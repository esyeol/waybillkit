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

const carrierId = "kr.logen" as const;
const notFoundNotice = "배송자료를 조회할 수 없습니다";

// Labels of the tracker's 배송상태 column.
function status(label: string): TrackingStatus {
  switch (label) {
    case "거래처출고":
    case "집하입고":
    case "집하완료":
      return "PICKED_UP";
    case "집하출고":
    case "터미널입고":
    case "행낭적입":
    case "터미널출고":
    case "행낭해체":
      return "IN_TRANSIT";
    case "배송입고":
      return "AT_LOCAL_FACILITY";
    case "배송출고":
      return "OUT_FOR_DELIVERY";
    case "배송완료":
      return "DELIVERED";
    default:
      return "UNKNOWN";
  }
}

function description(value: TrackingStatus): string {
  switch (value) {
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

export function parseLogen(
  input: string,
): Pick<ParsedTrackingResult, "events" | "status"> {
  const $ = load(input);
  const details = $("table.pdInfo");
  if (details.length !== 1)
    throw new ParseError("Tracking page shape is unrecognized.", carrierId);
  const history = $("table.tkInfo");
  const empty = details.find("tr.empty");
  if (empty.length) {
    if (history.length || !empty.text().includes(notFoundNotice))
      throw new ParseError("Unexpected empty tracking answer.", carrierId);
    throw new TrackingNotFoundError(
      "No tracking history was found.",
      carrierId,
    );
  }
  if (history.length !== 1)
    throw new ParseError("Tracking event table is missing.", carrierId);
  const events: TrackingEvent[] = history
    .children("tbody")
    .children("tr")
    .not(".empty")
    .toArray()
    .map((row) => {
      const cells = $(row).children("td");
      // Date, site, status, details, staff, receiver, office and phone.
      if (cells.length !== 8)
        throw new ParseError(
          "Tracking event shape is unrecognized.",
          carrierId,
        );
      const clock =
        /^(\d{4})\.(\d{2})\.(\d{2}) (\d{2}:\d{2})$/.exec(
          cells.eq(0).text().trim(),
        ) ?? [];
      // A delivery with a photo adds a link inside the label cell.
      const label = cells.eq(2).clone().children().remove().end().text();
      const normalized = status(label.trim());
      return {
        status: normalized,
        description: description(normalized),
        time: parseKoreanDateTime(
          `${clock[1]}-${clock[2]}-${clock[3]} ${clock[4]}`,
          carrierId,
        ),
      };
    });
  if (!events.length)
    throw new ParseError("Tracking event list is empty.", carrierId);
  sortEvents(events);
  const latest = events.at(-1);
  if (!latest) throw new ParseError("Tracking event list is empty.", carrierId);
  return { events, status: latest.status };
}
