## Static combined flipbook layers — revision 6

Continues approved revision 5 without altering its soil, cracks, low fire, smoke, embers, random draw sequence or fourteen aerial curls. No bitmap artwork was generated. The existing source atlases are copied unchanged by the static build and cropped with the same rounded 4×4 frame boundaries as the flipbook.

### Complete source inventory and mapping

Audited `src/fx/flame-fan-flipbook.ts`, including Nixie emitter definitions and render updates. Frame numbers below are zero-based. All four effect image files and the white particle texture used by that implementation are represented. Frames are representative selections, not all animation phases stacked or an exact simulation-time snapshot.

| Flipbook layer | Actual source and original use | Static treatment |
| --- | --- | --- |
| Ignition | hand-ignition-source.png, 16-frame atlas; additive hand flash | One compact frozen frame 2 at the narrow origin; alpha blending keeps its outline readable. No actor/hand is added. |
| Flame sheet | rolling-fan-v2.png; three Nixie Sub-UV quads, 16 phases | Three small screen-up rolling folds, frames 6/8/10, 205–255 wide and 77–98 high, alpha .68, along burning seams. No whole-scene replacement sheet. |
| Curling tongues | hand-ignition-source.png, frames 4–11, seven animated curls | Retain all fourteen revision 5 upright curls using frames 4–11. |
| Hot interior | eroded-core-v2.png, 16 luminance/noise-eroded phases | Three matching frozen core phases 6/8/10, additive .22, smaller than their rolling folds. |
| Ground heat | Pixi Graphics, four translucent orange ellipses | Preserve existing local foot glows from glow.png. Do not overlay the flipbook's broad heat ellipse over approved soil. This is a retained equivalent, not a new source sprite. |
| Hit contacts | hand-ignition-source.png; three target flashes | Three small upright frames 3/12/13 at distributed ground contact sites. No enemies or combat motion. |
| Embers | Texture.WHITE; Nixie orange additive billboard particles | Twelve tiny frozen orange additive quads, alongside unchanged original cinders/ember/spark crops. No particle simulation runs. |
| Smoke | smoke-v2.png; Nixie gray alpha billboard particles | Six small tinted source puffs at fixed positions, alpha .34, upright and depth sorted; existing smoke stays intact. |
| Burn Soil | Pixi Graphics footprint/specks plus 24 small hand-ignition frames 4–11 | Preserve approved crust, cracks, low flame runs, ember details and existing frozen 4–11 flames. No duplicate footprint, soil mask or replacement crust is added. This is a retained equivalent for the procedural ground layer. |

Support sprite inventory: the flipbook also loads actors/manifest.json and its Ember Warden/Revenant actor atlases (one caster and three target sprites) and approved-reference.png. These are actor-scale/comparison context, not Flame Fan effect components; deliberately excluded from the standalone effect. Its Graphics backdrop, actor shadows, timeline and English Pixi controls are also review UI. Static review retains its own English Pixi checkerboard and target controls, latest-target.png and one canvas. No HTML/React controls, ticker motion, Nixie update loop or animation frames stacked.

The original static manifest still has thirty cropped parts; rejected plates-v3 is not loaded. Two previously approved supplemental smoke parts remain. Not every original thirty-part crop is forced into view. This change adds 28 sprites (3 sheet, 3 core, 1 ignition, 3 contact, 6 smoke, 12 sparks), retaining the fourteen previous curls. All aerial additions have zero rotation and never inherit the ground's .53 vertical projection. Existing depth sorting uses projected feet.

### Validation

Run `npx tsc --noEmit`, `node scripts/flame-fan-static/build.mjs`, then `node scripts/flame-fan-static/verify.mjs`. For production use `LIVE=https://arkodia.online node scripts/flame-fan-static/verify.mjs`. The combined verifier checks 1440×1000, 390×844 and 320×560, nine effect category mappings, 28 new sprites, fourteen retained curls, one canvas, no HTML controls, working Pixi controls, upright sprites, stopped ticker, no failed resources/page errors, and byte-identical consecutive full frames.

Before implementation, captured actual live revision 5 at the same three viewports as baseline-v5-*.png. Hiding only the 28 new sprites compares all retained soil/fire/smoke/embers/curls. Local mean channel delta: .184045 / .085871 / .102816 out of 255; maximum 6 / 5 / 5. Assertion tolerance mean < .3 and max <= 8 matches prior documented browser rounding tolerance; exact pixel identity is not claimed. Original random draws/parameters are unchanged.

Remaining visual limitations: baseline soil is finer/flatter than target large fractures; source rolling folds retain recognizable directional fan silhouettes; source smoke is soft radial density rather than textured reference billows. They are used sparingly. Physical-device performance and artistic parity are not claimed by browser viewport tests.

Deploy uses `fural-agent repos ship RPe11327fbfe413dbeba246526 --mode script --script scripts/flame-fan-static/deploy.sh`, acquiring the normal shared Arkodia lock. Only static review prefix changes, preserving peer game layers. Live screenshots/report and final release SHA are recorded after supported shipment.

### Live delivery

Implementation 3e3882b4, first deployed release 2c8f27342ce657513d202bacb60d425436327391. Public release.json matched; live browser checks passed every assertion at all three viewports. Live hidden-additions comparisons are exactly equal to captured live revision 5 (mean/max delta zero at all three sizes). /healthz is healthy. Actual live screenshots attached in originating room message DM7fe47be240259aac7de02dbb and the same three images embedded inline in existing Flame Fan Knowledge NKBDbd185330904c8926506f945e, preserving all English history. Final evidence release follows without code changes.
