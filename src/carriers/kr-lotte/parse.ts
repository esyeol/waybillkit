// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import { type CheerioAPI, load } from "cheerio";
import { ParseError, TrackingNotFoundError } from "../../core/errors.js";
import { parseKoreanDateTime, sortEvents } from "../../core/time.js";
import type {
  ParsedTrackingResult,
  TrackingEvent,
  TrackingStatus,
} from "../../core/types.js";

const carrierId = "kr.lotte" as const;
const summaryHeader = "운송장 번호|발송지|도착지|배달결과";
const historyHeader = "단계|시간|현재위치|처리현황";
// The line the history shows for a waybill without scans.
const noScans = "보내시는 고객님께서 상품 발송 준비중입니다.";
const clean = (text: string): string => text.replace(/\s+/g, " ").trim();

// The tracker's step names (단계), which head every scan.
function status(step: string): TrackingStatus {
  switch (step.replace(/\s+/g, "")) {
    case "인수/상품접수":
    case "상품접수":
      return "PICKED_UP";
    case "터미널입고":
    case "상품이동중":
      return "IN_TRANSIT";
    case "배달지도착":
      return "AT_LOCAL_FACILITY";
    case "배송출발":
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

function table($: CheerioAPI, header: string) {
  return $("table").filter(
    (_, element) =>
      $(element)
        .children("thead")
        .find("th")
        .map((__, cell) => clean($(cell).text()))
        .get()
        .join("|") === header,
  );
}

interface Scan {
  step: string;
  day: string;
  clock: string | undefined;
  status: TrackingStatus;
}

export function parseLotte(
  input: string,
): Pick<ParsedTrackingResult, "events" | "status"> {
  const $ = load(input);
  const summary = table($, summaryHeader);
  const history = table($, historyHeader);
  if (summary.length !== 1 || history.length !== 1)
    throw new ParseError("Tracking page shape is unrecognized.", carrierId);
  // A number the tracker refuses comes back without a waybill in the summary.
  if (
    summary.children("tbody").children("tr").first().children("td").length !== 4
  )
    throw new ParseError("Tracking summary is unrecognized.", carrierId);
  const rows = history.children("tbody").children("tr").toArray();
  const [only] = rows;
  if (
    rows.length === 1 &&
    only &&
    $(only).children("td").length === 1 &&
    clean($(only).text()) === noScans
  )
    throw new TrackingNotFoundError(
      "No tracking history was found.",
      carrierId,
    );
  // The page lists scans newest first.
  const scans: Scan[] = rows.reverse().map((row) => {
    const cells = $(row).children("td");
    const match = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}|--:--)$/.exec(
      clean(cells.eq(1).text()),
    );
    const step = clean(cells.eq(0).text());
    if (cells.length !== 4 || !match?.[1] || !step)
      throw new ParseError("Tracking event shape is unrecognized.", carrierId);
    return {
      step,
      day: match[1],
      clock: match[2] === "--:--" ? undefined : match[2],
      status: status(step),
    };
  });
  const newest = scans.at(-1);
  if (!newest) throw new ParseError("Tracking event list is empty.", carrierId);
  const events: TrackingEvent[] = scans
    // Recent waybills repeat a scan once without its time.
    .filter(
      (scan) =>
        scan.clock ||
        !scans.some(
          (other) =>
            other.clock && other.day === scan.day && other.step === scan.step,
        ),
    )
    .map((scan) => ({
      status: scan.status,
      description: description(scan.status),
      // The tracker hides the time of some scans; those report midnight.
      time: parseKoreanDateTime(
        `${scan.day} ${scan.clock ?? "00:00"}`,
        carrierId,
      ),
    }));
  sortEvents(events);
  // Midnight placeholders can sort early, so the page's newest row decides.
  return { events, status: newest.status };
}
