// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { load } from "cheerio";
import { describe, expect, it } from "vitest";
import { build, normalizeBase, pagePath, render } from "../website/build.mjs";
import { locales } from "../website/content.mjs";

const browserScript = await readFile(
  new URL("../website/site.js", import.meta.url),
  "utf8",
);

describe("documentation navigation enhancements", () => {
  function simulate(page, hash) {
    const replacements = [];
    const handlers = {};
    const language = {
      hash: "",
      addEventListener: (_, handler) => {
        handlers.language = handler;
      },
    };
    const window = {
      location: { hash, replace: (url) => replacements.push(url) },
      addEventListener: (name, handler) => {
        handlers[name] = handler;
      },
    };
    const document = {
      body: { dataset: { page } },
      querySelectorAll: (selector) =>
        selector === "a.language"
          ? [language]
          : locales.en.sections.map(({ id }) => ({
              dataset: { page: id },
              href: pagePath("en", id),
            })),
    };
    runInNewContext(browserScript, { window, document });
    return { replacements, language, handlers, window };
  }
  it("routes old topic and API fragments to their new pages", () => {
    expect(simulate("overview", "#carriers").replacements).toEqual([
      "/waybillkit/carriers/",
    ]);
    expect(simulate("overview", "#heading-limitations").replacements).toEqual([
      "/waybillkit/limitations/",
    ]);
    expect(simulate("overview", "#track").replacements).toEqual([
      "/waybillkit/api/#track",
    ]);
  });
  it("does not route native headings, unknown fragments or external input", () => {
    for (const hash of [
      "",
      "#main",
      "#overview",
      "#features",
      "#unknown",
      "#https://example.com/",
    ])
      expect(simulate("overview", hash).replacements).toEqual([]);
    expect(simulate("api", "#errors").replacements).toEqual([]);
  });
  it("handles hash changes and preserves language-switch anchors", () => {
    const state = simulate("overview", "");
    state.window.location.hash = "#errors";
    state.handlers.hashchange();
    expect(state.replacements).toEqual(["/waybillkit/api/#errors"]);
    state.handlers.language();
    expect(state.language.hash).toBe("#errors");
  });
});

describe("public documentation", () => {
  it("keeps bilingual pages and heading anchors aligned", () => {
    expect(locales.en.sections.map(({ id }) => id)).toEqual(
      locales.ko.sections.map(({ id }) => id),
    );
    for (const { id } of locales.en.sections) {
      const ids = (lang) =>
        load(render(lang, "/", id))("[id]")
          .map((_, node) => node.attribs.id)
          .get();
      expect(ids("en")).toEqual(ids("ko"));
    }
  });
  for (const base of ["/", "/waybillkit/", "/preview/docs/"]) {
    it(`builds complete multi-page documentation at ${base}`, async () => {
      const directory = await mkdtemp(join(tmpdir(), "waybillkit-site-"));
      try {
        await build(directory, base);
        const files = await readdir(directory, {
          recursive: true,
          withFileTypes: true,
        });
        const relativeFiles = files
          .filter((file) => file.isFile())
          .map((file) =>
            join(file.parentPath, file.name).slice(directory.length + 1),
          )
          .sort();
        const pages = Object.entries(locales).flatMap(([lang, content]) =>
          content.sections.map(
            ({ id }) => `${pagePath(lang, id, "/").slice(1)}index.html`,
          ),
        );
        expect(relativeFiles).toEqual(
          [
            ".nojekyll",
            "404.html",
            "assets/icon.svg",
            "assets/site.js",
            "assets/style.css",
            ...pages,
          ].sort(),
        );
        const documents = new Map();
        for (const file of [...pages, "404.html"])
          documents.set(
            file,
            load(await readFile(join(directory, file), "utf8")),
          );
        for (const [file, $] of documents) {
          expect($("html").attr("lang")).toBe(
            file.startsWith("ko/") ? "ko" : "en",
          );
          expect($("h1")).toHaveLength(1);
          expect($("main")).toHaveLength(1);
          expect($("iframe, form, .hero, .cards")).toHaveLength(0);
          const ids = $("[id]")
            .map((_, node) => node.attribs.id)
            .get();
          expect(new Set(ids).size).toBe(ids.length);
          for (const node of $("[href], [src]").toArray()) {
            const href = node.attribs.href ?? node.attribs.src;
            if (href.startsWith("https://")) continue;
            const [path, fragment] = href.split("#");
            let target = file;
            if (path) {
              expect(path.startsWith(base)).toBe(true);
              target = path.slice(base.length);
              if (!target || target.endsWith("/")) target += "index.html";
              expect(relativeFiles).toContain(target);
            }
            if (fragment)
              expect(
                documents
                  .get(target)("[id]")
                  .map((_, item) => item.attribs.id)
                  .get(),
              ).toContain(fragment);
          }
          if (file === "404.html") continue;
          expect($("script")).toHaveLength(1);
          expect($("script").attr("src")).toBe(`${base}assets/site.js`);
          expect($(".sidebar [aria-current=page]")).toHaveLength(1);
          expect($(".sidebar a")).toHaveLength(7);
          expect($(".toc a")).toHaveLength($("article h2").length + 1);
          expect($("link[rel=alternate]")).toHaveLength(3);
          const current = $("body").attr("data-page");
          expect($(".language").attr("href")).toBe(
            pagePath(file.startsWith("ko/") ? "en" : "ko", current, base),
          );
          expect($("link[rel=canonical]").attr("href")).toBe(
            `https://esyeol.github.io${base}${file.replace(/index\.html$/, "")}`,
          );
          if (current === "carriers") expect($("tbody tr")).toHaveLength(5);
          if (current === "api")
            for (const id of [
              "track",
              "parse-tracking",
              "track-with-raw",
              "errors",
            ])
              expect(ids).toContain(id);
          expect($(".pagination a")).toHaveLength(
            ["overview", "contributing"].includes(current) ? 1 : 2,
          );
        }
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    });
  }
  it("rejects unsafe base paths and unknown pages", () => {
    for (const base of [
      "//evil/",
      "/../",
      '/a"/',
      "waybillkit",
      "/waybillkit",
      "https://example.com/",
    ])
      expect(() => normalizeBase(base)).toThrow();
    expect(() => render("unsupported")).toThrow();
    expect(() => render("en", "/", "missing")).toThrow();
  });
});
