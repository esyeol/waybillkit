# Carrier fixtures

The Daesin fixtures are reduced from maintainer-authorized live captures as
documented in its carrier-local README. The Kyungdong, Chunil, Kunyoung and
Ilyang fixtures are synthetic contract fixtures created from public page
structure and request-schema observations on 2026-09-07. They are not evidence
that a real shipment completed successfully.

Hapdong's fixtures have separate provenance in
[kr-hdexp/README.md](kr-hdexp/README.md): the not-found response was observed on
2026-11-11, while the successful response is synthetic. Woori (formerly Honam)
follows the same pattern in [kr-honamlogis/README.md](kr-honamlogis/README.md),
as does GS Postbox in [kr-cvsnet/README.md](kr-cvsnet/README.md).

Kunyoung's current JSON fixtures have separate provenance in
[kr-kunyoung/README.md](kr-kunyoung/README.md): the empty response was observed on
2026-09-16, while successful JSON rows remain synthetic.

All committed fixtures use synthetic identifiers and omit names, addresses,
phone numbers, cookies, scripts and real waybills. A carrier becomes live-verified
only after a separately documented, authorized capture is reviewed.
