## World and overlays

Stronghold fills the entire viewport as a pre-rendered canvas world. Terrain, buildings, walls and vegetation are canvas artwork. All HTML controls float above the world; the building panel and forge gallery no longer reserve permanent screen space.

Drag to pan, pinch/scroll to zoom, or choose Fit world. Click any visible part of a building, including its roof, or select it in the building dock. Its floating panel opens and the camera focuses it. Close the panel to reveal the world again. Portrait uses a bottom sheet and never scrolls the document.

The overlay menu contains the modular asset editor, legacy travel map, save import/export and forge appearance gallery. Expedition I and the Expedition Table enter the new Frostpass level. Arena remains available as a separate destination.

## Live game

[Open full-screen Stronghold](https://ark-whachat.fural.space/)

## Runtime views

![Full-screen desktop Stronghold](https://ark-whachat.fural.space/fullscreen-snow/stronghold-1536.webp)

![Wide full-screen canvas](https://ark-whachat.fural.space/fullscreen-snow/stronghold-2560.webp)

![Default portrait camera](https://ark-whachat.fural.space/fullscreen-snow/stronghold-mobile-default.webp)

![Portrait after Fit world](https://ark-whachat.fural.space/fullscreen-snow/stronghold-390.webp)

![Landscape view](https://ark-whachat.fural.space/fullscreen-snow/stronghold-844.webp)

## Verification

The production build and browser checks pass across four viewport sizes. All seven panels, upgrades and navigation into Frostpass work. Canvas selection is tested against opaque roof pixels, and dragging does not accidentally select a building. Resource/save rules remain covered by the existing eight economy tests.


[Implementation and verification notes](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Ffullscreen-snow%2FREADME.md)

## Mobile panning performance

The world is rasterized once into a bounded canvas surface, then moved and scaled with compositor transforms. Panning and pinching do not draw sprites, generate new chunks, allocate canvas buffers or upload changing canvas content. Resource ticks leave the world unchanged. Selection and building upgrades refresh the artwork. The world surface is limited to 32 MiB and 4096 pixels per dimension; the current surface uses 3787 × 2163 pixels (31.25 MiB). Infinite snow uses a separate repeated layer with the same world phase.

Chromium emulation at 390 × 844, DPR 3 and 4× CPU slowdown measured:

| Measurement | Original | Initial tile cache | Current compositor |
| --- | --- | --- | --- |
| Canvas backing-store resets during pan | 202 | 0 | 0 |
| Canvas image draws during pan | 3884 | 2322 | 0 |
| Pointer handler p95 | 286.2 ms | 0.3 ms | 0.2 ms |
| Frame interval p95 | 266.6 ms | 50.0 ms | 16.8 ms |

A separate CDP touch-input gesture measured a 16.8 ms p95 frame interval and zero Canvas2D image draws. These are emulated results, not a physical-phone FPS guarantee. Tests cover touch pinch, extended panning outside the settlement, roof hit selection, zoom, viewport resize, resource ticks, Forge upgrade invalidation, all seven panels and four viewport sizes.

## Snow and Mine occlusion

Ground decals (snowdrifts, paving wear and weeds) now render before all structural artwork, including back walls whose depth coordinates are negative. Structural objects are grouped by the enclosure's isometric sides: rear perimeter first, interior buildings next, front perimeter last, with foot depth ordering within each group. Mine remains at its original position. The front wall correctly hides the part of Mine behind it; the wall is not cut through by a different segment or by snow.

### Reported phone screenshots

![Reported snow overlapping the rear wall](https://ark-whachat.fural.space/fullscreen-snow/reported-snow-overlap.jpg)

![Reported Mine and wall overlap](https://ark-whachat.fural.space/fullscreen-snow/reported-mine-overlap.jpg)

### Corrected views

![Mine behind a continuous foreground wall at its original position](https://ark-whachat.fural.space/fullscreen-snow/mine-wall-corrected.webp)

![Continuous snow after panning far outside the settlement](https://ark-whachat.fural.space/fullscreen-snow/infinite-snow.webp)

## Wall clearance for rocks, trees and snow

Perimeter scenery no longer touches the enclosure. Behind the rear walls, cliffs, boulders and trees stand three or more tiles out, so their snowy bases sit on open snow above the battlements instead of resting on the wall top. In front of the front walls, they stand three to five tiles out, so no rock or tree crown covers the wall face. Snowdrift decals moved off the wall lines as well: rear drifts lie in open snow, and front drifts sit against the outer wall foot.

The court paving also runs half a tile under the rear walls. Before this, a thin strip of snow showed between the paving and the inner foot of the rear walls.

`scripts/verify-wall-clearance.mjs` enforces both rules on the rendered world surface. No opaque pixel of a cliff, boulder or tree may coincide with an opaque wall, bastion or gate pixel, and no snow-coloured pixel may appear just behind the rear wall line. Before the fix, all 24 perimeter props failed the first check and the second check found many snow pixels. Both checks now pass, together with the composited-world, roof-hit and full-screen Frostpass regressions.

### Reported phone screenshot

Red: rocks and a tree overlapping the front wall. Green: snow-covered rocks resting on the rear wall top, with snow visible at the inner wall foot.

![Reported wall, rock and snow overlap](https://ark-whachat.fural.space/fullscreen-snow/reported-wall-rock-snow.jpg)

### Corrected views

![Rear wall with scenery standing clear and paving reaching the wall foot](https://ark-whachat.fural.space/fullscreen-snow/wall-clearance-rear.webp)

![Front wall near Mine with no rock or tree covering the wall](https://ark-whachat.fural.space/fullscreen-snow/wall-clearance-front.webp)

![Front-left wall near the Mage Tower](https://ark-whachat.fural.space/fullscreen-snow/wall-clearance-front-left.webp)

![Desktop overview](https://ark-whachat.fural.space/fullscreen-snow/wall-clearance-overview.webp)
