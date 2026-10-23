# Arkadia → Arkodia

The game is **Arkodia** (the logo always read ARK✦DIA, with the compass star as the O). Everything that names the game now
says Arkodia: page titles, the loading screen, in-game labels, share text, docs, scripts, the Go server command
(`server/cmd/arkodia`, binary `arkodia`), the release scripts (`scripts/arkodia/`), the map (`src/world/maps/arkodia-01.json`),
the debug globals (`window.__ARKODIA_APP__`, `__ARKODIA_ARENA__`, …) and every browser storage key (`arkodia.*`, `arkodia-*`).

## Players keep their progress

`src/storage-rename.ts` is imported first by every page entry. On first load it moves each `arkadia*` localStorage and
sessionStorage key to the matching `arkodia*` key (a key already saved under the new name wins) and removes the old one.
`node scripts/verify-arkodia-rename.mjs` checks this in Chromium and writes `results.json` + `page.webp` here.

## Deploys across the switch

`scripts/arkodia/gateway.mjs` installs the co-op binary from a release whether it is named `arkodia` or (older releases)
`arkadia`, and starts `coop/arkadia` until the first post-rename release has installed `coop/arkodia`.

## Kept on purpose

These are addresses or data, not the game's name. Changing them would break links or the world:

- World seeds `'arkadia-01'` (`src/stronghold/parallax.ts`, `src/expedition/main.ts`, the map's `seed`): the terrain is hashed from them.
- The Fural sandbox `arkadia` (`SANDBOX` in `scripts/arkodia/publish-layer.mjs`, the lookups in `scripts/ember-warden/publish-*.mjs`)
  and the retired `arkadia-stronghold`, `arkadia-coop`, `arkadia-enemies` and `arkadia-expedition` sandboxes the docs mention;
  the public URL stays https://ark-whachat.fural.space. Screenshots already published under `/arkadia-sandbox/` keep that path.
- The GitHub repository `github.com/rizrmd/arkadia` and the Go module path that matches it.
- Retired preview hosts `arkadia-whachat.fural.space` / `arkadia-stronghold-whachat.fural.space` recorded in old evidence files.
- The legacy `arkadia_build` cookie the gateway clears, and absolute workspace paths (`~/projects/arkadia/...`).
