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

const carrierId = "kr.epost" as const;
const historyHeader = "날짜|시간|발생국|처리현황";
const notFoundNotice =
  "현재 고객님이 신청하신 접수번호에 대하여 배달정보를 찾지 못했습니다.";
const clean = (text: string): string => text.replace(/\s+/g, " ").trim();

// Labels of the 처리현황 column (span.evtnm).
function status(label: string): TrackingStatus {
  switch (label) {
    case "운송장출력":
      return "INFO_RECEIVED";
    case "집하완료":
    case "인수완료":
    case "접수":
      return "PICKED_UP";
    case "발송":
    case "도착":
      return "IN_TRANSIT";
    case "배달준비":
      return "OUT_FOR_DELIVERY";
    case "배달완료":
      return "DELIVERED";
    default:
      return "UNKNOWN";
  }
}

function description(value: TrackingStatus): string {
  switch (value) {
    case "INFO_RECEIVED":
      return "운송장 등록";
    case "PICKED_UP":
      return "상품 인수";
    case "IN_TRANSIT":
      return "배송 이동 중";
    case "OUT_FOR_DELIVERY":
      return "배송 출발";
    case "DELIVERED":
      return "배송완료";
    default:
      return "배송 상태 확인";
  }
}

export function parseEpost(
  input: string,
): Pick<ParsedTrackingResult, "events" | "status"> {
  const $ = load(input);
  // The page's own scripts mention table markup; only real elements count.
  $("script, style, noscript").remove();
  const history = $("table").filter(
    (_, element) =>
      $(element)
        .children("thead")
        .find("th")
        .map((__, cell) => clean($(cell).text()))
        .get()
        .join("|") === historyHeader,
  );
  if (history.length !== 1)
    throw new ParseError("Tracking page shape is unrecognized.", carrierId);
  const rows = history.children("tbody").children("tr").toArray();
  if (!rows.length) {
    const noticed = $("td[colspan]")
      .toArray()
      .some((cell) => clean($(cell).text()).startsWith(notFoundNotice));
    if (noticed)
      throw new TrackingNotFoundError(
        "No tracking history was found.",
        carrierId,
      );
    throw new ParseError("Tracking event list is empty.", carrierId);
  }
  const events: TrackingEvent[] = rows.map((row) => {
    const cells = $(row).children("td");
    const date = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(clean(cells.eq(0).text()));
    // The status cell goes on with courier or receiver details after the label.
    const label = cells.eq(3).children("span.evtnm");
    if (cells.length !== 4 || !date || label.length !== 1)
      throw new ParseError("Tracking event shape is unrecognized.", carrierId);
    const normalized = status(clean(label.text()));
    return {
      status: normalized,
      description: description(normalized),
      time: parseKoreanDateTime(
        `${date[1]}-${date[2]}-${date[3]} ${clean(cells.eq(1).text())}`,
        carrierId,
      ),
    };
  });
  sortEvents(events);
  const latest = events.at(-1);
  if (!latest) throw new ParseError("Tracking event list is empty.", carrierId);
  return { events, status: latest.status };
}
