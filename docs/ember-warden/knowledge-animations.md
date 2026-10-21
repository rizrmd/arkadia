## Playable production candidate

[Open normal/slow playback, frame scrubber and transitions](https://ember-warden-review-whachat.fural.space/). [Manifest](https://ember-warden-review-whachat.fural.space/manifest.json).

All eight facings cover idle, run, four skills, hurt and death, plus the moving Flame Fan variant. Exactly four skills: Flame Fan, Cinder Step, Ember Snare and Furnace Heart. The latter three are animation proposals, not previously approved game mechanics. The concept remains [Ember Warden v02](/organizations/ORd5dd6f99b4308d6187031557/knowledge/NKBDc8ca8c735a55009062b64a64).

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

Run `scripts/ember-warden/render-all.sh` with the existing home-installed bpy renderer. Renderer setup is documented in `scripts/rift-runner/setup-renderer.sh`. Then run `node scripts/ember-warden/assemble.mjs` and `node scripts/ember-warden/verify.mjs`. Use `DEMO_URL=https://ember-warden-review-whachat.fural.space` for public verification.

Body sheets use 256 × 256 transparent cells, a common orthographic camera and ground origin (128,179.2). Each sheet holds two directions. VFX sheets use 384 × 384 cells with ground origin (192,243.2), retaining pixel scale and adding 64px on every side. Every body frame exports its actual projected right-gauntlet socket, feet, world foot positions, bounds and timing. The manifest records FPS, frame coverage, phases, activation/stop/recovery events, loop and terminal-hold rules. Content hashes version asset URLs.

VFX are code-authored flame tongues, trails, seal/eruption and aura, rasterized with Sharp to separate transparent PNG sheets. They are not additional imagegen outputs. Flame Fan follows the per-frame anatomical wrist socket. Other effects use the ground pivot. Front/back compositing uses facing; exact per-pixel limb occlusion is not implemented.

## Playback rules

Idle and run loop. Skill bodies and hurt play once and return to the shared neutral. Moving Flame Fan loops as a distinct locomotion state; the preview demonstrates entry/exit through approximate short blends. Hurt can return to idle or run in an eventual animator. Death plays once and holds its last frame; it never automatically recovers. The viewer's transition mode uses idle before the action and idle/run after it, retaining death's terminal hold.

Optional co-op downed use is a separate design: a settled death pose could be displayed while a revive window is active, but no revive clip, invulnerability, timer or gameplay policy is included. Death remains a distinct exported clip.

## Review limitations

Matching scale, analytical planted-foot contacts and a fixed right arm do not prove final art quality. Face/hair, jacket articulation, toy-like limbs and lighting need visual refinement to match the painterly concept. Effects are deliberately stylized analytic shapes. No physical-device, performance-budget or gameplay collision verification is claimed. The QA report separates playback/pixel evidence from unresolved visual acceptance.


## Complete body atlas gallery

Every rendered sheet is embedded below. Two facings per sheet in the manifest direction order. Alpha and coverage checks do not establish final art quality.

### idle

![idle N and NE](https://ember-warden-review-whachat.fural.space/sheets/idle-0.png?v=144bfba8d7d5)

![idle E and SE](https://ember-warden-review-whachat.fural.space/sheets/idle-1.png?v=5c7ef8193c92)

![idle S and SW](https://ember-warden-review-whachat.fural.space/sheets/idle-2.png?v=5d4059d76dfd)

![idle W and NW](https://ember-warden-review-whachat.fural.space/sheets/idle-3.png?v=4b62d587c3a1)

### run

![run N and NE](https://ember-warden-review-whachat.fural.space/sheets/run-0.png?v=f663f0a9779a)

![run E and SE](https://ember-warden-review-whachat.fural.space/sheets/run-1.png?v=edb4afa8ecca)

![run S and SW](https://ember-warden-review-whachat.fural.space/sheets/run-2.png?v=7a7bbe17f381)

![run W and NW](https://ember-warden-review-whachat.fural.space/sheets/run-3.png?v=13f23eaaef11)

### flame fan

![flame-fan N and NE](https://ember-warden-review-whachat.fural.space/sheets/flame-fan-0.png?v=455b6d65d7c6)

![flame-fan E and SE](https://ember-warden-review-whachat.fural.space/sheets/flame-fan-1.png?v=f2481205c927)

![flame-fan S and SW](https://ember-warden-review-whachat.fural.space/sheets/flame-fan-2.png?v=e39b63e62526)

![flame-fan W and NW](https://ember-warden-review-whachat.fural.space/sheets/flame-fan-3.png?v=c05fee0c4280)

### flame fan moving

![flame-fan-moving N and NE](https://ember-warden-review-whachat.fural.space/sheets/flame-fan-moving-0.png?v=468a38149a3a)

![flame-fan-moving E and SE](https://ember-warden-review-whachat.fural.space/sheets/flame-fan-moving-1.png?v=92e553f269ca)

![flame-fan-moving S and SW](https://ember-warden-review-whachat.fural.space/sheets/flame-fan-moving-2.png?v=5294f8fb656c)

![flame-fan-moving W and NW](https://ember-warden-review-whachat.fural.space/sheets/flame-fan-moving-3.png?v=06502e6e51de)

### cinder step

![cinder-step N and NE](https://ember-warden-review-whachat.fural.space/sheets/cinder-step-0.png?v=522b5ea6fd87)

![cinder-step E and SE](https://ember-warden-review-whachat.fural.space/sheets/cinder-step-1.png?v=996299d6c8e4)

![cinder-step S and SW](https://ember-warden-review-whachat.fural.space/sheets/cinder-step-2.png?v=f80f4ccb913f)

![cinder-step W and NW](https://ember-warden-review-whachat.fural.space/sheets/cinder-step-3.png?v=0e49dcda0e0f)

### ember snare

![ember-snare N and NE](https://ember-warden-review-whachat.fural.space/sheets/ember-snare-0.png?v=548d8dafc7a1)

![ember-snare E and SE](https://ember-warden-review-whachat.fural.space/sheets/ember-snare-1.png?v=38cc7b0ccfa9)

![ember-snare S and SW](https://ember-warden-review-whachat.fural.space/sheets/ember-snare-2.png?v=6aa0932520f4)

![ember-snare W and NW](https://ember-warden-review-whachat.fural.space/sheets/ember-snare-3.png?v=9ebcfb1515ed)

### furnace heart

![furnace-heart N and NE](https://ember-warden-review-whachat.fural.space/sheets/furnace-heart-0.png?v=d38647014144)

![furnace-heart E and SE](https://ember-warden-review-whachat.fural.space/sheets/furnace-heart-1.png?v=9db7a67a344c)

![furnace-heart S and SW](https://ember-warden-review-whachat.fural.space/sheets/furnace-heart-2.png?v=7fb0462b6a92)

![furnace-heart W and NW](https://ember-warden-review-whachat.fural.space/sheets/furnace-heart-3.png?v=0616be1d829c)

### hurt

![hurt N and NE](https://ember-warden-review-whachat.fural.space/sheets/hurt-0.png?v=63bc029984f4)

![hurt E and SE](https://ember-warden-review-whachat.fural.space/sheets/hurt-1.png?v=1ea4c5f8e3fd)

![hurt S and SW](https://ember-warden-review-whachat.fural.space/sheets/hurt-2.png?v=68c3dce47e99)

![hurt W and NW](https://ember-warden-review-whachat.fural.space/sheets/hurt-3.png?v=e50d247f4241)

### death

![death N and NE](https://ember-warden-review-whachat.fural.space/sheets/death-0.png?v=b79ff6bc56ee)

![death E and SE](https://ember-warden-review-whachat.fural.space/sheets/death-1.png?v=ee7b6e79af2c)

![death S and SW](https://ember-warden-review-whachat.fural.space/sheets/death-2.png?v=7146a17a2857)

![death W and NW](https://ember-warden-review-whachat.fural.space/sheets/death-3.png?v=1857c56a6c4c)
