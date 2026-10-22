## Export

Eight painted southeast animation clips, eight frames each: **idle, run, Flame Fan, Cinder Step, Ember Snare, Furnace Heart, hurt, death**. The new Ember identity and painted Rift-style material treatment are retained.

- `ember-warden-SE.png`: transparent 3072 × 3072 atlas, eight columns and eight rows.
- `atlas.json`: named frame rectangles, normalized ground pivots, frame durations, animation frame lists, FPS, loop policy, next state and terminal hold.
- `sheets/*.png`: eight individual 1536 × 768 sheets, four columns and two rows.
- `previews/*.webp`: eight animated previews.
- `manifest.json`: playback clips with pixel bounds and SHA-256 resource receipts.
- Interactive English viewer: action/speed selection, pause, restart, frame stepping, scrubber, idle/action/idle transitions, snow background and direct downloads.

Every frame uses a 384 × 384 cell and ground pivot (192, 320). Read each individual sheet left to right, top row then bottom row. Read the combined atlas left to right within each action row. Row order follows the action list above.

## Playback contract

Idle (6 FPS) and run (12 FPS) loop. Flame Fan (10 FPS), Cinder Step (12 FPS), Ember Snare (9 FPS), Furnace Heart (8 FPS), and hurt (12 FPS) play once and recover to idle. Their first and last frames use the exact same shared neutral pixels. Death (8 FPS) plays once and holds its final frame; its last two frames have identical settled-body pixels. It never automatically revives or loops.

Skill effects are painted into the RGBA frames. They are **not** separate body/VFX layers. Root motion, skill mechanics and gameplay integration are not included. This export covers **SE only**, not eight headings.

## Generation and packing

The built-in imagegen tool generated one eight-frame source sheet per action using the painted Ember SE turnaround as the identity reference. `generation.json` records the initial prompts. The oversized Flame Fan was revised to fit inside its source cell. Two alternate run generations and a legacy 3D pose guide are retained for traceability, not used as substitute gameplay art.

The packer extracts four-by-two source cells and removes disconnected neighboring-cell fragments. It applies one scale per clip, preserving crouch/fall pose proportions. A boot-pixel heuristic aligns standing frames to the common ground pivot; this is not a measured rig foot-contact constraint. Common neutral and terminal-hold frames use copied shared pixels. No generated body frames are mirrored or synthesized with geometric joint transforms.

The run remains a generated animation candidate: leg alternation, gait contacts, cloth continuity and shoulder/gauntlet consistency need animator review. The last alternate run attempt introduced inconsistent gauntlet detail and was excluded. Passing pixel and playback tests does not establish production-ready anatomy or physically correct motion.

## Validation

The verifier compares all 64 combined-atlas frame crops to the individual sheets, observes all eight frames of every clip at 1× and 0.25×, scrubs every frame, verifies recovery and death hold, checks phone viewport overflow and snow contrast, exercises failed-sheet retry, and hashes every original source, atlas and preview.

Public playback is executed in Chromium using actual public HTTPS responses fetched by Node; direct Chromium navigation to this sandbox hostname is unreliable in this environment. This is not a physical-device or direct browser-network test.

The shared working tree currently fails the repository TypeScript build because its unrelated `world-view.ts` work-in-progress does not expose the six-argument hero-selection API used by `main.ts`. This task changes static assets and viewers, not those gameplay files. Relevant browser and export checks pass independently.

## Commands

1. `node scripts/ember-warden/assemble-animation.mjs`
2. `node scripts/ember-warden/verify-animation.mjs`
3. `node scripts/ember-warden/publish-animation.mjs`
4. `DEMO_URL=https://ark-whachat.fural.space/ember-warden-review/v3/ node scripts/ember-warden/verify-animation.mjs`
5. Publish the final evidence, then `node scripts/ember-warden/publish-animation-knowledge.mjs`.

The scoped deployment adds `/ember-warden-review/v3/` to the existing Arkadia gateway without changing the game page, gateway, server or another session's files.
