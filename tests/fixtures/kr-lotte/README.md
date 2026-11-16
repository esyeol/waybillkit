# Lotte fixtures

- `not-found.html`: reduced from the page returned for a single fixed-dummy
  query (`InvNo=000000000011`, a check-valid number the tracker does not know)
  against the public tracking result page on 2026-11-16. Only the summary and
  history tables remain. It contains no waybill or personal data.
- `delivered.html`: **synthetic**. The two-table structure, the newest-first
  order and a row whose time is hidden as `--:--` were observed on the same
  day on the carrier's own all-zero test record (`000000000000`), which is not
  committed. The step names and the repeated pickup row without a time follow
  the page shape documented by the Apache-2.0 project
  [universal-parcel-scraper](https://github.com/plhery/universal-parcel-scraper/tree/5a07e53dad5472187694c3b668d3a5f4db82c23b/carriers/lotte-global).
  No code or fixture content was copied. Courier names and phones are omitted.

The twelve-digit rule and the modulo-7 check digit come from the validation
script of the carrier's own tracking form, observed on 2026-11-16.

Rows whose time the tracker hides are reported at 00:00 KST of their day. No
real customer shipment has been captured by this project.
