// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import { ParseError, TrackingNotFoundError } from "../../core/errors.js";
import { parseKoreanDateTime, sortEvents } from "../../core/time.js";
import type {
  ParsedTrackingResult,
  TrackingEvent,
  TrackingStatus,
} from "../../core/types.js";

const carrierId = "kr.kdexp" as const;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function status(code: string): TrackingStatus {
  switch (code) {
    case "0002":
      return "PICKED_UP";
    case "0003":
    case "0006":
      return "IN_TRANSIT";
    case "0007":
      return "DELIVERED";
    case "0008":
      return "OUT_FOR_DELIVERY";
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

export function parseKdexp(
  input: string,
): Pick<ParsedTrackingResult, "events" | "status"> {
  let json: unknown;
  try {
    json = JSON.parse(input);
  } catch {
    throw new ParseError("Expected a JSON tracking response.", carrierId);
  }
  if (!record(json) || typeof json.result !== "string")
    throw new ParseError("Tracking response shape is unrecognized.", carrierId);
  if (json.result !== "suc") {
    if (json.result === "fail" && !("data" in json))
      throw new TrackingNotFoundError(
        "No tracking history was found.",
        carrierId,
      );
    throw new ParseError(
      "Carrier did not report a successful result.",
      carrierId,
    );
  }
  if (!record(json.data) || !Array.isArray(json.data.scanList))
    throw new ParseError("Tracking event list is missing.", carrierId);
  const events: TrackingEvent[] = json.data.scanList.map((item) => {
    if (
      !record(item) ||
      typeof item.scanDt !== "string" ||
      typeof item.scanType !== "string" ||
      typeof item.scanTypeNm !== "string"
    )
      throw new ParseError("Tracking event shape is unrecognized.", carrierId);
    const normalized = status(item.scanType);
    return {
      status: normalized,
      description: description(normalized),
      time: parseKoreanDateTime(item.scanDt, carrierId),
    };
  });
  if (!events.length)
    throw new ParseError("Tracking event list is empty.", carrierId);
  sortEvents(events);
  const latest = events.at(-1);
  if (!latest) throw new ParseError("Tracking event list is empty.", carrierId);
  return { events, status: latest.status };
}
