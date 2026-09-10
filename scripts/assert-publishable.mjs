import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
assert.equal(pkg.name, "@esyeol/waybillkit");
assert.equal(
  pkg.private,
  false,
  "Publishing is disabled. Complete the first-release checklist and explicitly set private: false.",
);
assert.notEqual(pkg.version, "0.0.0", "The scaffold is not a release.");
assert.equal(pkg.publishConfig?.access, "public");
assert.ok(
  pkg.repository?.url,
  "Set the verified public GitHub repository URL before publishing.",
);
console.log("Package release metadata is ready.");
