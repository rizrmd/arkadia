# Stronghold lighting and day/night cycle: implementation plan

Status: plan plus a throwaway rendering spike. No game code has changed yet.

## Where Stronghold is today

- Each painted sprite already contains lighting baked in by its artist: a light source from the upper left, plus glowing windows, torches, braziers, altar candles and the Mage Tower rune.
- `createWorldView` (`src/stronghold/world-view.ts`) rasterizes the whole finite settlement **once** into `#world-surface`. Panning and zooming only change CSS transforms. The infinite snow is a repeated CSS background (`snowLayer`). Neither layer is repainted while panning, so no draw calls or uploads happen during a pan frame.
- There is no time model, no light source data and no tint layer. The faint radial gradient in `installTerrain` belongs to the legacy DOM terrain path, which the composited world does not use.

Any lighting design must keep that guarantee: **a pan frame repaints nothing**.

## Spike result: a world-space lightmap works

`scripts/spike-stronghold-lighting.mjs` injects two extra world-space canvases into the running game. It repaints nothing in the game's own surface.

![Day, golden hour, dusk and night (desktop)](https://arkadia-stronghold-whachat.fural.space/lighting-plan/phases-desktop.webp)

![Day, golden hour, dusk and night (portrait 390 × 844)](https://arkadia-stronghold-whachat.fural.space/lighting-plan/phases-mobile.webp)

![Night close view](https://arkadia-stronghold-whachat.fural.space/lighting-plan/desktop-night.webp)

Measured in headless Chromium (software compositing). These are relative numbers, not device FPS ([raw report](https://arkadia-stronghold-whachat.fural.space/lighting-plan/spike-report.json)):

| Measurement | Day (layers off) | Night (2 blend layers) |
| --- | --- | --- |
| Pan frame interval, median (390 × 844, DPR 3, 4× CPU) | 16.5 ms | 18.0 ms |
| Pan frame interval, p95 | 52.2 ms | 62.5 ms |
| World surface repaints during pan | 0 | 0 |
| Lightmap repaint per phase change (91 auto lights, blur filter) | 28–36 ms | |

Findings:

1. Multiplying a low-resolution lightmap over the baked art gives a convincing night while the texture detail stays intact. UI overlays are unaffected because they sit above `#world-layers`.
2. The spike detected emissive pixels automatically by colour threshold. That is **too noisy for production**: the parchment map, altar gold and paving produced false light pools, while some forge windows were missed. Production should use authored light anchors and per-sprite emissive masks (see below).
3. Repainting the lightmap with ~90 gradients and a blur filter costs ~30 ms. That is fine once per building change but too slow to run every tick. The plan splits the work into a pre-baked light canvas and a cheap per-tick composite.
4. The blend layers add measurable compositor cost at night, about +10 ms p95 under 4× throttle. They must therefore turn off completely in full daylight, and the benchmark must gate the change.

## Target architecture

```d2
direction: down
clock: Day clock (daylight.ts) {
  t: "timeOfDay(now) -> 0..1"
  k: "lightingAt(t) -> ambient, lights, glow, phase"
}
data: Light data (lights.ts) {
  a: Authored anchors per sprite and level
  m: Emissive masks (offline, sharp)
}
stack: "#world-layers (one CSS transform)" {
  snow: "L0 snow repeat + ambient tint (background-blend-mode)"
  surface: L1 world surface (unchanged baked art)
  lightmap: "L2 lightmap canvas, mix-blend-mode multiply"
  glow: "L3 glow canvas, mix-blend-mode screen + CSS flicker"
}
ui: HUD and panels (never tinted)
clock -> stack.lightmap: "tick <= 1 Hz, 2 draw calls"
clock -> stack.snow: tint colour
clock -> stack.glow: opacity
data -> stack.lightmap: "bake light canvas on building change"
data -> stack.glow: bake glow canvas
stack -> ui: composited below
```

### Layers

| Layer | Content | Repainted when | Cost per pan frame |
| --- | --- | --- | --- |
| L0 snow | Existing repeat plus `linear-gradient(ambient)` with `background-blend-mode: multiply` | Ambient colour changes (quantized, ≤ 1 Hz) | Transform only |
| L1 surface | Existing baked world, unchanged | Building level or selection changes (as today) | Transform only |
| L2 lightmap | `fill(ambient)`, then `drawImage(lightCanvas)` with `lighter` and `globalAlpha = lights` | Each clock tick (≤ 1 Hz), 2 draw calls | Transform only |
| L3 glow | Pre-blurred emissive halos with `mix-blend-mode: screen`, opacity = `glow` | Building change only; intensity is CSS opacity | Transform only |

- `lightCanvas` is an offscreen canvas at about 0.35 × world resolution. It holds every light at full strength on black: ground pools are isometric ellipses (y scaled 0.55) and emissive masks render at full white. It is baked once per building or level change. Because emissive pixels map to lightmap white, `multiply` leaves windows and flames exactly as painted.
- L2 and L3 copy the transform string that `draw()` already writes for `#world-surface` and share its CSS size. Lightmap and snow use the same ambient colour, so there is no seam at the world bounds.
- When `ambient == white && lights == 0` (full day), L2/L3 are `display:none` and the snow gradient is removed. Daytime cost is then exactly today's cost.

### Light sources

| Source | Kind | Notes |
| --- | --- | --- |
| Forge levels 1–3 | Windows, hearth | Anchors per level, since the three sprites differ |
| Barracks, Mine, Mage Tower door | Wall lanterns, mine mouth | Warm 2700 K |
| Mage Tower rune | Arcane | Cool blue, slow pulse |
| Altar | Candles, braziers, inner glow | Strongest source; acts as the night landmark |
| Expedition Table | Table lantern | Small |
| Gateway | Two torches | Lights the entrance path |
| Braziers (`terrain.ts` props) | Fire | Flicker |

`src/stronghold/lights.ts` stores anchors in **sprite source pixels**, the same convention as `groundEdges` in `scene.ts`, so the data stays auditable. They are transformed through the same `translate → shear/vertical` matrix as the sprite. Each anchor holds `{x, y, kind, radius, colour}`. A new offline script, `scripts/extract-emissive.mjs` (sharp), generates candidate masks and anchors with an HSV threshold. It then writes a review contact sheet, and a person accepts or edits the results. This replaces the noisy runtime detection used in the spike.

### Time model (`src/stronghold/daylight.ts`)

- `timeOfDay(now, config)` is a pure function of `Date.now()`, so it stays deterministic and the offline claim screen matches what the player sees.
- One game day takes **24 real minutes** by default (configurable). An optional **Sync to local time** mode is listed under open decisions.
- `lightingAt(t)` interpolates keyframes in linear-light RGB with smoothstep easing:

| t | Phase | Ambient (sRGB) | Lights | Glow |
| --- | --- | --- | --- | --- |
| 0.00 | Night | `#384575` | 1.0 | 0.9 |
| 0.22 | Dawn | `#8f7393` | 0.7 | 0.5 |
| 0.30 | Morning | `#ffe9d2` | 0.1 | 0 |
| 0.40–0.62 | Day | `#ffffff` | 0 | 0 |
| 0.72 | Golden hour | `#ffd6ad` | 0.3 | 0.2 |
| 0.80 | Dusk | `#8f759e` | 0.75 | 0.55 |
| 0.88 | Night | `#384575` | 1.0 | 0.9 |

- A readability floor keeps ambient luminance ≥ 0.22. The selected building also gets an extra light anchor at night so the existing gold selection glow stays visible.
- QA overrides: `?time=0.85` freezes the clock and `?daySpeed=60` speeds it up. Preferences are stored in the separate localStorage key `arkadia.stronghold.lighting`, wrapped in try/catch, and never written into the economy save.

### UI and accessibility (English labels)

- Header: a compact sun/moon chip showing the phase (`Dawn`, `Day`, `Dusk`, `Night`) and the time.
- Menu → **Lighting**: `Dynamic`, `Always day`, `Always night`, plus a `Time of day` preview slider.
- `prefers-reduced-motion`: no flicker or rune pulse; transitions stay smooth.
- Flicker runs as CSS keyframes on L3 opacity (compositor only) with two offset periods (0.9 s / 1.3 s, ±6 %).

## Non-goals

- Dynamic shadows that rotate with the sun. The painted shading has a fixed light direction, and rotating shadows would contradict it.
- Per-pixel normal-mapped lighting, WebGL migration, weather or sky rendering.
- Economy changes. Night bonuses are listed as an open decision instead.

## Delivery phases

| # | Scope | Acceptance | Size |
| --- | --- | --- | --- |
| 1 | `daylight.ts` clock + keyframes + QA URL params; unit tests next to `scripts/test-stronghold.mjs` | Keyframe interpolation, wraparound at 1.0 → 0, deterministic `timeOfDay` | S |
| 2 | L0 tint + L2 lightmap in `world-view.ts` (lighting module with `setTransform`, `setLights`, `tick`); auto-off in daylight | `#world-surface` paints unchanged during pan and ticks; benchmark p95 within +15 % at night, identical by day | M |
| 3 | `extract-emissive.mjs`, anchors and masks for 7 buildings (forge × 3 levels) + gateway + braziers; review contact sheet | Every painted window, torch and candle stays bright at night; no false pools | M |
| 4 | L3 glow, flicker, reduced motion, header chip, Lighting menu | UI never tinted; menu works on 390 px portrait | S |
| 5 | `scripts/verify-lighting.mjs`: 4 phases × 4 viewports screenshots, pan benchmark gate, roof hit-test at night, Knowledge update, deploy | All checks green on the public sandbox | S |

Phase 2 touches `world-view.ts`, which a parallel session is changing for mobile panning and snow overlap. Start phase 2 only after that work is committed. Keep the hook surface small: `draw()` forwards its transform string, and `update()` forwards building levels.

## Risks and fallbacks

- **Blend-layer cost on low-end mobile.** If the benchmark gate fails, use a fallback "baked" mode: composite the lightmap into `#world-surface` inside `paintWorld()` (one repaint per quantized step, e.g. every 2 % of the day), and turn flicker off.
- **Readability at night.** Enforce the ambient floor, keep the selected-building light, and offer the `Always day` option.
- **Art drift.** New or updated sprites need new anchors and masks. `verify-lighting.mjs` should fail when a sprite has no light data.

## Open decisions for the team

1. Cycle length: 24 real minutes, or synced to the player's local clock?
2. Should night affect gameplay (e.g. Mage Tower +Mana at night, Mine +Gold by day), or stay cosmetic?
3. Should Frostpass inherit the same clock in a later task?

## Reproduce the spike

```
npx vite build --outDir /tmp/site
SITE_DIR=/tmp/site OUTPUT_DIR=/tmp/shots node scripts/spike-stronghold-lighting.mjs
```

`scripts/publish-lighting-plan.mjs` publishes only the review images under `/lighting-plan/` on the shared sandbox. It does not change game code.
