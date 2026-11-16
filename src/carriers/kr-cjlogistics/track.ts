// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import { InvalidTrackingNumberError, ParseError } from "../../core/errors.js";
import { parseTracking } from "../../core/parse-tracking.js";
import { requestCarrier } from "../../core/request.js";
import type { TrackingResultWithRaw, TrackOptions } from "../../core/types.js";

const carrierId = "kr.cjlogistics" as const;

export async function trackCjlogistics(
  options: TrackOptions,
): Promise<TrackingResultWithRaw> {
  if (
    typeof options.trackingNumber !== "string" ||
    !/^(?:\d{10}|\d{12})$/.test(options.trackingNumber)
  )
    throw new InvalidTrackingNumberError(
      "Expected a 10- or 12-digit CJ Logistics waybill.",
      carrierId,
    );
  const { bytes, contentType } = await requestCarrier(
    options,
    carrierId,
    "https://trace.cjlogistics.com/next/rest/selectTrackingDetailList.do",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "WaybillKit/0.0 (manual tracking SDK)",
      },
      body: new URLSearchParams({ wblNo: options.trackingNumber }).toString(),
    },
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
