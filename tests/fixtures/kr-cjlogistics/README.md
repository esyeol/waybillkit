# CJ Logistics fixtures

- `not-found.json`: the complete response to a single fixed-dummy query
  (`wblNo=000000000000`) against the trace service used by the public tracker
  on 2026-11-16. It contains no waybill or personal data.
- `delivered.json`: **synthetic**. No successful shipment response has been
  captured by this project. Field names (`data.svcOutList`, `workDt`,
  `workHms`, `crgStDcd`, `crgStDnm`, `crgStDcdVal`), the oldest-first order and
  the scan codes follow the response shape documented by the Apache-2.0
  project [universal-parcel-scraper](https://github.com/plhery/universal-parcel-scraper/tree/5a07e53dad5472187694c3b668d3a5f4db82c23b/carriers/cj-logistics),
  whose own fixtures are invented data in the observed shape. No code or
  fixture content was copied. Names, phones and addresses are omitted.

An empty scan list is reported as not found. The carrier separates an unknown
waybill from one registered without scans only through a second lookup, which
this adapter does not make.
