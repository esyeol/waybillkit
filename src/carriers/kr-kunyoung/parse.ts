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

const carrierId = "kr.kunyoung" as const;
const compact = (value: string) => value.replace(/\s+/g, "").trim();

function status(text: string): TrackingStatus {
  const value = compact(text);
  if (value.endsWith("배송완료")) return "DELIVERED";
  if (value.endsWith("발송")) return "IN_TRANSIT";
  if (value.endsWith("도착")) return "IN_TRANSIT";
  return "UNKNOWN";
}

function description(value: TrackingStatus): string {
  if (value === "DELIVERED") return "배송완료";
  if (value === "IN_TRANSIT") return "배송 이동 중";
  return "배송 상태 확인";
}

export function parseKunyoung(
  html: string,
): Pick<ParsedTrackingResult, "events" | "status"> {
  const $ = load(html);
  const tables = $("table.goods-table");
  if (tables.length !== 3)
    throw new ParseError("Tracking table set is unrecognized.", carrierId);
  if (tables.eq(0).find("tr").first().children("td").length === 0)
    throw new ParseError("Displayed waybill cell is missing.", carrierId);
  const displayedWaybill = compact(
    tables.eq(0).find("tr").first().children("td").first().text(),
  );
  if (!displayedWaybill)
    throw new TrackingNotFoundError(
      "No tracking history was found.",
      carrierId,
    );
  if (!/^\d{10}$/.test(displayedWaybill))
    throw new ParseError("Displayed waybill is unrecognized.", carrierId);
  const eventTable = tables.eq(2);
  const headers = eventTable
    .find("thead th")
    .toArray()
    .map((cell) => compact($(cell).text()));
  if (headers.join("|") !== "날짜|시간|배송상태|전화번호")
    throw new ParseError("Tracking table headers are unrecognized.", carrierId);
  const events: TrackingEvent[] = eventTable
    .find("tr")
    .toArray()
    .flatMap((row) => {
      const cells = $(row).children("td");
      if (!cells.length) return [];
      if (cells.length !== 4)
        throw new ParseError("Tracking row shape is unrecognized.", carrierId);
      const normalized = status(cells.eq(2).text());
      return [
        {
          status: normalized,
          description: description(normalized),
          time: parseKoreanDateTime(
            `${cells.eq(0).text().trim()} ${cells.eq(1).text().trim()}`,
            carrierId,
          ),
        },
      ];
    });
  if (!events.length)
    throw new ParseError("Tracking table contains no events.", carrierId);
  sortEvents(events);
  const latest = events.at(-1);
  if (!latest)
    throw new ParseError("Tracking table contains no events.", carrierId);
  return { events, status: latest.status };
}
