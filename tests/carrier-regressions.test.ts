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
  it.each(["error", "maintenance", ""])(
    "does not turn Hapdong result %s into not-found",
    (result) => {
      expect(() =>
        parseTracking({
          carrier: "kr.hdexp",
          payload: JSON.stringify({ result }),
        }),
      ).toThrow(ParseError);
    },
  );
  it("keeps unrecognized Hapdong scan labels as UNKNOWN", () => {
    const result = parseTracking({
      carrier: "kr.hdexp",
      payload: JSON.stringify({
        result: "suc",
        data: {
          scanList: [
            { scanDt: "2026-01-02 00:00:00", scanTypeNm: "SYNTHETIC_LABEL" },
          ],
        },
      }),
    });
    expect(result.status).toBe("UNKNOWN");
    expect(result.events[0]?.description).toBe("배송 상태 확인");
  });
  it.each([
    { MSG_ID: "9999", ODS0_TOTAL: 0, ODS0: [] },
    { MSG_ID: "0000", ODS0_TOTAL: 1, ODS0: [] },
    { MSG_ID: "0000", ODS0: [] },
  ])("does not turn Woori envelope %j into not-found", (envelope) => {
    expect(() =>
      parseTracking({
        carrier: "kr.honamlogis",
        payload: JSON.stringify(envelope),
      }),
    ).toThrow(ParseError);
  });
  it("does not turn a GS Postbox upstream failure into not-found", () => {
    expect(() =>
      parseTracking({
        carrier: "kr.cvsnet",
        payload: 'var trackingInfo = {"code":500,"msg":"SYNTHETIC"};',
      }),
    ).toThrow(ParseError);
  });
  it("reports GS Postbox events without a known code as UNKNOWN", () => {
    const result = parseTracking({
      carrier: "kr.cvsnet",
      payload:
        'var trackingInfo = {"code":200,"trackingDetails":[{"transTime":"2026-01-02T00:00:00","transCode":"SYNTHETIC_CODE"}]};',
    });
    expect(result.status).toBe("UNKNOWN");
  });
  it.each([
    { data: { svcOutList: [] }, resultCode: 500 },
    { data: null, resultCode: 200 },
    { resultCode: 200 },
  ])("does not turn CJ Logistics envelope %j into not-found", (envelope) => {
    expect(() =>
      parseTracking({
        carrier: "kr.cjlogistics",
        payload: JSON.stringify(envelope),
      }),
    ).toThrow(ParseError);
  });
  it("keeps a CJ Logistics delivery when a departure scan follows it", () => {
    const scan = (workHms: string, crgStDcd: string) => ({
      workDt: "2026-01-02",
      workHms,
      crgStDcd,
    });
    const parse = (codes: string[]) =>
      parseTracking({
        carrier: "kr.cjlogistics",
        payload: JSON.stringify({
          data: {
            svcOutList: codes.map((code, index) =>
              scan(`0${index}:00:00`, code),
            ),
          },
          resultCode: 200,
        }),
      }).status;
    expect(parse(["11", "91", "82"])).toBe("DELIVERED");
    expect(parse(["11", "91", "84"])).toBe("EXCEPTION");
    expect(parse(["11", "SYNTHETIC"])).toBe("UNKNOWN");
  });
  describe("Hanjin page variants", () => {
    const page = (rows: string) =>
      `<div class="songjang-num"><span class="num">000000000000</span></div><div class="waybill-tbl"><table><tbody>${rows}</tbody></table></div>`;
    const row = (date: string, clock: string, wording: string) =>
      `<tr><td>${date}</td><td>${clock}</td><td>SYNTHETIC</td><td><span class="stateDesc">${wording}</span></td></tr>`;
    const parse = (payload: string) =>
      parseTracking({ carrier: "kr.hanjin", payload });
    it("does not turn another notice into not-found", () => {
      expect(() =>
        parse('<script>function submitEvent(){ alert("SYNTHETIC"); }</script>'),
      ).toThrow(ParseError);
    });
    it("keeps unrecognized wording as UNKNOWN", () => {
      const result = parse(
        page(row("2026-01-02", "00:00", "SYNTHETIC 문구입니다.")),
      );
      expect(result.status).toBe("UNKNOWN");
    });
    it("matches wording regardless of spacing", () => {
      const result = parse(
        page(
          row("2026-01-02", "00:00", "<strong>배송출발</strong> 하였습니다."),
        ),
      );
      expect(result.status).toBe("OUT_FOR_DELIVERY");
    });
    it.each([
      row("2026-01-02*", "00:00*", "배송출발하였습니다."),
      row("2026-01-02", "00:00", "항공편으로 출발 대기중입니다."),
      row("2026-01-02", "00:00", "수입통관장에 반입되었습니다."),
    ])("rejects foreign-clock history %#", (rows) => {
      expect(() => parse(page(rows))).toThrow(ParseError);
    });
  });
  describe("Logen page variants", () => {
    const cells = (clock: string, label: string) =>
      `<tr><td>${clock}</td><td>SYNTHETIC</td><td>${label}</td><td></td><td></td><td></td><td></td><td></td></tr>`;
    const page = (rows: string) =>
      `<table class="pdInfo"><tbody><tr><td class="tit">송장번호</td><td>00000000000</td></tr></tbody></table><table class="tkInfo"><tbody>${rows}</tbody></table>`;
    const parse = (payload: string) =>
      parseTracking({ carrier: "kr.logen", payload });
    it("does not turn another empty answer into not-found", () => {
      expect(() =>
        parse(
          '<table class="pdInfo"><tbody><tr class="empty"><td>SYNTHETIC</td></tr></tbody></table>',
        ),
      ).toThrow(ParseError);
    });
    it("keeps unrecognized labels as UNKNOWN", () => {
      expect(parse(page(cells("2026.01.02 00:00", "SYNTHETIC"))).status).toBe(
        "UNKNOWN",
      );
    });
    it("ignores the photo link inside a delivery label", () => {
      expect(
        parse(
          page(cells("2026.01.02 00:00", '배송완료 <a href="#">사진확인</a>')),
        ).status,
      ).toBe("DELIVERED");
    });
    it.each(["2026-01-02 00:00", "2026.01.02", ""])(
      "rejects the clock %j",
      (clock) => {
        expect(() => parse(page(cells(clock, "배송완료")))).toThrow(ParseError);
      },
    );
    it("rejects a scan with missing cells", () => {
      expect(() =>
        parse(page("<tr><td>2026.01.02 00:00</td><td>배송완료</td></tr>")),
      ).toThrow(ParseError);
    });
  });
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
    "kr.hdexp",
    "kr.chunilps",
    "kr.kunyoung",
    "kr.ilyanglogis",
    "kr.honamlogis",
    "kr.cvsnet",
    "kr.cjlogistics",
    "kr.hanjin",
    "kr.logen",
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
