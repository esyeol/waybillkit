# Changelog

## 0.1.0-alpha.2 (2026-11-11)

Second experimental release, distributed with the npm `next` tag.

### Features

- Hapdong (`kr.hdexp`), Woori, formerly Honam (`kr.honamlogis`) and GS Postbox
  (`kr.cvsnet`) adapters, available through `track`, `trackWithRaw` and
  `parseTracking`. `CarrierId` gains the three new IDs.

### Known limitations

- The three new carriers have synthetic successful-response fixtures only. Their
  not-found responses were observed with fixed dummy queries on 2026-11-11.
- Woori is queried over plain HTTP because its HTTPS endpoint failed certificate
  validation; the waybill number is sent unencrypted.
- GS Postbox maps only store arrival and customer receipt. Other events,
  including in-transit scans, are `UNKNOWN`.
- The limitations listed for 0.1.0-alpha.1 still apply.

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
