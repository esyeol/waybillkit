// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import { load } from "cheerio";
import { ParseError, TrackingNotFoundError } from "../../core/errors.js";
import type { ParsedTrackingResult, TrackingEvent } from "../../core/types.js";

const compact = (value: string) => value.replace(/\s+/g, "");
const headers = [
  "구분",
  "취급점명",
  "전화번호",
  "도착(접수)일시",
  "출발(배달)일시",
  "현재위치",
];
function parseTime(value: string): string | undefined {
  const text = value.trim();
  if (!text || text === "-") return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/.exec(text);
  if (!match) throw new ParseError("Unrecognized tracking timestamp.");
  const [, year, month, day, hour, minute] = match;
  const local = `${year}-${month}-${day}T${hour}:${minute}:00`;
  const check = new Date(`${local}Z`);
  if (
    !Number.isFinite(check.getTime()) ||
    check.toISOString().slice(0, 19) !== local
  )
    throw new ParseError("Invalid tracking timestamp.");
  // This adapter covers domestic Korea, not a country-based timezone inference.
  return `${local}+09:00`;
}
export function parseDaesin(
  html: string,
): Pick<ParsedTrackingResult, "events" | "status"> {
  const $ = load(html);
  const area = $("#printarea");
  if (area.length !== 1)
    throw new ParseError("Tracking response container is missing.");
  const tables = area.find("table");
  if (tables.length === 0) {
    if (/운송된내역이없습니다\.$/.test(compact(area.find("div.effect").text())))
      throw new TrackingNotFoundError("No tracking history was found.");
    throw new ParseError("Unrecognized empty tracking response.");
  }
  const candidates = tables.filter(
    (_, table) =>
      $(table)
        .find("tr")
        .first()
        .find("th")
        .toArray()
        .map((cell) => compact($(cell).text()))
        .join("|") === headers.join("|"),
  );
  if (candidates.length !== 1)
    throw new ParseError("Tracking table headers are unrecognized.");
  const events: TrackingEvent[] = [];
  let delivered = false;
  for (const row of candidates.first().find("tr").toArray().slice(1)) {
    const cells = $(row).children("td");
    if (cells.length !== 6)
      throw new ParseError("Tracking row shape is unrecognized.");
    const role = compact(cells.eq(0).text());
    const origin = role === "발송취급점";
    const destination = role === "도착취급점";
    const transit = /^경유취급점\d*$/.test(role);
    const completed = compact(cells.eq(5).text()) === "배송완료";
    const arrival = parseTime(cells.eq(3).text());
    const departure = parseTime(cells.eq(4).text());
    if (completed && (!destination || !departure))
      throw new ParseError(
        "Delivery confirmation has no matching delivery timestamp.",
      );
    if (arrival && departure && arrival > departure)
      throw new ParseError("Tracking row timestamps are inconsistent.");
    const label = origin
      ? "발송취급점"
      : destination
        ? "도착취급점"
        : transit
          ? "경유취급점"
          : "취급점";
    if (arrival)
      events.push({
        status: origin
          ? "PICKED_UP"
          : destination
            ? "AT_LOCAL_FACILITY"
            : transit
              ? "IN_TRANSIT"
              : "UNKNOWN",
        description: `${label} 도착(접수)`,
        time: arrival,
      });
    if (departure)
      events.push({
        status: completed
          ? "DELIVERED"
          : origin || transit
            ? "IN_TRANSIT"
            : "UNKNOWN",
        description: completed ? "배송완료" : `${label} 출발(배달)`,
        time: departure,
      });
    delivered ||= completed;
  }
  if (!events.length)
    throw new ParseError("Tracking table contains no timestamped events.");
  events.sort((a, b) => a.time.localeCompare(b.time));
  const latest = events.at(-1);
  if (!latest || (delivered && latest.status !== "DELIVERED"))
    throw new ParseError(
      "Tracking history conflicts with delivery confirmation.",
    );
  return { events, status: latest.status };
}
