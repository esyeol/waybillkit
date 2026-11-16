# Hanjin fixtures

- `not-found.html`: reduced from the notice page returned for a single
  fixed-dummy query (`wblnum=000000000000`) against the public tracking result
  page on 2026-11-16. Script includes and a duplicate empty form were dropped.
  It contains no waybill or personal data.
- `delivered.html`: **synthetic**. No successful shipment response has been
  captured by this project. The element structure (`.songjang-num .num`,
  `.waybill-tbl table`, four cells per scan, `span.stateDesc`, empty rows
  between scans) and the scan sentences follow the page shape documented by
  the Apache-2.0 project [universal-parcel-scraper](https://github.com/plhery/universal-parcel-scraper/tree/5a07e53dad5472187694c3b668d3a5f4db82c23b/carriers/hanjin),
  whose own fixtures are invented data in the observed shape. No code or
  fixture content was copied. Sender, recipient, courier and phone fields are
  omitted.

International histories are rejected with `ParseError`: scans made abroad use
the foreign carrier's local clock, which has no known offset.
