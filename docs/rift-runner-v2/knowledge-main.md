## Playback and status

[Open interactive animation review](https://ark-whachat.fural.space/rift-runner/v1/) · [Browser playback recording](https://ark-whachat.fural.space/rift-runner/v1/playback.webm)

Generated assets and independent previews only; the live hero is unchanged. **Rendering verified; final art acceptance blocked. Not game-ready.** Foot sliding, pose popping, emitter-side inconsistency, direction drift and neutral-pose discontinuity remain after targeted corrections. The complete findings are in the [art review](https://ark-whachat.fural.space/rift-runner/v1/review.json).

## Coverage and conventions

All eight requested slots: N, NE, E, SE, S, SW, W, NW. Idle has 4 frames per direction; run and all four skills have 6 each. Full-body skill phases cover ready, anticipation, activation/impact and recovery. Separate VFX are on the matching Rift Runner VFX page.

The 18 selected sheets contain 360 frames in 66 clips. All sources have alpha. Calibrated cells are 256 × 256; body anchor (128,224), VFX origin (128,128). Body anchors are inferred from silhouette bounds, not hand-tracked foot landmarks. One scale per row preserves crouches. Global alpha-component extraction removes neighboring-row fragments.

## Actual playback verification

All 66 clips displayed every selected frame in real-time browser playback with zero page/resource errors. Eight-direction idle/action/idle transitions, pause and step passed. Visual review still fails full art consistency: numeric pivots alone cannot prevent foot sliding or repair generated anatomy. Headless browser checks do not establish physical-device or gameplay readiness. VFX composition uses approximate placement.

[Manifest](https://ark-whachat.fural.space/rift-runner/v1/manifest.json) · [Pixel audit](https://ark-whachat.fural.space/rift-runner/v1/evidence/pixel-audit.json) · [Local browser evidence](https://ark-whachat.fural.space/rift-runner/v1/evidence/local-playback.json)

## Idle

![idle eight-direction animated preview](https://ark-whachat.fural.space/rift-runner/v1/previews/idle-clip.webp)

![idle-n-ne-e-se calibrated atlas, rows N, NE, E, SE](https://ark-whachat.fural.space/rift-runner/v1/sheets/idle-n-ne-e-se.png)

![idle-s-sw-w-nw calibrated atlas, rows S, SW, W, NW](https://ark-whachat.fural.space/rift-runner/v1/sheets/idle-s-sw-w-nw.png)

![idle actual browser playback screenshot](https://ark-whachat.fural.space/rift-runner/v1/evidence/idle-playback.png)

## Run

![run eight-direction animated preview](https://ark-whachat.fural.space/rift-runner/v1/previews/run-clip.webp)

![run idle-to-action-to-idle preview](https://ark-whachat.fural.space/rift-runner/v1/previews/run-transition.webp)

![run-n-ne-e-se calibrated atlas, rows N, NE, E, SE](https://ark-whachat.fural.space/rift-runner/v1/sheets/run-n-ne-e-se.png)

![run-s-sw-w-nw calibrated atlas, rows S, SW, W, NW](https://ark-whachat.fural.space/rift-runner/v1/sheets/run-s-sw-w-nw.png)

![run actual browser playback screenshot](https://ark-whachat.fural.space/rift-runner/v1/evidence/run-playback.png)

## Pulse Shot

![pulse-shot eight-direction animated preview](https://ark-whachat.fural.space/rift-runner/v1/previews/pulse-shot-clip.webp)

![pulse-shot idle-to-action-to-idle preview](https://ark-whachat.fural.space/rift-runner/v1/previews/pulse-shot-transition.webp)

![pulse-shot-n-ne-e-se calibrated atlas, rows N, NE, E, SE](https://ark-whachat.fural.space/rift-runner/v1/sheets/pulse-shot-n-ne-e-se.png)

![pulse-shot-s-sw-w-nw calibrated atlas, rows S, SW, W, NW](https://ark-whachat.fural.space/rift-runner/v1/sheets/pulse-shot-s-sw-w-nw.png)

![pulse-shot actual browser playback screenshot](https://ark-whachat.fural.space/rift-runner/v1/evidence/pulse-shot-playback.png)

## Phase Dash

![phase-dash eight-direction animated preview](https://ark-whachat.fural.space/rift-runner/v1/previews/phase-dash-clip.webp)

![phase-dash idle-to-action-to-idle preview](https://ark-whachat.fural.space/rift-runner/v1/previews/phase-dash-transition.webp)

![phase-dash-n-ne-e-se calibrated atlas, rows N, NE, E, SE](https://ark-whachat.fural.space/rift-runner/v1/sheets/phase-dash-n-ne-e-se.png)

![phase-dash-s-sw-w-nw calibrated atlas, rows S, SW, W, NW](https://ark-whachat.fural.space/rift-runner/v1/sheets/phase-dash-s-sw-w-nw.png)

![phase-dash actual browser playback screenshot](https://ark-whachat.fural.space/rift-runner/v1/evidence/phase-dash-playback.png)

## Rift Trap

![rift-trap eight-direction animated preview](https://ark-whachat.fural.space/rift-runner/v1/previews/rift-trap-clip.webp)

![rift-trap idle-to-action-to-idle preview](https://ark-whachat.fural.space/rift-runner/v1/previews/rift-trap-transition.webp)

![rift-trap-n-ne-e-se calibrated atlas, rows N, NE, E, SE](https://ark-whachat.fural.space/rift-runner/v1/sheets/rift-trap-n-ne-e-se.png)

![rift-trap-s-sw-w-nw calibrated atlas, rows S, SW, W, NW](https://ark-whachat.fural.space/rift-runner/v1/sheets/rift-trap-s-sw-w-nw.png)

![rift-trap actual browser playback screenshot](https://ark-whachat.fural.space/rift-runner/v1/evidence/rift-trap-playback.png)

## Overdrive

![overdrive eight-direction animated preview](https://ark-whachat.fural.space/rift-runner/v1/previews/overdrive-clip.webp)

![overdrive idle-to-action-to-idle preview](https://ark-whachat.fural.space/rift-runner/v1/previews/overdrive-transition.webp)

![overdrive-n-ne-e-se calibrated atlas, rows N, NE, E, SE](https://ark-whachat.fural.space/rift-runner/v1/sheets/overdrive-n-ne-e-se.png)

![overdrive-s-sw-w-nw calibrated atlas, rows S, SW, W, NW](https://ark-whachat.fural.space/rift-runner/v1/sheets/overdrive-s-sw-w-nw.png)

![overdrive actual browser playback screenshot](https://ark-whachat.fural.space/rift-runner/v1/evidence/overdrive-playback.png)

## Reproduction and acceptance blocker

Built-in imagegen used the inspected original concept DA66f49939f6e26121844a0957. This collection supersedes incomplete draft DAa0928eda21fb0243763e976a. Sources, rejected corrections and prompt specifications are preserved on the matching source archive page.

[Implementation and verification notes](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Frift-runner-v1%2FREADME.md). Reproduce with prepare-rift-runner, preview-rift-runner and verify-rift-runner scripts.

A manual sprite cleanup pass or controlled rig render source is needed to meet exact eight-direction anatomy, contact and continuity requirements. No game-ready claim is made.

## Public deployment evidence

Live browser playback passed all 66 clips with zero page/resource errors. All 70 initially deployed resources matched SHA-256 against the task package; the game homepage bytes were unchanged by the overlay. [Live playback results](https://ark-whachat.fural.space/rift-runner/v1/evidence/live-playback.json) · [Checksum evidence](https://ark-whachat.fural.space/rift-runner/v1/evidence/live-byte-verification.json).

![idle public-site browser playback](https://ark-whachat.fural.space/rift-runner/v1/evidence/live-idle-playback.png)

![run public-site browser playback](https://ark-whachat.fural.space/rift-runner/v1/evidence/live-run-playback.png)

![pulse-shot public-site browser playback](https://ark-whachat.fural.space/rift-runner/v1/evidence/live-pulse-shot-playback.png)

![phase-dash public-site browser playback](https://ark-whachat.fural.space/rift-runner/v1/evidence/live-phase-dash-playback.png)

![rift-trap public-site browser playback](https://ark-whachat.fural.space/rift-runner/v1/evidence/live-rift-trap-playback.png)

![overdrive public-site browser playback](https://ark-whachat.fural.space/rift-runner/v1/evidence/live-overdrive-playback.png)


## Final delivery check

After the evidence overlay, all **82 deployed resources** matched their packaged SHA-256 hashes. The gameplay homepage bytes remain unchanged. [Final checksum report](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Frift-runner-v1%2Flive-byte-verification.json). Assets and previews are shipped; final consistent animation acceptance is blocked by the documented art defects.
## Active game-ready correction work

The current complete candidates are **Pulse Shot, hurt and death in all eight directions**, with 288 verified rendered frames. [Open current playback](https://ark-whachat.fural.space/rift-runner/v2/candidate.html). Hurt recovers to the shared neutral. Death includes impact, fall and a held terminal corpse pose; it does not loop or recover to idle by default.

The candidate viewer verifies every frame, neutral/action/neutral transitions and terminal hold. The canonical rig prevents anatomical swaps. Numeric ground pivots and contact audits now pass; final visual acceptance and the remaining idle/run, skills and separate VFX are still in progress. No game-ready claim or hero replacement is made.

All produced images, including rejected prototypes and earlier grid versions, are inline on the existing **Rift Runner — Animation Generation Sources** page. Knowledge and asset labels remain English.
