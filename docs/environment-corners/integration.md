How the corner layer resolves the current area, swaps artwork and follows the camera.

## Current state in code

- **No parallax layer exists.** The edge trees are ordinary `foreground` props from [src/stronghold/terrain.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fterrain.ts) (tiles with u/v ≥ 15), so they move 1:1 with the world.
- **The Stronghold scene has one biome (snow).** There is no `biomeAt()` in `src/stronghold/`.
- **The court already has a check.** `inSafeZone()` in [src/stronghold/safe-zone.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fsafe-zone.ts) is true on the court side of the gate.
- **The expedition map has 5 biomes.** [src/expedition/world.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fexpedition%2Fworld.ts) derives them from elevation and moisture.

## Flow

```d2
direction: right
hero: Hero tile (u, v)
resolve: "biomeAt(u, v)"
court: court
snow: snow
outer: outdoor biome (noise)
hyst: "Hysteresis (~1.5 s / ~2 tiles)"
swap: "Slot B loads set, cross-fade, swap A/B"
desk: "Desktop: parallax offset + clamp"
mob: "Mobile: static frame"
hero -> resolve
resolve -> court: inSafeZone
resolve -> snow: near gate
resolve -> outer: elsewhere
court -> hyst
snow -> hyst
outer -> hyst
hyst -> swap: area changed
swap -> desk
swap -> mob
```

## Area resolution

New `biomeAt(u, v)` in `src/stronghold/`:

1. `inSafeZone()` → `court`
2. Inside the gate and outskirts radius → `snow`
3. Otherwise → the same noise and seed as `src/expedition/world.ts`, so it matches the expedition map

- **Hysteresis:** switch only after the hero has spent ~1.5 s or ~2 tiles in the new area, so borders don't flicker.
- **Border blend (optional):** each side samples ~6 tiles toward its own side, so an approaching forest appears on that side first.

## Layer — `src/stronghold/parallax.ts`

- A `<div class="fg-parallax">` above the world and below the HUD, with `pointer-events: none`.
- Two slots per side (A/B). On an area change, slot B loads the new set and cross-fades in over 600–800 ms with a slight rise. Then the slots swap roles.
- `<picture>` with `<source media="(max-width: 700px)">` picks the mobile artwork.
- Preload neighbouring sets as the hero approaches and unload distant ones (this matters on mobile).

## Camera hook (desktop only)

- In `draw()` in [src/stronghold/world-view.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fworld-view.ts), next to `hero.place(x, y, scale)`, call `parallax.place(cx, cy, scale)`.
- Offset = `-(cx - anchor) * scale * (factor - 1)`, with factor ≈ 1.3 for trees and 1.5 for branches, clamped to ±60 px.
- Move with `translate3d` only (GPU, no repaint), as `snowLayer` does, and set `will-change: transform`.

## Responsive layout

| Viewport | Placement | Size | Motion |
|---|---|---|---|
| Desktop | Bottom-left and bottom-right | `width: clamp(220px, 22vw, 380px)` | Parallax and cross-fade |
| Mobile portrait (≤ 700 px) | Top-left and top-right frame, clear of the clock and HUD | `width: 18vw; max-height: 16dvh` | Cross-fade only |
| Mobile landscape (`max-height: 500px`) | Thin left and right strips, away from the controls | Narrow strip | Cross-fade only |

## Gameplay safety and accessibility

- When the hero or an enemy is on screen inside a corner's bounding box, fade that corner to about 0.5 opacity.
- `prefers-reduced-motion`: no parallax offset, instant swap or a short fade.
- Thin out the existing u/v ≥ 15 foreground spruce props so trees aren't doubled.

## Future artwork

Phase 2 remains unproduced: `relic-forest` (mossy deciduous roots), `swamp` (reeds/dead trees/mist), `mountains` (rocks/stunted pines), `ash-frontier` (charred wood/embers), `river` (shrubs/wet stones). Four files per area: 20 additional assets. Optional independent branch layers are ~420×300 px; none are included in this kit.

## Integration verification

Capture court, gate and outskirts at 1440×900, 390×844 and 844×390. Confirm clear controls/HUD, one stable gate cross-fade without border flicker, no camera motion on mobile or with reduced motion, and measure mobile FPS with/without the layer. Localize expedition biome display labels into English before exposing them in UI.
