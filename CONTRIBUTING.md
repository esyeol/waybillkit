# Contributing

Use Node.js 24 and the pnpm version pinned in `package.json`. Run
`pnpm install --frozen-lockfile` and `pnpm check` before opening a PR.
For an intentional dependency update, use pnpm and include the lockfile change.
Do not add npm or Bun lockfiles.

`pnpm check` runs lint, type checking, offline tests, build, workflow structure
checks, bilingual documentation validation/build and package installation checks
with npm and pnpm. Package installation checks require registry access; unit tests
do not query carrier websites.
Use `pnpm test` for offline tests and `pnpm format` for formatting.

Public documentation lives in `website/`; see its README for local previews.
Update English and Korean content together. Label historical carrier evidence
separately from current availability. Internal `docs/` remains local and ignored.

Package checks require runtime entry points, type declarations, package metadata
and distribution notices. Root README and CHANGELOG Markdown files, including
language variants such as `README.ko.md`, are optional and need no per-file check
updates. Compiled JavaScript and declaration files under `dist/` are allowed;
internal documents, source files, tests and environment files are not. The
`package.json` `files` field selects distribution content; the package check
independently guards against unexpected files. New runtime asset formats require
an explicit packaging policy update.

## Workflow

Create a short-lived branch, open a PR, and squash merge to `main` after CI passes.
Use the PR title as the squash commit message:

- `fix: ...`: compatible bug fix; patch release.
- `feat: ...`: new capability or carrier; minor release.
- `feat!: ...` or `fix!: ...`: breaking change; explain migration in the PR.
- `docs: ...`, `chore: ...`, `ci: ...`: generally do not trigger a release alone.

Before 1.0, breaking changes increment the minor version. From 1.0 onward,
breaking changes increment the major version. Breaking changes always require
explicit release notes. Release Please will own version and changelog updates
once release automation is enabled. The first alpha is bootstrapped manually.

## Release process

The first release candidate is `0.1.0-alpha.1`, published publicly as
`@esyeol/waybillkit` with the `next` npm dist-tag. It includes the existing five
carriers without changing their documented validation limitations.

1. Prepare version, changelog, `.release-please-manifest.json` and bilingual docs
   in a reviewed PR. Run `pnpm check`, including release metadata and package checks.
2. After protected-branch CI passes and the PR is merged, use a clean checkout of
   that exact main commit. Run `pnpm check` and
   `npm publish --dry-run --access public --tag next`.
3. A maintainer authenticated as the npm package owner can run
   `npm publish --access public --tag next`. Complete any npm browser/2FA approval
   personally. Never share tokens or OTPs in issues, chats or repository files.
4. Verify the registry version and dist-tags, then install the exact version in
   a fresh consumer and check exports and declarations without querying carriers.
   If publication has an ambiguous result, inspect the registry before retrying;
   a published name/version cannot be overwritten.
5. Create a matching `v0.1.0-alpha.1` GitHub prerelease at the reviewed commit.
   This bootstrap release is not a `latest` release and makes no provenance claim.

`publishConfig.tag` and the release metadata guard keep prereleases on `next`.
A stable release requires explicitly changing the version and tag to `latest`.
Do not bypass the guard with `--ignore-scripts` when publishing from the checkout.

`RELEASE_ENABLED` and `NPM_PUBLISH_ENABLED` remain disabled for the bootstrap.
The existing Release workflow accepts stable tags only; it is not the alpha
publishing path. Before enabling future automation, configure npm trusted
publishing for this repository and `release.yml`, review the release token setup,
and test the desired release channel. No npm credential is committed or added to
GitHub for this manual first release.

## Carrier contributions

For persistent Daesin runner-only timeouts, maintainers can manually run
`Daesin network diagnostic` on the default branch. It makes at most three sequential
fixed-dummy POSTs: the SDK (10 seconds), instrumented IPv4 Node HTTPS (12 seconds),
and IPv4 curl (12 seconds). Access denial/rate limiting stops subsequent probes.
It never retries, follows redirects, disables TLS validation, or records response
bodies/cookies. Safe DNS addresses, HTTP status, timings and error codes appear in
the run summary. There is no schedule or issue/repair mutation. Run sparingly.
Node stage names indicate the next incomplete phase, not proof of a specific
firewall policy; curl and SDK use different clients/limits. A green diagnostic job
means the report completed, not that tracking works. Unit tests make no requests.

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
