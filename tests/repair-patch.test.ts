import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const validator = fileURLToPath(
  new URL("../scripts/check-repair-patch.mjs", import.meta.url),
);
function addition(path: string, mode = "100644") {
  return `diff --git a/${path} b/${path}\nnew file mode ${mode}\n--- /dev/null\n+++ b/${path}\n@@ -0,0 +1 @@\n+// synthetic regression\n`;
}
function validate(patch: string) {
  const scratch = mkdtempSync(join(tmpdir(), "waybillkit-repair-test-"));
  try {
    mkdirSync(join(scratch, ".local"));
    writeFileSync(join(scratch, ".local/carrier-repair.patch"), patch);
    return execFileSync(process.execPath, [validator], {
      cwd: scratch,
      encoding: "utf8",
      stdio: "pipe",
    });
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}
describe("repair patch boundaries", () => {
  it("accepts carrier changes accompanied by a regression test", () => {
    expect(
      validate(
        addition("src/carriers/kr-daesin/new.ts") +
          addition("tests/new.test.ts"),
      ),
    ).toContain("OK");
  });
  it.each([
    addition(".github/workflows/ci.yml") + addition("tests/new.test.ts"),
    addition("src/carriers/kr-daesin/new.ts"),
    addition("tests/new.test.ts", "120000"),
    addition("tests/new.test.ts", "100755"),
  ])("rejects untrusted changes outside the proposal boundary", (patch) => {
    expect(() => validate(patch)).toThrow();
  });
});
