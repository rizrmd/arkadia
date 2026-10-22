## Sprite player

An iframe-ready player for grid sprite sheets (rows = headings, columns = frames). Live: https://ark-whachat.fural.space/rift-runner/sprite-player/

Built-in pose samples from Knowledge (`Art Direction › Characters › Rift Runner / Ember Warden › Sprites & Animation`):
- **Rift Runner — Idle** (`NKBD5d29155bc5f9d7ba568672e6`, attachment `DA0addbe3d3b0d4d9e3631bdc0`): 8 headings × 8 frames, 384 × 384 cells, foot pivot (192, 360), 5 fps, Loop.
- **Rift Runner — Hurt** (`NKBDd93e7ee52b19d68efa7907c6`, attachment `DA8500d2aa02f2d22c68d1610a`): 8 headings × 8 frames, 384 × 384 cells, foot pivot (192, 360), 8 fps, Once (holds final frame).
- **Rift Runner — Death** (`NKBDc0435b17089590ebf758c5b0`, attachment `DA9dc6c5997e83e261128fb23c`): 8 headings × 8 frames, 384 × 384 cells, foot pivot (192, 360), 8 fps, Once (holds final frame).
- **Rift Runner — Run** (`NKBD7b2d30906c8a963483c32888`, attachment `DA491cd29951c4bbf15d80f1dd`): 8 headings × 8 frames, 384 × 384 cells, foot pivot (192, 360), 10 fps, Loop.
- **Ember Warden — Idle** (`NKBD9c1df4ae8524e49a749059f3`, attachment `DA643ce3d7b15fb6e943e49c3c`): 8 headings × 8 frames, 384 × 384 cells, foot pivot (192, 360), 5 fps, Loop.
- **Ember Warden — Hurt** (`NKBD3acc769cfee0487d59def5e6`, attachment `DAeed87d064b6d95538b4794cd`): 8 headings × 8 frames, 384 × 384 cells, foot pivot (192, 360), 8 fps, Once (holds final frame).
- **Ember Warden — Death** (`NKBD3c1f34f5ca7b63f32516d2e9`, attachment `DAf848defd25fb17b5fa37b2c1`): 8 headings × 8 frames, 384 × 384 cells, foot pivot (192, 360), 8 fps, Once (holds final frame).
- **Ember Warden — Run** (`NKBDf18fa50ee1a4cc98cc5d2106`, attachment `DA9fd2331401c246424a7402bf`): 8 headings × 8 frames, 384 × 384 cells, foot pivot (192, 360), 10 fps, Loop.

`node scripts/sprite-player/prepare-sample.mjs` writes the full and half-size WebP atlases, the sheet descriptions (`.json`, plus `.js`) and animated 8-heading previews for all 8 hero/pose sheets. Frames are copied from the sheet, not redrawn or interpolated.

### Embedding

Knowledge pages render `<iframe>` from `*.fural.space` hosts in a preview card (sandbox `allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox`, lazy, no referrer). Each per-pose Knowledge page under `Sprites & Animation` (`Idle`, `Hurt`, `Death`, `Run`) embeds its dedicated pose player directly.

```html
<iframe src="https://ark-whachat.fural.space/rift-runner/sprite-player/?hero=rift-runner&pose=idle&row=S&controls=simple" title="Rift Runner — Idle sprite player" width="100%" height="560"></iframe>
<iframe src="https://ark-whachat.fural.space/rift-runner/sprite-player/?hero=ember-warden&pose=idle&row=S&controls=simple" title="Ember Warden — Idle sprite player" width="100%" height="560"></iframe>
```

| Parameter | Effect |
| --- | --- |
| `hero=ember-warden\|rift-runner` | Select built-in hero (`ember`, `ember-warden`, `rift` or `rift-runner`) |
| `pose=idle\|hurt\|death\|run` | Select built-in pose (`action=` also accepted; `Idle` & `Run` default to Loop; `Hurt` & `Death` default to Once / hold final frame) |
| `manifest=sheets/x.js` | Explicit sheet description (`sheets/{rift-runner,ember-warden}-{idle,hurt,death,run}.js`). Use the `.js` form inside Knowledge design frames |
| `sheet=URL&cell=384&cols=8&rows=8&pivot=192,360&fps=5&labels=N,NE,…` | Any sheet without a description |
| `row=S` or `row=4` | Starting heading (`N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW`) |
| `fps`, `frame`, `bg=dark\|light\|checker\|snow`, `guides=1`, `all=1`, `autoplay=0` | Playback and display |
| `controls=simple` | Embed mode: 8-direction switcher (`N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW`), Play/Pause, Loop/Once and zoom (`−`, `%`, `+`, `Reset`) |
| `controls=full\|min\|none` | Full controls, transport only, or none |
| `loop=0\|1` | Override default repeat mode (`0` = Once and hold last frame; `1` = Loop) |
| `zoom=1.5` | Start zoomed (50–400 %); drag pans while zoomed |

Controls: 8-direction heading switcher, play/pause, previous/next, frame scrubber, FPS, background, pivot guide and an all-headings grid. Keys: Space, ←/→ frames, ↑/↓ heading, +/− zoom, 0 reset zoom; Ctrl+wheel zooms and double-click resets. A host page can send `postMessage({type:'sprite-player', action:'play'|'pause'|'row'|'frame'|'fps'|'loop', value})`. The half-size atlas is used while cells are drawn at about half size or smaller; the full atlas loads only when needed. Reduced-motion users start paused.

### Verification

`node scripts/sprite-player/verify.mjs` (local files) and `BASE=https://ark-whachat.fural.space node scripts/sprite-player/verify.mjs` (deployed) run Chromium with the player inside a cross-origin iframe. They check playback inside a Knowledge page iframe and a sandboxed design frame, timed playback, pause/step/wrap, simple embed controls with the 8-direction switcher, all 8 hero/pose manifests and their default Loop/Once modes, zoom/pan/reset, all 64 heading/frame cells, keyboard, URL parameters, full/half atlas selection, 340 px width without overflow, postMessage control, the error state and zero page/resource errors. Results: `verification.json`, `verification-live.json`; screenshots in this folder. `node scripts/sprite-player/publish.mjs` deploys the layer and writes `deployment.json` with per-file SHA-256 checks.
