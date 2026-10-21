## Painted style correction

The human rejected v2 controlled 3D renders because they do not match the approved painted v1 sprites. They are experiments only, not final replacements. The source render batch was stopped. No gameplay hero was replaced.

Imagegen regenerated hurt and death from each approved directional idle sprite, with eight frames per action and heading. The final review set has 16 clips / 128 frames in N, NE, E, SE, S, SW, W, NW. W/NW correct the reference's anatomical emitter-side error; the corresponding older idle/skill artwork still needs that correction. Do not treat this checkpoint as full game-ready acceptance.

Each final sheet has a 4×2 grid of 320px cells. The ground pivot is (160,224). A single scale derived from the standing frame applies to the whole clip; fallen bodies are not individually enlarged or shrunk. Hurt aligns boot centers and floor; death aligns the body center and floor and still needs final fall-path review. Actual transparent row gutters are detected because some generated source rows are unequal. Disconnected fragments from adjacent cells are excluded. Source PNGs remain unchanged in the archive.

Hurt's last frame shares exact pixels with its first frame. Death's last two frames share the settled corpse pixels. Death is non-looping and holds its last frame in the requested v1 viewer. The preview supports older 256px cells padded to the same ground origin and new 320px cells without resampling them.

## Verification

- `node scripts/rift-runner/assemble-painted.mjs`
- `node scripts/rift-runner/extend-v1.mjs`
- `node scripts/rift-runner/audit-painted.mjs`
- `RIFT_ACTIONS=hurt,death node scripts/verify-rift-runner.mjs`

The pixel audit covers all 16 clips / 128 frames: all eight headings for each action, alpha, clipping margins, pivots and exact endpoints. Local real-time requestAnimationFrame playback observes every replacement frame, hurt recovery and held death, with zero page/resource errors. Style comparisons inspect approved idle, replacement neutral/recoil, and settled death at the same character height.

## Remaining acceptance

The human also reported a limping run. A rejected-style controlled-source experiment identified same-side arm/leg swing and insufficient flight; the approved painted run still needs a balanced replacement in the same artwork style. Old skill heading, anatomical continuity, foot-contact and neutral-transition issues from v1 remain open. Final VFX, sockets, packing, all-clip visual/transition review and public release verification must be completed before a game-ready claim.

All sources, rejected experiments, final sheets, animated previews and comparison images are inline in the reused project Knowledge source archive. The requested public page remains `/rift-runner/v1/`.
