# Korea Post fixtures

- `not-found.html`: reduced from the page returned for a single fixed-dummy
  query (`sid1=0000000000000`) against the public domestic tracking page on
  2026-11-16. Only the basic-information and history tables remain. It
  contains no waybill or personal data.
- `delivered.html`: **synthetic**. No successful shipment response has been
  captured by this project. The history table's headings and its empty body
  were observed in the not-found page; the scan rows (dotted date, time,
  office, `span.evtnm` label followed by courier or receiver text, oldest
  first) and the labels follow the page shape documented by the Apache-2.0
  project [universal-parcel-scraper](https://github.com/plhery/universal-parcel-scraper/tree/5a07e53dad5472187694c3b668d3a5f4db82c23b/carriers/korea-post),
  whose own fixtures are invented data in the observed shape. No code or
  fixture content was copied.

The basic-information table's headings differed between the observed
not-found page and that reference, so the parser does not depend on them.
Only 13-digit domestic numbers are supported; EMS uses another portal.
