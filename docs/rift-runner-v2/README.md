## Current status

Progress toward the active goal: **fix and generate until game-ready**. This prototype is not final art and does not meet the complete eight-direction skill and VFX acceptance yet. It does not replace the gameplay hero.

The previous free-generated pose sheets remain archived in v1. Their anatomical swaps and contact errors motivated testing a controlled source instead of trying to fix them solely through crop alignment.

## Controlled source

A reproducible Blender 4.5.3 scene defines a single hooded character, fixed anatomical emitter arm, exact yaw rotations, materials, camera and articulated joints. The approved concept front view is the canonical emitter-side reference: anatomical **right**. Earlier prompts called the emitter left; the human brief did not prescribe a side, and the concept itself varies between views. This prototype fixes one side for every render rather than mirroring images.

Imagegen generated the teal cloth, rust scarf, brown leather and charcoal material study in `public/rift-runner/v2/source/material-atlas.png`. The rig is built by `scripts/rift-runner/rig.py`. The generated material is used in the shader. Current visual limitations include simplified face, stiff coat panels, toy-like limb forms, insufficient scarf articulation and a style difference from the hand-painted concept. These must be improved before final visual acceptance.

The source mesh is retained in `rift-runner-rig.blend`, and the complete construction is in the script. Renderer packages and dynamic libraries are installed only under the sandbox home. `setup-renderer.sh` documents the pinned bpy setup; `setup-render-deps.py` checks Debian package SHA-256 before extracting libraries under the home directory. Existing browser libraries and glibc are prerequisites in this sandbox.

## Run contact proof

The current twelve-frame southeast loop uses two-bone inverse kinematics, a 0.8-second cycle and an in-place speed of 1.145833 model units per second. A dense audit evaluates both feet over 241 cycle samples (482 foot states). It measures actual evaluated joint transforms with the matching root velocity applied, rather than inferring contacts from silhouette bounds.

Measured maximum planted-foot displacement per sample: 9.81e-8 model units. Maximum stance-floor error: 5.22e-8. Both pass a 1e-5 tolerance. This proves the prototype contact constraint only; it does not prove the whole task or the visible quality of all clips.

The local browser observed all twelve actual animation frames, verified alpha, pause and stepping, with zero page/resource errors. `local-prototype.json` records the result. The viewer clock was also corrected: it initializes from its first requestAnimationFrame timestamp and clamps elapsed time nonnegative, preventing a first-frame negative index. The earlier v1 viewer receives the same correction.

## Remaining work

- Refine the model and materials until the visual identity and quality match the approved concept.
- Add articulated scarf and cloth follow-through without mesh intersections.
- Replace provisional skill motion with complete anticipation, activation/impact and recovery poses; verify hand/ground contact and emitter sockets.
- Render and inspect idle/run and all four skills in all eight directions from the same source.
- Produce separate calibrated projectile, afterimage, trap and aura effects with clean birth, sustain and fade behavior.
- Export common neutral endpoints, stable projected pivots, locomotion metadata, clip timing and effect sockets.
- Verify every final clip in playback, including loop seams, direction changes and skill transitions; audit source anatomy, frame coverage, alpha, clipping, contacts and mesh intersections.
- Publish every produced image inline in the existing English Knowledge hierarchy, then push and deploy scoped assets and repeat public verification.

No completion or game-ready claim is made while any of these requirements lacks direct evidence.

## Added standard states

The human explicitly added **hurt** and **death** to game-ready acceptance. Both must cover N, NE, E, SE, S, SW, W and NW from the same canonical character source.

- Hurt: readable impact reaction, recoil and recovery to the shared neutral; one-shot, with an interrupt/recovery policy in the manifest.
- Death: impact, loss of balance, fall and settled terminal pose; one-shot with hold-last-frame playback. It must not recover to idle or loop. Verify floor contact, final pose stability and directional coverage.

The complete final body scope is idle, run, Pulse Shot, Phase Dash, Rift Trap, Overdrive, hurt and death. Standard-state additions do not authorize gameplay hero replacement.

## Source isolation and current production candidate

Remaining work runs in the dedicated task worktree. `render-body.sh` checks the source hash before/after the job, requires an explicit `BODY_EXPORT` receipt, then validates the output metadata. This prevents a refreshed shared checkout from silently running an earlier turnaround script.

Source `3346c6057837` currently supplies the complete eight-direction Pulse Shot candidate: four 24-frame sheets, 96 total frames, calibrated 256px cells and world ground pivot (128,224). Every clip has pixel-identical first/last neutral frames. Its local browser test observed all 96 frames and neutral/action/neutral phases without errors. Source-constraint checks now cover all six initial action families, including exact endpoint transforms, smooth skill starts and trap palm contact at the floor. These do not yet establish full eight-state final readiness.
