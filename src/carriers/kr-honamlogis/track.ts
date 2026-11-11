// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import { InvalidTrackingNumberError, ParseError } from "../../core/errors.js";
import { parseTracking } from "../../core/parse-tracking.js";
import { requestCarrier } from "../../core/request.js";
import type { TrackingResultWithRaw, TrackOptions } from "../../core/types.js";

const carrierId = "kr.honamlogis" as const;

export async function trackHonamlogis(
  options: TrackOptions,
): Promise<TrackingResultWithRaw> {
  if (
    typeof options.trackingNumber !== "string" ||
    !/^\d{10,14}$/.test(options.trackingNumber)
  )
    throw new InvalidTrackingNumberError(
      "Expected a 10- to 14-digit Woori (Honam) waybill.",
      carrierId,
    );
  // Plain HTTP on purpose: the carrier's HTTPS endpoint failed certificate
  // validation when observed, and validation is never disabled. The waybill
  // number therefore travels unencrypted.
  const { bytes, contentType } = await requestCarrier(
    options,
    carrierId,
    "http://honamlogis.co.kr/tracking_number.php",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "WaybillKit/0.0 (manual tracking SDK)",
      },
      body: new URLSearchParams({
        SLIP_BARCD: options.trackingNumber,
      }).toString(),
    },
  );
  // The endpoint labels its JSON body as text/html.
  if (!/(?:text\/html|(?:application|text)\/json)\b/i.test(contentType))
    throw new ParseError("Expected a JSON tracking response.", carrierId);
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
