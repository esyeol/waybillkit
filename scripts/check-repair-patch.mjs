import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const path = ".local/carrier-repair.patch";
const patch = readFileSync(path, "utf8");
assert.ok(Buffer.byteLength(patch) <= 500_000, "Repair patch is too large.");
assert.ok(
  !/^(?:new file mode|old mode|new mode|deleted file mode) (?!100644$)/m.test(
    patch,
  ),
  "Only regular files may be changed.",
);
assert.ok(
  !/^(?:GIT binary patch|Binary files|rename from|copy from)/m.test(patch),
  "Binary/renamed/copied files are not allowed.",
);
const stats = execFileSync("git", ["apply", "--numstat", "-z", path], {
  encoding: "utf8",
});
const names = stats
  .split("\0")
  .filter(Boolean)
  .map((line) => line.split("\t").at(-1));
assert.ok(names.length > 0 && names.length <= 20, "Expected a small repair.");
for (const name of names) {
  assert.ok(
    /^(?:src\/carriers\/kr-[a-z]+\/[a-z-]+\.ts|tests\/[a-z-]+\.test\.ts|tests\/fixtures\/kr-[a-z]+\/[a-z-]+\.(?:html|json))$/.test(
      name,
    ),
    "Patch changes a path outside the carrier repair scope.",
  );
}
assert.ok(
  names.some((name) => name.endsWith(".test.ts")),
  "Repair must include a regression test.",
);
execFileSync("git", ["apply", "--check", path]);
console.log("Repair patch paths and file modes OK.");
