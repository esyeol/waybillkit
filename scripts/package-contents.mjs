import assert from "node:assert/strict";

// Runtime entry points and distribution notices are mandatory; Markdown is not.
const required = [
  "LICENSE",
  "NOTICE",
  "dist/index.d.ts",
  "dist/index.js",
  "package.json",
];

export function validatePackageContents(paths) {
  for (const path of required)
    assert.ok(paths.includes(path), `Missing package file: ${path}`);
  for (const path of paths)
    assert.ok(
      required.includes(path) ||
        /^dist\/[\w/-]+\.(js|d\.ts)$/.test(path) ||
        /^(README|CHANGELOG)(?:\.[a-z]{2,3}(?:-[a-z0-9]+)*)?\.md$/i.test(path),
      `Unexpected package file: ${path}`,
    );
}
