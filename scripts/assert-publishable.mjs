import { readFileSync } from "node:fs";
import { validateReleaseMetadata } from "./release-metadata.mjs";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const tag = validateReleaseMetadata(pkg, process.env.npm_config_tag);
console.log(
  `Package release metadata is ready: ${pkg.name}@${pkg.version} (${tag}).`,
);
