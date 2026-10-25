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

Verification: TypeScript, mask alpha parity and quality-controller tests pass. Reproduce the historical comparison with `BASELINE=1 BASELINE_REF=2150b3e0 node scripts/android-stutter/verify-pause-and-gate.mjs`, then run without BASELINE. The baseline reference is explicit so later commits do not silently change the comparison. Reports: `pause-gate-before.json`, `pause-gate-after.json`.

The zero-frame-drop goal remains active. Remaining work includes real gameplay profiling with the enriched upload/placement data, removal of remaining upload/render stalls, and verification on the actual low-spec device.

## Fractional frame pacing and resume fidelity

A deterministic replay through the real Pixi Ticker reproduces avoidable skipped render opportunities: its maxFPS limiter truncates elapsed milliseconds. At 60 Hz / target 60, the original ticker emits 593 callbacks over 600 refresh opportunities and occasionally waits 33.33 ms. At target 30 it emits 298 of 300 and reaches 50 ms gaps.

The shared game scheduler and the Pixi application now use the same fractional cadence implementation. Pixi's integer limiter is disabled, but the new gate still caps renderer updates to the selected target. start/stop and ticker listeners continue to work. Fractional deadlines retain a bounded early-vsync tolerance, avoiding artificial skipped frames under 0.04 ms timestamp jitter, without catch-up render bursts. Tests cover 30/60 FPS on 60/90/120/144/240 Hz inputs; all emit the expected 300/600 callbacks over ten seconds. 90/144 Hz displays naturally quantize presentation intervals; the test does not pretend those can present every 60 FPS frame at identical intervals.

Pause accounting now subtracts exactly the scheduler's accumulated pause duration. It retains genuine work/delay in the first resumed frame. The stronger browser test keeps a 521 ms active delay immediately after resume while excluding a separate intentional 2.3-second pause. It also keeps later active delays.

When a gateway sheet finishes preparing after the door animation already reached its final index, that same-index shadow is invalidated and refreshed. A separate browser test checks this delayed completion and forces the frame-by-frame fallback; fallback and bitmap output have a mean channel error of 0.454/255, with no page errors.

The first second-pass code, `b87f912a`, has been deployed; `live-verification.json` records its production loading/combat regression check. Software rendering still drops frames in that environment and is not proof of device smoothness. The fractional pacing revision requires its own deployed validation; the full zero-frame-drop goal remains unproven.

## Current published verification

`72db7f15` was pushed and deployed through the full supported release script from an isolated clean worktree. The deployment passed production TypeScript/Vite build, Go tests, co-op smoke, shadow geometry/field tests, exact mask alpha checks and the cadence replay. The live build is `/assets/index-B3OsDNbU.js`; the loading/combat regression has no page errors or missing/unsupported VFX references.

This remains partial progress toward the requested zero-frame-drop objective. The software-GPU browser still records slow frames and cannot prove physical Android smoothness. The latest available physical-device traces, rechecked after this deployment, were still from older builds (newest Mali trace 2026-10-26 00:04 WIB; newest Adreno 612 trace 2026-10-25 22:36 WIB). Fresh physical-device evidence on the current build and broader active-gameplay analysis remain necessary. The native goal remains active.

## GPU first-use and native Flame Fan (next implementation pass)

Default-renderer CPU profiling exposed cold shader reflection/link waits and a lazy secondary WebGL material context during the first Flame Fan. The profiles are diagnostic captures using a software GPU; some local captures also include concurrent shadow-audit work. Their FPS must not be treated as a controlled device before/after benchmark.

Implemented targeted GPU preparation through Pixi's shader/texture caches. Only the selected hero's dependencies are prepared; the tested Ember profile compiles four particle programs and uploads fifteen shared textures. One tiny offscreen pass per first effect instance also exercises uniform/buffer setup, then disables the temporary render group to preserve ordinary scene batching. Distant hidden scene textures stay deferred. Actor receiver shaders share programs by sampler count while keeping per-batch uniforms independent.

The first-cast ablation probe links three new VFX material programs (plus the default particle and connected-sheet programs) without GPU preparation. With preparation it links no new programs during the tested simultaneous cast. Tests also verify actor program sharing, independent uniforms and distinct sampler-count variants.

Flame Fan now uses a shared Pixi shader and three pooled 256-pixel render textures on WebGL2. This removes its secondary WebGL context and its per-animation-frame WebGL-to-2D copy/texture upload. The old Canvas path remains for compatibility and preview consumers. The authored fragment math is shared; only output orientation, mask sampling and premultiplied output adapt to the render target. The GLSL variable formerly named active is renamed for GLSL ES 3 compatibility. Radius, world transform, wall clipping, per-pixel scenery mask and lifetime are preserved.

Browser pixel tests cover all five ranks, four animation times, full/partial masks and wall clipping. Unclipped alpha is identical; the largest mean color difference is 0.0484/255. Clipped mean alpha error is 0.00122/255 (maximum one alpha level). Tests observe zero new WebGL contexts and zero texture uploads during six steady animation updates, at most three live sheets, and unchanged radius 4.4. This parity check now gates deployment.

Occlusion alpha is prefetched with already-requested camera-neighbourhood mask images. Repeated static lookups use image identity instead of DOM dimensions/URL reads. Single-bucket point probes reuse their already-unique candidate list. A browser test performs 10,000 cached alpha lookups with zero DOM property reads, exact alpha parity, distinct Canvas masks and correct gate-frame invalidation; it also gates deployment.

Reports: gpu-preparation-before.json / gpu-preparation-after.json, flame-gpu-verification.json, alpha-cache-verification.json and default-gameplay-profile*.json. The zero-frame-drop goal remains active: these checks establish specific removed stalls and visual parity, not physical-device smoothness across all gameplay.

## Published GPU release verification

Revision `a0eae6d0` was pushed and deployed from a clean detached worktree through `scripts/fural-deploy.sh`. The production entry is `/assets/index-iXFD5qMw.js`; deployment build, required regression guards and health check succeeded. The live readiness probe reports four prepared programs, fifteen uploaded textures, no missing/unsupported effect references, and no page errors (`gpu-live-verification.json`).

The live cast probe is inconclusive: the diagnostic AoE was accepted but no active sheet was observed during its sampling window. It therefore does not establish the native Flame Fan backend in live gameplay. Native rendering and visual parity remain covered by the isolated browser test; the production combat profile is recorded separately in `default-gameplay-profile-live-gpu.json`. The first live probe timed out after 45 seconds; the repeated readiness probe completed.

Physical trace inspection still finds only older builds: newest Mali trace at 2026-10-26 00:04 WIB, with `/assets/index-DjrEquqd.js`. No current-build physical Android sample is available. The zero-frame-drop objective is not verified and remains active.
