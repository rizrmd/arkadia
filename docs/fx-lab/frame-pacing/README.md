## Retained mobile layer scrolling

The release removes full-sidebar rebuilding from layer/property scrolling. Pixi containers and text remain alive; scrolling changes their translation and culls offscreen controls. Opaque panel covers clip partial rows without allocating render textures or running a stencil mask. Wheel input and touch dragging preserve the document; touch release coasts with friction and bounded velocity. Clipped rows cannot activate outside the list. Looping the preview no longer rebuilds the sidebar. Tooltips ignore touch hover.

Mobile padding is 10 px instead of 16 px, the Hero/Skill row removes redundant labels, and the list begins at 202 rather than 242 px. Rows use 46 px spacing rather than 50 px; eye and name targets remain 44 px high. The selected row shows phase and the sheet-edit hint. Properties contains the selected layer's additional fields. Save draft and Apply saved remain pinned, separate operations. Layer names still open the bound Spritesheet Editor; eyes change visibility only.

The hero upload canvas is 256×256 instead of the entire viewport. Position/scale remain Pixi transforms. Unchanged cached hero revisions no longer repeat canvas copies/uploads. FX Lab now feeds frame timing to the existing adaptive quality controller and applies its resolution changes.

## Sustained real-touch measurement

`baseline/` is released code at c7cd99f1 (including af599628) in an isolated worktree, with opt-in render instrumentation only. `released/` is the final implementation. Both use Chromium/ANGLE SwiftShader software GPU, Android user agent on mobile, 1× device scale, seven seconds of warm-up, looping Flame Fan, and four alternating CDP touch drags of 22 moves each. Default fallback visual definitions were used locally because no API was running at port 8787; the separate persistence suite used an isolated live Go API. These are browser frame scheduling measurements, not physical-device FPS or hardware presentation timestamps.

| Viewport | rAF median before → after | rAF p95 before → after | Maximum gap before → after | Sidebar builds before → after |
|---|---:|---:|---:|---:|
| 390×844 | 33.3 → 66.7 ms | 416.7 → 133.3 ms | 1883.3 → 283.4 ms | 80 → 0 |
| 844×390 | 83.4 → 66.7 ms | 299.9 → 166.6 ms | 866.6 → 366.7 ms | 82 → 0 |
| 1440×1000 | 50.0 → 200.0 ms | 816.6 → 516.7 ms | 2816.6 → 666.6 ms | 65 → 0 |

Tail stalls and allocation/rebuild churn improved. Median scheduling regressed in portrait and desktop in this software environment: the results do **not** prove universally smooth playback or stable 60 FPS. Continuous GPU/compositor pressure remains visible. After-update JavaScript preview tick p95 was 7.4/8.8/7.6 ms, and long-task counts were 0/1/1. Preview loop counters increased in every sequence, and scroll samples prove bidirectional movement. No JavaScript errors occurred.

Local raw `render` samples include Pixi offscreen render invocations, so they must not be interpreted as display-presented frames. The released opt-in `?profile=1` instrumentation now records only main-stage render invocations; rAF intervals remain the consistent before/after comparison. Production main-stage diagnostics are recorded separately after deployment. CPU render duration excludes GPU completion. No physical device was available.

## Regression validation

- `verify-layer-sheet.mjs`: isolated temporary save directory/API; eye does not open sheet; layer name opens sheet; FPS 18 edit; Save asset, Use asset, visual Save then Apply; retained mobile layer draft; close; no JS errors.
- `verify-mobile-sidebar.mjs`: portrait/landscape CDP touch, 44 px targets, scroll without mutation/accidental sheet opening, sheet/eye, tabs, history reachable, open/close, Pixi-only controls; no JS errors.
- `fx-lab-mobile-verify.mjs`: portrait/landscape movement, facing, release stops movement, hero selection, pinch zoom, desktop keyboard, Pixi-only controls.
- TypeScript and whitespace checks passed. The release publisher runs Vite and Go tests/build.

## Reproduction

`OUT=docs/fx-lab/frame-pacing/run node scripts/fx-lab-frame-profile.mjs` starts local Vite. `BASE_URL=https://arkodia.online OUT=...` profiles the public release without writes. Optional `WIDTH` and `HEIGHT` isolate a viewport. Raw arrays and screenshots accompany the summaries. Frame samples include deferred work, software GPU scheduling and browser input dispatch overhead.

## Release safety

Use `fural-agent repos ship RPe11327fbfe413dbeba246526 --mode script --script scripts/fx-lab/deploy.sh`. The committed detached build includes the latest pushed branch; new checks fetch and verify upstream ancestry after acquiring arkodia-deploy.lock and again before publication. A newer pushed commit aborts activation and requires integration/rebuild. The supported cumulative publisher also enforces live-release ancestry and preserves production storage. No production authenticated writes are used for validation.
