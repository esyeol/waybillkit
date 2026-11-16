// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import { InvalidTrackingNumberError, ParseError } from "../../core/errors.js";
import { parseTracking } from "../../core/parse-tracking.js";
import { requestCarrier } from "../../core/request.js";
import type { TrackingResultWithRaw, TrackOptions } from "../../core/types.js";

const carrierId = "kr.epost" as const;

export async function trackEpost(
  options: TrackOptions,
): Promise<TrackingResultWithRaw> {
  // Domestic registered numbers only; EMS identifiers use another portal.
  if (
    typeof options.trackingNumber !== "string" ||
    !/^\d{13}$/.test(options.trackingNumber)
  )
    throw new InvalidTrackingNumberError(
      "Expected a 13-digit Korea Post domestic number.",
      carrierId,
    );
  const params = new URLSearchParams({
    sid1: options.trackingNumber,
    displayHeader: "N",
  });
  const { bytes, contentType } = await requestCarrier(
    options,
    carrierId,
    `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?${params}`,
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
