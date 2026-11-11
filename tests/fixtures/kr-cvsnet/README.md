# GS Postbox (CVSnet) fixtures

- `not-found.html`: reduced from a single fixed-dummy query
  (`invoice_no=0000000000`) against the public tracking page on 2026-11-11.
  Only the script line carrying the embedded `trackingInfo` object remains; it
  contains no waybill or personal data.
- `delivered.html`: **synthetic**. Field names (`trackingDetails`, `transTime`,
  `transWhere`, `transKind`, `transCode`) and the meaning of codes `C10`
  (store arrival) and `C11`/`C12` (customer receipt) come from the public
  page's own script, observed the same day. The timestamp layout, other code
  values and event order are assumptions; no successful shipment response has
  been captured. Sender and receiver fields the page reads are omitted.

Every other `transCode` is reported as `UNKNOWN`, so a shipment still in
transit currently normalizes to `UNKNOWN`.
