// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import { trackChunilps } from "./carriers/kr-chunilps/track.js";
import { trackDaesin } from "./carriers/kr-daesin/track.js";
import { trackIlyanglogis } from "./carriers/kr-ilyanglogis/track.js";
import { trackKdexp } from "./carriers/kr-kdexp/track.js";
import { trackKunyoung } from "./carriers/kr-kunyoung/track.js";
import type {
  TrackingResult,
  TrackingResultWithRaw,
  TrackOptions,
} from "./core/types.js";

export * from "./core/errors.js";
export { parseTracking } from "./core/parse-tracking.js";
export type {
  CarrierId,
  ParsedTrackingResult,
  ParseTrackingOptions,
  PayloadEncoding,
  RawTrackingResponse,
  TrackingEvent,
  TrackingResult,
  TrackingResultWithRaw,
  TrackingSource,
  TrackingStatus,
  TrackOptions,
} from "./core/types.js";
export async function track(options: TrackOptions): Promise<TrackingResult> {
  return (await trackWithRaw(options)).result;
}
/** Opt in to unredacted upstream content. Do not log or persist raw data by default. */
export async function trackWithRaw(
  options: TrackOptions,
): Promise<TrackingResultWithRaw> {
  switch (options.carrier) {
    case "kr.daesin":
      return trackDaesin(options);
    case "kr.kdexp":
      return trackKdexp(options);
    case "kr.chunilps":
      return trackChunilps(options);
    case "kr.kunyoung":
      return trackKunyoung(options);
    case "kr.ilyanglogis":
      return trackIlyanglogis(options);
    default:
      throw new RangeError("Unsupported carrier.");
  }
}
