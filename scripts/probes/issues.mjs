import { targets } from "./probe.mjs";

export function nextIncident(previous, result, runId) {
  const healthy = result.outcome === "not-found-contract-ok";
  const consecutive = healthy
    ? 0
    : previous?.outcome !== result.outcome
      ? 1
      : previous.runId === runId
        ? previous.consecutive
        : Math.min(previous.consecutive + 1, 1000);
  return { runId, consecutive, outcome: result.outcome };
}

export async function syncIssues(github, context, report) {
  const issues = await github.paginate(github.rest.issues.listForRepo, {
    ...context.repo,
    state: "all",
    creator: "github-actions[bot]",
    per_page: 100,
  });
  let repair = false;
  for (const result of report.carriers) {
    if (!Object.hasOwn(targets, result.carrier))
      throw new Error("Unknown report carrier.");
    const marker = `<!-- waybillkit-probe:${result.carrier}:synthetic-not-found -->`;
    const issue = issues.find(
      (item) => !item.pull_request && item.body?.startsWith(marker),
    );
    let previous;
    try {
      previous = JSON.parse(
        issue?.body?.match(/<!-- state:(.*?) -->/)?.[1] ?? "null",
      );
    } catch {
      previous = null;
    }
    const healthy = result.outcome === "not-found-contract-ok";
    if (healthy && (!issue || issue.state === "closed")) continue;
    const state = nextIncident(previous, result, String(context.runId));
    const body = [
      marker,
      `<!-- state:${JSON.stringify(state)} -->`,
      `Carrier: ${result.carrier}`,
      `Checked at: ${result.checkedAt}`,
      "",
      `Outcome: **${result.outcome}**`,
      `Consecutive matching observations: ${state.consecutive}`,
      "",
      "Scope: one fixed dummy query. This does not verify successful shipment tracking.",
      "An unrecognized contract may be a maintenance page; it is not proof of a parser defect.",
      "Transport/TLS/access/rate-limit failures require investigation, not automatic parser edits.",
      "",
      `[Workflow run](https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})`,
      "",
      "Please contribute a minimal redacted reproduction and expected behavior. Do not attach real waybills, raw responses, cookies or personal information.",
    ].join("\n");
    const params = {
      ...context.repo,
      title: `[carrier-check] ${result.carrier}: ${healthy ? "dummy contract recovered" : "investigation needed"}`,
      body,
    };
    if (issue)
      await github.rest.issues.update({
        ...params,
        issue_number: issue.number,
        state: healthy ? "closed" : "open",
      });
    else await github.rest.issues.create(params);
    repair ||=
      result.outcome === "contract-unrecognized" && state.consecutive >= 2;
  }
  if (repair) {
    const prs = await github.rest.pulls.list({
      ...context.repo,
      state: "open",
      head: `${context.repo.owner}:automation/carrier-repair`,
    });
    repair = prs.data.length === 0;
  }
  return repair;
}
