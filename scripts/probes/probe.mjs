// Only fixed synthetic inputs. No shipment secrets or upstream content in reports.
export const targets = Object.freeze({
  "kr.daesin": "0000000000000",
  "kr.kdexp": "00000000",
  "kr.chunilps": "0000000000000000",
  "kr.kunyoung": "0000000000",
  "kr.ilyanglogis": "0000000000",
});

export function selectCarriers(value = "") {
  const ids = [
    ...new Set(
      value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
  if (ids.some((id) => !Object.hasOwn(targets, id)))
    throw new Error("CARRIER_PROBE_IDS contains an unsupported carrier ID.");
  return ids;
}

// Classification reflects what a dummy query proves, never shipment health.
export async function probeCarrier(carrier, sdk) {
  if (!Object.hasOwn(targets, carrier))
    throw new Error("Unsupported probe carrier.");
  const base = {
    carrier,
    scope: "synthetic-not-found",
    checkedAt: new Date().toISOString(),
  };
  try {
    await sdk.track({
      carrier,
      trackingNumber: targets[carrier],
      timeoutMs: 10000,
    });
    return { ...base, outcome: "unexpected-success" };
  } catch (error) {
    const outcomes = [
      [sdk.TrackingNotFoundError, "not-found-contract-ok"],
      [sdk.ParseError, "contract-unrecognized"],
      [sdk.CarrierTimeoutError, "timeout"],
      [sdk.CarrierAuthError, "access-denied"],
      [sdk.CarrierRateLimitedError, "rate-limited"],
      [sdk.CarrierUnavailableError, "unavailable"],
    ];
    const outcome =
      outcomes.find(([type]) => error instanceof type)?.[1] ?? "internal-error";
    return { ...base, outcome };
  }
}

export async function runProbes(ids, sdk) {
  const carriers = [];
  // Sequential; each adapter sends exactly one request and performs no retries.
  for (const id of ids) carriers.push(await probeCarrier(id, sdk));
  return {
    schemaVersion: 1,
    checkedAt: new Date().toISOString(),
    status: ids.length ? "completed" : "not-configured",
    carriers,
  };
}

export function summary(report) {
  return [
    "## Carrier protocol checks",
    "",
    `Checked at: ${report.checkedAt}`,
    "",
    "Scope: fixed dummy-number responses only. Successful shipment tracking is not verified.",
    "",
    ...(report.carriers.length
      ? report.carriers.map((r) => `- ${r.carrier}: ${r.outcome}`)
      : ["No carriers selected; no requests sent."]),
    "",
    "A green workflow means the report was produced, not that all carriers work. Results older than 36 hours are stale.",
    "",
  ].join("\n");
}
