import { describe, expect, it } from "vitest";
import { validatePackageContents } from "../scripts/package-contents.mjs";

const required = [
  "LICENSE",
  "NOTICE",
  "package.json",
  "dist/index.js",
  "dist/index.d.ts",
];

describe("package contents boundaries", () => {
  it("does not require Markdown documents", () => {
    expect(() => validatePackageContents(required)).not.toThrow();
  });

  it("allows translated public documents and new compiled modules", () => {
    expect(() =>
      validatePackageContents([
        ...required,
        "README.md",
        "README.ko.md",
        "README.ja.md",
        "README.zh-CN.md",
        "CHANGELOG.md",
        "CHANGELOG.ko.md",
        "dist/carriers/new-carrier/parse.js",
        "dist/carriers/new-carrier/parse.d.ts",
      ]),
    ).not.toThrow();
  });

  it.each(required)("rejects a missing required file: %s", (missing) => {
    expect(() =>
      validatePackageContents(required.filter((path) => path !== missing)),
    ).toThrow(`Missing package file: ${missing}`);
  });

  it.each([
    "docs/README.md",
    ".local/README.md",
    "INTERNAL.md",
    ".env",
    "src/index.ts",
    "tests/fixtures/example.html",
    "dist/.env",
    "dist/index.js.map",
  ])("rejects unexpected distribution content: %s", (path) => {
    expect(() => validatePackageContents([...required, path])).toThrow(
      `Unexpected package file: ${path}`,
    );
  });
});
