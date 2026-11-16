// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import { load } from "cheerio";
import { ParseError, TrackingNotFoundError } from "../../core/errors.js";
import { parseKoreanDateTime, sortEvents } from "../../core/time.js";
import type {
  ParsedTrackingResult,
  TrackingEvent,
  TrackingStatus,
} from "../../core/types.js";

const carrierId = "kr.hanjin" as const;

// The tracker spaces the same sentence differently from row to row, so
// wording is compared without whitespace or a closing full stop.
const key = (wording: string): string =>
  wording.normalize("NFC").replace(/\s+/g, "").replace(/\.+$/, "");

const notFoundNotice = key(
  "운송장이 등록되지 않았거나 보내는 분(업체)이 상품을 준비 중 입니다.",
);
// The notice page's only script: an alert, then a post back to the search form.
const noticeScript =
  /function\s+submitEvent\s*\(\s*\)\s*\{\s*alert\(\s*"([^"]{1,200})"\s*\)/;
// Scans made abroad use the foreign carrier's local clock.
const foreignLeg =
  /(?:항공편|선편)으로출발대기중입니다$|^수입통관|^하선신고|^통관목록|^목록통관/;

// Scans are sentences without a code; most name a terminal mid-sentence.
const scans: readonly (readonly [RegExp, TrackingStatus])[] = [
  [/^운송장정보가등록되었습니다$/, "INFO_RECEIVED"],
  [/^고객님상품을접수하였습니다$/, "PICKED_UP"],
  [/^고객님상품을집하하여.+에입고되었습니다$/, "IN_TRANSIT"],
  [/^상품이물류센터에입고되었습니다$/, "IN_TRANSIT"],
  [/^.+에서.+로이동중입니다$/, "IN_TRANSIT"],
  [/^.+에도착하였습니다$/, "IN_TRANSIT"],
  [/^배송지점에도착하여배송을준비중입니다$/, "AT_LOCAL_FACILITY"],
  [/^배송원이배송준비중입니다$/, "AT_LOCAL_FACILITY"],
  [/^배송출발하였습니다$/, "OUT_FOR_DELIVERY"],
  [/^배송완료(?:되었|하였)습니다$/, "DELIVERED"],
];

function status(wording: string): TrackingStatus {
  return scans.find(([pattern]) => pattern.test(wording))?.[1] ?? "UNKNOWN";
}

function description(value: TrackingStatus): string {
  switch (value) {
    case "INFO_RECEIVED":
      return "운송장 등록";
    case "PICKED_UP":
      return "상품 인수";
    case "IN_TRANSIT":
      return "배송 이동 중";
    case "AT_LOCAL_FACILITY":
      return "배송지 도착";
    case "OUT_FOR_DELIVERY":
      return "배송 출발";
    case "DELIVERED":
      return "배송완료";
    default:
      return "배송 상태 확인";
  }
}

export function parseHanjin(
  input: string,
): Pick<ParsedTrackingResult, "events" | "status"> {
  const $ = load(input);
  const notFound = () =>
    new TrackingNotFoundError("No tracking history was found.", carrierId);
  if (!$(".songjang-num .num").length) {
    const notice = noticeScript.exec(input)?.[1];
    if (notice !== undefined && key(notice) === notFoundNotice)
      throw notFound();
    throw new ParseError("Tracking page shape is unrecognized.", carrierId);
  }
  // Older result pages show the same notice in place of the scan table.
  const noticed = key($(".delivery-time .comm-sec").text()) === notFoundNotice;
  const table = $(".waybill-tbl table");
  if (table.length !== 1) {
    if (!table.length && noticed) throw notFound();
    throw new ParseError("Tracking event table is missing.", carrierId);
  }
  const events: TrackingEvent[] = [];
  for (const row of table.children("tbody").children("tr").toArray()) {
    const cells = $(row).children("td");
    // The page leaves empty rows between scans.
    if (!cells.length || !cells.text().trim()) continue;
    const date = cells.eq(0).text().replace(/\s+/g, "");
    const clock = cells.eq(1).text().replace(/\s+/g, "");
    const wording = cells.eq(3).children("span.stateDesc");
    if (cells.length !== 4 || wording.length !== 1)
      throw new ParseError("Tracking event shape is unrecognized.", carrierId);
    const sentence = key(wording.text());
    // An asterisk marks a foreign local clock, which has no known offset.
    if (date.endsWith("*") || clock.endsWith("*") || foreignLeg.test(sentence))
      throw new ParseError(
        "International histories with foreign local clocks are not supported.",
        carrierId,
      );
    const normalized = status(sentence);
    events.push({
      status: normalized,
      description: description(normalized),
      time: parseKoreanDateTime(`${date} ${clock}`, carrierId),
    });
  }
  if (!events.length) {
    if (noticed) throw notFound();
    throw new ParseError("Tracking event list is empty.", carrierId);
  }
  sortEvents(events);
  const latest = events.at(-1);
  if (!latest) throw new ParseError("Tracking event list is empty.", carrierId);
  return { events, status: latest.status };
}
