import { execFile } from "node:child_process";
import { lookup } from "node:dns/promises";
import { appendFileSync } from "node:fs";
import { request } from "node:https";
import { isIP } from "node:net";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const endpoint = "https://www.ds3211.co.kr/freight/internalFreightSearch.ht";
const headers = {
  "Content-Type": "application/x-www-form-urlencoded",
  Referer: "https://www.ds3211.co.kr/freight/internalFreightForm.jsp",
  "User-Agent": "WaybillKit/0.0 (manual tracking SDK)",
};
const body = "billno=0000000000000";
const timeoutMs = 12000;
const codes = new Set([
  "ENOTFOUND",
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "CERT_HAS_EXPIRED",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "UND_ERR_CONNECT_TIMEOUT",
  "ABORT_ERR",
]);
export function safeCode(error) {
  const code = error?.cause?.code ?? error?.code;
  return codes.has(code) ? code : "OTHER";
}
export function stalledStage(timings) {
  if (timings.bodyMs !== undefined) return "complete";
  if (timings.headersMs !== undefined) return "body";
  if (timings.tlsMs !== undefined) return "response-headers";
  if (timings.tcpMs !== undefined) return "tls";
  if (timings.dnsMs !== undefined) return "tcp";
  return "dns-or-socket";
}
const denied = (result) => [401, 403, 429].includes(result.httpStatus);
export async function runSequential(probes) {
  const results = [];
  for (const probe of probes) {
    const result = await probe();
    results.push(result);
    if (denied(result)) break;
  }
  return results;
}

async function sdkProbe() {
  const sdk = await import("../../dist/index.js");
  const start = performance.now();
  const report = { client: "sdk-default", timeoutMs: 10000 };
  try {
    await sdk.track({
      carrier: "kr.daesin",
      trackingNumber: "0000000000000",
      timeoutMs: 10000,
      fetch: async (...args) => {
        try {
          const response = await fetch(...args);
          report.httpStatus = response.status;
          report.headersMs = Math.round(performance.now() - start);
          return response;
        } catch (error) {
          report.code = safeCode(error);
          throw error;
        }
      },
    });
    report.outcome = "unexpected-success";
  } catch (error) {
    const known = [
      "TrackingNotFoundError",
      "ParseError",
      "CarrierTimeoutError",
      "CarrierUnavailableError",
      "CarrierAuthError",
      "CarrierRateLimitedError",
    ];
    report.outcome = known.includes(error.constructor.name)
      ? error.constructor.name
      : "internal-error";
  }
  report.totalMs = Math.round(performance.now() - start);
  return report;
}

function nodeProbe() {
  return new Promise((resolve) => {
    const start = performance.now();
    const timings = {};
    const report = { client: "node-https-ipv4", timeoutMs, timings };
    let finished = false;
    const mark = (key) => {
      timings[key] = Math.round(performance.now() - start);
    };
    const finish = (outcome) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({
        ...report,
        outcome,
        stage: stalledStage(timings),
        totalMs: Math.round(performance.now() - start),
      });
    };
    const req = request(
      endpoint,
      {
        method: "POST",
        family: 4,
        headers: { ...headers, "Content-Length": Buffer.byteLength(body) },
        agent: false,
      },
      (res) => {
        mark("headersMs");
        report.httpStatus = res.statusCode;
        let bytes = 0;
        res.on("data", (chunk) => {
          bytes += chunk.length;
          if (bytes > 1024 * 1024) {
            finish("body-limit");
            req.destroy();
          }
        });
        res.on("end", () => {
          mark("bodyMs");
          finish("response-received");
        });
        res.on("error", (error) => {
          report.code = safeCode(error);
          finish("body-error");
        });
      },
    );
    const timer = setTimeout(() => {
      finish("timeout");
      req.destroy();
    }, timeoutMs);
    req.on("socket", (socket) => {
      socket.on("lookup", (error, address) => {
        if (error) report.code = safeCode(error);
        else {
          mark("dnsMs");
          if (isIP(address)) report.remoteAddress = address;
        }
      });
      socket.on("connect", () => mark("tcpMs"));
      socket.on("secureConnect", () => mark("tlsMs"));
    });
    req.on("error", (error) => {
      report.code = safeCode(error);
      finish("connection-error");
    });
    req.end(body);
  });
}

const curlFields = [
  "http_code",
  "time_namelookup",
  "time_connect",
  "time_appconnect",
  "time_starttransfer",
  "time_total",
  "remote_ip",
  "ssl_verify_result",
];
export function sanitizeCurl(text) {
  const data = JSON.parse(text);
  const result = {};
  for (const key of curlFields) {
    if (key === "remote_ip") {
      if (typeof data[key] === "string" && isIP(data[key]))
        result[key] = data[key];
    } else if (
      typeof data[key] === "number" &&
      Number.isFinite(data[key]) &&
      data[key] >= 0
    )
      result[key] = data[key];
  }
  return result;
}
async function curlProbe() {
  // Disable ~/.curlrc before any other option. Never follow redirects or retry.
  const args = [
    "-q",
    "-4",
    "--silent",
    "--output",
    "/dev/null",
    "--max-time",
    "12",
    "--connect-timeout",
    "10",
    "--max-filesize",
    "1048576",
    "--write-out",
    "%{json}",
  ];
  for (const [key, value] of Object.entries(headers))
    args.push("--header", `${key}: ${value}`);
  args.push("--data", body, endpoint);
  let stdout;
  let exitCode = 0;
  try {
    ({ stdout } = await promisify(execFile)("curl", args, {
      timeout: 14000,
      maxBuffer: 65536,
    }));
  } catch (error) {
    stdout = error.stdout;
    exitCode = Number.isInteger(error.code) ? error.code : -1;
  }
  let metrics = {};
  try {
    metrics = sanitizeCurl(stdout);
  } catch {
    /* No raw tool errors. */
  }
  return {
    client: "curl-ipv4",
    timeoutMs,
    exitCode,
    httpStatus: metrics.http_code,
    metrics,
  };
}

async function main() {
  // Hard ceiling also covers a stuck resolver or unexpected diagnostic bug.
  const watchdog = setTimeout(() => {
    console.error("Diagnostic exceeded its bounded runtime.");
    process.exit(1);
  }, 60000);
  try {
    let timer;
    let dns;
    try {
      const values = await Promise.race([
        lookup("www.ds3211.co.kr", { all: true }),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject({ code: "ETIMEDOUT" }), 5000);
        }),
      ]);
      dns = values
        .filter((item) => isIP(item.address))
        .map(({ address, family }) => ({ address, family }));
    } catch (error) {
      dns = { code: safeCode(error) };
    } finally {
      clearTimeout(timer);
    }
    const report = {
      checkedAt: new Date().toISOString(),
      scope: "fixed-dummy-network-diagnostic",
      dns,
      results: await runSequential([sdkProbe, nodeProbe, curlProbe]),
    };
    const output = JSON.stringify(report, null, 2);
    console.log(output);
    if (process.env.GITHUB_STEP_SUMMARY)
      appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        `## Daesin network diagnostic\n\nNo shipment success is verified. A green job means diagnostics completed.\n\n\`\`\`json\n${output}\n\`\`\`\n`,
      );
  } finally {
    clearTimeout(watchdog);
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(() => {
    console.error("Diagnostic failed internally; raw error suppressed.");
    process.exitCode = 1;
  });
}
