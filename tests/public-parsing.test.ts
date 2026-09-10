import { readFileSync } from "node:fs";
import iconv from "iconv-lite";
import { describe, expect, it, vi } from "vitest";
import {
  ParseError,
  type ParseTrackingOptions,
  parseTracking,
  TrackingNotFoundError,
  track,
  trackWithRaw,
} from "../src/index.js";

const html = readFileSync(
  new URL("./fixtures/kr-daesin/delivered.html", import.meta.url),
  "utf8",
);
const missing = readFileSync(
  new URL("./fixtures/kr-daesin/not-found.html", import.meta.url),
  "utf8",
);
const carrier = "kr.daesin" as const;
const trackingNumber = "0000000000000";
const response = () =>
  new Response(new Uint8Array(iconv.encode(html, "euc-kr")), {
    // Deliberately wrong declaration: raw metadata preserves it, decoding is explicit.
    headers: {
      "Content-Type": "text/html; charset=ISO-8859-1",
      "Set-Cookie": "PRIVATE_COOKIE",
    },
  });

describe("standalone parsing", () => {
  it("parses without network access, fetch time or an invented waybill", () => {
    const network = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Unexpected network"));
    try {
      const parsed = parseTracking({ carrier, payload: html });
      expect(parsed.status).toBe("DELIVERED");
      expect(parsed.events).toHaveLength(6);
      expect(parsed.carrier.id).toBe(carrier);
      expect(parsed.meta).toEqual({ source: "HTML", locale: "ko-KR" });
      expect(parsed).not.toHaveProperty("trackingNumber");
      expect(parsed).not.toHaveProperty("raw");
      expect(network).not.toHaveBeenCalled();
      expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
    } finally {
      network.mockRestore();
    }
  });
  it("accepts EUC-KR bytes including sliced buffers", () => {
    const encoded = iconv.encode(html, "euc-kr");
    const padded = Buffer.concat([
      Buffer.from("prefix"),
      encoded,
      Buffer.from("suffix"),
    ]);
    expect(parseTracking({ carrier, payload: padded.subarray(6, -6) })).toEqual(
      parseTracking({ carrier, payload: html }),
    );
  });
  it("accepts UTF-8 saved files when explicitly requested", () => {
    expect(
      parseTracking({
        carrier,
        payload: new TextEncoder().encode(html),
        encoding: "utf-8",
      }),
    ).toEqual(parseTracking({ carrier, payload: html }));
  });
  it("does not decode a JavaScript string a second time", () => {
    expect(
      parseTracking({ carrier, payload: html, encoding: "euc-kr" }),
    ).toEqual(parseTracking({ carrier, payload: html, encoding: "utf-8" }));
  });
  it("distinguishes not-found from bad input", () => {
    expect(() => parseTracking({ carrier, payload: missing })).toThrow(
      TrackingNotFoundError,
    );
    for (const payload of ["", "{}", "<tracking/>"])
      expect(() => parseTracking({ carrier, payload })).toThrow(ParseError);
    expect(() =>
      parseTracking({ carrier, payload: {} } as ParseTrackingOptions),
    ).toThrow(ParseError);
  });
  it("rejects unsupported carriers and encodings", () => {
    expect(() =>
      parseTracking({
        carrier: "unsupported" as typeof carrier,
        payload: html,
      }),
    ).toThrow(RangeError);
    expect(() =>
      parseTracking({
        carrier,
        payload: html,
        encoding: "unknown",
      } as unknown as ParseTrackingOptions),
    ).toThrow(RangeError);
  });
  it("does not share mutable results across calls", () => {
    const first = parseTracking({ carrier, payload: html });
    first.events.length = 0;
    expect(parseTracking({ carrier, payload: html }).events).toHaveLength(6);
  });
});

describe("explicit raw response", () => {
  it("returns decoded source from the same single request and supports re-parsing", async () => {
    const fetcher = vi.fn(async () => response());
    const { result, raw } = await trackWithRaw({
      carrier,
      trackingNumber,
      fetch: fetcher,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(raw).toEqual({
      body: html,
      contentType: "text/html; charset=ISO-8859-1",
      encoding: "euc-kr",
    });
    expect(raw.body).toContain("PRIVATE_SENDER");
    expect(raw).not.toHaveProperty("headers");
    expect(JSON.stringify(raw)).not.toContain("PRIVATE_COOKIE");
    const parsed = parseTracking({ carrier, payload: raw.body });
    expect(result).toEqual({
      ...parsed,
      trackingNumber,
      meta: { ...parsed.meta, fetchedAt: expect.any(String) },
    });
    expect(JSON.stringify(result)).not.toContain("PRIVATE_SENDER");
  });
  it("preserves the original track result shape with no raw data", async () => {
    const result = await track({
      carrier,
      trackingNumber,
      fetch: async () => response(),
    });
    expect(Object.keys(result).sort()).toEqual(
      ["carrier", "events", "meta", "status", "trackingNumber"].sort(),
    );
    expect(JSON.stringify(result)).not.toContain("PRIVATE_SENDER");
  });
  it("does not attach raw HTML to parsing errors", async () => {
    try {
      await trackWithRaw({
        carrier,
        trackingNumber,
        fetch: async () =>
          new Response("PRIVATE_SOURCE", {
            headers: { "Content-Type": "text/html" },
          }),
      });
      expect.fail("Expected ParseError");
    } catch (error) {
      expect(error).toBeInstanceOf(ParseError);
      expect(error).not.toHaveProperty("raw");
      expect(String(error)).not.toContain("PRIVATE_SOURCE");
    }
  });
});
