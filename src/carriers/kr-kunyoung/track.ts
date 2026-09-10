// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import iconv from "iconv-lite";
import { InvalidTrackingNumberError, ParseError } from "../../core/errors.js";
import { parseTracking } from "../../core/parse-tracking.js";
import { requestCarrier } from "../../core/request.js";
import type { TrackingResultWithRaw, TrackOptions } from "../../core/types.js";

const carrierId = "kr.kunyoung" as const;

export async function trackKunyoung(
  options: TrackOptions,
): Promise<TrackingResultWithRaw> {
  if (
    typeof options.trackingNumber !== "string" ||
    !/^\d{10}$/.test(options.trackingNumber)
  )
    throw new InvalidTrackingNumberError(
      "Expected a 10-digit Kunyoung waybill.",
      carrierId,
    );
  const params = new URLSearchParams({ mulno: options.trackingNumber });
  const { bytes, contentType } = await requestCarrier(
    options,
    carrierId,
    `https://www.kunyoung.com/goods/goods_02__.php?${params}`,
    { headers: { "User-Agent": "WaybillKit/0.0 (manual tracking SDK)" } },
  );
  if (!/text\/html\b/i.test(contentType))
    throw new ParseError("Expected an HTML tracking response.", carrierId);
  const body = iconv.decode(Buffer.from(bytes), "euc-kr");
  const parsed = parseTracking({ carrier: carrierId, payload: body });
  return {
    result: {
      ...parsed,
      trackingNumber: options.trackingNumber,
      meta: { ...parsed.meta, fetchedAt: new Date().toISOString() },
    },
    raw: { body, contentType, encoding: "euc-kr" },
  };
}
