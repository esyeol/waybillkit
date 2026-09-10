// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import { ParseError } from "./errors.js";
import type { CarrierId, TrackingEvent } from "./types.js";

function valid(parts: readonly number[]): boolean {
  const [year, month, day, hour, minute, second] = parts;
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined ||
    second === undefined
  )
    return false;
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second
  );
}

export function parseKoreanDateTime(
  input: string,
  carrierId: CarrierId,
): string {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/.exec(
      input.trim(),
    );
  if (!match)
    throw new ParseError("Unrecognized tracking timestamp.", carrierId);
  const values = match
    .slice(1, 7)
    .map((value, index) => Number(value ?? (index === 5 ? "00" : "")));
  if (!valid(values))
    throw new ParseError("Invalid tracking timestamp.", carrierId);
  const [year, month, day, hour, minute, second] = match.slice(1, 7);
  return `${year}-${month}-${day}T${hour}:${minute}:${second ?? "00"}+09:00`;
}

export function parseCompactKoreanDateTime(
  date: string,
  time: string,
  carrierId: CarrierId,
): string {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(date.trim());
  const clock = /^(\d{2})(\d{2})(\d{2})?$/.exec(time.trim());
  if (!match || !clock)
    throw new ParseError("Unrecognized tracking timestamp.", carrierId);
  return parseKoreanDateTime(
    `${match[1]}-${match[2]}-${match[3]} ${clock[1]}:${clock[2]}:${clock[3] ?? "00"}`,
    carrierId,
  );
}

export function sortEvents(events: TrackingEvent[]): void {
  events.sort((a, b) => a.time.localeCompare(b.time));
}
