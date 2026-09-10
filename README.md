# WaybillKit

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue)](LICENSE)
[![Node.js: 22.13+](https://img.shields.io/badge/Node.js-22.13%2B-339933)](#getting-started)
[![TypeScript](https://img.shields.io/badge/TypeScript-typed-3178C6)](#api)
[![Status: Experimental](https://img.shields.io/badge/Status-experimental-orange)](#carriers)

A TypeScript SDK for unified tracking across Korean parcel and freight carriers.

Query carriers directly from your Node.js application and receive consistent
tracking statuses and events.

> Experimental — not yet published to npm. Carrier support and API details may change.

## Features

- One API for five Korean carriers.
- Consistent statuses and chronological events with Korean time offsets.
- Standalone HTML/JSON parsing without network requests.
- Request timeouts, cancellation and injectable `fetch`.
- Personal names, contact details and addresses excluded from normalized results.

## Carriers

| Carrier | ID | Format | Verification |
| --- | --- | --- | --- |
| 대신택배 · Daesin | `kr.daesin` | EUC-KR HTML | Delivered and not-found responses |
| 경동택배 · Kyungdong | `kr.kdexp` | UTF-8 JSON | Dummy response checked; successful-response fixture is synthetic |
| 천일택배 · Chunil | `kr.chunilps` | UTF-8 HTML | Dummy response checked; successful-response fixture is synthetic |
| 건영택배 · Kunyoung | `kr.kunyoung` | EUC-KR HTML | Synthetic fixtures; HTTPS certificate error at last check |
| 일양로지스 · Ilyang | `kr.ilyanglogis` | UTF-8 JSON | Dummy response checked; successful-response fixture is synthetic |

Last protocol check: **2026-09-10**. Dummy-response checks do not verify successful
shipment tracking. Carrier websites may change independently of this package.

## Getting started

Requires **Node.js 22.13+**. WaybillKit is an ESM package; browser runtimes are not
supported.

Until the first npm release, build from a local checkout using Node.js 24 and
the pnpm version specified in `package.json`:

```sh
pnpm install --frozen-lockfile
pnpm build
```

Run the following from a JavaScript module in the project root:

```js
import { track } from './dist/index.js';

const result = await track({
  carrier: 'kr.daesin',
  trackingNumber: process.env.WAYBILLKIT_DAESIN_NUMBER,
  timeoutMs: 10_000,
});
```

Set `WAYBILLKIT_DAESIN_NUMBER` to a 12- or 13-digit Daesin waybill you are authorized
to query. The planned npm package name is `@esyeol/waybillkit`.

## API

### `track(options)`

Returns `carrier`, `trackingNumber`, `status`, `events` and `meta`.
Each event contains a normalized `status`, a fixed `description` and an ISO timestamp
with a `+09:00` offset. Events are oldest-first; unrecognized states remain `UNKNOWN`.

Options include `timeoutMs` (default: 10 seconds), an `AbortSignal` via `signal`,
and a custom `fetch` implementation. Requests are not retried or redirected automatically.

`TrackingNotFoundError` indicates a recognized no-history response;
`ParseError` indicates an unrecognized response. HTTP availability, access denial,
rate limits and timeouts have separate error classes. Cancellation raises `AbortError`.

### `parseTracking(options)`

Parse a saved response without making a network request:

```js
import { readFile } from 'node:fs/promises';
import { parseTracking } from './dist/index.js';

const payload = await readFile('response.html', 'utf8');
const result = parseTracking({ carrier: 'kr.daesin', payload });
```

Accepts a decoded string or `Uint8Array` (including `Buffer`). Bytes use the carrier's
default encoding; set `encoding: 'utf-8'` for files saved as UTF-8.
Returns the normalized result without `trackingNumber` or `meta.fetchedAt`.

### `trackWithRaw(options)`

Returns `{ result, raw }` from a single query. `raw` contains the decoded `body`,
declared `contentType` and actual `encoding`. It is not the original network bytes.

Raw content is **not redacted** and may contain personal information.
Avoid logging or publicly sharing it. Raw content is not attached to errors.
The normalized result also contains the supplied tracking number, so avoid
logging complete results.

## Roadmap

- Expand support for additional Korean parcel and freight carriers.
- Add carriers in the United States and Japan through the same unified API.
- Grow coverage with community-contributed, redacted response fixtures and real-world validation.
- Use GitHub Actions to detect regressions and help maintain carrier integrations.

US and Japanese integrations are planned, not currently available. Carrier priority
will follow user demand, available integration methods and validation evidence.
Suggestions and contributions are welcome through issues and pull requests.

## Automated validation

GitHub Actions workflows are prepared to check code quality, types, offline tests
and package installation on Node.js 22 and 24 for pushes and pull requests.

Once enabled, scheduled carrier checks will run twice daily against selected
carriers using fixed dummy inputs. Optional issue automation will track failures
and recovery. Repeated response-parsing failures can trigger a repair proposal;
changes backed by sufficient committed evidence must pass checks before a draft
PR is opened for maintainer review.

Scheduled checks and repair automation are not yet enabled. Dummy checks verify
only the observed no-history response path, not successful shipment tracking or
every possible website change. Community reports and real-response fixtures remain
essential to validating each integration.

## Contributing

Bug reports, carrier validation and new adapters are welcome.
See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and contribution guidelines.

Please use synthetic or redacted examples in issues and pull requests.
Do not include real waybills, personal information or credentials.

## License

[Apache-2.0](LICENSE) · [NOTICE](NOTICE)

WaybillKit is not affiliated with any carrier. Use carrier endpoints in accordance
with their applicable terms.
