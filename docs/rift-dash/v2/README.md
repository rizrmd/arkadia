## Dedicated Rift Dash VFX player

Canonical URL: https://ark-whachat.fural.space/rift-dash/player/

This standalone Pixi player shows the recovered generated departure and arrival flipbooks, directional trail, particle sprites, character afterimages, aim range and heading. It is separate from the main game and does not change game mechanics or other skills.

All controls are Pixi objects: play/pause, replay, slow speed, four held phases, and eight headings. Drag the stage to aim, then release to replay the dash. Desktop Space replays. The character moves between endpoints during Travel. Direction is quantized to the eight headings. This is a VFX inspection player, with no gameplay collision or damage simulation.

The previous session left its player, source PNGs and runtime WebPs uncommitted. They were recovered through supported home-file transfers, with source hashes verified by the packer. Sources remain under public/rift-dash/v2/source. The player build is self-contained, including its character sheet; no main-game bundle is loaded.

Build: `node scripts/rift-dash/build.mjs`. Check: `npx tsc --noEmit` and `node scripts/rift-dash/player-verify.mjs`. The latter serves the built page through the actual gateway and checks the dedicated document, missing-route 404, mouse/touch input, phase timing, actor displacement, eight directions, speed, replay, and control bounds at desktop, portrait, landscape and 560px embed sizes. Touch uses Chromium emulation, not physical devices.

Publish: `bash scripts/rift-dash/deploy.sh`, using the supported Arkodia layer publisher, bounded JSON batches, deployment lock and live peer process checks. It refuses to overwrite an unexpectedly changed live gateway. The general game release script also stages this player so a later release retains it. Verify live: `VERIFY_URL=https://ark-whachat.fural.space node scripts/rift-dash/player-verify.mjs`.

Local/live JSON reports and images in this directory are separate evidence; earlier gameplay reports do not verify this player. The Knowledge page preserves both original DA references and existing concept/gameplay images. Chat delivery must contain an actual iframe in origin room DR1ad76840133f5b3b50b3114e after live checks pass.
