# Logen fixtures

- `not-found.html`: reduced from the page returned for a single fixed-dummy
  query (`00000000001`) against the public tracking page on 2026-11-16. Only
  the details table carrying the carrier's "no delivery data" row remains. It
  contains no waybill or personal data.
- `delivered.html`: **synthetic**. The table structure (`table.pdInfo`,
  `table.tkInfo`, eight cells per scan, `YYYY.MM.DD HH:MM` clocks, oldest
  first) was observed on the same day on the carrier's own all-zero test
  record (`00000000000`), which the tracker answers with a long history. That
  record is not committed. It showed the labels 집하완료, 집하출고, 터미널입고,
  터미널출고, 행낭적입, 배송입고 and 배송출고; the remaining labels (거래처출고,
  집하입고, 행낭해체, 배송완료) and the photo link inside a delivery label follow
  the page shape documented by the Apache-2.0 project
  [universal-parcel-scraper](https://github.com/plhery/universal-parcel-scraper/tree/5a07e53dad5472187694c3b668d3a5f4db82c23b/carriers/logen).
  No code or fixture content was copied. Staff, receiver, office and phone
  cells are left empty.

No real customer shipment has been captured by this project.
