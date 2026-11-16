// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import { InvalidTrackingNumberError, ParseError } from "../../core/errors.js";
import { parseTracking } from "../../core/parse-tracking.js";
import { requestCarrier } from "../../core/request.js";
import type { TrackingResultWithRaw, TrackOptions } from "../../core/types.js";

const carrierId = "kr.lotte" as const;

export async function trackLotte(
  options: TrackOptions,
): Promise<TrackingResultWithRaw> {
  // The public form refuses anything but twelve digits whose last digit is
  // the first eleven modulo 7, before it looks a waybill up.
  if (
    typeof options.trackingNumber !== "string" ||
    !/^\d{12}$/.test(options.trackingNumber) ||
    Number(options.trackingNumber.slice(0, 11)) % 7 !==
      Number(options.trackingNumber.slice(11))
  )
    throw new InvalidTrackingNumberError(
      "Expected a 12-digit Lotte waybill with a valid check digit.",
      carrierId,
    );
  const { bytes, contentType } = await requestCarrier(
    options,
    carrierId,
    "https://www.lotteglogis.com/home/reservation/tracking/linkView",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "WaybillKit/0.0 (manual tracking SDK)",
      },
      body: new URLSearchParams({ InvNo: options.trackingNumber }).toString(),
    },
  );
  if (!/text\/html\b/i.test(contentType))
    throw new ParseError("Expected an HTML tracking response.", carrierId);
  const body = new TextDecoder().decode(bytes);
  const parsed = parseTracking({ carrier: carrierId, payload: body });
  return {
    result: {
      ...parsed,
      trackingNumber: options.trackingNumber,
      meta: { ...parsed.meta, fetchedAt: new Date().toISOString() },
    },
    raw: { body, contentType, encoding: "utf-8" },
  };
}
