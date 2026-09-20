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
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base))
    throw new Error("Site base must be / or a slash-delimited URL path.");
  return base;
}
const escapeHtml = (text) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
export function pagePath(lang, id, base = "/waybillkit/") {
  return `${base}${lang === "ko" ? "ko/" : ""}${id === "overview" ? "" : `${id}/`}`;
}

export function render(lang, base = "/waybillkit/", pageId = "overview") {
  normalizeBase(base);
  const content = locales[lang];
  const current = content?.sections.find(({ id }) => id === pageId);
  if (!current) throw new Error("Unsupported documentation language or page.");
  const ko = lang === "ko";
  const other = ko ? "en" : "ko";
  const url = (id, language = lang) => pagePath(language, id, base);
  const groups = [
    [ko ? "시작하기" : "Getting started", ["overview", "getting-started"]],
    [
      ko ? "사용 가이드" : "Guides",
      ["api", "carriers", "limitations", "responsible-use"],
    ],
    [ko ? "프로젝트" : "Project", ["contributing"]],
  ];
  const navigation = groups
    .map(
      ([title, ids]) =>
        `<div class="nav-group"><p>${title}</p>${ids.map((id) => `<a href="${url(id)}" data-page="${id}"${pageId === id ? ' aria-current="page"' : ""}>${content.sections.find((section) => section.id === id).title}</a>`).join("")}</div>`,
    )
    .join("");
  const headings = [];
  let body = current.body.replace(
    /<h3(?: id="([^"]+)")?>(.*?)<\/h3>/g,
    (_, existing, title) => {
      const id = existing ?? `${pageId}-section-${headings.length + 1}`;
      headings.push({ id, title: title.replace(/<[^>]*>/g, "") });
      return `<h2 id="${id}">${title}<a class="heading-anchor" href="#${id}" aria-label="${ko ? "이 항목 링크" : "Link to this section"}">#</a></h2>`;
    },
  );
  body = body.replace(/href="#([^"]+)"/g, (match, id) =>
    content.sections.some((section) => section.id === id) && id !== pageId
      ? `href="${url(id)}"`
      : match,
  );
  const toc = `<a href="#${pageId}">${current.title}</a>${headings.map(({ id, title }) => `<a href="#${id}">${title}</a>`).join("")}`;
  const index = content.sections.indexOf(current);
  const adjacent = [content.sections[index - 1], content.sections[index + 1]];
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${current.title} | WaybillKit</title>
  <meta name="description" content="${escapeHtml(`${current.title} — ${content.description}`)}">
  <meta name="theme-color" content="#ffffff">
  <meta property="og:title" content="${current.title} | WaybillKit">
  <meta property="og:description" content="${escapeHtml(content.description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${origin}${url(pageId)}">
  <link rel="canonical" href="${origin}${url(pageId)}">
  <link rel="alternate" hreflang="en" href="${origin}${url(pageId, "en")}">
  <link rel="alternate" hreflang="ko" href="${origin}${url(pageId, "ko")}">
  <link rel="alternate" hreflang="x-default" href="${origin}${url(pageId, "en")}">
  <link rel="icon" href="${base}assets/icon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${base}assets/style.css">
  <script src="${base}assets/site.js" defer></script>
</head>
<body data-page="${pageId}">
  <a class="skip" href="#main">${content.skip}</a>
  <header class="header">
    <a class="brand" href="${url("overview")}"><img src="${base}assets/icon.svg" width="28" height="28" alt="">WaybillKit</a>
    <a class="docs-link" href="${url("overview")}">${content.navigation}</a>
    <span class="release">${ko ? "실험 단계" : "Experimental"}</span>
    <nav class="header-links" aria-label="${ko ? "언어 및 저장소" : "Language and repository"}">
      <a class="language" href="${url(pageId, other)}" lang="${other}" hreflang="${other}">${content.other}</a>
      <a href="${repository}">GitHub ↗</a>
    </nav>
  </header>
  <details class="mobile-menu"><summary>${content.navigation}</summary><nav aria-label="${ko ? "모바일 문서 메뉴" : "Mobile documentation"}">${navigation}</nav></details>
  <div class="layout">
    <aside class="sidebar"><nav aria-label="${content.navigation}">${navigation}</nav></aside>
    <main id="main" tabindex="-1">
      <nav class="breadcrumb" aria-label="${ko ? "현재 위치" : "Breadcrumb"}"><a href="${url("overview")}">${content.navigation}</a><span aria-hidden="true"> / </span><span>${current.title}</span></nav>
      <article id="${pageId}"><h1>${current.title}</h1><details class="mobile-toc"><summary>${ko ? "이 페이지의 내용" : "On this page"}</summary><nav>${toc}</nav></details>${body}</article>
      <a class="edit-link" href="${repository}/blob/main/website/content.mjs">${content.edit} ↗</a>
      <nav class="pagination" aria-label="${ko ? "이전·다음 문서" : "Previous and next pages"}">${adjacent.map((section, position) => (section ? `<a class="${position ? "next" : "previous"}" href="${url(section.id)}"><small>${position ? (ko ? "다음" : "Next") : ko ? "이전" : "Previous"}</small><span>${position ? "" : "← "}${section.title}${position ? " →" : ""}</span></a>` : "<span></span>")).join("")}</nav>
      <footer><p>${content.footer}</p><a href="${repository}/blob/main/LICENSE">Apache-2.0</a> · <a href="${repository}/issues">${ko ? "문제 제보" : "Report an issue"}</a></footer>
    </main>
    <aside class="toc"><nav aria-label="${ko ? "이 페이지의 내용" : "On this page"}"><p>${ko ? "이 페이지의 내용" : "On this page"}</p>${toc}</nav></aside>
  </div>
</body>
</html>\n`;
}

export async function build(destination = output, base = "/waybillkit/") {
  normalizeBase(base);
  await mkdir(resolve(destination, "assets"), { recursive: true });
  for (const [lang, content] of Object.entries(locales)) {
    for (const { id } of content.sections) {
      const path = resolve(destination, pagePath(lang, id, "/").slice(1));
      await mkdir(path, { recursive: true });
      await writeFile(resolve(path, "index.html"), render(lang, base, id));
    }
  }
  for (const asset of ["style.css", "icon.svg", "site.js"])
    await copyFile(
      resolve(directory, asset),
      resolve(destination, "assets", asset),
    );
  await writeFile(resolve(destination, ".nojekyll"), "");
  await writeFile(
    resolve(destination, "404.html"),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page not found — WaybillKit</title><link rel="stylesheet" href="${base}assets/style.css"></head><body><main class="not-found"><h1>Page not found</h1><p>This documentation page does not exist.</p><a href="${base}">English documentation</a> · <a href="${base}ko/" lang="ko">한국어 문서</a></main></body></html>\n`,
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
