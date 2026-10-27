## Facing and movement correction

Rift Dash locks the hero’s current facing at activation. Cursor location and drag direction no longer aim gameplay Dash. The configured skill shortcut or a tap/click on its socket performs the same action. Neutral controls retain the last facing. All Char tap inspection, Details and Equip remain separate.

Travel follows a swept, terrain-clamped path up to 1.5 tiles over 260 ms. Walking is held during travel, camera tracking stays smooth, and departure, growing trail/afterimages and arrival share the simulation clock. Arrival damage waits until travel completes. The server advances travel once per world tick, independent of queued/replayed inputs; its 50 ms tick quantizes completion to the next tick. Co-op clients receive actual distance and elapsed time and interpolate that authoritative path. The approved WebP art is reused; no new art replaces it.

## Evidence

`input-frame-verification.json` executes production controls, hero facing, cast, movement and VFX code with navigation/Pixi doubles: 16 keyboard/touch cases, eight headings each, neutral input, 208 positions, arrival gating and obstacle clamps. Server tests cover eight directions, intermediate positions, cooldown/equipment, queued input, burst pacing and delayed arrival damage. All Go packages, TypeScript, Vite, progression and save/persistence tests pass.

Actual Go-server browser: desktop N, NE, E, SE, S, SW and W passed intermediate-position/facing/opposite-cursor checks before a 300-second budget expired during evidence capture. A later desktop attempt reached GPU warmup but exceeded startup budget. Portrait 390×844 passed an actual joystick-left gesture, neutral release and skill-socket tap; six sampled frames and a travel screenshot are saved. Physical mobile hardware and all-direction live-browser coverage are not claimed. Static-server startup was unsuitable; the matching Go server supplied successful browser validation.

Peer Skill Tree preview files are excluded from this task commit and release checkout. Existing committed Pixi UI, Flame Fan, Editor, settings, persistence and BGM are preserved.
