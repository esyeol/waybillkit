// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import { ParseError, TrackingNotFoundError } from "../../core/errors.js";
import { parseKoreanDateTime, sortEvents } from "../../core/time.js";
import type {
  ParsedTrackingResult,
  TrackingEvent,
  TrackingStatus,
} from "../../core/types.js";

const carrierId = "kr.cjlogistics" as const;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Scan codes (crgStDcd). Only codes with a documented meaning are mapped.
function status(code: string): TrackingStatus {
  switch (code.toUpperCase()) {
    case "11": // 집화처리
      return "PICKED_UP";
    case "21": // SM입고
    case "41": // 간선상차
    case "42": // 간선하차
    case "43": // 소분류
    case "44": // 간선상차
    case "58": // 권내출고
    case "61": // 오도착
    case "62": // 미발송
    case "63": // 미출고
    case "R1": // 행낭포장
    case "RMN": // HUB 도착
      return "IN_TRANSIT";
    case "82": // 배송출발
      return "OUT_FOR_DELIVERY";
    case "84": // 미배송
      return "EXCEPTION";
    case "91": // 배송완료
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
    case "EXCEPTION":
      return "미배송";
    case "DELIVERED":
      return "배송완료";
    default:
      return "배송 상태 확인";
  }
}

// Couriers sometimes record a departure scan after the delivery scan.
const afterDelivery = new Set<TrackingStatus>([
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
]);

export function parseCjlogistics(
  input: string,
): Pick<ParsedTrackingResult, "events" | "status"> {
  let json: unknown;
  try {
    json = JSON.parse(input);
  } catch {
    throw new ParseError("Expected a JSON tracking response.", carrierId);
  }
  if (!record(json) || !("data" in json))
    throw new ParseError("Tracking response shape is unrecognized.", carrierId);
  if (String(json.resultCode) !== "200")
    throw new ParseError(
      "Carrier did not report a successful result.",
      carrierId,
    );
  if (!record(json.data) || !Array.isArray(json.data.svcOutList))
    throw new ParseError("Tracking event list is missing.", carrierId);
  // An empty list covers both an unknown waybill and one registered without
  // scans; the carrier separates them only through a second lookup.
  if (!json.data.svcOutList.length)
    throw new TrackingNotFoundError(
      "No tracking history was found.",
      carrierId,
    );
  const events: TrackingEvent[] = json.data.svcOutList.map((item) => {
    if (
      !record(item) ||
      typeof item.workDt !== "string" ||
      typeof item.workHms !== "string" ||
      typeof item.crgStDcd !== "string"
    )
      throw new ParseError("Tracking event shape is unrecognized.", carrierId);
    const normalized = status(item.crgStDcd);
    return {
      status: normalized,
      description: description(normalized),
      time: parseKoreanDateTime(`${item.workDt} ${item.workHms}`, carrierId),
    };
  });
  sortEvents(events);
  const latest = events.at(-1);
  if (!latest) throw new ParseError("Tracking event list is empty.", carrierId);
  const delivered = events
    .map((event) => event.status)
    .lastIndexOf("DELIVERED");
  const settled =
    delivered >= 0 &&
    events
      .slice(delivered + 1)
      .every((event) => afterDelivery.has(event.status));
  return { events, status: settled ? "DELIVERED" : latest.status };
}
