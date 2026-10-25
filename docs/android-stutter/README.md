## Findings

The six latest Adreno 612 / 4 GB Android traces include 140–160 ms `sceneryMask` operations, `fxCreate` up to 133.7 ms, and a maximum frame interval of 457.3 ms. Low quality was selected, but saved Auto / 60 FPS preferences overrode the profile's 30 FPS target. These are multiple sources of stutter; lowering resolution alone cannot remove synchronous construction work.

## Loading strategy implemented

- Generate exact scenery alpha crops offline. Uniform RGB preserves occlusion alpha while avoiding the colour data of full scenery PNGs. Regenerate with `node scripts/android-stutter/build-masks.mjs` after changing the atlas or placements.
- Request masks only within the camera neighbourhood, with a 512 world-pixel advance margin and two concurrent requests. Keep the initial neighbourhood behind loading; distant scenery masks stay unloaded until approached. Collision and GPU scenery continue using the original scene/atlas.
- Resolve the active hero's cue inheritance before preloading textures and warming effect instances. Unrelated hero/UI effects stay cold. Hero changes prepare their dependencies before gameplay starts. Reuse the existing pools during combat.
- Bound low-tier particles inside essential effects as well as secondary effects. Preserve every emitter and single-particle cue.
- Treat Auto's saved FPS as a ceiling, so low-spec profiles can select 30 FPS. Manual Low / 60 remains available.

This is a bounded first step: the packed FX definitions and main scenery atlas still download as units, and the active hero's full cue set is prepared. Chunking those exports by spatial region and skill would be a separate asset-pipeline change. Large immediate camera jumps can reach scenery before a newly requested mask has decoded; normal movement has the advance margin.

## Verification

- TypeScript and shadow geometry checks pass.
- `node scripts/android-stutter/test.mjs`: exact alpha parity for all 44 original/mirrored masks; low-cost limits preserve emitters, zero rates and single-sprite cues. The deploy script runs this check to reject stale masks.
- `node scripts/test-render-quality.mjs`: saved Auto / 60, low-device hints, automatic downgrade, explicit overrides and frame caps.
- `node scripts/android-stutter/verify.mjs`: Android hints, 4x CPU throttling during loading, then a scripted combat burst. Only 13/44 masks and 36/76 effect definitions were prepared at startup; no page errors or mask/effect-construction operations were recorded in the inspected playable frames.

The headless browser uses a software GPU. Combat runs without CPU throttling and with `shadowField=0` to isolate loading/CPU behaviour from software shadow rasterization. Its FPS is not an Adreno benchmark; physical-device smoothness still needs fresh post-deploy Android tracelogs. `before-particle-limits.json` is an intermediate diagnostic run with different throttling/shadow settings and must not be used as an FPS baseline.

## Published release

Code commit `8ae24f1f` was pushed and deployed through `scripts/fural-deploy.sh` from an isolated clean worktree. Production build, Go tests, co-op smoke tests, shadow tests and mask parity checks passed. The game is live at https://ark-whachat.fural.space/.

The first automated live loading check timed out at 300 seconds. A diagnostic run subsequently reached readiness in about 30 seconds without missing assets or page errors; the complete verification rerun passed in 38 seconds. The first timeout was not reproduced, so its cause is not established. `live-verification.json` records the successful production check (13 masks, 36 prepared effects, Auto 30 FPS, no recorded construction work in sampled combat frames). Real Adreno performance remains a physical-device follow-up.

## Second pass: remaining drops (2026-10-26)

The next Android samples still contain a 186 ms GL upload and 204 ms world draw, plus two 2.30–2.32 second gaps without comparable measured work. They are Mali-G925 / explicit High / 60 FPS samples; no fresh post-fix Adreno 612 sample was available in this inspection.

Changes: reset the telemetry window after an explicit scheduler pause, use browser wall time consistently for visibility suppression, record slow upload source type/dimensions/ID, and record individual world placement phases. Unpaused stalls remain visible. Gateway sheet resizing now uses asynchronous ImageBitmap preparation, with a frame-by-frame fallback, instead of resizing the complete sheet inside paint.

The isolated before/after browser regression uses the same 2.3-second pause and a separate active 500 ms gap. The old code reports a 2342 ms resume frame; the new code reports 32 ms, while retaining the active gap (524 ms). Gateway construction measured 579 ms before and 66 ms after in the software browser. The resized sheet differs from the old Canvas resize by a mean 0.00366 channel values out of 255; the animation reaches its open frame without page errors. These timings are not a physical Android benchmark and do not prove zero frame drops.

Verification: TypeScript, mask alpha parity and quality-controller tests pass. Reproduce the targeted comparison with `BASELINE=1 node scripts/android-stutter/verify-pause-and-gate.mjs` before committing the implementation, then run without BASELINE. The baseline reads HEAD versions of the three tested modules, so subsequent reruns must use the previous implementation commit for a historical comparison. Reports: `pause-gate-before.json`, `pause-gate-after.json`.

The zero-frame-drop goal remains active. Remaining work includes real gameplay profiling with the enriched upload/placement data, removal of remaining upload/render stalls, and verification on the actual low-spec device.
