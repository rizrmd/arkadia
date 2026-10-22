## Sprite player

An iframe-ready player for grid sprite sheets (rows = headings, columns = frames). Live: https://ark-whachat.fural.space/rift-runner/sprite-player/

Sample: the Rift Runner idle atlas from Knowledge (Rift Runner › Sprites & Animation › Idle, attachment `DA0addbe3d3b0d4d9e3631bdc0`): 8 headings × 8 frames, 384 × 384 cells, foot pivot (192, 360), 5 fps. The unmodified source is `assets-src/sprite-player/rift-runner-idle.png`. `node scripts/sprite-player/prepare-sample.mjs` writes the full and half-size WebP atlases, the sheet description (`.json`, plus the same as `.js`) and an animated 8-heading preview for the Knowledge page. Frames are copied from the sheet, not redrawn or interpolated.

### Embedding

Knowledge **pages** sanitize their Markdown and strip `<iframe>`, so the interactive player is embedded in a Knowledge **design** document (each design frame is an iframe with scripts enabled). The page shows the animated preview inline and links to the design document.

```html
<iframe src="https://ark-whachat.fural.space/rift-runner/sprite-player/?row=S" width="560" height="620" style="border:0" title="Rift Runner idle"></iframe>
```

| Parameter | Effect |
| --- | --- |
| `manifest=sheets/x.js` | Sheet description (default: the Rift Runner idle sample). Use the `.js` form inside Knowledge design frames: they sandbox the player to an opaque origin, where `fetch()` of a `.json` fails without CORS |
| `sheet=URL&cell=384&cols=8&rows=8&pivot=192,360&fps=5&labels=N,NE,…` | Any sheet without a description |
| `row=S` or `row=4` | Starting heading |
| `fps`, `frame`, `bg=dark\|light\|checker\|snow`, `guides=1`, `all=1`, `autoplay=0` | Playback and display |
| `controls=full\|min\|none` | Full controls, transport only, or none |

Controls: heading buttons, play/pause, previous/next, frame scrubber, FPS, background, pivot guide and an all-headings grid. Keys: Space, ←/→ frames, ↑/↓ heading. A host page can send `postMessage({type:'sprite-player', action:'play'|'pause'|'row'|'frame'|'fps', value})`. The half-size atlas is used while cells are drawn at about half size or smaller; the full atlas loads only when needed. Reduced-motion users start paused.

### Verification

`node scripts/sprite-player/verify.mjs` (local files) and `BASE=https://ark-whachat.fural.space node scripts/sprite-player/verify.mjs` (deployed) run Chromium with the player inside a cross-origin iframe. They check playback inside a Knowledge-style sandboxed design frame, timed playback, pause/step/wrap, all 64 heading/frame cells, keyboard, URL parameters, full/half atlas selection, 340 px width without overflow, postMessage control, the error state and zero page/resource errors. Results: `verification.json`, `verification-live.json`; screenshots in this folder. `node scripts/sprite-player/publish.mjs` deploys the layer and writes `deployment.json` with per-file SHA-256 checks.
