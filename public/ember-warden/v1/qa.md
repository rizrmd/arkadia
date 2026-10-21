## Mobile loading defect and fix

**Deployment blocked:** the corrected viewer passes local testing, but the hosting node rejects the isolated deployment with `runtime_admission_paused` under CPU pressure. The public URL still serves the previous viewer. Earlier public playback results do not establish mobile compatibility.

The previous loader waited for all 1,312 body and VFX frames and had no visible failure/retry state. The replacement loads only the selected action, starts with four idle sheets, uses canvas crops without requiring ImageBitmap, releases unrelated clips and displays progress, timeout errors and Retry. All 45 full regression checks pass locally. Android-sized touch emulation with ImageBitmap disabled verifies startup, moving Flame Fan, death hold and recovery from an intentionally failed image. Physical-phone verification remains outstanding.

![Reported mobile loading failure](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAd3bcea6903c918c3f1964c32)

![Local mobile emulation after the loader correction](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA09e05aac89bfb1360ec482fd)

## Acceptance status

**Production candidate published; final art acceptance is pending.** The simplified 3D rendering does not yet match the approved hand-painted concept. No game-ready quality claim is made.

[Play the isolated review](https://ember-warden-review-whachat.fural.space/) · [Atlas manifest](https://ember-warden-review-whachat.fural.space/manifest.json)

## Asset coverage

- 72 body clips, 832 body frames: idle, run, four full-body skills, hurt and death in all eight facings; plus eight moving Flame Fan variants. There are exactly four skills.
- 40 separate VFX clips: Flame Fan, its moving variant, Cinder Step trail, Ember Snare seal/eruption and Furnace Heart aura.
- Body cells 256 × 256, common ground pivot (128,179.2). VFX cells 384 × 384, pivot (192,243.2); pixel scale is identical. Per-frame sockets follow the anatomical right wrist.
- All 36 body atlases have alpha, nonempty frame coverage and transparent cell margins. Every VFX active frame is checked for clipping. Unused VFX frames are transparent.

## Source constraints

All four stationary skill endpoints and hurt return exactly to the shared neutral transforms. Death's terminal transforms remain identical from normalized time 0.8 through 1.0, and rendered frames 12–15 are pixel-identical in all eight directions. Two 482-sample foot audits cover run and moving Flame Fan: maximum measured planted-foot displacement 9.802e-8 world units; floor error 5.215e-8. These numerical checks do not replace visual review.

The source audit found a 0.032-unit floor penetration during death's fall. Removing a partial floor-clamp multiplier corrected it; the repeated mesh audit now reports minimum death height 0.001000. The two accepted source revisions differ only by this death correction; body identity, camera and all other motions are unchanged. Source receipts retain both hashes.

## Playback evidence

Local browser: PASS — 45 playback/scrub/transition checks, zero page or resource errors.

Public browser: PASS — 45 playback/scrub/transition checks; 57 deployed image resources match SHA-256; zero page or resource errors.

The verifier observes every frame of all eight facings for each action at 1× and 0.25× through requestAnimationFrame playback. It tests every frame with the scrubber, idle/action/idle-or-run transitions, hurt recovery and death's terminal hold. Trace evidence is stored in local-playback.json and live-playback.json, separately from the art review. Screenshots of each action are embedded in project Knowledge.

## Mobile loading correction

The original viewer decoded every body/VFX sheet before its first draw. It now loads only the selected action, uses browser-compatible canvas crops, releases unrelated actions and displays per-sheet progress, a timeout and Retry. Startup requests only four idle sheets. Android-sized touch emulation with ImageBitmap disabled verifies moving attack, death hold and recovery from a deliberately failed sheet. This is browser emulation, not a physical-phone claim. See local-mobile-loader.json and live-mobile-loader.json for evidence.

## Visual inspection and limitations

- Fixed yaw rotations and one camera prevent mirrored-arm swaps and sheet-to-sheet scale guesses. Right-arm anatomy is explicit in the source. Heading should still receive human review at production sprite size.
- Planted locomotion feet pass numerical checks. The in-place dash needs game-driven root travel before ground contacts during travel can be accepted. Background scrolling in the viewer is an inspection aid; it is not game movement.
- Shared non-death endpoints avoid neutral pose popping. The moving attack has a distinct aimed upper body; its entry/exit and run posture need a production animator's refinement. The viewer uses approximate cross-fades and does not supply authored transition clips.
- Face, curls, jacket silhouette, shoulder forms, cloth articulation and toy-like limbs remain below the painterly reference. The fixed rig prevents independent-frame silhouette drift, but it does not establish attractive final anatomy.
- VFX are deterministic vector-authored shapes rasterized to transparent PNGs. Flame Fan follows the actual right wrist, while seal/trail/aura use the ground pivot. Activation begins on the manifest event frame. Painterly flame detail and per-pixel limb occlusion remain unresolved; facing selects front/back draw order.
- No physical-device, gameplay, collision, combat, numerical balance or runtime performance-budget acceptance is claimed.

## Death and optional downed use

Death plays once and holds its final pose; it does not recover to idle. Optional co-op downed use would require a separate revive policy and recovery animation. Those are not included and do not replace Death.

## Review outcome

The delivered pack is a reproducible animation and VFX candidate with an isolated playable review. Final visual approval and further art refinement remain required before game-ready acceptance. Gameplay deployments and peer work are outside this pack.
