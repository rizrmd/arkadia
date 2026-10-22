## Scope and status

This task creates animation assets and a separate review viewer. It does not replace the gameplay hero, integrate combat, or set numerical balance. The controlled source is a production candidate, not final approved art. Its simplified 3D appearance still differs from the hand-painted Ember Warden v02 reference.

## Final animation design

Exactly four skill names and visual mechanics are finalized for this animation production:

| Skill | Role | Body and effect sequence |
| --- | --- | --- |
| Flame Fan | Automatic attack | Right gauntlet draw-back, brace and extend, continuous broad forward flame fan, retract and recover. Moving variant uses the run cycle with a compact aimed arm. Sustain frames 5–7 can be repeated by a future animator; stop emission before recovery. Cone angle is illustrative, not locked balance. |
| Cinder Step | Mobility proposal | Compress into a crouch, drive forward through a short dash with an ember trail, land and rise. Root travel must be driven externally in an eventual game integration. |
| Ember Snare | Area control proposal | Anticipate, crouch and place an ember seal, lift away as the seal erupts, stand and recover. A future mechanic may slow targets before eruption; timing and values are not approved game rules. |
| Furnace Heart | Temporary buff proposal | Gather the gauntlet inward, open into an empowered stance, show a warm ember aura, then settle. A future buff may strengthen flame output; duration and values are not approved game rules. |

Idle, run, hurt and death are standard states, not additional skills. The moving Flame Fan clip is a locomotion variant of skill one.

## Source and export

One isolated Blender scene defines all facings without mirroring. Motion primitives and mesh helpers were derived from the repository's Rift Runner rig, then copied and adapted for this character. No peer source files are edited. The source includes a right-side gauntlet, exposed curls, ochre jacket, charcoal trousers and boots. Imagegen's four-quadrant material atlas supplies cloth/leather/bronze textures. The built-in imagegen prompt is recorded in `knowledge-sources.md`.

Run `scripts/ember-warden/render-all.sh` with the existing home-installed bpy renderer. Renderer setup is documented in `scripts/rift-runner/setup-renderer.sh`. Then run `node scripts/ember-warden/assemble.mjs` and `node scripts/ember-warden/verify.mjs`. Use `DEMO_URL=https://ark-whachat.fural.space/ember-warden-review/` for public verification.

Body sheets use 256 × 256 transparent cells, a common orthographic camera and ground origin (128,179.2). Each sheet holds two directions. VFX sheets use 384 × 384 cells with ground origin (192,243.2), retaining pixel scale and adding 64px on every side. Every body frame exports its actual projected right-gauntlet socket, feet, world foot positions, bounds and timing. The manifest records FPS, frame coverage, phases, activation/stop/recovery events, loop and terminal-hold rules. Content hashes version asset URLs.

VFX are code-authored flame tongues, trails, seal/eruption and aura, rasterized with Sharp to separate transparent PNG sheets. They are not additional imagegen outputs. Flame Fan follows the per-frame anatomical wrist socket. Other effects use the ground pivot. Front/back compositing uses facing; exact per-pixel limb occlusion is not implemented.

## Playback rules

Idle and run loop. Skill bodies and hurt play once and return to the shared neutral. Moving Flame Fan loops as a distinct locomotion state; the preview demonstrates entry/exit through approximate short blends. Hurt can return to idle or run in an eventual animator. Death plays once and holds its last frame; it never automatically recovers. The viewer's transition mode uses idle before the action and idle/run after it, retaining death's terminal hold.

Optional co-op downed use is a separate design: a settled death pose could be displayed while a revive window is active, but no revive clip, invulnerability, timer or gameplay policy is included. Death remains a distinct exported clip.

## Review limitations

Matching scale, analytical planted-foot contacts and a fixed right arm do not prove final art quality. Face/hair, jacket articulation, toy-like limbs and lighting need visual refinement to match the painterly concept. Effects are deliberately stylized analytic shapes. No physical-device, performance-budget or gameplay collision verification is claimed. The QA report separates playback/pixel evidence from unresolved visual acceptance.
