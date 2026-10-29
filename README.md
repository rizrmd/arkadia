# Arkodia — Historical Archive

**Obsolete repository. No active development or deployments.**

This repository, formerly named arkadia, is retained for historical reference.
Active repositories: [arkodia-game](https://github.com/rizrmd/arkodia-game) and
[arkodia-editor](https://github.com/rizrmd/arkodia-editor).

Access this archive only inside the shared custom sandbox **arkodia-archived**
(CSc638ec2a0373608800d3a680), at $HOME/repos/arkodia-archived. Do not clone,
mirror, copy, fetch or restore it or its historical backup into a member/personal
sandbox, and do not register or repair a member workspace for it. Use the
shared sandbox terminal/file manager or fural-agent sandboxes exec.

The complete-history backup is retained inside that shared sandbox at
$HOME/backups/arkadia-20261030. See AGENTS.md and the project Knowledge page
**Archived Repository — Access Policy** for the access rules.

The material below describes historical behavior and is not current setup guidance.

---

## Arkodia — Perbatasan Abu / asset lab

Run `npm ci`, `npm run extract`, `npm run build`, then `node server.mjs` (port 3000). The extraction requires `../attachments/kit-or-preview-1.png`, the original attachment DA0679ae3e0624f52236ea60ea. Its unmodified copy is retained in public/assets/source-kit.png.

The application renders 100 individual floor sprites and seeded individual props using PixiJS 8. Grid is 128 × 64; floors are normalized to that size. Props are sorted by projected ground Y with a stable insertion order for ties. Arrow keys move an amber geometric depth probe; this probe is a diagnostic marker, not an art asset. Toggle Y-sort to compare incorrect insertion-order occlusion. Drag to pan, wheel to zoom around cursor, reset to fit. The source dialog shows the original kit and all twelve extracted sprites, with a downloadable crop manifest.

No arena preview is loaded by the application. The other supplied image (DA3593cef66dddda720f68862b) was inspected as the AI composition reference only and is excluded from the site.

## Extraction limits

Hand-reviewed crop rectangles, original transparent alpha, alpha values below 24/255 removed. No generated replacement art, invented texture, or global background removal. The generated sheet already has alpha. Shapes are imperfect diamonds and have baked side faces/shadows; stretching to the nominal 2:1 footprint does not make them seamless. The floor motif visibly repeats. Props have approximate hand-set pivots and sizes, not standardized physical footprints. Both wall sprites face similar directions; the demo does not claim a finished connected wall kit. Alpha fringe pixels and sheet-edge color contamination may remain. No characters, animation, collision, draw-call benchmark, mobile performance or gameplay proof.

## Verification

`npm run build` performs TypeScript checks and Vite production build. `scripts/verify.mjs` is a Playwright interaction test; local downloaded Chromium needs compatible system libraries. Managed Fural browser verification is performed separately if that runtime is unavailable. The static site server uses Node built-ins and a foreground boot command, with no npm or Vite dependency at runtime.

## One preview sandbox — 22 October 2026

Every public preview now lives in **one** custom sandbox, `arkadia`: https://ark-whachat.fural.space/. The former sandboxes `arkadia-stronghold`, `arkadia-coop`, `arkadia-enemies` and `ember-warden-review` were merged into it and deleted; their hostnames no longer resolve.

| Path | What | Former sandbox |
|------|------|----------------|
| `/` | The game: one build from `feat/stronghold` with `feat/coop-server` merged in. Solo, or a co-op room via `/?room=CODE`; `?offline=1` (or no reachable server) runs the local simulation | arkadia-stronghold + arkadia-coop |
| `/ws`, `/api/rooms/{code}`, `/healthz` | Co-op WebSocket and room API (Go server) | arkadia-coop |
| `/rift-runner/v1/`, `/rift-runner/v2/`, `/knight-footfalls/review.html`, `/<review>/…` | Every review folder and evidence file, same paths as before | arkadia-stronghold |
| `/enemies/v1/` | Ashfang & Mire Imp review | arkadia-enemies |
| `/ember-warden-review/` | Ember Warden animation review | ember-warden-review |

`scripts/arkodia/gateway.mjs` serves all of it from disk on port 3000 and runs the Go game server on 127.0.0.1:3001 behind it. Releases are **layers** applied in order when the sandbox boots (`scripts/arkodia/publish-layer.mjs`):

- **The game**: `scripts/fural-deploy.sh` (also `fural-agent repos ship`): build, Go tests, co-op smoke test, then one release with the Go binary, the files the game loads and this commit's gateway.
- **Review pages and evidence**: `node scripts/arkodia/publish-layer.mjs --dir DIR --prefix /folder`, or `publishLayer({name, files, prefix})` from a script (`scripts/ember-warden/publish.mjs`, `scripts/publish-rift-runner.mjs`, `scripts/rift-runner/publish-prototype.mjs`). A layer never carries the game page.
- `node scripts/arkodia/verify-live.mjs` checks the game (co-op and offline) and the review pages in Chromium (`docs/arkodia-sandbox/`).

The per-feature `scripts/publish-*.mjs` one-offs that patched the old in-memory loader of `arkadia-stronghold` were removed; each release they made is part of today's site, and running one would have rolled the game back. See `docs/arkodia-sandbox/README.md`.

## Verified live result — 20 October 2026

https://ark-whachat.fural.space/ (retired) — custom sandbox arkadia, foreground `node app.mjs`, port 3000. `scripts/package-site.mjs` bundles the Vite output into a single Node file to avoid timeout while the platform copies many resources. All packaging scripts stage their output under the ignored `.publish/<name>/` folder (never the repo root). That release was published with `sandboxes serve --name arkadia … --cmd "node app.mjs"`; do not run it now — it would replace the gateway boot script of today's `arkadia` sandbox. Use `scripts/arkodia/publish-layer.mjs`.

`node scripts/final-verify.mjs` tests the public URL in Chromium. The browser uses HOME-only Ubuntu libraries on Alpine; organization runtime now includes their idempotent setup (scripts/organization-setup.sh). Playwright Chromium requires --no-zygote --single-process here; this is browser test configuration, not a site requirement. The test verifies 13 conditions, including grid below props, true sorting toggle, deterministic seeds, camera handlers and transparency toggles. Final deterministic camera assertions use dispatched events with pointer-capture bypassed; this does not prove physical mouse or touch behavior on every device. No hardware performance claim is made.

Layer order is floors → grid → sorted props and depth probe → diagnostic pivot markers. Grid lines are occluded by opaque prop pixels. Pivot dots intentionally remain an inspection overlay. Ground-Y sorting is per sprite, not a per-pixel or multi-cell occlusion model; large crossing walls may still need split geometry.

## Characters, animation and equipment — 20 October 2026

Sources: `assets-src/characters/{hero,enemy,equipment}-v1.png` (unmodified imagegen output from the Arkodia discussion). `node scripts/extract-characters.mjs` writes `public/assets/characters/{hero,revenant,equipment}.png` + `manifest.json`; `node scripts/inspect-characters.mjs` writes pivot/onion-skin evidence; `node scripts/verify-characters.mjs` (or `DEMO_URL=… node scripts/verify-characters.mjs`) is the browser smoke test and also re-runs `scripts/check-browser.js`.

- Sheets already carry real alpha (≈73 % fully transparent); the dark glow seen in viewers is RGB stored under alpha 0. Alpha < 16 is zeroed in the output so no background colour can bleed through filtering.
- Slicing is by 8-connected alpha components, not a 256 px grid: each sheet holds exactly 24 figures (12 equipment objects) plus 1–3 px specks. Several poses cross the nominal cell borders (hero attack 4/5 and death 6, revenant attack), so grid crops would leak neighbours. Each frame copies only its own component pixels into a padded cell (4 px gutter, border transparency asserted).
- Pivot: one ground pivot per character. Idle frame 0 anchors at its feet; other frames are seated on their lowest feet row and registered horizontally by alpha-mask IoU (loops to the clip head, one-shots frame-to-frame). All cells share the same pivot pixel, so the sprite anchor never changes.
- Clips (one direction, south-east; west = horizontal mirror): idle 6f@6, move 6f@10 hero / @7 revenant, attack 6f@12 hero / @10 revenant (impact frame 3), hit = row 4 frames 1–2 @10, die = row 4 frames 3–6 @8 holding the last frame. Atlas scale 0.5 × source, displayed at 1.1 (idle hero ≈ 116 world px on a 128 × 64 tile), mip-mapped, integer screen positions.
- Arena: WASD move, Space attack, R revive; arrow keys still drive the depth probe. Auto-battle drives the hero; only the 8 nearest revenants engage, the rest keep a ring. Equipment panel uses the 4 × 3 atlas (icons only — not armour attachments).
- Limits: AI pose drift remains (torso drift ≤ 3.8 atlas px in idle, ≤ 5.4 in run); no north/back-facing art; no collision with props; hit/death shares one row; atlas icons are not wearable layers.

## Character movement and identity v2

Current implementation supersedes the single-direction character notes above. Hero uses cobalt blue/silver, revenants rust red/ochre. Idle and locomotion have front/back art with horizontal mirroring; W/up shows the back and stopped actors keep their facing. Step phase follows actual projected distance, with equal screen speed across directions and stable head height in move clips. Attacks, hit and death still use front art.

Sources and exact imagegen prompts: [character-prompts-v2.md](docs/character-prompts-v2.md). Visual results, verification and remaining AI-art limits: [character-motion-v2.md](docs/character-motion-v2.md). Runtime atlases now have 36 frames each; regenerate with `node scripts/extract-characters.mjs`. Public preview remains https://ark-whachat.fural.space/.

## Mobile blank arena recovery — 20 October 2026

A reported 404 for the gallery-only `wall-b.png` could abort scene startup. The world now loads only its required textures and retries transient required-texture failures. Mobile settings, camera controls, visible loading/error recovery and renderer fallback are verified with `node scripts/verify-mobile.mjs`, including injected 404s and nontransparent rendered-pixel checks. See `docs/mobile/implementation.md`.

## Single-page app and asset loading bar — 21 October 2026

`index.html` is the only page. It paints the loading screen from inline CSS before any script runs; `src/app/main.ts` is the router (today `/` → the Stronghold, lazy-loaded) and `src/app/loader.ts` drives the bar. `stronghold.html` is gone: every server (`vite`, `server.mjs`, the live loader) serves index.html for directory and extensionless paths and redirects any other `.html` page, including `/stronghold.html`, to `/` with its query (`/stronghold.html?time=0.5` → `/?time=0.5`). The old arena page is kept as `arena.html` for reference only.

The bar counts real steps: every Stronghold artwork file, then the hero atlas, then the first world raster; it only moves forward and leaves once the world has painted. A failed load keeps the screen up with the reason and a *Try again* button. `node scripts/verify-spa-loading.mjs` (or `DEMO_URL=…`) slows artwork requests to check all of this plus the redirects and a 404 recovery; screenshots in `docs/spa-loading/`. Publish with `node scripts/publish-spa.mjs` from a clean checkout.

## Co-op server — 21 October 2026

The Stronghold now runs on an authoritative Go game server (`server/`, Go 1.25, one dependency: `github.com/coder/websocket`). One binary serves the built client (same single-page routes as `server.mjs`) and the co-op WebSocket at `/ws`. Rooms are invite codes for 2–4 guests (no accounts); each room's world ticks at 20 Hz only while someone is connected and pauses when empty. The server owns hero positions, revenant packs and AI, auto attack, damage, kills, safe-zone healing, the gate and the day clock (1 real minute = 1 game hour). The client sends one walk input per tick; the own hero is predicted and reconciled, other heroes and revenants are drawn on an adaptive render clock (interpolated, with up to 200 ms of extrapolation when a snapshot is late), and other heroes carry name tags and health bars. Solo play is a room of one; without a reachable server (or with `?offline=1`) the old local simulation runs. The economy stays in `localStorage`.

- Run locally: `npm run build && (cd server && go run ./cmd/arkodia)` with `SITE_DIR=../dist`, or `cd server && PORT=8787 go run ./cmd/arkodia` beside `npx vite` (Vite proxies `/ws` and `/api` to port 8787).
- Tests: `cd server && go test ./...` (sim, rooms, WebSocket, static routes); `node scripts/coop-smoke.mjs` (two headless protocol clients plus a cheating one); `npm run build && node scripts/coop-browser.mjs` (two browser tabs in one room, screenshots in `docs/coop/`).
- Smooth motion: the server walks a hero on through up to three ticks of late input and acknowledges those inputs without walking twice (`ow` in each snapshot); the client paces its inputs (±5%) to keep one or two queued at the server (`q`). Remote heroes and revenants use `src/stronghold/net/timeline.ts`: delay = one tick + the 95th percentile of snapshot lateness, a clock warped at most ±6% toward it, extrapolation capped at 200 ms, corrections blended over 100 ms. `node scripts/coop-interpolation.mjs` checks it deterministically against the old fixed 100 ms interpolation on four network profiles (`docs/coop/interpolation.json`, chart `interpolation-mobile.webp`); `npm run build && PROFILE=lan|mobile|bad node scripts/coop-smoothness.mjs` measures the drawn speed in two browser tabs over a delayed, jittery WebSocket (`ROOT=` another built checkout for A/B runs).
- Frame budget: a room adds three revenants per extra hero (17 with four). Each revenant is its own small canvas moved by the compositor and composed again only when its look changes (frame, facing, light, hit flash, sun, zoom or an upright cutting it out); heroes and allies redraw only on such changes too, not every step they walk. Before, two full-screen canvases were cleared and redrawn every frame. `npm run build && node scripts/coop-frame-budget.mjs` (`PHONE=1` for a throttled phone, `ROOT=… TAG=upstream` for A/B) measures one tab in a room of four; `node scripts/chart-coop-frame-budget.mjs` draws `docs/coop/frame-budget.webp`.
- Collision data: `node scripts/export-coop-nav.mjs` re-exports the sprite footprints to `server/internal/sim/nav.json` and `public/coop/nav.json` after any court sprite changes.
- Release: `scripts/fural-deploy.sh` (tests, builds, stages only the files the game loads and publishes it as a release of the `arkadia` sandbox, https://ark-whachat.fural.space/).

## Skill VFX on NixieFX — 23 October 2026

Every skill, hit, level-up and combo effect is a [NixieFX](https://nixiefx.com/) particle effect (npm `nixie-fx`, PixiJS runtime), replacing the hand-drawn canvas shapes of `combat-vfx.ts`. Effects are written as compact recipes (`vfx/recipes/<hero>.mjs`) built from reusable layers, skill kits and palettes (`scripts/vfx/lib/`), compiled into the NixieFX editor project in `vfx/`, validated and exported by the NixieFX CLI, and packed into `public/vfx/skills.bin`: `npm run vfx`. In the game `src/fx/` plays them by cue (`flame-fan.cast`, `hit.crit`, …) on two transparent WebGL planes, ground decals under the figures and particles over them; each hero is an FX profile that extends `shared`. `/fx-lab` previews every hero's skills. Guide: [vfx/README.md](vfx/README.md); checks: `node scripts/vfx/verify.mjs`, screenshots: `scripts/vfx/capture.mjs` (lab) and `scripts/vfx/capture-game.mjs` (game), in `docs/nixie-fx/`.
