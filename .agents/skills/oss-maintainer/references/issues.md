# Issue workflows

## Draft or create

Search open and closed issues for the same symptom or request. If an existing issue
already covers it, explain the overlap; do not update or reopen it without authorization.
Use the repository template, keeping only sections relevant to the report:

- Problem or requested capability and why it matters.
- Observed behavior versus expected behavior.
- Minimal reproduction, relevant versions/environment, and sanitized evidence.
- Known scope and uncertainty; do not invent missing reproduction steps.
- Suggested acceptance criteria for work that has a clear implementation outcome.

For a draft request, return the title and body without creating an issue. For an
explicit creation request, use `gh issue create` against the resolved repository
and return the resulting URL. Use existing labels only when requested or required
by an applicable repository convention; do not invent a label taxonomy.

## Triage or investigate

Read the issue, relevant comments, linked workflow logs, and implicated code.
Separate observed facts, plausible explanations, and missing evidence. Explain
the smallest useful next diagnostic or fix, but do not implement it unless asked.
Prioritize by demonstrated impact, not the reporter's wording alone.

For carrier-monitor issues, inspect the recorded outcome, observation time, and
run environment. A timeout, access denial, rate limit, or TLS failure is not proof
of a parsing defect. A recognized no-history response does not test the successful
shipment path. Preserve bot state markers and machine-managed bodies; do not
manually close an incident solely because a code PR merged. Use fresh relevant
evidence and the user's requested scope when deciding recovery.

If a public reply is requested, explain findings respectfully and ask only for
missing information that could change the diagnosis. Never ask for credentials,
real waybills, or raw private response bodies in a public issue.
