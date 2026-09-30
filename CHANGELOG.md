# Changelog

## 0.1.0-alpha.1 (2026-09-30)

First experimental release, distributed with the npm `next` tag.

### Features

- Unified Node.js ESM / TypeScript SDK for Daesin, Kyungdong, Chunil, Kunyoung and Ilyang.
- `track`, offline `parseTracking`, and opt-in `trackWithRaw`.
- Normalized statuses and chronological events, timeouts, cancellation and injectable fetch.
- Bilingual documentation, offline regression tests and scheduled dummy-response monitoring.

### Known limitations

- This is an alpha, not a stable availability guarantee. Carrier websites may change.
- Only Daesin has a committed redacted live delivered fixture. The other carriers'
  successful-response fixtures are synthetic; dummy checks do not verify real shipments.
- Daesin has persistent connection failures on observed GitHub-hosted runners.
  Ilyang also timed out in the 2026-09-30 scheduled check while a subsequent local
  dummy query succeeded. The cause of that Ilyang timeout remains unconfirmed.
- Node.js 22.13+ and ESM only; no browser runtime support.
- No automatic rate limiting, caching or retries. Raw responses are not redacted.
