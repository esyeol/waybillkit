import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  CarrierUnavailableError,
  ParseError,
  parseTracking,
  TrackingNotFoundError,
  track,
} from "../src/index.js";

const carrier = "kr.kunyoung" as const;
const read = (file: string) =>
  readFileSync(
    new URL(`./fixtures/kr-kunyoung/${file}`, import.meta.url),
    "utf8",
  );
const parse = (value: unknown) =>
  parseTracking({ carrier, payload: JSON.stringify(value) });
const row = {
  writeDate: "2026-01-02 04:00:00",
  goodsTypeSP: "Y",
  goodsContent: "배송완료",
};
const envelope = (rows: unknown[]) => ({ success: true, msgCode: "0", rows });

describe("Kunyoung current JSON contract", () => {
  it("parses UTF-8 bytes, sorts events and retains only normalized fields", () => {
    const payload = read("delivered.json");
    const result = parseTracking({
      carrier,
      payload: new TextEncoder().encode(payload),
    });
    expect(result).toEqual(parseTracking({ carrier, payload }));
    expect(result.meta.source).toBe("JSON");
    expect(result.events.map((event) => event.status)).toEqual([
      "IN_TRANSIT",
      "DELIVERED",
    ]);
    expect(JSON.stringify(result)).not.toMatch(
      /SYNTHETIC|userName|phoneNumber|fileUrl|goodsTypeSP/,
    );
  });

  it.each(["text/html;charset=UTF-8", "application/json;charset=UTF-8"])(
    "recognizes the observed empty response with %s",
    async (contentType) => {
      const fetcher = vi.fn(
        async () =>
          new Response(read("not-found.json"), {
            headers: { "content-type": contentType },
          }),
      );
      await expect(
        track({ carrier, trackingNumber: "0000000000", fetch: fetcher }),
      ).rejects.toBeInstanceOf(TrackingNotFoundError);
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    null,
    [],
    {},
    { rows: [] },
    { success: false, msgCode: "0", rows: [] },
    { success: true, msgCode: "1", rows: [] },
    { success: true, msgCode: "0", rows: null },
    { success: true, msgCode: "0", rows: {} },
    envelope([null]),
    envelope([{}]),
    envelope([[]]),
    envelope([{ ...row, writeDate: "2026-02-30 04:00:00" }]),
    envelope([{ ...row, writeDate: null }]),
    envelope([{ ...row, goodsContent: "" }]),
    envelope([{ ...row, goodsContent: 1 }]),
    envelope([{ ...row, goodsTypeSP: null }]),
    envelope([{ ...row, goodsTypeSP: "N" }]),
  ])(
    "rejects malformed/unsuccessful responses, not as missing shipments: %j",
    (value) => {
      expect(() => parse(value)).toThrow(ParseError);
    },
  );

  it("does not leak upstream error text", () => {
    try {
      parse({
        success: false,
        msgCode: "1",
        msgDesc: "SYNTHETIC_PRIVATE",
        rows: [],
      });
      expect.fail("Expected ParseError");
    } catch (error) {
      expect(error).toBeInstanceOf(ParseError);
      expect(String(error)).not.toContain("SYNTHETIC_PRIVATE");
    }
  });

  it("does not infer delivered from the undocumented Y code", () => {
    expect(
      parse(envelope([{ ...row, goodsContent: "SYNTHETIC_UNKNOWN" }])).status,
    ).toBe("UNKNOWN");
  });

  it("uses deliveryContent only for N rows without exposing free text", () => {
    const result = parse(
      envelope([
        {
          ...row,
          goodsTypeSP: "N",
          deliveryContent: "배송",
          goodsContent: "완료",
        },
      ]),
    );
    expect(result.status).toBe("DELIVERED");
  });

  it("retains legacy HTML parsing and source metadata", () => {
    expect(
      parseTracking({ carrier, payload: read("delivered.html") }),
    ).toMatchObject({ status: "DELIVERED", meta: { source: "HTML" } });
    expect(() =>
      parseTracking({ carrier, payload: read("not-found.html") }),
    ).toThrow(TrackingNotFoundError);
  });

  it.each([
    ["text/html", "<html>maintenance</html>"],
    ["application/json", read("delivered.html")],
    ["application/json", "not JSON"],
    ["application/jsonp", read("delivered.json")],
  ])(
    "rejects unexpected live response format %s",
    async (contentType, body) => {
      await expect(
        track({
          carrier,
          trackingNumber: "0000000000",
          fetch: async () =>
            new Response(body, { headers: { "content-type": contentType } }),
        }),
      ).rejects.toBeInstanceOf(ParseError);
    },
  );

  it("does not retry or fall back to legacy HTTP after transport failure", async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError("SYNTHETIC_TLS_ERROR");
    });
    await expect(
      track({ carrier, trackingNumber: "0000000000", fetch: fetcher }),
    ).rejects.toBeInstanceOf(CarrierUnavailableError);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
