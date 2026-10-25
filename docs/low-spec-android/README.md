## Adaptive rendering

Production Android traces 502–507 (25 October 2026, 13:47–13:48 WIB) reported 4 GB device memory and DPR 2.75, 14.36–43.05 FPS, and stalls up to 583.4 ms. Stalls also occurred at idle with no particles. These logs motivated changes to rendering, rather than only reducing combat VFX.

| Profile | Target FPS | Maximum canvas resolution | 3D sprite scale | Idle animation | Hero shadow | Decorative particle budget ceiling |
| --- | --- | --- | --- | --- | --- | --- |
| Low | 30 | 1× | 1× | 15 FPS | Cached contact shadow | 400 |
| Balanced | 60 | 1.5× | 2× | 30 FPS | Cached contact shadow | 800 |
| High | 60 | 2× | 2× | 60 FPS | Projected silhouette | 1400 |

Actual canvas resolution is also bounded by device pixel ratio. The UI and world share one Pixi canvas; lowering resolution affects both. MSDF text remains vector-distance-field text. MSAA is enabled only when starting in High; an existing GL context retains its initial antialias setting after a runtime downgrade.

Mobile browsers reporting at most 4 GB memory or at most four cores start in Low. Other mobile devices start in Balanced; desktop starts in High. These are conservative hints, not an assertion about GPU performance. More than half of live frame samples missing the selected cadence by 25% over four seconds lowers one tier. Isolated stalls, long suspension gaps, and a detected browser cap do not count. There is no automatic upgrade during the same page load, avoiding oscillation. Reload starts selection afresh.

`?quality=low`, `?quality=balanced`, or `?quality=high` pins a profile for manual comparison. Omit the parameter, or use `?quality=auto`, for automatic selection. No benchmark runs to choose a profile.

Game loops and Pixi share the selected maximum frame rate. Simulation still advances using elapsed time, and input and casts run at the selected game cadence. Idle-only sprite reuse does not throttle moving or casting animations. Low and Balanced omit allocation and execution of the four silhouette-shadow passes; the cached contact shadow keeps the feet grounded. A runtime downgrade releases and recreates the hero render targets at the new size. Primary projectiles, danger markers, and combat outcomes remain independent of the decorative effect budget.

## Production diagnostics

Tracelogs now include `client.build` (entry bundle URL), `client.gpu` when exposed by WebGL, and `client.renderQuality` with the actual resolution, antialias state, hero scale and selected target. Deliberate 30 FPS uses a 29 FPS trigger threshold; it does not produce a battery-saver warning.

`frames[].details` includes hero animation/draw/framebuffer-copy/shadow/post timings, actual Pixi texture uploads, effect creation/warmup, and scenery mask preparation. These are sub-phases and overlap parent phase totals. `renderOperations` retains up to 32 slow operations, including script source attribution from the browser's Long Animation Frame API when supported. These records help distinguish CPU work and GL submission stalls; they are not GPU timer-query measurements and cannot identify every OS or compositor stall.

## Verification

- `node scripts/test-render-quality.mjs`: profile selection, sustained downgrade, isolated stalls, suspension, browser cap, and explicit override.
- Go tracelog tests: round-trip profile, build/GPU metadata, frame details and script attribution.
- `node scripts/verify-low-spec-android.mjs`: functional browser checks for automatic Low, explicit High, and a deterministic controller-driven transition from Balanced to Low. Verifies actual renderer settings, visible 3D sprite pixels, movement, casting, and detailed trace fields. Tracelog POSTs are intercepted; no synthetic production logs are written.
- `VERIFY_URL=https://ark-whachat.fural.space/ REPORT=docs/low-spec-android/live-functional.json node scripts/verify-low-spec-android.mjs`: production functional checks for automatic Low and explicit High.

These are functionality checks, not a device performance benchmark. Stable frame rate on physical low-spec Android must be assessed from post-release production tracelogs. Existing freezes outside measured work are not claimed to be fully resolved by this release.
