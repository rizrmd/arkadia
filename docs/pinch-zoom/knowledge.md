[Play the updated Stronghold](https://ark-whachat.fural.space/) on a phone and pinch to zoom.

## What was wrong

Pinching to zoom on a phone made the bottom of the screen flicker. There were two causes:

- **The snow layer was resized on every pinch frame.** The endless snow is a repeated background on one GPU layer, moved and scaled by compositor transforms. Its size was recomputed from the current zoom (`viewport / zoom + one tile`), so a pinch changed its width and height almost every frame (36 times in a single gesture). Each resize made the browser re-raster the whole layer. The newly exposed strips along the bottom and right edges showed empty for a frame before their tiles arrived.
- **The walk thumbstick grabbed the second pinch finger.** A touch in the bottom-left quarter of the screen starts the floating thumbstick. If the second finger of a pinch landed there, the stick popped up at the bottom, the hero started walking, and the pinch turned into a one-finger pan.

## The fix

- The snow layer is now sized once for the furthest zoom-out (35 %). Every zoom level is covered by the same layer, so a pinch only changes its transform and never invalidates its raster. It is resized only when the screen itself changes size. See [world-view.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fworld-view.ts).
- The thumbstick only starts from the first finger on the world. A touch that joins one already down is treated as part of a pinch. Walking with the stick and panning with a second finger still works. See [controls.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fcontrols.ts).

## Verification

[verify-pinch-zoom.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fverify-pinch-zoom.mjs) emulates a 390 × 844 touch phone and drives real two-finger touch events: zoom out to the minimum, zoom in to the maximum, then a pinch whose second finger lands in the bottom-left quarter. On every animation frame it checks that the snow layer keeps one size and still covers the whole screen, and that the thumbstick stays hidden.

| Check | Before | After (live) |
|---|---|---|
| Snow layer resizes during pinches | 36 | 0 |
| Frames where snow did not cover the screen | 0 | 0 |
| Frames showing the thumbstick during a pinch | 62 | 0 |
| Pinch with a finger in the bottom-left zooms | No (it panned) | Yes |

The script fails on the previous build and passes on the live site. Results: [results.json](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fpinch-zoom%2Flive-results.json).

Headless screenshots cannot show compositor flicker itself. They do confirm that snow fills the bottom of the screen in the middle of each pinch.

![Mid-pinch at the furthest zoom-out](https://ark-whachat.fural.space/pinch-zoom/zoom-out-390.webp)

![Mid-pinch zoomed in](https://ark-whachat.fural.space/pinch-zoom/zoom-in-390.webp)

![Pinch with the second finger in the bottom-left quarter: no thumbstick](https://ark-whachat.fural.space/pinch-zoom/bottom-left-finger-390.webp)

## Commands

- `npm run build && node scripts/verify-pinch-zoom.mjs` checks a local build. `DEMO_URL=https://ark-whachat.fural.space/ node scripts/verify-pinch-zoom.mjs` checks the live site.
- `RELEASE_DIR=<clean checkout> node scripts/publish-pinch-zoom.mjs` publishes the page scripts and these screenshots.
