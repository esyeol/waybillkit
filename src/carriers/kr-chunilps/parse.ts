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

const carrierId = "kr.chunilps" as const;
const compact = (value: string) => value.replace(/\s+/g, "").trim();

function status(text: string): TrackingStatus {
  switch (compact(text)) {
    case "접수":
      return "INFO_RECEIVED";
    case "발송":
      return "PICKED_UP";
    case "배송출발":
      return "OUT_FOR_DELIVERY";
    case "배송완료":
      return "DELIVERED";
    case "간선상차":
    case "간선하차":
    case "중계도착":
    case "중계발송":
    case "발송터미널하차":
    case "발송터미널출발":
    case "도착터미널하차":
    case "영업소도착":
    case "도착":
      return "IN_TRANSIT";
    default:
      return "UNKNOWN";
  }
}

function description(value: TrackingStatus): string {
  switch (value) {
    case "INFO_RECEIVED":
      return "운송장 접수";
    case "PICKED_UP":
      return "상품 발송";
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

export function parseChunilps(
  html: string,
): Pick<ParsedTrackingResult, "events" | "status"> {
  const $ = load(html);
  const tables = $('table[cellspacing="1"]');
  if (!tables.length) {
    // The upstream HTML places a form inside a table incorrectly, so an HTML5
    // parser may foster-parent this input outside its source form.
    if ($('input#transNo[name="transNo"]').length === 1)
      throw new TrackingNotFoundError(
        "No tracking history was found.",
        carrierId,
      );
    throw new ParseError(
      "Tracking response structure is unrecognized.",
      carrierId,
    );
  }
  if (tables.length < 5)
    throw new ParseError("Tracking table set is incomplete.", carrierId);
  const rows = tables.eq(4).find("tr").toArray().slice(1);
  const events: TrackingEvent[] = rows.map((row) => {
    const cells = $(row).children("td");
    if (cells.length !== 4)
      throw new ParseError("Tracking row shape is unrecognized.", carrierId);
    const normalized = status(cells.eq(3).text());
    return {
      status: normalized,
      description: description(normalized),
      time: parseKoreanDateTime(cells.eq(0).text(), carrierId),
    };
  });
  if (!events.length)
    throw new ParseError("Tracking table contains no events.", carrierId);
  sortEvents(events);
  const latest = events.at(-1);
  if (!latest)
    throw new ParseError("Tracking table contains no events.", carrierId);
  return { events, status: latest.status };
}
