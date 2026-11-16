// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import { InvalidTrackingNumberError, ParseError } from "../../core/errors.js";
import { parseTracking } from "../../core/parse-tracking.js";
import { requestCarrier } from "../../core/request.js";
import type { TrackingResultWithRaw, TrackOptions } from "../../core/types.js";

const carrierId = "kr.hanjin" as const;

export async function trackHanjin(
  options: TrackOptions,
): Promise<TrackingResultWithRaw> {
  if (
    typeof options.trackingNumber !== "string" ||
    !/^(?:\d{12}|\d{14})$/.test(options.trackingNumber)
  )
    throw new InvalidTrackingNumberError(
      "Expected a 12- or 14-digit Hanjin waybill.",
      carrierId,
    );
  // schLang=KR selects the Korean page, whose wording the parser reads.
  const params = new URLSearchParams({
    mCode: "MN038",
    wblnum: options.trackingNumber,
    schLang: "KR",
  });
  const { bytes, contentType } = await requestCarrier(
    options,
    carrierId,
    `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?${params}`,
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
