// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import { ParseError, TrackingNotFoundError } from "../../core/errors.js";
import { parseKoreanDateTime, sortEvents } from "../../core/time.js";
import type {
  ParsedTrackingResult,
  TrackingEvent,
  TrackingStatus,
} from "../../core/types.js";

const carrierId = "kr.cvsnet" as const;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Only the codes the public page's own script gives meaning to are mapped:
// C10 is arrival at the pickup store, C11/C12 are customer receipt.
function status(code: string): TrackingStatus {
  switch (code) {
    case "C10":
      return "AVAILABLE_FOR_PICKUP";
    case "C11":
    case "C12":
      return "DELIVERED";
    default:
      return "UNKNOWN";
  }
}

function description(value: TrackingStatus): string {
  switch (value) {
    case "AVAILABLE_FOR_PICKUP":
      return "점포 도착";
    case "DELIVERED":
      return "배송완료";
    default:
      return "배송 상태 확인";
  }
}

export function parseCvsnet(
  input: string,
): Pick<ParsedTrackingResult, "events" | "status"> {
  // The page embeds its data as a single-line object literal.
  const match = /var trackingInfo = (\{.*\});/.exec(input);
  if (!match?.[1])
    throw new ParseError("Tracking data is missing from the page.", carrierId);
  let json: unknown;
  try {
    json = JSON.parse(match[1]);
  } catch {
    throw new ParseError("Embedded tracking data is not JSON.", carrierId);
  }
  if (!record(json) || typeof json.code !== "number")
    throw new ParseError("Tracking response shape is unrecognized.", carrierId);
  if (json.code === 100)
    throw new TrackingNotFoundError(
      "No tracking history was found.",
      carrierId,
    );
  if (json.code !== 200)
    throw new ParseError(
      "Carrier did not report a successful result.",
      carrierId,
    );
  if (!Array.isArray(json.trackingDetails))
    throw new ParseError("Tracking event list is missing.", carrierId);
  const events: TrackingEvent[] = json.trackingDetails.map((item) => {
    if (
      !record(item) ||
      typeof item.transTime !== "string" ||
      typeof item.transCode !== "string"
    )
      throw new ParseError("Tracking event shape is unrecognized.", carrierId);
    const normalized = status(item.transCode);
    return {
      status: normalized,
      description: description(normalized),
      time: parseKoreanDateTime(item.transTime, carrierId),
    };
  });
  if (!events.length)
    throw new ParseError("Tracking event list is empty.", carrierId);
  sortEvents(events);
  const latest = events.at(-1);
  if (!latest) throw new ParseError("Tracking event list is empty.", carrierId);
  return { events, status: latest.status };
}
