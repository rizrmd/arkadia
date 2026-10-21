# Stronghold lighting and day/night cycle

Status: **implemented** for the Stronghold only (Frostpass and other pages are unchanged). Lighting is cosmetic and does not touch the economy or save data.

## What players see

One Stronghold day lasts **24 real minutes**: Night → Dawn → Day → Golden hour → Dusk → Night. The live clock derives from `Date.now()`, so every visit shows the same time of day; the in-game clock can pin any hour instead. In full daylight the colours are unchanged, and the sun casts shadows that move through the day. As evening falls, the ambient light shifts to dusk violet and then to moonlit blue. Windows, hearths, lanterns, gate torches, braziers, altar candles and the Mage Tower rune stay at full painted brightness, cast warm or arcane light pools on the paving, and glow. Flames flicker gently while the camera is still.

![Night, dawn, day and dusk (desktop)](https://arkadia-custom-whachat.fural.space/lighting-plan/runtime-phases.webp)

![Night, dawn, day and dusk (portrait 390 × 844)](https://arkadia-custom-whachat.fural.space/lighting-plan/runtime-portrait.webp)

![Night at default levels](https://arkadia-custom-whachat.fural.space/lighting-plan/runtime-night.webp)

![Night with every building at level 3 (Forge hearth lit)](https://arkadia-custom-whachat.fural.space/lighting-plan/runtime-night-level3.webp)

### Sun shadows

From 06:00 to 18:00, every upright sprite (buildings, walls, bastions, gateway, trees, rocks, props) casts a soft shadow on the ground. The sprites are painted lit from the upper left, so the sun stands there at noon and shadows fall short toward the lower right. Through the day the sun turns 180°, so shadows reach long to the right after sunrise and long to the left before sunset. Shadow length is capped at 1.7× the object's height, so low-sun shadows never flood the court. Shadows fade in after sunrise and out before sunset, so there are none at night. The ambient tint darkens them further at golden hour.

![Sun shadows at 07:30, 12:00 and 16:30](https://arkadia-custom-whachat.fural.space/lighting-plan/sun-shadows.webp)

#### Fix: stray shadow stripes (21 October 2026)

The first version drew each sprite's flat 2D silhouette sheared along the sun. A sprite has no depth, so with a low sun each shadow collapsed into a thin stripe that ran across the court, detached from its building (reported at 07:46 on mobile):

![Bug report: thin horizontal shadow stripes across the court at 07:46](https://arkadia-custom-whachat.fural.space/lighting-plan/shadow-bug-report.webp)

Shadows now come from a solid volume. Each object stands on a ground footprint, and the sun sweeps that footprint, topped by the sprite's roof line, across the ground. Same view at 07:45, before (left) and after (right):

![07:45 before and after: stripes replaced by attached shadows](https://arkadia-custom-whachat.fural.space/lighting-plan/shadow-fix-0745.webp)

#### Follow-up: stripes still on a phone after the fix (21 October 2026)

Two hours after the fix shipped, the same phone still showed stripes at 08:15. The server was already serving the fixed bundle, and the same 08:15 view renders attached shadows in a fresh browser. The phone's tab had been loaded before the release and was never reloaded, so it kept running the old shadow code. Phone screenshot (left) and a fresh load of the live build at 08:15 (right):

![08:15 on a stale phone tab (left) and a fresh load of the live build (right)](https://arkadia-custom-whachat.fural.space/lighting-plan/shadow-stale-tab-0815.webp)

The Stronghold now picks up releases on its own. When the tab comes back into view (screen unlocked, app or tab switched back, page restored from the back/forward cache), it fetches `stronghold.html` and compares the listed bundle with the one it is running, at most once every 5 minutes. If they differ, it reloads. Progress and the pinned hour live in `localStorage`, so the reload loses nothing. This only runs in production builds, never on the Vite dev server.

If a phone still shows stripes, reload the page once. Tabs opened before this release do not have the check yet.

#### Fix: slow shadow updates (21 October 2026)

Every time the sun moved to its next 15-minute step (every 15 s of a live day, and on every clock preset or slider release), the Stronghold redrew the **whole 3738 × 2243 world** from scratch, including snow, paving, every sprite and every foundation, just to move the shadows. Profiling showed that building and blurring the shadow mask took only about 50 ms; almost all of the cost was this redraw.

The world is now drawn once as two cached layers: the **ground** (snow, paving, ground decals) and the **uprights** (buildings, walls, trees, props). A sun step rebuilds only the small 0.35× shadow mask and recomposes ground + shadow + uprights. The result is pixel-identical (mean difference 0.05/255 across four hours on desktop and portrait).

| Sun step, headless Chromium | Before | After |
| --- | --- | --- |
| Desktop, click to shadows on screen (median) | ~600 ms | ~170 ms |
| Desktop, longest main-thread task | ~550 ms | ~130 ms |
| Phone 390 × 844 @3×, 4× CPU, click to shadows | ~2.5 s | ~600 ms |
| Phone, longest main-thread task | ~2.9 s | ~0.55 s |

![07:30 before (left) and after (right): the same shadows at about a quarter of the cost](https://arkadia-custom-whachat.fural.space/lighting-plan/shadow-perf-0730.webp)

A cheaper variant that cut the shadow under each sprite with a 0.35× silhouette mask was rejected because it left a visible light halo around sprites. The cached uprights layer costs one more world-sized canvas (about 33 MB).

### In-game clock

A clock chip in the top-right corner shows the Stronghold hour, its phase and whether the clock is **Live** (following the 24-minute cycle) or **Pinned**. Tap it to open the panel:

- **Set the hour**: a slider from 00:00 to 23:45 in 15-minute steps. Lighting, glow and snow tint follow the thumb every frame. Sun shadows catch up as soon as the thumb rests for 150 ms, and on release.
- **Presets**: Midnight 00:00, Dawn 06:00, Morning 09:00, Noon 12:00, Golden hour 17:00, Dusk 18:45.
- **Return to live clock**: unpins the hour and goes back to the cycle.

A pinned hour is remembered in this browser (`arkadia.stronghold.lighting` = `{"mode":"dynamic","time":0.708}`). Picking an hour also takes over from the `?time` / `?daySpeed` QA parameters by removing them from the URL. Escape closes the panel.

![Clock panel open at 17:00 (desktop)](https://arkadia-custom-whachat.fural.space/lighting-plan/clock-desktop.webp)

![Clock panel at Dusk 18:45 (portrait 390 × 844)](https://arkadia-custom-whachat.fural.space/lighting-plan/clock-mobile.webp)

### URL controls

The URL parameters remain for QA and links:

| URL | Effect |
| --- | --- |
| `/stronghold.html` | Dynamic 24-minute cycle (default) |
| `?lighting=night` / `?lighting=day` | Always night / always day; **remembered** in this browser |
| `?lighting=dynamic` | Back to the cycle (remembered) |
| `?time=0.85` | Freeze at a time of day (0 = midnight, 0.5 = noon); not remembered |
| `?daySpeed=60` | Run the clock 60× faster (QA) |

Users with `prefers-reduced-motion` get no flicker.

## How it works

```d2
direction: right
clock: "daylight.ts (pure clock)" {
  k: "keyframes -> ambient, lights, glow"
  sun: "sunAt -> shadow direction, length"
}
ui: "clock.ts (chip, slider, presets)"
anchors: "light-anchors.ts" {
  a: "authored lights per sprite, source pixels"
}
world: "world-view.ts" {
  paint: "paintWorld: ground + uprights layers"
  cast: "castShadows: 0.35x mask"
}
lighting: "lighting.ts" {
  base: "unlit copy (base)"
  bake: "light pools + emissive masks + bloom"
  compose: "surface = (ground + shadow + uprights) x lightmap + bloom"
}
screen: "#world-layers" {
  snow: "snow tile, pre-tinted"
  surface: "#world-surface (single layer)"
  flicker: "#world-glow flicker, idle only"
}
anchors -> lighting.bake: on building or selection change
world.paint -> lighting.base: capture after raster
world.cast -> lighting.compose: setShadow
clock -> lighting.compose: "tick 1 Hz, quantized"
ui -> lighting.compose: "setTime (pin or live)"
lighting.compose -> world.cast: "new 15-minute sun step"
lighting.compose -> screen.surface
lighting.compose -> screen.snow
lighting.bake -> screen.flicker
```

- **`daylight.ts`**: the pure clock. Keyframes are interpolated in linear light with smoothstep easing, and a readability floor keeps night ambient luma ≥ 0.22. It also handles the URL overrides and the manual clock time (`?time` > pinned hour > `?lighting` mode > live clock). `sunAt(t)` gives the shadow direction, length and strength. The heading on the ground is −30° at sunrise, 60° (lower right) at noon and 150° at sunset. Elevation peaks at 60°, length is capped at 1.7× height, and alpha peaks at 0.4.
- **`light-anchors.ts`**: hand-authored light sources for the 10 lit sprites (Forge levels 1–3, Barracks, Altar, Mage Tower, Expedition Table, Mine, Gateway, Brazier). Each light stores sprite source-pixel coordinates (the same convention as `groundEdges`), a mask radius, its kind (`fire`, `window`, `candle`, `holy`, `arcane`), a ground-pool radius and drop, and an intensity. Lights hidden behind the front walls are mask-only, because the 2D lightmap has no occlusion.
- **`lighting.ts`**:
  - On a building or selection change, it bakes a 0.35×-resolution light canvas: isometric (0.55-flattened) pools, white emissive masks and a colour bloom. Emissive masks are the authored circles intersected with a flame/arcane pixel test, so the parchment map, gold trim and red roofs never light up.
  - After every world raster it keeps the unlit ground (`base`) and the transparent uprights layer from the world view. When the quantized light level or the sun shadow changes, it recomposes `surface = (base + shadow + uprights) × (ambient + lights) + glow`: a few blits, no sprite redraw.
  - The infinite snow uses a pre-tinted copy of its repeat tile (a `data:` URL).
  - The selected building gets a soft extra pool, so it stays readable at night.
  - The sun moves in 15-minute steps (15 real seconds of a live day). On a new step it asks the world view for a new shadow mask (`setShadow`), deferred while the camera moves, and recomposes. The world is never re-rastered for the sun. Clock ticks inside a step only relight.
  - **Clock-drag preview.** Baking recomposes the full 3738 × 2243 surface, and each step re-encoded the snow tile. At one bake per slider step, a drag ran at p95 417 ms per frame (3 s with 4× CPU throttling). While the slider is dragged, the surface instead shows the unlit world. The 807 × 485 lightmap (`multiply`) and bloom (`screen`) blend live over it, and a flat `#world-ambient` layer tints the snow. Each step redraws only the small lightmap, and the clock applies at most one hour per frame. Releasing the slider, or resting on it for 1.5 s, bakes once. When the sun moved, that bake includes the new shadow mask. The preview matches the baked frame to a mean difference below 1/255.
- **`world-view.ts`** has four lighting hooks: create, `capture()` after `paintWorld`, `place()` beside the surface transform, and `setScene()` in `update()`. `paintWorld` draws the ground and ground decals into the surface and every upright sprite into a separate transparent `uprights` canvas, so shadows land between them and never darken a building. `castShadows()` builds the shadow mask and hands it to `lighting.setShadow()`. Each placed sprite is cut into columns about 3.5 world px apart. A column spans its footprint from the back edge to the front edge, and its height is the roof line's height above the back edge. The footprint's front edge is the sprite's lowest opaque pixel in that column. The hidden back edge is that contour reflected through the midpoint of its left and right ends (a footprint parallelogram is centrally symmetric, under any calibrated shear). Trees use a round crown footprint instead. On each sun step, every column's footprint is swept along the sun's offset × height (a convex hexagon) and filled opaque into one 0.35× mask, so overlapping shadows never double-darken. The mask is blurred once (a wider penumbra for longer shadows) and laid over the ground at the shadow alpha. Columns are built once per sprite. Each column is filled on its own, because building one Path2D with thousands of subpaths took about 1 s in Chrome. Pan frames are unchanged.
- **`clock.ts`** is the clock chip and panel. `main.ts` mounts it with `worldView.setTime` and `worldView.subscribeClock`.

### Departures from the plan, with reasons

| Plan | Shipped | Why |
| --- | --- | --- |
| Live `multiply`/`screen` overlay layers | Lighting baked into the surface on change (the plan's fallback) | The overlay layers cost +45–75 ms p95 per pan frame on throttled mobile. Baked lighting keeps pan frames identical to daytime |
| `background-blend-mode` snow tint | Pre-tinted tile as a `data:` URL | Blend mode made Chrome re-raster the snow layer each pan frame, and `blob:` tiles also panned slower |
| Header chip + Lighting menu | URL controls, then a single clock chip | The Stronghold is world-only. Lighting was first URL-only, but nobody could see it change during the day, so a single clock chip was added in the top-right corner |
| Always-on flicker | Flicker layer hidden while the camera moves | It is the only live blended layer. While the camera is still, its cost does not affect panning |

Memory: the surface, the unlit ground copy and the uprights layer are each the size of the world raster (3738 × 2243 px ≈ 33 MB, so about 100 MB in total). Dawn and dusk recompose every few seconds, deferred while the camera moves. Each recompose re-uploads the surface texture once. By day the surface also recomposes once per 15-minute sun step (every 15 s of a live day), deferred while the camera moves. It does not re-raster the world (see *Fix: slow shadow updates* above). The shadow mask and its blurred copy add about 2 MB.

## Verification

- `node scripts/test-daylight.mjs`: 10 tests (keyframes, wraparound, readability floor, phases, determinism, URL modes, manual clock precedence, sun shadows, anchor validity). `node scripts/test-stronghold.mjs`: the 8 economy tests still pass.
- `npm run build`, then `node scripts/verify-lighting.mjs` (and `node scripts/capture-clock-docs.mjs` for the clock and shadow images) (`SITE_DIR` or `PREVIEW_URL` selects the target). Results ([report](https://arkadia-custom-whachat.fural.space/lighting-plan/verify-report.json)):
  - Every lit sprite has anchors.
  - 4 phases × 4 viewports (1536 × 1024, 2560 × 1440, 390 × 844 @3×, 844 × 390 @2×) show the right phase, layer state and snow tint, and the canvas stays the input surface.
  - Night lightmap: ambient 252/765, 1680 restored emissive pixels, light at all 7 buildings.
  - Night screen luma is 42.6 vs 113.0 by day (day now includes sun shadows).
  - Clock ticks relight; a 15-minute sun step rebuilds only the shadow mask, with zero world re-rasters.
  - Sun step from a clock preset to shadows on screen: median 155 ms, with zero world re-rasters (450–740 ms before).
  - The in-game clock: slider and presets relight, sun shadows appear by day only, a pinned hour survives a reload, and Live restores the cycle.
  - Clock drag from 05:00 to 17:00 at 60 Hz: no world re-raster or snow re-encode while dragging or on release (shadows catch up from the mask). Headless p95 went from 417 ms to 33 ms per frame (3016 → 50 ms at 4× CPU).
  - `?lighting` persistence works.
  - A night roof click selects the Forge and relights the selection.
  - Reduced motion stops the flicker.
  - **Mobile pan** (390 × 844, DPR 3, 4× CPU, best of 3): zero world repaints. Median 16.6 ms by day and at night. Day p95 varied between 17.5 and 26.1 ms across three runs on the shared host (night 17.9–18.4 ms). Pan frames only move the baked surface, so cast shadows cannot change them.
- These are headless Chromium (software compositing) results on a shared host, not physical-device FPS.

### Authoring lights

Run `node scripts/extract-emissive.mjs [dir]`. It writes candidate flame/arcane clusters (green, numbered) and the authored anchors (magenta) for every lit sprite, plus `sheet.png`. Edit `src/stronghold/light-anchors.ts`, then re-run the overlay and `verify-lighting.mjs`.

![Authored light anchors review sheet](https://arkadia-custom-whachat.fural.space/lighting-plan/light-anchors-review.webp)

## Planning spike (history)

The first plan used a throwaway spike (`scripts/spike-stronghold-lighting.mjs`) with live blend layers and auto-detected emissive pixels. It proved the look, but its detection was noisy. Those mockups are kept for reference.

![Spike mockups: day, golden hour, dusk, night](https://arkadia-custom-whachat.fural.space/lighting-plan/phases-desktop.webp)
