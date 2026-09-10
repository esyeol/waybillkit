// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0

import type { CarrierId } from "./types.js";

export class WaybillKitError extends Error {
  constructor(
    message: string,
    readonly carrierId: CarrierId = "kr.daesin",
  ) {
    super(message);
    this.name = new.target.name;
  }
}
export class InvalidTrackingNumberError extends WaybillKitError {}
export class TrackingNotFoundError extends WaybillKitError {}
export class CarrierUnavailableError extends WaybillKitError {}
export class CarrierTimeoutError extends WaybillKitError {}
export class CarrierAuthError extends WaybillKitError {}
export class CarrierRateLimitedError extends WaybillKitError {}
export class ParseError extends WaybillKitError {}
