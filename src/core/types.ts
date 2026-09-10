// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

export type TrackingStatus =
  | "UNKNOWN"
  | "INFO_RECEIVED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "AT_LOCAL_FACILITY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "AVAILABLE_FOR_PICKUP"
  | "EXCEPTION"
  | "RETURNED";
export type CarrierId =
  | "kr.daesin"
  | "kr.kdexp"
  | "kr.chunilps"
  | "kr.kunyoung"
  | "kr.ilyanglogis";
export type TrackingSource = "HTML" | "JSON";
export type PayloadEncoding = "euc-kr" | "utf-8";
export interface TrackingEvent {
  status: TrackingStatus;
  description: string;
  time: string;
}
export interface ParsedTrackingResult {
  carrier: { id: CarrierId; name: string };
  status: TrackingStatus;
  events: TrackingEvent[];
  meta: { source: TrackingSource; locale: "ko-KR" };
}
export interface TrackingResult extends ParsedTrackingResult {
  trackingNumber: string;
  meta: { source: TrackingSource; fetchedAt: string; locale: "ko-KR" };
}
export interface ParseTrackingOptions {
  carrier: CarrierId;
  /** Decoded HTML/JSON, or bytes (including Node.js Buffer). */
  payload: string | Uint8Array;
  /** Byte decoding only. Defaults to the carrier's observed encoding. */
  encoding?: PayloadEncoding;
}
export interface RawTrackingResponse {
  /** Decoded, unredacted upstream content; not byte-for-byte network data. */
  body: string;
  /** Content-Type as declared by the upstream server. */
  contentType: string;
  /** Actual byte decoding used by the adapter, independent of Content-Type. */
  encoding: PayloadEncoding;
}
export interface TrackingResultWithRaw {
  result: TrackingResult;
  raw: RawTrackingResponse;
}
export interface TrackOptions {
  carrier: CarrierId;
  trackingNumber: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  fetch?: typeof globalThis.fetch;
}
