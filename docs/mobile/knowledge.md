## Reported failure

The first screenshot showed an empty mobile viewport. The follow-up screenshot identified a concrete loader error: `/assets/wall-b.png` returned HTTP 404 in Pixi's image worker, rejecting the startup Promise before the scene was attached. This was an asset loading failure, not evidence of a GPU failure. Independent requests later returned HTTP 200; the exact cause of the earlier 404 was not reproducible.

## Changes

The arena now loads only textures used by the world. Legacy `wall-b`, `crack`, and the gallery-only corner wall no longer gate startup. Required world textures retry twice with distinct URLs after failure. The production package still includes the complete gallery. Loading stages, a 30-second slow-start notice, visible error details, Reload, and an explicit Canvas2D compatibility link provide recovery. WebGL remains the default, with Canvas2D fallback if renderer initialization fails.

On narrow screens, the arena uses the available width and Settings opens an overlay. Touch zoom buttons, Fit, pointer cancellation, and camera refitting after renderer resize keep the world visible. The stronghold link stays in the document flow on phones. The previously published character gait, back-facing animation and faction palettes are preserved by merging their committed branch before deployment.

## Verification

`npm run build` and `node scripts/verify-mobile.mjs` pass. The browser test deliberately makes optional `wall-b.png` unavailable and fails the first required `ash.png` request. The arena still initializes and produces nontransparent pixels. It checks widths 320, 393, 430, 844, and 1440; settings/source dialog by touch; actual CDP touch drag; zoom/Fit; error visibility; WebGL output; and Canvas2D output with WebGL disabled. This is browser emulation, not a physical-device performance test.

Public site: https://arkadia-whachat.fural.space/ . Results: `docs/mobile/results.json`. Screenshot: `docs/mobile/after.png`.


## Original report and confirmed error

The initial phone screenshot showed an empty arena:

![Original mobile report with an empty canvas](/api/organizations/ORd5dd6f99b4308d6187031557/task-attachments/TA8f37bd6569cbb712f98b6232)

The follow-up screenshot exposed the failing asset request:

![Phone error: wall-b.png returned HTTP 404](https://arkadia-whachat.fural.space/mobile/reported-error.jpg)

## Verified rendering

![Mobile arena rendering after loader recovery and camera fixes](https://arkadia-whachat.fural.space/mobile/after.png)

The deployed package was checked against the public server: all 48 resources returned HTTP 200 and exactly matched their packaged bytes, including `/assets/wall-b.png`. The live browser test passed the injected missing-wall and retried-required-texture scenarios, plus visible WebGL and Canvas2D pixel checks. The actual phone should reload the page to receive the new bundle; physical-phone confirmation remains outside browser emulation.

[Implementation notes](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fmobile%2Fimplementation.md)

[Live browser test results](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fmobile%2Fresults.json)

[Deployment asset checks](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fmobile%2Fassets.json)
