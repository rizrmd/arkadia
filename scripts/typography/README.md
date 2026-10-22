# Typography rendering sample (v2)

MSDF text and bronze 9-slice frames for the HUD and the Choose Your Hero screen, rendered with Pixi v8.
Code: `src/typography/` (shared module + sample). Assets: `public/typography/v2/`. Evidence: `docs/typography/v2/`.

## Run

```bash
npx vite -c vite.typography.config.ts            # http://127.0.0.1:3047/typography/
npx vite build -c vite.typography.config.ts      # dist/typography-sample (self-contained, served at /typography/)
```

Query parameters: `screen=hud|hero`, `hero=ember-warden|rift-runner`, `glow=1`, `ref=0..1` (reference overlay
opacity), `capture=1` (hide toolbar), `fix=0` (Pixi's stock MSDF edge width, for comparison).

## Rebuild assets

| Step | Command | Output |
|---|---|---|
| MSDF fonts | `node scripts/typography/build-fonts.mjs` | `v2/fonts/*.fnt` (BMFont XML) + atlas PNG + OFL licences |
| HUD frames, icons, skill art | `node scripts/typography/build-frames.mjs` | `v2/hud/@{1,2,3}x/*.png`, `v2/hud/manifest.json` |
| ARKADIA logo image | `node scripts/typography/build-logo.mjs` | `v2/hero/logo@{1,2,3}x.png` |
| HUD clean plate | `node scripts/typography/build-backdrop.mjs` | `v2/backdrops/hud-clean.jpg` |
| Evidence | `node scripts/typography/capture.mjs [compare\|crisp\|fx] [name]` | `docs/typography/v2/*`, `evidence.json` |
| Live check (after deploy) | `node scripts/typography/verify-live.mjs` | `docs/typography/v2/live-*.webp`, `live.json` |
| Knowledge page | `node scripts/typography/publish-knowledge.mjs` | Typography Rendering Sample, `docs/typography/sample.md` |

Deploy: `npx vite build -c vite.typography.config.ts`, then `node scripts/arkadia/publish-layer.mjs --dir dist/typography-sample --prefix /typography --name typography-v2` (the gateway opens `/typography/`).

Font sources and licences: `assets-src/typography/fonts/` (EB Garamond Medium, Cinzel SemiBold; SIL OFL 1.1).

### Font tools (kept out of the game's dependencies)

```bash
npm install --prefix ~/.cache/msdf-tools msdf-bmfont-xml@2.7.0
uv venv ~/.cache/fonttools-venv && uv pip install --python ~/.cache/fonttools-venv/bin/python fonttools skia-pathops
```

On this musl sandbox the bundled msdfgen (glibc) runs through the Debian glibc loader. Replace
`~/.cache/msdf-tools/node_modules/msdf-bmfont-xml/bin/linux/msdfgen.linux` with a wrapper after renaming the binary to
`msdfgen.real`:

```sh
#!/bin/sh
D=$(dirname "$0"); G=/opt/fural-antigravity-glibc
exec "$G/ld-linux-x86-64.so.2" --library-path "$D/lib:$G" "$D/msdfgen.real" "$@"
```

msdf-bmfont-xml 2.8's msdfgen needs glibc 2.38 and does not run here; 2.7.0's does.

## Pixi v8 notes

- Pixi 8.22's text-format BMFont parser only reads lower-case tags and drops `distanceField`, so the font silently
  renders as a plain bitmap. The fonts are therefore written as BMFont XML.
- Pixi sets the MSDF edge width from the text's world transform only. At DPR N the anti-aliased edge spreads over N
  device pixels. `installMsdfFx` multiplies it by the renderer resolution (measured in `evidence.json`).
- `installMsdfFx` swaps Pixi's MSDF shader for one that also draws a 3-stop vertical gradient, outline, glow and a
  soft shadow pass from the distance field. Text roles are named tokens in `src/typography/tokens.ts`.
