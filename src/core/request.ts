// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import {
  CarrierAuthError,
  CarrierRateLimitedError,
  CarrierTimeoutError,
  CarrierUnavailableError,
} from "./errors.js";
import type { CarrierId, TrackOptions } from "./types.js";

export interface CarrierResponseBytes {
  bytes: Uint8Array;
  contentType: string;
}

export async function requestCarrier(
  options: TrackOptions,
  carrierId: CarrierId,
  input: string,
  init: RequestInit = {},
): Promise<CarrierResponseBytes> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 2_147_483_647
  )
    throw new RangeError(
      "timeoutMs must be an integer between 1 and 2147483647.",
    );

  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  const abortError = () =>
    timedOut
      ? new CarrierTimeoutError("Carrier request timed out.", carrierId)
      : new DOMException("Tracking request was cancelled.", "AbortError");
  if (options.signal?.aborted) throw abortError();
  options.signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  let rejectAbort: (() => void) | undefined;
  const interrupted = new Promise<never>((_, reject) => {
    rejectAbort = () => reject(abortError());
    controller.signal.addEventListener("abort", rejectAbort, { once: true });
  });
  const query = async (): Promise<CarrierResponseBytes> => {
    let response: Response;
    try {
      response = await (options.fetch ?? globalThis.fetch)(input, {
        ...init,
        signal: controller.signal,
        redirect: "error",
      });
    } catch {
      if (controller.signal.aborted) throw abortError();
      throw new CarrierUnavailableError("Carrier request failed.", carrierId);
    }
    if (controller.signal.aborted) throw abortError();
    if (response.status === 429)
      throw new CarrierRateLimitedError(
        "Carrier rate limit reached.",
        carrierId,
      );
    if (response.status === 401 || response.status === 403)
      throw new CarrierAuthError("Carrier access was denied.", carrierId);
    if (!response.ok)
      throw new CarrierUnavailableError(
        "Carrier returned an unsuccessful HTTP status.",
        carrierId,
      );
    const contentType = response.headers.get("content-type") ?? "";
    try {
      return {
        bytes: new Uint8Array(await response.arrayBuffer()),
        contentType,
      };
    } catch {
      if (controller.signal.aborted) throw abortError();
      throw new CarrierUnavailableError(
        "Carrier response could not be read.",
        carrierId,
      );
    }
  };
  try {
    return await Promise.race([interrupted, query()]);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
    if (rejectAbort)
      controller.signal.removeEventListener("abort", rejectAbort);
  }
}
