## Sprite player

An iframe-ready player for grid sprite sheets (rows = headings, columns = frames). Live: https://ark-whachat.fural.space/rift-runner/sprite-player/

Sample: the Rift Runner idle atlas from Knowledge (Rift Runner › Sprites & Animation › Idle, attachment `DA0addbe3d3b0d4d9e3631bdc0`): 8 headings × 8 frames, 384 × 384 cells, foot pivot (192, 360), 5 fps. The unmodified source is `assets-src/sprite-player/rift-runner-idle.png`. `node scripts/sprite-player/prepare-sample.mjs` writes the full and half-size WebP atlases, the sheet description (`.json`, plus the same as `.js`) and an animated 8-heading preview for the Knowledge page. Frames are copied from the sheet, not redrawn or interpolated.

### Embedding

Since the fural.space release of 22 October 2026 (23:48 WIB), Knowledge pages render `<iframe>` from `*.fural.space` hosts in a preview card (sandbox `allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox`, lazy, no referrer). The Rift Runner Idle page embeds the player directly; the design document "Idle — Sprite Player" holds the same player. Before that release, pages stripped `<iframe>`.

```html
<iframe src="https://ark-whachat.fural.space/rift-runner/sprite-player/?row=S&controls=simple" title="Rift Runner idle" width="100%" height="560"></iframe>
```

| Parameter | Effect |
| --- | --- |
| `manifest=sheets/x.js` | Sheet description (default: the Rift Runner idle sample). Use the `.js` form inside Knowledge design frames: they sandbox the player to an opaque origin, where `fetch()` of a `.json` fails without CORS |
| `sheet=URL&cell=384&cols=8&rows=8&pivot=192,360&fps=5&labels=N,NE,…` | Any sheet without a description |
| `row=S` or `row=4` | Starting heading |
| `fps`, `frame`, `bg=dark\|light\|checker\|snow`, `guides=1`, `all=1`, `autoplay=0` | Playback and display |
| `controls=simple` | Embed mode: only Play/Pause, Loop/Once and zoom (−, level, +, Reset) |
| `controls=full\|min\|none` | Full controls, transport only, or none |
| `loop=0` | Play once and stop on the last frame (Play restarts) |
| `zoom=1.5` | Start zoomed (50–400 %); drag pans while zoomed |

Controls: heading buttons, play/pause, previous/next, frame scrubber, FPS, background, pivot guide and an all-headings grid. Keys: Space, ←/→ frames, ↑/↓ heading, +/− zoom, 0 reset zoom; Ctrl+wheel zooms and double-click resets. A host page can send `postMessage({type:'sprite-player', action:'play'|'pause'|'row'|'frame'|'fps', value})`. The half-size atlas is used while cells are drawn at about half size or smaller; the full atlas loads only when needed. Reduced-motion users start paused.

### Verification

`node scripts/sprite-player/verify.mjs` (local files) and `BASE=https://ark-whachat.fural.space node scripts/sprite-player/verify.mjs` (deployed) run Chromium with the player inside a cross-origin iframe. They check playback inside a Knowledge page iframe and a sandboxed design frame (both emulated with fural.space's sandbox attributes), timed playback, pause/step/wrap, simple embed controls, Loop/Once, zoom/pan/reset, all 64 heading/frame cells, keyboard, URL parameters, full/half atlas selection, 340 px width without overflow, postMessage control, the error state and zero page/resource errors. Results: `verification.json`, `verification-live.json`; screenshots in this folder. `node scripts/sprite-player/publish.mjs` deploys the layer and writes `deployment.json` with per-file SHA-256 checks.
