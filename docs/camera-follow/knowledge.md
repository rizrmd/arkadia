## Problem

Walking the hero felt janky: the camera did not move smoothly. Measurement found three causes:

- **Hard stop on release.** The camera only moved while the hero was walking. Its easing trailed the hero by about 20 px, so when the key was released the camera dropped from walking speed (~113 px/s) to zero in a single frame. On the next walk, the leftover lag caught up in a ~90 px/s spike.
- **Camera updated inside physics sub-steps.** On slow frames, the hero loop moved the camera once per 34 ms sub-step, not once per rendered frame.
- **Revenants and the hero HP bar lagged a frame.** Their loop ran before the hero's, so they drew with the previous frame's camera and shook against the world (4 px on desktop, 10 px on a throttled phone).

[Play Stronghold](https://ark-whachat.fural.space/)

## Fix

- **Spring follow** ([world-view.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fworld-view.ts)): the camera chases the same central dead-zone box on a critically damped spring (Unity-style SmoothDamp, 0.22 s lag). Speed stays continuous through starts, turns and stops; it never overshoots, and it settles over ~0.8 s after the hero stops. A drag, pinch, building focus or fit takes control and resets the spring. Respawn and teleport still snap exactly.
- **One camera move per frame** ([hero.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fhero.ts)): physics still sub-steps for collision safety, but the camera moves once per frame, every frame, so it can finish settling after the hero stops.
- **Frame order** ([encounters.ts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Fencounters.ts)): the revenant loop starts after the hero loop, so revenants and the HP bar draw with the current frame's camera.

## Before and after

![Camera speed while walking and stopping: before drops from 113 px/s to zero in one frame and spikes on the next walk; after eases smoothly to rest](https://ark-whachat.fural.space/camera-follow/speed.png)

| Metric | Desktop before | Desktop after | Phone (4× CPU) before | Phone (4× CPU) after |
|---|---|---|---|---|
| Hard stops from walking speed | 1 (113 px/s) | 0 | 2 (112, 126 px/s) | 0 |
| Largest frame-to-frame speed change | 112.7 px/s | 12.3 px/s | 125.8 px/s | 42 px/s |
| HP bar drift against the hero | 3.9 px | 0 px | 10.4 px | 0 px |

Headless Chromium at 1280 × 800 and 390 × 844. The machine was heavily loaded during the runs, so frame times are noisy; the hard-stop and drift results do not depend on frame rate.

## Verification and release

- TypeScript and the Vite production build pass. Existing checks still pass: verify-hero-walk, verify-encounters and verify-pinch-zoom. verify-camera-glide (targets the retired /stronghold.html) and the verify-gate-animation p95 threshold were already failing before this change.
- [verify-camera-follow.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fverify-camera-follow.mjs): a drag during the settle wins; walking resumes the follow; the camera comes to rest; tapping a building glides without interruption; teleport snaps with nothing left to settle.
- [measure-camera-follow.mjs](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fmeasure-camera-follow.mjs) records the before/after metrics. Raw per-frame traces are in [docs/camera-follow](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fcamera-follow%2FREADME.md).
- Commits 1116f16 and ccbbb0c are on feat/stronghold. A clean build was deployed to the canonical Stronghold sandbox. On the live URL, verify-camera-follow passed and the measurement found no hard stops, a largest speed change of 19.2 px/s and 0 px HP bar drift.

These are measurements from synthetic keyboard input in a headless browser, not a test on a physical phone.
