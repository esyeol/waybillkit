// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { locales, repository } from "./content.mjs";

const directory = dirname(fileURLToPath(import.meta.url));
export const output = resolve(directory, "../.local/site");
const origin = "https://esyeol.github.io";
export function normalizeBase(base) {
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) {
    throw new Error("Site base must be / or a slash-delimited URL path.");
  }
  return base;
}
const escapeHtml = (text) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

export function render(lang, base = "/waybillkit/") {
  normalizeBase(base);
  const content = locales[lang];
  if (!content) throw new Error("Unsupported documentation language.");
  const home = (language) => `${base}${language === "ko" ? "ko/" : ""}`;
  const other = lang === "en" ? "ko" : "en";
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WaybillKit — ${content.navigation}</title>
  <meta name="description" content="${escapeHtml(content.description)}">
  <meta name="theme-color" content="#f7f8f5">
  <meta property="og:title" content="WaybillKit — ${content.navigation}">
  <meta property="og:description" content="${escapeHtml(content.description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${origin}${home(lang)}">
  <link rel="canonical" href="${origin}${home(lang)}">
  <link rel="alternate" hreflang="en" href="${origin}${home("en")}">
  <link rel="alternate" hreflang="ko" href="${origin}${home("ko")}">
  <link rel="alternate" hreflang="x-default" href="${origin}${home("en")}">
  <link rel="icon" href="${base}assets/icon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${base}assets/style.css">
</head>
<body>
  <a class="skip" href="#main">${content.skip}</a>
  <header class="header"><div class="header-inner">
    <a class="brand" href="${home(lang)}"><span class="brand-mark" aria-hidden="true">w.</span>WaybillKit<span class="brand-label">DOCS</span></a>
    <nav class="header-links" aria-label="${lang === "ko" ? "언어 및 저장소" : "Language and repository"}">
      <a href="${home(other)}" lang="${other}" hreflang="${other}">${content.other}</a>
      <a href="${repository}">GitHub <span aria-hidden="true">↗</span></a>
    </nav>
  </div></header>
  <div class="layout">
    <aside class="sidebar"><nav aria-label="${content.navigation}"><p class="nav-label">${content.navigation}</p>${content.sections.map((section, index) => `<a href="#${section.id}"><span aria-hidden="true">0${index + 1}</span>${section.title}</a>`).join("")}<div class="sidebar-note">OPEN SOURCE<br>Apache-2.0<br>Node.js / TypeScript</div></nav></aside>
    <main id="main" tabindex="-1">
      <div class="hero"><p class="eyebrow">${content.eyebrow}</p><h1>${escapeHtml(content.title).replace("\n", "<br>")}</h1><p class="lead">${content.description}</p><div class="link-row"><a class="button" href="#getting-started">${content.start}<span aria-hidden="true">→</span></a><a class="secondary" href="#carriers">${content.support}</a></div><p class="release-note">${content.notice}</p><div class="hero-line" aria-hidden="true"><span>WAYBILL</span><i></i><span>ADAPTER</span><i></i><span>EVENTS</span></div></div>
      ${content.sections.map((section, index) => `<section id="${section.id}" aria-labelledby="heading-${section.id}"><div class="section-heading"><span aria-hidden="true">0${index + 1}</span><h2 id="heading-${section.id}">${section.title}</h2></div>${section.body}</section>`).join("\n")}
      <footer><a href="${repository}/blob/main/website/content.mjs">${content.edit} ↗</a><p>${content.footer}</p><span>WaybillKit / Apache-2.0</span></footer>
    </main>
  </div>
</body>
</html>\n`;
}

export async function build(destination = output, base = "/waybillkit/") {
  normalizeBase(base);
  await mkdir(resolve(destination, "assets"), { recursive: true });
  await mkdir(resolve(destination, "ko"), { recursive: true });
  for (const lang of Object.keys(locales)) {
    await writeFile(
      resolve(destination, lang === "ko" ? "ko/index.html" : "index.html"),
      render(lang, base),
    );
  }
  for (const asset of ["style.css", "icon.svg"]) {
    await copyFile(
      resolve(directory, asset),
      resolve(destination, "assets", asset),
    );
  }
  await writeFile(resolve(destination, ".nojekyll"), "");
  await writeFile(
    resolve(destination, "404.html"),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page not found — WaybillKit</title><link rel="stylesheet" href="${base}assets/style.css"></head><body><main class="not-found"><p class="eyebrow">404 / WAYBILLKIT</p><h1>Page not found.</h1><p>This documentation page does not exist.</p><a class="button" href="${base}">English documentation</a> <a href="${base}ko/" lang="ko">한국어 문서</a></main></body></html>\n`,
  );
  return destination;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await build(output, process.env.SITE_BASE_PATH ?? "/waybillkit/");
  console.log(`Built public documentation: ${output}`);
}
