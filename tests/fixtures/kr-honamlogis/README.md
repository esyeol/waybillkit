# Woori (formerly Honam) fixtures

- `not-found.json`: the complete response to a single fixed-dummy query
  (`SLIP_BARCD=0000000000`) against the public tracking page's request on
  2026-11-11. It contains no waybill or personal data.
- `delivered.json`: **synthetic**. Field names (`ODS0[0].TRACKING_DTL`,
  `SCAN_DM`, `SCANGB_NM`, `SCAN_USER_NM`) and the scan labels come from the
  public page's own script, observed the same day. The 12-digit `SCAN_DM`
  layout and event order are assumptions; no successful shipment response has
  been captured. Name, address and phone fields the page reads are omitted.

The endpoint was reachable over plain HTTP only; its HTTPS certificate failed
validation on the observation date.
