import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import iconv from "iconv-lite";

const root = fileURLToPath(new URL("../", import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), "waybillkit-package-"));
const run = (command, args, cwd = root) =>
  execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      // Keep validation independent from a developer's possibly shared or
      // root-owned npm cache. The enclosing scratch directory is disposable.
      npm_config_cache: join(scratch, "npm-cache"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
try {
  // Build explicitly: --ignore-scripts keeps packing independent of lifecycle hooks.
  run("pnpm", ["build"]);
  const [packed] = JSON.parse(
    run("npm", [
      "pack",
      "--json",
      "--ignore-scripts",
      "--pack-destination",
      scratch,
    ]),
  );
  const paths = packed.files.map((file) => file.path).sort();
  const required = [
    "LICENSE",
    "NOTICE",
    "README.md",
    "dist/index.d.ts",
    "dist/index.js",
    "package.json",
  ];
  for (const path of required)
    assert.ok(paths.includes(path), `Missing package file: ${path}`);
  for (const path of paths)
    assert.ok(
      required.includes(path) || /^dist\/[\w/-]+\.(js|d\.ts)$/.test(path),
      `Unexpected package file: ${path}`,
    );
  const html = readFileSync(
    join(root, "tests/fixtures/kr-daesin/delivered.html"),
    "utf8",
  );
  const bytes = iconv.encode(html, "euc-kr").toString("base64");
  const archive = join(scratch, packed.filename);
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  for (const manager of ["npm", "pnpm"]) {
    const consumer = join(scratch, manager);
    mkdirSync(consumer);
    writeFileSync(
      join(consumer, "package.json"),
      JSON.stringify({
        name: "waybillkit-package-consumer",
        private: true,
        type: "module",
        ...(manager === "pnpm"
          ? { packageManager: manifest.packageManager }
          : {}),
      }),
    );
    const args =
      manager === "npm"
        ? [
            "install",
            "--ignore-scripts",
            "--no-audit",
            "--no-fund",
            "--package-lock=false",
            archive,
          ]
        : ["add", "--ignore-scripts", archive];
    run(manager, args, consumer);
    writeFileSync(
      join(consumer, "consumer.mjs"),
      `import assert from "node:assert/strict";
       import { track, trackWithRaw, parseTracking } from "@esyeol/waybillkit";
       const result = await track({carrier:"kr.daesin",trackingNumber:"0000000000000",
         fetch: async () => new Response(Buffer.from(${JSON.stringify(bytes)},"base64"), {headers:{"content-type":"text/html"}})});
       assert.equal(result.status,"DELIVERED"); assert.equal(result.events.length,6);
       const parsed = parseTracking({carrier:"kr.daesin",payload:Buffer.from(${JSON.stringify(bytes)},"base64")});
       assert.equal(parsed.status,"DELIVERED"); assert.equal("fetchedAt" in parsed.meta,false);
       const captured = await trackWithRaw({carrier:"kr.daesin",trackingNumber:"0000000000000",
         fetch: async () => new Response(Buffer.from(${JSON.stringify(bytes)},"base64"), {headers:{"content-type":"text/html"}})});
       assert.deepEqual(parseTracking({carrier:"kr.daesin",payload:captured.raw.body}),parsed);
       console.log("Installed SDK tracking OK (offline fixture)");`,
    );
    console.log(
      manager,
      run(process.execPath, ["consumer.mjs"], consumer).trim(),
    );
    writeFileSync(
      join(consumer, "consumer.ts"),
      'import { track, trackWithRaw, parseTracking, type TrackingResult, type TrackingResultWithRaw, type ParsedTrackingResult } from "@esyeol/waybillkit";\nconst check: Promise<TrackingResult> = track({carrier:"kr.daesin",trackingNumber:"0000000000000"});\nconst raw: Promise<TrackingResultWithRaw> = trackWithRaw({carrier:"kr.daesin",trackingNumber:"0000000000000"});\nconst parsed: ParsedTrackingResult = parseTracking({carrier:"kr.daesin",payload:""});\nvoid [check, raw, parsed];\n',
    );
    writeFileSync(
      join(consumer, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          module: "NodeNext",
          moduleResolution: "NodeNext",
          target: "ES2022",
          noEmit: true,
        },
        files: ["consumer.ts"],
      }),
    );
    run(
      process.execPath,
      [
        resolve(root, "node_modules/typescript/bin/tsc"),
        "--project",
        "tsconfig.json",
      ],
      consumer,
    );
    console.log(manager, "TypeScript declarations OK");
  }
  console.log("Package contents OK:", paths.join(", "));
} finally {
  // Only remove the unique scratch directory created by this invocation.
  rmSync(scratch, { recursive: true, force: true });
}
