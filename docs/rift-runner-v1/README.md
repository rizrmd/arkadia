## Deliverables

Generation study superseding incomplete draft DAa0928eda21fb0243763e976a, based on inspected original concept DA66f49939f6e26121844a0957. All 21 generated sources are retained, including rejected versions. Eighteen selected atlases contain 360 frames in 66 clips, plus 15 animated WebP previews and an interactive viewer at `/rift-runner/v1/`. No gameplay code imports these assets.

| Layer | Action | Requested directions | Frames per direction |
| --- | --- | --- | --- |
| Body | Idle | N, NE, E, SE, S, SW, W, NW | 4 |
| Body | Run | All eight | 6 |
| Body | Pulse Shot, Phase Dash, Rift Trap, Overdrive | All eight per skill | 6 |
| VFX | Projectile, afterimage | All eight per effect | 4 |
| VFX | Trap, aura | Omnidirectional | 12 |

Slot coverage is not a visual direction pass. See `public/rift-runner/v1/review.json` for defects.

## Export conventions

Selected atlases are RGBA PNG, 256 × 256 cells. Body pivot (128,224) is inferred from silhouette bottom-center; VFX origin is (128,128). These are review anchors, not artist-tracked anatomical landmarks. Bodies are isolated from global connected alpha components before slicing, removing adjacent-row fragments. Scale is fixed per row, derived from neutral height or median run height, preserving crouches. Packing cannot repair source clipping or anatomy.

`manifest.json` includes clip directions, frame rectangles, scales, frame rates and loop flags. Skills are one-shots; viewer repeat mode is for review. Projectile charge/travel/impact/fade are semantic states, not a travel loop. Trap can hold frames 4–6 and aura sustain frames 7–9, but seams still need cleanup. VFX composition is approximate; no emitter sockets are calibrated.

North Pulse Shot and Dash use correction rows 1–2. The correction's trap row is rejected. Original west idle/Overdrive sources use `-rejected` filenames. Source grid dimensions differ from requested output and are measured, not assumed.

## Verification and acceptance

`node scripts/prepare-rift-runner.mjs` packs the assets and writes the pixel audit. `node scripts/preview-rift-runner.mjs` builds animated previews and checks frame counts. `node scripts/verify-rift-runner.mjs` observes actual requestAnimationFrame playback for all 66 clips, tests eight-direction idle/action/idle transitions and pause/step. Set `DEMO_URL` for deployed verification. It uses the same local browser-library path as existing repository checks.

Browser rendering passed with zero page/resource errors. Visual review found foot sliding, pose popping, heading drift, anatomical emitter-side changes and scarf discontinuity. Alpha, cell size and frame count pass; smoothness and complete art consistency do not. **Not game-ready. Final art acceptance remains blocked on cleanup or a controlled rig-based render source.** No physical-device or gameplay integration verification is claimed.

## Files

`public/rift-runner/v1/` contains sources, calibrated sheets, animated previews, manifest, art review, browser recording and viewer. `docs/rift-runner-v1/` contains generation provenance, prompts, pixel audit, local/live browser evidence and Knowledge content. All produced sources, sheets, previews and screenshots are embedded inline in English Knowledge under the existing character hierarchy.
