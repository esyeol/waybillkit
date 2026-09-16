// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

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
  const form = new FormData();
  form.append("invoiceNumber", options.trackingNumber);
  const { bytes, contentType } = await requestCarrier(
    options,
    carrierId,
    "https://mj.kunyoung.com/webinvoicetracehistory/selectListInvoiceTraceHistory.do",
    {
      method: "POST",
      headers: { "User-Agent": "WaybillKit/0.0 (manual tracking SDK)" },
      body: form,
    },
  );
  // The current server labels JSON as text/html;charset=UTF-8 (observed
  // 2026-09-16). Accept that header, but still reject HTML/malformed JSON below.
  if (
    !/^\s*(?:(?:application|text)\/json|text\/html)\s*(?:;|$)/i.test(
      contentType,
    )
  )
    throw new ParseError("Expected a JSON tracking response.", carrierId);
  const body = new TextDecoder().decode(bytes);
  // Legacy HTML is supported only for offline captures, never live JSON replies.
  if (body.trimStart().startsWith("<"))
    throw new ParseError("Expected a JSON tracking response.", carrierId);
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
