// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import { InvalidTrackingNumberError, ParseError } from "../../core/errors.js";
import { parseTracking } from "../../core/parse-tracking.js";
import { requestCarrier } from "../../core/request.js";
import type { TrackingResultWithRaw, TrackOptions } from "../../core/types.js";

const carrierId = "kr.hdexp" as const;

export async function trackHdexp(
  options: TrackOptions,
): Promise<TrackingResultWithRaw> {
  // The public form documents no length rule; this range is a conservative guess.
  if (
    typeof options.trackingNumber !== "string" ||
    !/^\d{8,20}$/.test(options.trackingNumber)
  )
    throw new InvalidTrackingNumberError(
      "Expected a numeric Hapdong waybill between 8 and 20 digits.",
      carrierId,
    );
  const params = new URLSearchParams({ barcode: options.trackingNumber });
  const { bytes, contentType } = await requestCarrier(
    options,
    carrierId,
    `https://hdexp.co.kr/new/delivery_search_proc.do?${params}`,
    { headers: { "User-Agent": "WaybillKit/0.0 (manual tracking SDK)" } },
  );
  if (!/(?:application|text)\/json\b/i.test(contentType))
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
