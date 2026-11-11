// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import { ParseError, TrackingNotFoundError } from "../../core/errors.js";
import { parseCompactKoreanDateTime, sortEvents } from "../../core/time.js";
import type {
  ParsedTrackingResult,
  TrackingEvent,
  TrackingStatus,
} from "../../core/types.js";

const carrierId = "kr.honamlogis" as const;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Labels are the ones the public tracking page's own script branches on.
function status(label: string): TrackingStatus {
  switch (label.trim()) {
    case "집하입고":
      return "PICKED_UP";
    case "노선상차":
    case "터미널입고":
    case "터미널출고":
      return "IN_TRANSIT";
    case "노선하차":
      return "AT_LOCAL_FACILITY";
    case "배송출발":
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

export function parseHonamlogis(
  input: string,
): Pick<ParsedTrackingResult, "events" | "status"> {
  let json: unknown;
  try {
    json = JSON.parse(input);
  } catch {
    throw new ParseError("Expected a JSON tracking response.", carrierId);
  }
  if (
    !record(json) ||
    json.MSG_ID !== "0000" ||
    typeof json.ODS0_TOTAL !== "number" ||
    !Array.isArray(json.ODS0)
  )
    throw new ParseError("Tracking response shape is unrecognized.", carrierId);
  if (json.ODS0_TOTAL === 0 && json.ODS0.length === 0)
    throw new TrackingNotFoundError(
      "No tracking history was found.",
      carrierId,
    );
  const shipment: unknown = json.ODS0[0];
  if (!record(shipment) || !Array.isArray(shipment.TRACKING_DTL))
    throw new ParseError("Tracking event list is missing.", carrierId);
  const events: TrackingEvent[] = shipment.TRACKING_DTL.map((item) => {
    if (
      !record(item) ||
      typeof item.SCAN_DM !== "string" ||
      typeof item.SCANGB_NM !== "string" ||
      !/^\d{12}(?:\d{2})?$/.test(item.SCAN_DM)
    )
      throw new ParseError("Tracking event shape is unrecognized.", carrierId);
    const normalized = status(item.SCANGB_NM);
    return {
      status: normalized,
      description: description(normalized),
      time: parseCompactKoreanDateTime(
        item.SCAN_DM.slice(0, 8),
        item.SCAN_DM.slice(8),
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
