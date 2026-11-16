// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import { InvalidTrackingNumberError, ParseError } from "../../core/errors.js";
import { parseTracking } from "../../core/parse-tracking.js";
import { requestCarrier } from "../../core/request.js";
import type { TrackingResultWithRaw, TrackOptions } from "../../core/types.js";

const carrierId = "kr.logen" as const;

export async function trackLogen(
  options: TrackOptions,
): Promise<TrackingResultWithRaw> {
  // The public form answers ten or eleven digits and refuses anything else.
  if (
    typeof options.trackingNumber !== "string" ||
    !/^\d{10,11}$/.test(options.trackingNumber)
  )
    throw new InvalidTrackingNumberError(
      "Expected a 10- or 11-digit Logen waybill.",
      carrierId,
    );
  const { bytes, contentType } = await requestCarrier(
    options,
    carrierId,
    `https://www.ilogen.com/web/personal/trace/${options.trackingNumber}`,
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
