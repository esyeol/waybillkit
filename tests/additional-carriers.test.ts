import { readFileSync } from "node:fs";
import iconv from "iconv-lite";
import { describe, expect, it, vi } from "vitest";
import {
  type CarrierId,
  CarrierTimeoutError,
  InvalidTrackingNumberError,
  ParseError,
  parseTracking,
  TrackingNotFoundError,
  track,
  trackWithRaw,
} from "../src/index.js";

const fixtures = {
  "kr.kdexp": {
    directory: "kr-kdexp",
    delivered: "delivered.json",
    notFound: "not-found.json",
    source: "JSON",
    encoding: "utf-8",
    trackingNumber: "00000000",
    contentType: "text/json;charset=UTF-8",
  },
  "kr.chunilps": {
    directory: "kr-chunilps",
    delivered: "delivered.html",
    notFound: "not-found.html",
    source: "HTML",
    encoding: "utf-8",
    trackingNumber: "0000000000000000",
    contentType: "text/html; charset=utf-8",
  },
  "kr.kunyoung": {
    directory: "kr-kunyoung",
    delivered: "delivered.html",
    notFound: "not-found.html",
    source: "HTML",
    encoding: "euc-kr",
    trackingNumber: "0000000000",
    contentType: "text/html",
  },
  "kr.ilyanglogis": {
    directory: "kr-ilyanglogis",
    delivered: "delivered.json",
    notFound: "not-found.json",
    source: "JSON",
    encoding: "utf-8",
    trackingNumber: "0000000000",
    contentType: "Application/json;charset=UTF-8",
  },
} as const;

type AdditionalCarrier = keyof typeof fixtures;
const read = (carrier: AdditionalCarrier, file: string) =>
  readFileSync(
    new URL(
      `./fixtures/${fixtures[carrier].directory}/${file}`,
      import.meta.url,
    ),
    "utf8",
  );
const delivered = (carrier: AdditionalCarrier) =>
  read(carrier, fixtures[carrier].delivered);
const notFound = (carrier: AdditionalCarrier) =>
  read(carrier, fixtures[carrier].notFound);
const response = (carrier: AdditionalCarrier) => {
  const fixture = fixtures[carrier];
  const text = delivered(carrier);
  const bytes =
    fixture.encoding === "euc-kr"
      ? iconv.encode(text, "euc-kr")
      : new TextEncoder().encode(text);
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": fixture.contentType },
  });
};
const stub = (
  fn: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>,
) => vi.fn(fn);

describe("additional carrier parsing", () => {
  it.each(Object.keys(fixtures) as AdditionalCarrier[])(
    "parses the synthetic %s delivered contract",
    (carrier) => {
      const result = parseTracking({ carrier, payload: delivered(carrier) });
      expect(result.carrier.id).toBe(carrier);
      expect(result.status).toBe("DELIVERED");
      expect(result.meta).toEqual({
        source: fixtures[carrier].source,
        locale: "ko-KR",
      });
      expect(result.events.length).toBeGreaterThan(1);
      expect(result.events.at(-1)?.time).toBe("2026-01-02T04:00:00+09:00");
      expect(JSON.stringify(result)).not.toMatch(
        /SYNTHETIC_|전화번호|station|strtPoint/,
      );
    },
  );

  it.each(Object.keys(fixtures) as AdditionalCarrier[])(
    "recognizes the %s not-found contract",
    (carrier) => {
      expect(() =>
        parseTracking({ carrier, payload: notFound(carrier) }),
      ).toThrow(TrackingNotFoundError);
      try {
        parseTracking({ carrier, payload: notFound(carrier) });
      } catch (error) {
        expect(error).toMatchObject({ carrierId: carrier });
      }
    },
  );

  it("decodes Kunyoung EUC-KR bytes", () => {
    const html = delivered("kr.kunyoung");
    expect(
      parseTracking({
        carrier: "kr.kunyoung",
        payload: iconv.encode(html, "euc-kr"),
      }),
    ).toEqual(parseTracking({ carrier: "kr.kunyoung", payload: html }));
  });

  it.each(Object.keys(fixtures) as AdditionalCarrier[])(
    "rejects malformed %s data",
    (carrier) => {
      expect(() => parseTracking({ carrier, payload: "{}" })).toThrow(
        ParseError,
      );
    },
  );
});

describe("additional carrier transport", () => {
  it.each(Object.keys(fixtures) as AdditionalCarrier[])(
    "queries and parses %s",
    async (carrier) => {
      const fetcher = stub(async () => response(carrier));
      const fixture = fixtures[carrier];
      const { result, raw } = await trackWithRaw({
        carrier,
        trackingNumber: fixture.trackingNumber,
        fetch: fetcher,
      });
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(result.status).toBe("DELIVERED");
      expect(result.carrier.id).toBe(carrier);
      expect(result.trackingNumber).toBe(fixture.trackingNumber);
      expect(raw.encoding).toBe(fixture.encoding);
      expect(raw.contentType).toBe(fixture.contentType);
      expect(parseTracking({ carrier, payload: raw.body })).toEqual({
        carrier: result.carrier,
        status: result.status,
        events: result.events,
        meta: { source: result.meta.source, locale: result.meta.locale },
      });
    },
  );

  it("uses the Kyungdong JSON endpoint and barcode parameter", async () => {
    const fetcher = stub(async () => response("kr.kdexp"));
    await track({
      carrier: "kr.kdexp",
      trackingNumber: "00000000",
      fetch: fetcher,
    });
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      "https://kdexp.com/service/delivery/new/ajax_basic.do?barcode=00000000",
    );
    expect(init?.method).toBeUndefined();
    expect(init?.redirect).toBe("error");
  });

  it("uses the Chunil HTML endpoint and transNo parameter", async () => {
    const fetcher = stub(async () => response("kr.chunilps"));
    await track({
      carrier: "kr.chunilps",
      trackingNumber: "0000000000000000",
      fetch: fetcher,
    });
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      "https://www.chunil.co.kr/HTrace/HTrace.jsp?transNo=0000000000000000",
    );
  });

  it("uses only the secure Kunyoung URL", async () => {
    const fetcher = stub(async () => response("kr.kunyoung"));
    await track({
      carrier: "kr.kunyoung",
      trackingNumber: "0000000000",
      fetch: fetcher,
    });
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      "https://www.kunyoung.com/goods/goods_02__.php?mulno=0000000000",
    );
  });

  it("uses Ilyang's current form-backed JSON endpoint", async () => {
    const fetcher = stub(async () => response("kr.ilyanglogis"));
    await track({
      carrier: "kr.ilyanglogis",
      trackingNumber: "0000000000",
      fetch: fetcher,
    });
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      "https://www.ilyanglogis.co.kr/tracking/trackingByDeliNo.do",
    );
    expect(init?.method).toBe("POST");
    expect(new URLSearchParams(String(init?.body))).toEqual(
      new URLSearchParams({ trackingType: "0", blNum: "0000000000" }),
    );
  });

  it.each([
    ["kr.kdexp", "short"],
    ["kr.chunilps", "not-a-number"],
    ["kr.kunyoung", "123"],
    ["kr.ilyanglogis", "123"],
  ] as const)(
    "validates %s waybills before requesting",
    async (carrier, value) => {
      const fetcher = stub(async () => response(carrier));
      await expect(
        track({ carrier, trackingNumber: value, fetch: fetcher }),
      ).rejects.toBeInstanceOf(InvalidTrackingNumberError);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it("bounds an additional-carrier custom fetch", async () => {
    await expect(
      track({
        carrier: "kr.kdexp",
        trackingNumber: "00000000",
        timeoutMs: 10,
        fetch: () => new Promise(() => {}),
      }),
    ).rejects.toBeInstanceOf(CarrierTimeoutError);
  });

  it("rejects a carrier/content-type mismatch", async () => {
    await expect(
      track({
        carrier: "kr.kdexp",
        trackingNumber: "00000000",
        fetch: async () => new Response("<html></html>"),
      }),
    ).rejects.toBeInstanceOf(ParseError);
  });
});

describe("carrier id surface", () => {
  it("still rejects carrier ids outside the public union at runtime", () => {
    expect(() =>
      parseTracking({
        carrier: "kr.unsupported" as CarrierId,
        payload: "{}",
      }),
    ).toThrow(RangeError);
  });

  it("rejects unsupported carrier ids in the network API", async () => {
    await expect(
      track({
        carrier: "kr.unsupported" as CarrierId,
        trackingNumber: "0000000000",
        fetch: async () => new Response("{}"),
      }),
    ).rejects.toBeInstanceOf(RangeError);
  });
});
