import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { parseDocument } from "yaml";

const directory = new URL("../.github/workflows/", import.meta.url);
for (const file of readdirSync(directory).filter((name) =>
  name.endsWith(".yml"),
)) {
  const doc = parseDocument(readFileSync(new URL(file, directory), "utf8"), {
    uniqueKeys: true,
  });
  assert.deepEqual(doc.errors, [], `Invalid YAML: ${file}`);
  const workflow = doc.toJS();
  assert.ok(
    workflow.name && workflow.on && workflow.jobs,
    `Missing workflow fields: ${file}`,
  );
  for (const [name, job] of Object.entries(workflow.jobs)) {
    assert.ok(
      job.uses || (job["runs-on"] && Array.isArray(job.steps)),
      `Invalid job: ${file}/${name}`,
    );
  }
  console.log("Workflow structure OK:", file);
}
// This checks YAML/basic shape only; GitHub expression evaluation needs GitHub.
