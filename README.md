## Arkadia — Perbatasan Abu / asset lab

Run `npm ci`, `npm run extract`, `npm run build`, then `node server.mjs` (port 3000). The extraction requires `../attachments/kit-or-preview-1.png`, the original attachment DA0679ae3e0624f52236ea60ea. Its unmodified copy is retained in public/assets/source-kit.png.

The application renders 100 individual floor sprites and seeded individual props using PixiJS 8. Grid is 128 × 64; floors are normalized to that size. Props are sorted by projected ground Y with a stable insertion order for ties. Arrow keys move an amber geometric depth probe; this probe is a diagnostic marker, not an art asset. Toggle Y-sort to compare incorrect insertion-order occlusion. Drag to pan, wheel to zoom around cursor, reset to fit. The source dialog shows the original kit and all twelve extracted sprites, with a downloadable crop manifest.

No arena preview is loaded by the application. The other supplied image (DA3593cef66dddda720f68862b) was inspected as the AI composition reference only and is excluded from the site.

## Extraction limits

Hand-reviewed crop rectangles, original transparent alpha, alpha values below 24/255 removed. No generated replacement art, invented texture, or global background removal. The generated sheet already has alpha. Shapes are imperfect diamonds and have baked side faces/shadows; stretching to the nominal 2:1 footprint does not make them seamless. The floor motif visibly repeats. Props have approximate hand-set pivots and sizes, not standardized physical footprints. Both wall sprites face similar directions; the demo does not claim a finished connected wall kit. Alpha fringe pixels and sheet-edge color contamination may remain. No characters, animation, collision, draw-call benchmark, mobile performance or gameplay proof.

## Verification

`npm run build` performs TypeScript checks and Vite production build. `scripts/verify.mjs` is a Playwright interaction test; local downloaded Chromium needs compatible system libraries. Managed Fural browser verification is performed separately if that runtime is unavailable. The static site server uses Node built-ins and a foreground boot command, with no npm or Vite dependency at runtime.

## Verified live result — 20 October 2026

https://arkadia-whachat.fural.space/ — custom sandbox arkadia, foreground `node app.mjs`, port 3000. `scripts/package-site.mjs` bundles the Vite output into a single Node file to avoid timeout while the platform copies many resources. All packaging scripts stage their output under the ignored `.publish/<name>/` folder (never the repo root). Publish with `fural-agent sandboxes serve --name arkadia --dir $PWD/.publish/site --cmd "node app.mjs" --port 3000 --project PJ8758f22f61165f3d3215e454`.

`node scripts/final-verify.mjs` tests the public URL in Chromium. The browser uses HOME-only Ubuntu libraries on Alpine; organization runtime now includes their idempotent setup (scripts/organization-setup.sh). Playwright Chromium requires --no-zygote --single-process here; this is browser test configuration, not a site requirement. The test verifies 13 conditions, including grid below props, true sorting toggle, deterministic seeds, camera handlers and transparency toggles. Final deterministic camera assertions use dispatched events with pointer-capture bypassed; this does not prove physical mouse or touch behavior on every device. No hardware performance claim is made.

Layer order is floors → grid → sorted props and depth probe → diagnostic pivot markers. Grid lines are occluded by opaque prop pixels. Pivot dots intentionally remain an inspection overlay. Ground-Y sorting is per sprite, not a per-pixel or multi-cell occlusion model; large crossing walls may still need split geometry.

## Characters, animation and equipment — 20 October 2026

Sources: `assets-src/characters/{hero,enemy,equipment}-v1.png` (unmodified imagegen output from the Arkadia discussion). `node scripts/extract-characters.mjs` writes `public/assets/characters/{hero,revenant,equipment}.png` + `manifest.json`; `node scripts/inspect-characters.mjs` writes pivot/onion-skin evidence; `node scripts/verify-characters.mjs` (or `DEMO_URL=… node scripts/verify-characters.mjs`) is the browser smoke test and also re-runs `scripts/check-browser.js`.

- Sheets already carry real alpha (≈73 % fully transparent); the dark glow seen in viewers is RGB stored under alpha 0. Alpha < 16 is zeroed in the output so no background colour can bleed through filtering.
- Slicing is by 8-connected alpha components, not a 256 px grid: each sheet holds exactly 24 figures (12 equipment objects) plus 1–3 px specks. Several poses cross the nominal cell borders (hero attack 4/5 and death 6, revenant attack), so grid crops would leak neighbours. Each frame copies only its own component pixels into a padded cell (4 px gutter, border transparency asserted).
- Pivot: one ground pivot per character. Idle frame 0 anchors at its feet; other frames are seated on their lowest feet row and registered horizontally by alpha-mask IoU (loops to the clip head, one-shots frame-to-frame). All cells share the same pivot pixel, so the sprite anchor never changes.
- Clips (one direction, south-east; west = horizontal mirror): idle 6f@6, move 6f@10 hero / @7 revenant, attack 6f@12 hero / @10 revenant (impact frame 3), hit = row 4 frames 1–2 @10, die = row 4 frames 3–6 @8 holding the last frame. Atlas scale 0.5 × source, displayed at 1.1 (idle hero ≈ 116 world px on a 128 × 64 tile), mip-mapped, integer screen positions.
- Arena: WASD move, Space attack, R revive; arrow keys still drive the depth probe. Auto-battle drives the hero; only the 8 nearest revenants engage, the rest keep a ring. Equipment panel uses the 4 × 3 atlas (icons only — not armour attachments).
- Limits: AI pose drift remains (torso drift ≤ 3.8 atlas px in idle, ≤ 5.4 in run); no north/back-facing art; no collision with props; hit/death shares one row; atlas icons are not wearable layers.

## Character movement and identity v2

Current implementation supersedes the single-direction character notes above. Hero uses cobalt blue/silver, revenants rust red/ochre. Idle and locomotion have front/back art with horizontal mirroring; W/up shows the back and stopped actors keep their facing. Step phase follows actual projected distance, with equal screen speed across directions and stable head height in move clips. Attacks, hit and death still use front art.

Sources and exact imagegen prompts: [character-prompts-v2.md](docs/character-prompts-v2.md). Visual results, verification and remaining AI-art limits: [character-motion-v2.md](docs/character-motion-v2.md). Runtime atlases now have 36 frames each; regenerate with `node scripts/extract-characters.mjs`. Public preview remains https://arkadia-whachat.fural.space/.

## Mobile blank arena recovery — 20 October 2026

A reported 404 for the gallery-only `wall-b.png` could abort scene startup. The world now loads only its required textures and retries transient required-texture failures. Mobile settings, camera controls, visible loading/error recovery and renderer fallback are verified with `node scripts/verify-mobile.mjs`, including injected 404s and nontransparent rendered-pixel checks. See `docs/mobile/implementation.md`.

## Single-page app and asset loading bar — 21 October 2026

`index.html` is the only page. It paints the loading screen from inline CSS before any script runs; `src/app/main.ts` is the router (today `/` → the Stronghold, lazy-loaded) and `src/app/loader.ts` drives the bar. `stronghold.html` is gone: every server (`vite`, `server.mjs`, the live loader) serves index.html for directory and extensionless paths and redirects any other `.html` page, including `/stronghold.html`, to `/` with its query (`/stronghold.html?time=0.5` → `/?time=0.5`). The old arena page is kept as `arena.html` for reference only.

The bar counts real steps: every Stronghold artwork file, then the hero atlas, then the first world raster; it only moves forward and leaves once the world has painted. A failed load keeps the screen up with the reason and a *Try again* button. `node scripts/verify-spa-loading.mjs` (or `DEMO_URL=…`) slows artwork requests to check all of this plus the redirects and a 404 recovery; screenshots in `docs/spa-loading/`. Publish with `node scripts/publish-spa.mjs` from a clean checkout.

## Co-op server — 21 October 2026

The Stronghold now runs on an authoritative Go game server (`server/`, Go 1.25, one dependency: `github.com/coder/websocket`). One binary serves the built client (same single-page routes as `server.mjs`) and the co-op WebSocket at `/ws`. Rooms are invite codes for 2–4 guests (no accounts); each room's world ticks at 20 Hz only while someone is connected and pauses when empty. The server owns hero positions, revenant packs and AI, auto attack, damage, kills, safe-zone healing, the gate and the day clock (1 real minute = 1 game hour). The client sends one walk input per tick; the own hero is predicted and reconciled, other heroes and revenants are interpolated 100 ms behind, and other heroes carry name tags and health bars. Solo play is a room of one; without a reachable server (or with `?offline=1`) the old local simulation runs. The economy stays in `localStorage`.

- Run locally: `npm run build && (cd server && go run ./cmd/arkadia)` with `SITE_DIR=../dist`, or `cd server && PORT=8787 go run ./cmd/arkadia` beside `npx vite` (Vite proxies `/ws` and `/api` to port 8787).
- Tests: `cd server && go test ./...` (sim, rooms, WebSocket, static routes); `node scripts/coop-smoke.mjs` (two headless protocol clients plus a cheating one); `npm run build && node scripts/coop-browser.mjs` (two browser tabs in one room, screenshots in `docs/coop/`).
- Collision data: `node scripts/export-coop-nav.mjs` re-exports the sprite footprints to `server/internal/sim/nav.json` and `public/coop/nav.json` after any court sprite changes.
- Release: `scripts/fural-deploy.sh` (tests, builds, stages only the files the game loads and publishes the custom sandbox `arkadia-coop`, https://arkadia-coop-whachat.fural.space).
