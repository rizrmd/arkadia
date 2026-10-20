## World and overlays

Stronghold fills the entire viewport as a single canvas. Terrain, buildings, walls and vegetation are canvas artwork. All HTML controls float above the world; the building panel and forge gallery no longer reserve permanent screen space.

Drag to pan, pinch/scroll to zoom, or choose Fit world. Click any visible part of a building, including its roof, or select it in the building dock. Its floating panel opens and the camera focuses it. Close the panel to reveal the world again. Portrait uses a bottom sheet and never scrolls the document.

The overlay menu contains the modular asset editor, legacy travel map, save import/export and forge appearance gallery. Expedition I and the Expedition Table enter the new Frostpass level. Arena remains available as a separate destination.

## Live game

[Open full-screen Stronghold](https://arkadia-stronghold-whachat.fural.space/stronghold.html)

## Runtime views

![Full-screen desktop Stronghold](https://arkadia-stronghold-whachat.fural.space/fullscreen-snow/stronghold-1536.webp)

![Wide full-screen canvas](https://arkadia-stronghold-whachat.fural.space/fullscreen-snow/stronghold-2560.webp)

![Default portrait camera](https://arkadia-stronghold-whachat.fural.space/fullscreen-snow/stronghold-mobile-default.webp)

![Portrait after Fit world](https://arkadia-stronghold-whachat.fural.space/fullscreen-snow/stronghold-390.webp)

![Landscape view](https://arkadia-stronghold-whachat.fural.space/fullscreen-snow/stronghold-844.webp)

## Verification

The production build and browser checks pass across four viewport sizes. All seven panels, upgrades and navigation into Frostpass work. Canvas selection is tested against opaque roof pixels, and dragging does not accidentally select a building. Resource/save rules remain covered by the existing eight economy tests.


[Implementation and verification notes](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Ffullscreen-snow%2FREADME.md)

## Mobile panning performance

The renderer caches rasterized world sections in a 32 MiB LRU cache, coalesces pointer movement into animation frames, reuses material patterns and a baked ground shadow, and resizes the canvas only when the viewport changes. Selection and building-level changes invalidate cached artwork; resource ticks leave unchanged artwork alone. Existing artwork and full-screen HTML overlays are preserved.

A Chromium mobile emulation at 390 × 844, DPR 3 and 4× CPU slowdown measured the same 101-event pan before and after the change:

| Measurement | Before | After |
| --- | --- | --- |
| Canvas backing-store resets | 202 | 0 |
| Material patterns created | 202 | 0 |
| Pointer handler p95 | 286.2 ms | 0.3 ms |
| Frame interval p95 | 266.6 ms | 50.0 ms |
| Frame interval median | 16.7 ms | 16.7 ms |

These are browser emulation results, not a physical-device FPS guarantee. Cold sections still require rasterization when first revealed. Automated checks cover native roof selection, drag without selection, pan cache reuse, resource tick suppression, zoom and resize. Four viewport layouts, all seven building panels and upgrades also passed. The broader Frostpass smoke run reached checkpoint and reward checks before its 60-second command limit; this change does not modify expedition code.
