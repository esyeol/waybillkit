// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import { ParseError, TrackingNotFoundError } from "../../core/errors.js";
import { parseCompactKoreanDateTime, sortEvents } from "../../core/time.js";
import type {
  ParsedTrackingResult,
  TrackingEvent,
  TrackingStatus,
} from "../../core/types.js";

const carrierId = "kr.ilyanglogis" as const;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function status(text: string): TrackingStatus {
  switch (text.trim()) {
    case "발송사무소 인수":
      return "PICKED_UP";
    case "배송경유지 출고":
    case "배송경유지 도착":
      return "IN_TRANSIT";
    case "직원 배송중":
      return "OUT_FOR_DELIVERY";
    case "배달완료":
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
    case "OUT_FOR_DELIVERY":
      return "배송 출발";
    case "DELIVERED":
      return "배송완료";
    default:
      return "배송 상태 확인";
  }
}

export function parseIlyanglogis(
  input: string,
): Pick<ParsedTrackingResult, "events" | "status"> {
  let json: unknown;
  try {
    json = JSON.parse(input);
  } catch {
    throw new ParseError("Expected a JSON tracking response.", carrierId);
  }
  if (!record(json) || typeof json.res !== "boolean")
    throw new ParseError("Tracking response shape is unrecognized.", carrierId);
  if (!json.res)
    throw new ParseError(
      "Carrier did not report a successful result.",
      carrierId,
    );
  if (!Array.isArray(json.rows) || !record(json.rows[0]))
    throw new ParseError("Tracking result row is missing.", carrierId);
  const row = json.rows[0];
  if (row.tracking === null) {
    if (
      (typeof row.lastTrackingDesc === "string" &&
        row.lastTrackingDesc.startsWith("미 접수된 물품")) ||
      row.resultDesc === "Tracking 데이터 없음"
    )
      throw new TrackingNotFoundError(
        "No tracking history was found.",
        carrierId,
      );
    throw new ParseError("Tracking data is unavailable.", carrierId);
  }
  if (!Array.isArray(row.tracking))
    throw new ParseError("Tracking event list is missing.", carrierId);
  const events: TrackingEvent[] = row.tracking.map((item) => {
    if (
      !record(item) ||
      typeof item.actDate !== "string" ||
      typeof item.actTime !== "string"
    )
      throw new ParseError("Tracking event shape is unrecognized.", carrierId);
    const original =
      typeof item.chkPointDesc2 === "string"
        ? item.chkPointDesc2
        : item.chkPointDesc;
    if (typeof original !== "string")
      throw new ParseError("Tracking status is missing.", carrierId);
    const normalized = status(original);
    return {
      status: normalized,
      description: description(normalized),
      time: parseCompactKoreanDateTime(item.actDate, item.actTime, carrierId),
    };
  });
  if (!events.length)
    throw new ParseError("Tracking event list is empty.", carrierId);
  sortEvents(events);
  const latest = events.at(-1);
  if (!latest) throw new ParseError("Tracking event list is empty.", carrierId);
  return { events, status: latest.status };
}
