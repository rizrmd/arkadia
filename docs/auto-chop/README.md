## Automatic tree chopping fix

The hero automatically chops a reachable tree within 5 feet (1.524 ground meters) with an Axe. Holding a movement key or stick against a trunk no longer prevents chopping once actual ground movement stops. Real movement, leaving range, death, missing Axe and hit stun still interrupt partial work. Merely having an auto-combat target nearby no longer prevents gathering. Existing tree timings, Wood yields, persistence and collision removal remain in effect.

Validation: TypeScript; 8 gathering rule scenarios; 13 real Pixi controller scenarios including held input, actual movement and hit-stun cancellation, Axe, timing, yields, reload, respawn and quota rollback. Full-game browser test uses the normal ticker to harvest a dead tree for exactly 30 Wood and verifies persistence after reload. Software Chromium uses existing 3d=0 and shadowField=0 fallbacks. Optional local VFX API proxy requests refused port 8787; game loading, harvest and reload still passed with zero page errors.

The reported screenshot shows a Rift Runner near a dead tree without active chopping. The image is retained verbatim as reported-issue.png.
