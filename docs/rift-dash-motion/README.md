## Facing and movement correction

Rift Dash locks the hero’s current facing at activation. Cursor location and drag direction no longer aim gameplay Dash. The configured skill shortcut or a tap/click on its socket performs the same action. Neutral controls retain the last facing. All Char tap inspection, Details and Equip remain separate.

Travel follows a swept, terrain-clamped path up to 1.5 tiles over 260 ms. Walking is held during travel, camera tracking stays smooth, and departure, growing trail/afterimages and arrival share the simulation clock. Arrival damage waits until travel completes. The server advances travel once per world tick, independent of queued/replayed inputs; its 50 ms tick quantizes completion to the next tick. Co-op clients receive actual distance and elapsed time and interpolate that authoritative path. The approved WebP art is reused; no new art replaces it.

## Evidence

`input-frame-verification.json` executes production controls, hero facing, cast, movement and VFX code with navigation/Pixi doubles: 16 keyboard/touch cases, eight headings each, neutral input, 208 positions, arrival gating and obstacle clamps. Server tests cover eight directions, intermediate positions, cooldown/equipment, queued input, burst pacing and delayed arrival damage. All Go packages, TypeScript, Vite, progression and save/persistence tests pass.

Actual Go-server browser: desktop N, NE, E, SE, S, SW and W passed intermediate-position/facing/opposite-cursor checks before a 300-second budget expired during evidence capture. A later desktop attempt reached GPU warmup but exceeded startup budget. Portrait 390×844 passed an actual joystick-left gesture, neutral release and skill-socket tap; six sampled frames and a travel screenshot are saved. Physical mobile hardware and all-direction live-browser coverage are not claimed. Static-server startup was unsuitable; the matching Go server supplied successful browser validation.

The task commit did not modify peer Skill Tree preview files. The cumulative deployed checkout includes their committed floating Pixi inspection change, preserving immediate tap/Details/Equip, tree geometry and pan/zoom. Existing Flame Fan, Editor, settings, persistence and BGM are preserved.

## Public release

Implementation `5484b38a`, late-input replay correction `36c15c48`; the authoritative server and 62 compiled client/player files were verified at `36c15c48` on https://arkodia.online and https://play-arkodia.fural.space. All four approved VFX hashes match. `release-verification.json` records the exact SHA and checks.

The supported locked runtime publisher registered and applied the release, then reported an error when the resource guard killed its apply job and boot process. Incidents and boot logs were inspected; a subsequent supervised boot recovered with the correct binary and files. No restart loop was used by this task. Independent public integrity verification passed after recovery. The obsolete ark-whachat hostname is no longer a bound alias; current canonical and platform domains above are verified. The shared publisher now resolves the stable sandbox slug, and the peer release updated its health URL to the canonical domain.

