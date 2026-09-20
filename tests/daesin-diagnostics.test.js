import { describe, expect, it, vi } from "vitest";
import {
  runSequential,
  safeCode,
  sanitizeCurl,
  stalledStage,
} from "../scripts/probes/daesin-diagnostics.mjs";

describe("Daesin diagnostic boundaries", () => {
  it.each([
    [{}, "dns-or-socket"],
    [{ dnsMs: 0 }, "tcp"],
    [{ dnsMs: 1, tcpMs: 2 }, "tls"],
    [{ tlsMs: 3 }, "response-headers"],
    [{ headersMs: 4 }, "body"],
    [{ bodyMs: 5 }, "complete"],
  ])("identifies the last completed phase", (timings, expected) => {
    expect(stalledStage(timings)).toBe(expected);
  });
  it.each([401, 403, 429])("stops after HTTP %i", async (httpStatus) => {
    const next = vi.fn();
    expect(await runSequential([async () => ({ httpStatus }), next])).toEqual([
      { httpStatus },
    ]);
    expect(next).not.toHaveBeenCalled();
  });
  it("runs each supplied diagnostic once and sequentially", async () => {
    const order = [];
    const probes = [1, 2, 3].map((id) =>
      vi.fn(async () => {
        order.push(id);
        return { id };
      }),
    );
    expect(await runSequential(probes)).toEqual([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ]);
    expect(order).toEqual([1, 2, 3]);
    for (const probe of probes) expect(probe).toHaveBeenCalledTimes(1);
  });
  it("retains only known error codes, never exception messages", () => {
    expect(safeCode({ cause: { code: "ECONNRESET" }, message: "SECRET" })).toBe(
      "ECONNRESET",
    );
    expect(safeCode({ code: "SECRET", message: "SECRET" })).toBe("OTHER");
  });
  it("drops curl headers, error strings, URLs and malformed metrics", () => {
    expect(
      sanitizeCurl(
        JSON.stringify({
          http_code: 200,
          time_connect: 0.1,
          remote_ip: "203.232.91.119",
          errormsg: "SECRET",
          url_effective: "SECRET",
          time_total: "SECRET",
          ssl_verify_result: -1,
        }),
      ),
    ).toEqual({
      http_code: 200,
      time_connect: 0.1,
      remote_ip: "203.232.91.119",
    });
    expect(sanitizeCurl('{"remote_ip":"SECRET"}')).toEqual({});
  });
});
