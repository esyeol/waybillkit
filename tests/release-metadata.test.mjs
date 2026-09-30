import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateReleaseMetadata } from "../scripts/release-metadata.mjs";

const manifest = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const pkg = {
  ...manifest,
  version: "0.1.0-alpha.1",
  publishConfig: { ...manifest.publishConfig, tag: "next" },
};
describe("release metadata", () => {
  it("validates the committed release candidate", () => {
    expect(validateReleaseMetadata(manifest)).toBe(
      manifest.version.includes("-") ? "next" : "latest",
    );
  });
  it("publishes prereleases only to next", () => {
    for (const version of ["0.1.0-alpha.1", "0.1.0-beta.2", "0.1.0-rc.0"])
      expect(validateReleaseMetadata({ ...pkg, version }, "next")).toBe("next");
    expect(() => validateReleaseMetadata(pkg, "latest")).toThrow();
    expect(() =>
      validateReleaseMetadata({
        ...pkg,
        publishConfig: { ...pkg.publishConfig, tag: "latest" },
      }),
    ).toThrow();
  });
  it("requires an explicit latest channel for stable releases", () => {
    const stable = {
      ...pkg,
      version: "0.1.0",
      publishConfig: { ...pkg.publishConfig, tag: "latest" },
    };
    expect(validateReleaseMetadata(stable, "latest")).toBe("latest");
    expect(() => validateReleaseMetadata(stable, "next")).toThrow();
  });
  it("rejects invalid versions, private packages and wrong destinations", () => {
    for (const version of [
      "0.0.0",
      "v0.1.0",
      "01.1.0",
      "0.1.0-alpha.01",
      "0.1.0-alpha",
      "garbage",
    ])
      expect(() => validateReleaseMetadata({ ...pkg, version })).toThrow();
    for (const patch of [
      { private: true },
      { name: "other" },
      { repository: { type: "git", url: "https://example.com" } },
      { publishConfig: { ...pkg.publishConfig, access: "restricted" } },
      {
        publishConfig: {
          ...pkg.publishConfig,
          registry: "https://example.com/",
        },
      },
    ])
      expect(() => validateReleaseMetadata({ ...pkg, ...patch })).toThrow();
  });
});
