// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import { InvalidTrackingNumberError, ParseError } from "../../core/errors.js";
import { parseTracking } from "../../core/parse-tracking.js";
import { requestCarrier } from "../../core/request.js";
import type { TrackingResultWithRaw, TrackOptions } from "../../core/types.js";

const carrierId = "kr.cvsnet" as const;

export async function trackCvsnet(
  options: TrackOptions,
): Promise<TrackingResultWithRaw> {
  // The public form caps input at 13 digits; the lower bound is a guess.
  if (
    typeof options.trackingNumber !== "string" ||
    !/^\d{10,13}$/.test(options.trackingNumber)
  )
    throw new InvalidTrackingNumberError(
      "Expected a 10- to 13-digit GS Postbox waybill.",
      carrierId,
    );
  const params = new URLSearchParams({ invoice_no: options.trackingNumber });
  const { bytes, contentType } = await requestCarrier(
    options,
    carrierId,
    `https://www.cvsnet.co.kr/invoice/tracking.do?${params}`,
    { headers: { "User-Agent": "WaybillKit/0.0 (manual tracking SDK)" } },
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
