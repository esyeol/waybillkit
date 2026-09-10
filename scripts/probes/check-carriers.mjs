import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { runProbes, selectCarriers, summary } from "./probe.mjs";

try {
  const ids = selectCarriers(process.env.CARRIER_PROBE_IDS);
  const sdk = ids.length ? await import("../../dist/index.js") : undefined;
  const report = await runProbes(ids, sdk);
  mkdirSync(".local", { recursive: true });
  writeFileSync(
    ".local/carrier-report.json",
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary(report));
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `contract_failure=${report.carriers.some((r) => r.outcome === "contract-unrecognized")}\n`,
    );
  if (report.carriers.some((r) => r.outcome === "internal-error"))
    process.exitCode = 1;
} catch {
  console.error(
    "Carrier checks could not run. Check carrier IDs and run pnpm build first.",
  );
  process.exitCode = 1;
}
