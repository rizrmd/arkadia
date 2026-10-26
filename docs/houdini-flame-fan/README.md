## Delivered experiment and acceptance status

PC-FATAN executed Houdini 22.0.466, checked out `licenseCategoryType.Apprentice`, simulated and rendered all five levels through Karma CPU. The final batch completed with exit 0 in 367 seconds: 36 RGBA PNG frames per level, 24 FPS, 1.5 seconds, **1280×720** masters. Earlier 128-pixel previews and 256-pixel diagnostic renders are superseded.

**This is not a production-ready game replacement.** Apprentice assets remain noncommercial, the rolling-flame art direction needs further work, and integration against actual game occlusion/depth and physical mobile GPUs has not been approved. No gameplay code or production art imports reference this experiment. The original game effect remains authoritative.

## Source and reproducible workflow

- `tools/houdini-flame-fan/build.py`: one parameterized `hou` scene generator, inspected against the installed 22.0.466 node/parameter surface. Controls: level, range, angle, intensity, duration, seed, quality and vertical framing offset.
- `tools/houdini-flame-fan/batch.py`: sequential Lv1–Lv5 simulation/render; fail on a nonzero child exit; package masters, `.hipnc` scenes, manifests and logs.
- `scripts/houdini-flame-fan/pack.mjs`: validates all masters and generates Pixi spritesheet JSON and bounded mobile/desktop atlases. `--production` rejects Apprentice manifests.
- `src/houdini-flame-fan/player.ts`: English Pixi-only review controls. One active level is loaded; old texture sources are unloaded. This is a separate experiment, not the game runtime.

Use the Fural local device daemon only. Discover `PC-FATAN` with `fural-agent local-nodes list` before dispatch; the verified node is `ULc8291ec0aeea885a0cf29876`. `main-source-cbb57` is the daemon build string, never a node ID. CLI command arguments are separate `--arg` values.

```text
hython build.py --output C:/Users/USER/Fural/FlameFanExperiment/lv1-preview --level 1 --quality preview --render
hython batch.py
node scripts/houdini-flame-fan/pack.mjs
node scripts/houdini-flame-fan/build.mjs
node scripts/houdini-flame-fan/verify.mjs
```

The first two commands must execute on PC-FATAN through `local-runs`; the last three perform image packaging and browser verification in the sandbox. Python compilation in the sandbox is syntax checking only, never evidence of a Houdini render.

The chain is point source → rasterize density/temperature/burn/velocity → sparse Pyro Solver → File Cache → registered volume envelope → Pyro Bake Volume → Solaris scene import → native Karma Pyro Shader → orthographic camera → Karma settings → USD export → `husk`. Simulations cook sequentially before rendering, and shading reads disk caches. Scene parameters expose the controls; after changing cached-scene controls, rebuild/recook before rendering. This is a Python setup, not an exported HDA.

## Game specification and presets

Source: `src/fx/flame-fan-levels.ts`, `src/stronghold/combat-vfx.ts`, `src/fx/burn-soil.ts`, and the existing Flame Fan Knowledge page. These are gameplay inputs, not new balance proposals.

| Level | Authoritative range | Visual forward cap | Fan angle | Intensity / initial-damage multiplier | Cooldown ms |
|---|---:|---:|---:|---:|---:|
| 1 | 4.400 | 2.933 | 108° | 1.00 | 1400 |
| 2 | 5.192 | 3.461 | 108° | 1.25 | 1288 |
| 3 | 5.984 | 3.989 | 108° | 1.50 | 1185 |
| 4 | 6.776 | 4.517 | 108° | 1.75 | 1090 |
| 5 | 7.568 | 5.045 | 108° | 2.00 | 1003 |

The visual cap retains the approved two-thirds forward reach. One Houdini unit represents two game units. Intensity is an artistic source control; it does not apply damage. Cast release is +0.42s; this flipbook starts at release, frame 1 corresponds to clip time 0, and does not repeat the windup. Main emission ends at 0.45s with a short dissipation tail; the final frames are transparent apart from the retained watermark. The clip's 1.5s allocation includes that transparent tail.

Lv1–Lv2 have no Burn Soil. Lv3–Lv5 retain a separate 1s ground effect and events at +200/+400/+600/+800/+1000ms after initial hit. Tick damage is **unset**, not an approved zero-damage balance. This experiment records that contract in metadata; it does not bake the complete Burn Soil layer or replace the existing scheduler.

## Camera, framing and alpha

The fixed east-facing orthographic camera has an 8-Houdini-unit horizontal span, 16:9 aspect, and 30° elevation, giving a 0.5 ground-plane vertical scale. Shared raw pivot: **(0.20, 0.35)**. Higher levels use the same camera and pivot, so their larger reach remains visible instead of normalizing every level to the same size.

`--offset-y 0.15` moves the effect upward by 15% of the frame height. The bottom 20% is reserved and the original watermark is preserved. Metadata includes a *suggested* top-80% content rectangle with the mathematically adjusted pivot **(0.20, 0.4375)**. No cropping is applied. An offset, resize or crop never changes Apprentice licensing.

Masters are RGBA PNG. Pyro emission is bright relative to smoke coverage; direct normal blending was too faint over the review floor. Experimental atlas copies apply **coverage gain 16** to alpha in the top 80% before alpha-aware downsampling. RGB and raw masters are retained; the watermark area is untouched. This explicit artistic adjustment is in each atlas's metadata, and needs visual review before any properly licensed production recreation. Pixi uses normal blending and the loader's standard alpha handling; do not multiply alpha twice.

## Atlas and mobile budgets

- Mobile: 320×180 frames, 2-pixel transparent padding, 1944×1104 atlas, **8.19 MiB decoded per active level**.
- Desktop: 640×360 frames, three pages below 2048 per axis, **32.19 MiB decoded per active level**. Desktop is an optional inspection tier; mobile is the default.
- Masters: 1280×720, kept outside runtime atlases. The compressed master archive is available separately.
- Load one level/tier and unload the previous sources. These figures exclude the renderer framebuffer, upload transients and driver overhead. No physical-device GPU benchmark has been performed.

Measured master effect bounds, excluding the watermark region: Lv1 246×264; Lv2 282×292; Lv3 324×315; Lv4 366×343; Lv5 409×373 pixels. Bounds union all frames with alpha above 8/255 and include the vertical plume. Canvas dimensions alone would overstate useful flame detail. The raw render still has visible sampling noise; downsampling helps but does not constitute art approval.

## How a flipbook is used in a 3D game

A flipbook animates texture frames on a transparent quad. Spawn it at the casting socket, set the registered pivot, align the quad for the intended camera, apply the correct world scale, advance at 24 FPS and dispose after the one-shot clip. For these bakes, full frame width represents **16 game units**. Use alpha blending for the body, and optionally author a separate emission layer in a future production pipeline.

A baked camera view is not a freely viewable 3D volume. Rotating this sprite arbitrarily in screen space would distort the ground fan's 0.5 projection. For different headings, rotate the source in world space and bake additional directions with the same camera/pivot, or retain actual volume/mesh VFX. A true 3D renderer also needs depth testing against actors/terrain and an appropriate depth-write/sorting policy, ideally soft intersections. Arkodia's Pixi renderer additionally needs its existing world projection, wall clipping and object occlusion mask. The experiment player only demonstrates a registered east-facing sprite and range guide; it proves none of those game integration paths.

## Verification and limitations

`device-license.json` records the real PC-FATAN license probe. `device-batch.json` records successful 1280×720 batch execution. The master archive includes five `.hipnc` scenes and per-level logs. `atlas-validation.json` verifies 180 RGBA frames, distinct animation frames, color, transparency, dimensions and atlas bounds. Local browser verification covers all levels, animation, pointer-operated Pixi level switching and absence of HTML controls at 1440×900, 390×844 and 320×560. Public verification is recorded separately after deployment.

Initial failures were corrected: executable/argument CLI syntax, resolution-mode callback, USD noncommercial save paths, camera-unit conversion and excessive emission exposure. One run lost its dispatch owner; a device/process check confirmed no renderer remained before retry. Early blank/white/noisy frames are retained as diagnostics, not successful game art. Browser libraries required reapplying the existing HOME-only organization setup before verification.

Production blockers: an eligible commercial render environment with clean scene generation, approved rolling flame appearance, heading coverage, gameplay occlusion/depth integration and physical-device performance evidence. The native goal must remain incomplete until those acceptance requirements are satisfied.
