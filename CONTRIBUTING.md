# Contributing

Use Node.js 24 and the pnpm version pinned in `package.json`. Run
`pnpm install --frozen-lockfile` and `pnpm check` before opening a PR.
For an intentional dependency update, use pnpm and include the lockfile change.
Do not add npm or Bun lockfiles.

`pnpm check` runs lint, type checking, offline tests, build, workflow structure
checks and package installation checks with npm and pnpm. Package installation
checks require registry access; unit tests do not query carrier websites.
Use `pnpm test` for offline tests and `pnpm format` for formatting.

## Workflow

Create a short-lived branch, open a PR, and squash merge to `main` after CI passes.
Use the PR title as the squash commit message:

- `fix: ...`: compatible bug fix; patch release.
- `feat: ...`: new capability or carrier; minor release.
- `feat!: ...` or `fix!: ...`: breaking change; explain migration in the PR.
- `docs: ...`, `chore: ...`, `ci: ...`: generally do not trigger a release alone.

Before 1.0, breaking changes increment the minor version. From 1.0 onward,
breaking changes increment the major version. Breaking changes always require
explicit release notes. Release Please owns version and changelog updates.

## Carrier contributions

New adapters need evidence of
successful queries and an explicitly recognized not-found response.
A public homepage or HTTP 200 is not proof that tracking works.

1. Describe the carrier, use case and available validation evidence in an issue.
2. Confirm the official query flow and applicable access terms.
3. Keep requests and pure response parsing separate under `src/carriers/`.
4. Add minimal redacted fixtures and regression tests for observed behavior.
   Label live captures, dummy responses and synthetic assumptions separately.
5. Test status mapping, timestamps and errors. Unexpected structures must not be
   silently treated as no tracking history. Update the README support table.

Document fixture provenance alongside the fixtures, including observation date,
source and redaction method. Reference implementations can inform investigation,
but do not establish current behavior or replace independent evidence.
Do not bypass authentication, CAPTCHA or certificate validation.

Do not copy incompatible licensed implementations. Independently investigate
the public query flow and implement the adapter. Preserve third-party notices
where applicable. Contributions intentionally submitted for inclusion are
under Apache-2.0 unless explicitly stated otherwise; see LICENSE section 5.

Never attach real waybills, personal information, raw production responses,
session cookies, API keys, or CSRF tokens to public issues or PRs.
Redact or replace fixture values while preserving the relevant structure.
