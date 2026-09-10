// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import iconv from "iconv-lite";
import { InvalidTrackingNumberError, ParseError } from "../../core/errors.js";
import { parseTracking } from "../../core/parse-tracking.js";
import { requestCarrier } from "../../core/request.js";
import type { TrackingResultWithRaw, TrackOptions } from "../../core/types.js";

const carrierId = "kr.daesin" as const;

export async function trackDaesin(
  options: TrackOptions,
): Promise<TrackingResultWithRaw> {
  if (
    typeof options.trackingNumber !== "string" ||
    !/^\d{12,13}$/.test(options.trackingNumber)
  )
    throw new InvalidTrackingNumberError(
      "Expected a 12- or 13-digit Daesin waybill.",
      carrierId,
    );
  const { bytes, contentType } = await requestCarrier(
    options,
    carrierId,
    "https://www.ds3211.co.kr/freight/internalFreightSearch.ht",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: "https://www.ds3211.co.kr/freight/internalFreightForm.jsp",
        "User-Agent": "WaybillKit/0.0 (manual tracking SDK)",
      },
      body: new URLSearchParams({
        billno: options.trackingNumber,
      }).toString(),
    },
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
