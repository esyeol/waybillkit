# Kunyoung evidence

Observed on 2026-09-16 at https://mj.kunyoung.com/:

- The public search UI submits multipart POST to
  `https://mj.kunyoung.com/webinvoicetracehistory/selectListInvoiceTraceHistory.do`
  with the `invoiceNumber` field. No authentication or access-control bypass was used.
- A fixed all-zero dummy query returned HTTP 200 with valid TLS.
  `not-found.json` contains that observed response, not a successful shipment.
  The server declared `text/html;charset=UTF-8` even though its body is JSON;
  the adapter accepts this observed header but validates JSON, not HTML.
- The page checks `msgCode == '0'`, then whether `rows` is empty. It displays
  `writeDate` and `goodsContent`; for `goodsTypeSP == 'N'`, it prefixes
  `deliveryContent`. Other fields can contain names, telephone numbers and images.
- `delivered.json` is synthetic: field names follow the page, but event values,
  timestamps, chronological order, labels and status-code semantics have not been
  verified against an authorized successful shipment. The parser classifies only
  recognized display text; it does not infer status from internal codes.
- Existing HTML fixtures remain synthetic legacy captures for offline compatibility.
  Legacy EUC-KR byte parsing remains supported. Live requests never fall back to
  the legacy host or disable TLS verification.

Reference comparison only: delivery-tracker commit
`3b3d63b4a754a6939c0f9eaee08c04c164ddb582`,
`packages/core/src/carriers/kr.kunyoung/index.ts`, still uses the legacy HTML host.
No implementation was copied. New protocol facts were independently observed on
the public Kunyoung page. Public accessibility does not grant unrestricted usage;
the live verification used only a fixed dummy input, without enumeration or retries.

An authorized, redacted successful response is still needed to validate timestamp
formats, status labels, accepted waybill lengths and event variations. The existing
10-digit input constraint is retained; the page's maxlength alone is not evidence
of a different valid waybill format.
