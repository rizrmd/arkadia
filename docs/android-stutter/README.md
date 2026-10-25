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
