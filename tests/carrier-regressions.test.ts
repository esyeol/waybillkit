import { readFileSync } from "node:fs";
import { load } from "cheerio";
import iconv from "iconv-lite";
import { describe, expect, it, vi } from "vitest";
import {
  type CarrierId,
  InvalidTrackingNumberError,
  ParseError,
  parseTracking,
  track,
} from "../src/index.js";

describe("cross-validation regressions", () => {
  it.each(["error", "maintenance", "denied", ""])(
    "does not turn Kyungdong result %s into not-found",
    (result) => {
      expect(() =>
        parseTracking({
          carrier: "kr.kdexp",
          payload: JSON.stringify({ result }),
        }),
      ).toThrow(ParseError);
    },
  );
  it("distinguishes a missing Kunyoung waybill cell from an empty one", () => {
    const html = readFileSync(
      new URL("./fixtures/kr-kunyoung/not-found.html", import.meta.url),
      "utf8",
    );
    const $ = load(html);
    $("table.goods-table").first().find("td").remove();
    expect(() =>
      parseTracking({ carrier: "kr.kunyoung", payload: $.html() }),
    ).toThrow(ParseError);
  });
  it("accepts the 12-digit domestic Daesin form input", async () => {
    const html = readFileSync(
      new URL("./fixtures/kr-daesin/delivered.html", import.meta.url),
      "utf8",
    );
    const fetcher = vi.fn(
      async () =>
        new Response(new Uint8Array(iconv.encode(html, "euc-kr")), {
          headers: { "content-type": "text/html" },
        }),
    );
    const result = await track({
      carrier: "kr.daesin",
      trackingNumber: "000000000000",
      fetch: fetcher,
    });
    expect(result.trackingNumber).toBe("000000000000");
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it.each([
    "kr.daesin",
    "kr.kdexp",
    "kr.chunilps",
    "kr.kunyoung",
    "kr.ilyanglogis",
  ] as CarrierId[])(
    "rejects JavaScript numeric input before %s network access",
    async (carrier) => {
      const fetcher = vi.fn();
      await expect(
        track({
          carrier,
          trackingNumber: 1234567890 as unknown as string,
          fetch: fetcher,
        }),
      ).rejects.toBeInstanceOf(InvalidTrackingNumberError);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
});
