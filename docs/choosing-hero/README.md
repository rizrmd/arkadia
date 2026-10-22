## Delivered kit

31 reusable runtime PNGs, 19 generated production masters, one rejected Ember precursor, four assembled desktop/mobile screens and one component contact sheet. All assets and documentation are English. This is an asset and assembly handoff; no game implementation is included.

Runtime files: `public/choosing-hero/v1/`. Original generated images: `assets-src/choosing-hero/v1/`.

Read `artwork.md`, `frames.md`, `cards.md`, `controls.md` and `assembly.md` for the published catalogs and layout guidance. `generation.json` records prompts and provenance. `publication.json` records actual supported attachment URLs and Knowledge page IDs. The original Choosing Hero page remains unchanged.

## Rebuild

From the repository root, with the existing Node dependencies installed:

```bash
node docs/choosing-hero/prepare-assets.mjs
node docs/choosing-hero/build-kit.mjs
node docs/choosing-hero/assemble.mjs
node docs/choosing-hero/finalize.mjs
node docs/choosing-hero/verify.mjs
```

Preparation uses the preserved source masters and keeps straight alpha. The mobile panel uses nine-slice composition to prevent its corners from crowding content. Convenience text PNGs use the Georgia serif fallback. Use live text from `labels.en.json` for accessibility and responsive layouts.

## Verification

`verification.json` records decoding, dimensions, SHA-256 hashes, alpha and layer bounds. `publication-verification.json` records five persisted pages, all 39 inline attachment downloads, all 54 repository file preview links, and the unchanged reference page. All 39 attachment images also render in local Chromium. Authenticated live Fural browser tools were unavailable, so the live Fural UI itself was not visually inspected.

Use `verify-publication.mjs` for the supported CLI audit (allow several minutes), then `verify-rendering.mjs` for local Chromium rendering. The latter serves the exact published attachment URL paths from their verified downloaded bytes. `inline-preview-audit.html` contains the image markup used for that check.

## Scope and publication

Five direct children of Choosing Hero, ordered 10–50: Backgrounds and Hero Artwork; Frames and Ornamentation; Hero Cards and English Labels; Buttons, Skills and Indicators; Desktop and Mobile Assembly. `publish.mjs` uses only supported Fural CLI upload/Knowledge operations. No discussion message is posted. Thumb stick task #EHVLV and gateway task #TWSDQ remain untouched.
