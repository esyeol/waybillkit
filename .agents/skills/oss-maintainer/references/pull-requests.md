# Pull request workflows

## Prepare a draft or create a PR

Resolve the base branch, head branch, pushed head SHA, and related issue. Inspect
the actual committed diff and commit history against the base, plus local status.
Uncommitted and unpushed changes are not part of a remotely created PR. If needed
work has not been pushed, provide a draft and hand the commit/push step to the user.
Do not switch branches or rewrite history just to prepare a PR description.

Follow the repository's title and PR-template conventions. Describe motivation,
meaningful changes, compatibility impact, actual validation results, and remaining
risks. Do not claim that unrelated local test results validate a different pushed
revision. Link related issues; use `Closes #N` only when the change actually resolves
the issue, otherwise use a non-closing reference such as `Related to #N`.

Before `gh pr create`, look for a PR with the same repository/base/head. Create a
Draft PR by default unless the user asks for a ready-for-review PR. Pass explicit
base/head values and use the already pushed branch so creation never implicitly
pushes local work. Return the actual PR URL and any remaining blockers.

## Review

Read the current diff, relevant surrounding code, tests, and CI results. For
external contributions, inspect workflows, scripts, and dependency changes before
executing code; do not expose local secrets or privileged tokens to contributor code.

Lead with actionable findings ordered by impact, each with a file location,
concrete failure scenario, and supporting reasoning. Separate likely bugs from
optional suggestions. If no actionable findings are found, say so while noting
verification limits; do not equate that with proof of correctness.

Return findings locally unless a formal GitHub review or comment was explicitly
requested. Do not approve, request changes, or edit the PR merely because the user
asked to review it.

## Merge readiness and explicitly requested merges

Refresh the head SHA, draft status, mergeability, required checks, review state,
unresolved conversations, and applicable branch rules. Do not hardcode check names
or required reviewer counts. Distinguish pending/unknown state from failure.

A readiness request ends with a ready/blocked/unknown assessment and reasons; it
does not merge. If merging is explicitly requested, verify that the reviewed head
has not changed and all applicable requirements are met. Follow the repository's
preferred allowed merge method; use `--match-head-commit` to guard against a head
change. Never use an admin bypass, enable auto-merge, or delete a branch unless
separately authorized. Stop on changed commits or failed/pending required checks
and report what remains. After merging, verify the resulting state and return the
PR link without claiming a release or deployment occurred.
