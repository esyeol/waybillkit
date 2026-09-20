# Public documentation

This directory is the public English/Korean documentation source. Internal
maintainer notes under the ignored root `docs/` directory are never copied here.

- `content.mjs`: paired language content; keep section IDs and evidence aligned.
- `build.mjs`: dependency-free static renderer; copies only explicit public assets.
- `style.css` and `icon.svg`: local assets; no external fonts, analytics or scripts.

Run `pnpm build:site` to generate `.local/site/`. To preview at the domain root,
run `SITE_BASE_PATH=/ pnpm build:site` and serve `.local/site/` with any local
static HTTP server. The default base is `/waybillkit/` for GitHub Pages.
Generated output is ignored and is not part of the npm package.

`pnpm test` checks both languages, anchors, local links, base paths, output
allowlisting and basic semantic structure without querying carriers. `pnpm check`
also builds the site. Update both languages together; distinguish historical
evidence from live availability and date operational configuration claims.

The Documentation workflow deploys only `main`, following protected-branch CI.
Only `.local/site` is uploaded, never the repository or internal `docs/`.
Pages must use GitHub Actions as its publishing source. A manual dispatch on
`main` can redeploy. No npm release is performed. This site is not a live status
dashboard and performs no carrier requests.
