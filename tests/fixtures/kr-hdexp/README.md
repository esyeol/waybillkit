# Hapdong fixtures

- `not-found.json`: reduced from a single fixed-dummy query
  (`barcode=0000000000`) against the public tracking page's JSON request on
  2026-11-11. Framework binding metadata was dropped; only the top-level keys
  the parser depends on remain. No waybill or personal data was involved.
- `delivered.json`: **synthetic**. Field names (`data.scanList`, `scanDt`,
  `scanTypeNm`, `strtPointNm`, `strtPointTelno`) come from the public page's own
  script, observed the same day. Status labels, timestamp format and event
  order are assumptions; no successful shipment response has been captured.

The accepted waybill length (8–20 digits) is also an assumption: the public
form states no rule.
