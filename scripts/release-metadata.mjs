import assert from "node:assert/strict";

export function validateReleaseMetadata(pkg, requestedTag) {
  assert.equal(pkg.name, "@esyeol/waybillkit");
  assert.equal(pkg.private, false, "Publishing is disabled.");
  assert.match(
    pkg.version,
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(alpha|beta|rc)\.(0|[1-9]\d*))?$/,
    "Expected a stable version or alpha/beta/rc.N prerelease.",
  );
  assert.notEqual(pkg.version, "0.0.0", "The scaffold is not a release.");
  const tag = pkg.version.includes("-") ? "next" : "latest";
  assert.equal(pkg.publishConfig?.access, "public");
  assert.equal(pkg.publishConfig?.registry, "https://registry.npmjs.org/");
  assert.equal(
    pkg.publishConfig?.tag,
    tag,
    "Publish tag must match the release channel.",
  );
  if (requestedTag !== undefined)
    assert.equal(
      requestedTag,
      tag,
      "Refusing publication to the wrong dist-tag.",
    );
  assert.equal(pkg.repository?.type, "git");
  assert.equal(
    pkg.repository?.url,
    "git+https://github.com/esyeol/waybillkit.git",
  );
  return tag;
}
