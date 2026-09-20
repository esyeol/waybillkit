// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { load } from "cheerio";
import { describe, expect, it } from "vitest";
import { build, normalizeBase, render } from "../website/build.mjs";
import { locales } from "../website/content.mjs";

describe("public documentation", () => {
  it("keeps both languages on the same section and anchor contract", () => {
    expect(locales.en.sections.map(({ id }) => id)).toEqual(
      locales.ko.sections.map(({ id }) => id),
    );
    const ids = (lang) =>
      load(render(lang))("[id]")
        .map((_, element) => element.attribs.id)
        .get();
    expect(ids("en")).toEqual(ids("ko"));
  });

  for (const base of ["/", "/waybillkit/", "/preview/docs/"]) {
    it(`builds a self-contained, linked bilingual site at ${base}`, async () => {
      const directory = await mkdtemp(join(tmpdir(), "waybillkit-site-"));
      try {
        await build(directory, base);
        const files = (await readdir(directory, { recursive: true })).sort();
        expect(files).toEqual([
          ".nojekyll",
          "404.html",
          "assets",
          "assets/icon.svg",
          "assets/style.css",
          "index.html",
          "ko",
          "ko/index.html",
        ]);
        for (const page of ["index.html", "ko/index.html", "404.html"]) {
          const $ = load(await readFile(join(directory, page), "utf8"));
          expect($("html").attr("lang")).toBe(
            page.startsWith("ko/") ? "ko" : "en",
          );
          expect($("h1")).toHaveLength(1);
          expect($("main")).toHaveLength(1);
          expect($("script, iframe, form")).toHaveLength(0);
          const ids = $("[id]")
            .map((_, element) => element.attribs.id)
            .get();
          expect(new Set(ids).size).toBe(ids.length);
          for (const element of $("[href], [src]").toArray()) {
            const href = element.attribs.href ?? element.attribs.src;
            if (href.startsWith("https://")) continue;
            if (href.startsWith("#")) {
              expect(ids).toContain(href.slice(1));
            } else {
              expect(href.startsWith(base)).toBe(true);
              let path = href.slice(base.length);
              if (!path || path.endsWith("/")) path += "index.html";
              expect(files).toContain(path);
            }
          }
          if (page === "404.html") continue;
          expect($("section")).toHaveLength(7);
          expect($("tbody tr")).toHaveLength(5);
          expect($("link[rel=alternate]")).toHaveLength(3);
          for (const id of [
            "kr.daesin",
            "kr.kdexp",
            "kr.chunilps",
            "kr.kunyoung",
            "kr.ilyanglogis",
          ])
            expect($("body").text()).toContain(id);
          for (const method of [
            "track(options)",
            "parseTracking(options)",
            "trackWithRaw(options)",
          ])
            expect($("body").text()).toContain(method);
        }
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    });
  }
  it("rejects unsafe or ambiguous base paths", () => {
    for (const base of [
      "//evil/",
      "/../",
      "/a/../../",
      '/a"/',
      "waybillkit",
      "/waybillkit",
      "https://example.com/",
    ])
      expect(() => normalizeBase(base)).toThrow();
    expect(() => render("unsupported")).toThrow();
  });
});
