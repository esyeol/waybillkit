import { describe, expect, it, vi } from "vitest";
import { nextIncident, syncIssues } from "../scripts/probes/issues.mjs";
import {
  probeCarrier,
  runProbes,
  selectCarriers,
} from "../scripts/probes/probe.mjs";
import * as sdk from "../src/index.js";

describe("carrier probes", () => {
  it("is opt-in and rejects unknown targets before requests", async () => {
    expect(selectCarriers()).toEqual([]);
    expect(selectCarriers("kr.daesin, kr.daesin")).toEqual(["kr.daesin"]);
    expect(() => selectCarriers("https://example.com")).toThrow();
    expect(() => selectCarriers("toString")).toThrow();
    const track = vi.fn();
    expect((await runProbes([], { ...sdk, track })).status).toBe(
      "not-configured",
    );
    expect(track).not.toHaveBeenCalled();
  });
  it.each([
    [sdk.TrackingNotFoundError, "not-found-contract-ok"],
    [sdk.ParseError, "contract-unrecognized"],
    [sdk.CarrierAuthError, "access-denied"],
    [sdk.CarrierRateLimitedError, "rate-limited"],
    [sdk.CarrierTimeoutError, "timeout"],
    [sdk.CarrierUnavailableError, "unavailable"],
    [Error, "internal-error"],
  ])(
    "classifies %s without logging exception contents or retrying",
    async (ErrorClass, outcome) => {
      const track = vi
        .fn()
        .mockRejectedValue(new ErrorClass("PRIVATE_RESPONSE Cookie=SECRET"));
      const report = await probeCarrier("kr.daesin", { ...sdk, track });
      expect(report.outcome).toBe(outcome);
      expect(track).toHaveBeenCalledExactlyOnceWith({
        carrier: "kr.daesin",
        trackingNumber: "0000000000000",
        timeoutMs: 10000,
      });
      expect(JSON.stringify(report)).not.toMatch(
        /PRIVATE|SECRET|0000000000000/,
      );
    },
  );
  it("does not expose unexpected successful dummy shipments", async () => {
    const report = await probeCarrier("kr.daesin", {
      ...sdk,
      track: vi
        .fn()
        .mockResolvedValue({ trackingNumber: "PRIVATE", raw: "SECRET" }),
    });
    expect(report.outcome).toBe("unexpected-success");
    expect(JSON.stringify(report)).not.toMatch(/PRIVATE|SECRET/);
  });
});

describe("incident lifecycle", () => {
  it("counts distinct runs and resets after recovery or a different error", () => {
    const first = nextIncident(null, { outcome: "contract-unrecognized" }, "1");
    expect(
      nextIncident(first, { outcome: "contract-unrecognized" }, "1")
        .consecutive,
    ).toBe(1);
    expect(
      nextIncident(first, { outcome: "contract-unrecognized" }, "2")
        .consecutive,
    ).toBe(2);
    expect(nextIncident(first, { outcome: "timeout" }, "2").consecutive).toBe(
      1,
    );
    expect(
      nextIncident(first, { outcome: "not-found-contract-ok" }, "2")
        .consecutive,
    ).toBe(0);
  });
  it("updates its existing issue and suppresses repair when a PR is open", async () => {
    const update = vi.fn();
    const create = vi.fn();
    const github = {
      paginate: vi.fn().mockResolvedValue([
        {
          number: 3,
          state: "open",
          body: '<!-- waybillkit-probe:kr.daesin:synthetic-not-found -->\n<!-- state:{"runId":"1","consecutive":1,"outcome":"contract-unrecognized"} -->',
        },
      ]),
      rest: {
        issues: { listForRepo: vi.fn(), update, create },
        pulls: { list: vi.fn().mockResolvedValue({ data: [{ number: 5 }] }) },
      },
    };
    const context = { repo: { owner: "owner", repo: "repo" }, runId: 2 };
    const report = {
      carriers: [
        {
          carrier: "kr.daesin",
          checkedAt: "2026-09-10T00:00:00Z",
          outcome: "contract-unrecognized",
        },
      ],
    };
    expect(await syncIssues(github, context, report)).toBe(false);
    expect(update).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
    expect(update.mock.calls[0]?.[0].body).toContain('"consecutive":2');
    github.rest.pulls.list.mockResolvedValue({ data: [] });
    expect(await syncIssues(github, context, report)).toBe(true);
    const recovered = {
      carriers: report.carriers.map((result) => ({
        ...result,
        outcome: "not-found-contract-ok",
      })),
    };
    expect(await syncIssues(github, context, recovered)).toBe(false);
    expect(update.mock.lastCall?.[0].state).toBe("closed");
  });
});
