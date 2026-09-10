import { readFileSync } from "node:fs";
import { load } from "cheerio";
import iconv from "iconv-lite";
import { describe, expect, it, vi } from "vitest";
import { redactDaesin } from "../scripts/redact-daesin.mjs";
import { parseDaesin } from "../src/carriers/kr-daesin/parse.js";
import {
  CarrierAuthError,
  CarrierRateLimitedError,
  CarrierTimeoutError,
  CarrierUnavailableError,
  InvalidTrackingNumberError,
  ParseError,
  TrackingNotFoundError,
  track,
} from "../src/index.js";

const delivered = readFileSync(
  new URL("./fixtures/kr-daesin/delivered.html", import.meta.url),
  "utf8",
);
const notFound = readFileSync(
  new URL("./fixtures/kr-daesin/not-found.html", import.meta.url),
  "utf8",
);
const waybill = "0000000000000";
const options = { carrier: "kr.daesin" as const, trackingNumber: waybill };
function response(html = delivered) {
  return new Response(new Uint8Array(iconv.encode(html, "euc-kr")), {
    headers: { "content-type": "text/html; charset=euc-kr" },
  });
}
const stub = (
  fn: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>,
) => vi.fn(fn);
function altered(edit: (dom: ReturnType<typeof load>) => void) {
  const $ = load(delivered);
  edit($);
  return $.html();
}
describe("Daesin parsing", () => {
  it("normalizes the actual delivered structure without personal fields", () => {
    const result = parseDaesin(delivered);
    expect(result.status).toBe("DELIVERED");
    expect(result.events.map((e) => e.status)).toEqual([
      "PICKED_UP",
      "IN_TRANSIT",
      "IN_TRANSIT",
      "IN_TRANSIT",
      "AT_LOCAL_FACILITY",
      "DELIVERED",
    ]);
    expect(result.events.map((e) => e.time)).toEqual(
      [0, 1, 2, 2, 3, 4].map((i) => `2026-01-02T00:0${i}:00+09:00`),
    );
    expect(JSON.stringify(result)).not.toMatch(
      /PRIVATE_|SYNTHETIC_|전화|받으실|보내신/,
    );
  });
  it("sorts table rows chronologically", () => {
    const html = altered(($) => {
      const table = $("#printarea table").last();
      const rows = table.find("tr").slice(1).toArray();
      for (const row of rows.reverse()) table.append(row);
    });
    expect(parseDaesin(html)).toEqual(parseDaesin(delivered));
  });
  it("handles a synthetic in-transit response with future times missing", () => {
    const html = altered(($) => {
      const rows = $("#printarea table").last().find("tr");
      rows.last().remove();
      rows.eq(2).find("td").eq(4).text("");
    });
    expect(parseDaesin(html).status).toBe("IN_TRANSIT");
    expect(parseDaesin(html).events).toHaveLength(3);
  });
  it("recognizes observed not-found text only in its expected container", () => {
    expect(() => parseDaesin(notFound)).toThrow(TrackingNotFoundError);
    expect(() => parseDaesin("<p>운송된 내역이 없습니다.</p>")).toThrow(
      ParseError,
    );
  });
  it.each([
    "<h3>Data Access Failure</h3>",
    '<div id="printarea">Maintenance</div>',
    delivered.replace("도착(접수)일시", "NEW HEADER"),
  ])("rejects errors or changed structure", (html) => {
    expect(() => parseDaesin(html)).toThrow(ParseError);
  });
  it("rejects impossible calendar dates", () => {
    expect(() =>
      parseDaesin(delivered.replace("2026-01-02 00:00", "2026-02-30 00:00")),
    ).toThrow(ParseError);
  });
  it("rejects missing delivery time even if the marker says delivered", () => {
    expect(() =>
      parseDaesin(
        altered(($) => {
          $("#printarea table")
            .last()
            .find("tr")
            .last()
            .find("td")
            .eq(4)
            .text("");
        }),
      ),
    ).toThrow(ParseError);
  });
  it("does not infer delivery from destination departure alone", () => {
    expect(parseDaesin(delivered.replace("배송완료", "")).status).toBe(
      "UNKNOWN",
    );
  });
  it("keeps unfamiliar row roles unknown rather than inventing a status", () => {
    const html = delivered.replace("발송취급점", "NEW_ROLE");
    expect(parseDaesin(html).events[0]?.status).toBe("UNKNOWN");
  });
});
describe("Tracking transport", () => {
  it("sends the form protocol, decodes EUC-KR and assembles metadata", async () => {
    const fetcher = stub(async () => response());
    const result = await track({ ...options, fetch: fetcher });
    expect(result.carrier.id).toBe("kr.daesin");
    expect(result.trackingNumber).toBe(waybill);
    expect(result.status).toBe("DELIVERED");
    expect(result.meta.locale).toBe("ko-KR");
    expect(Number.isFinite(Date.parse(result.meta.fetchedAt))).toBe(true);
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://www.ds3211.co.kr/freight/internalFreightSearch.ht",
    );
    expect(init?.method).toBe("POST");
    expect(new URLSearchParams(String(init?.body)).get("billno")).toBe(waybill);
    expect(new Headers(init?.headers).get("referer")).toBe(
      "https://www.ds3211.co.kr/freight/internalFreightForm.jsp",
    );
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(init?.redirect).toBe("error");
  });
  it("propagates recognized not-found results", async () => {
    await expect(
      track({ ...options, fetch: stub(async () => response(notFound)) }),
    ).rejects.toBeInstanceOf(TrackingNotFoundError);
  });
  it.each([
    [429, CarrierRateLimitedError],
    [403, CarrierAuthError],
    [401, CarrierAuthError],
    [503, CarrierUnavailableError],
    [404, CarrierUnavailableError],
  ])("classifies HTTP %s", async (status, ErrorType) => {
    await expect(
      track({
        ...options,
        fetch: stub(async () => new Response("", { status: status as number })),
      }),
    ).rejects.toBeInstanceOf(ErrorType);
  });
  it("removes arbitrary network error details", async () => {
    const result = track({
      ...options,
      fetch: stub(async () => {
        throw new Error(`PRIVATE_COOKIE ${waybill}`);
      }),
    });
    await expect(result).rejects.toBeInstanceOf(CarrierUnavailableError);
    await expect(result).rejects.not.toThrow(waybill);
    await expect(result).rejects.not.toHaveProperty("cause");
  });
  it("validates arguments before requesting", async () => {
    const fetcher = stub(async () => response());
    await expect(
      track({ ...options, trackingNumber: "invalid", fetch: fetcher }),
    ).rejects.toBeInstanceOf(InvalidTrackingNumberError);
    await expect(
      track({ ...options, timeoutMs: 0, fetch: fetcher }),
    ).rejects.toBeInstanceOf(RangeError);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects non-HTML responses", async () => {
    await expect(
      track({ ...options, fetch: stub(async () => Response.json({})) }),
    ).rejects.toBeInstanceOf(ParseError);
  });
  it("bounds a custom fetch that ignores cancellation", async () => {
    const fetcher = stub(() => new Promise(() => {}));
    await expect(
      track({ ...options, timeoutMs: 10, fetch: fetcher }),
    ).rejects.toBeInstanceOf(CarrierTimeoutError);
    expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });
  it("bounds body reading as part of the same timeout", async () => {
    const fetcher = stub(
      async () =>
        new Response(new ReadableStream({ start() {} }), {
          headers: { "content-type": "text/html" },
        }),
    );
    await expect(
      track({ ...options, timeoutMs: 10, fetch: fetcher }),
    ).rejects.toBeInstanceOf(CarrierTimeoutError);
  });
  it("handles pre-aborted signals without a request", async () => {
    const fetcher = stub(async () => response());
    await expect(
      track({
        ...options,
        signal: AbortSignal.abort("PRIVATE_REASON"),
        fetch: fetcher,
      }),
    ).rejects.toMatchObject({
      name: "AbortError",
      message: "Tracking request was cancelled.",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("handles cancellation during a request", async () => {
    const controller = new AbortController();
    const pending = track({
      ...options,
      signal: controller.signal,
      fetch: stub(() => new Promise(() => {})),
    });
    controller.abort("PRIVATE_REASON");
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});
describe("Fixture privacy", () => {
  it("rebuilds an allowlist without hidden data, links or scripts", () => {
    const dirty = `${delivered.replace(
      'id="printarea"',
      'id="printarea" data-secret="PRIVATE_ATTRIBUTE"',
    )}<script>PRIVATE_SCRIPT</script><input value="PRIVATE_INPUT">`;
    const clean = redactDaesin(dirty);
    expect(clean).not.toMatch(
      /PRIVATE_ATTRIBUTE|PRIVATE_SCRIPT|PRIVATE_INPUT|data-secret|<script|<input/,
    );
    expect(parseDaesin(clean)).toEqual(parseDaesin(delivered));
  });
  it("committed HTML contains no contact numbers, waybills, URLs or active content", () => {
    for (const fixture of [delivered, notFound])
      expect(fixture).not.toMatch(
        /\d{7,}|\d{2,3}-\d{3,4}-\d{4}|https?:|<script|<input|<!--/i,
      );
  });
});
