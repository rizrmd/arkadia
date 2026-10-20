## Collision animation stability

Opposing AI can collide and push each other without rapidly changing sprite direction or walking in place. The fix is published at https://arkadia-whachat.fural.space/ on branch `feat/stronghold` (implementation commit `21cc329`).

## Changes

- Facing uses a normalized screen direction with an angular dead band. Small collision displacements near horizontal or vertical movement retain the previous sprite quadrant; deliberate turns still select the correct front/back art and horizontal mirror.
- Locomotion is finalized after collision separation. Only forward progress advances the stride; blocked or backward-pushed actors idle. Walking resumes immediately when movement becomes possible, with separate stop/resume thresholds to avoid toggling near zero progress.
- Ring AI enters retreat below 2.4 tiles and leaves above 2.6 tiles. Engaged attackers retain a 0.3-tile selection preference. Small collision displacements no longer repeatedly reverse retreat decisions or exchange the eighth attacker.

Implementation: [Arena movement and animation](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fcharacters%2Farena.ts).

## Verification

`npm run build` passes. `node scripts/verify-characters.mjs` passes all 13 arena regression groups, including combat, directional art, stride cadence, 36-actor depth sorting, 72-actor rendering and no browser errors.

`node scripts/verify-collisions.mjs` passes seven focused checks locally and on the public deployment: opposing contact over 180 simulation frames, immediate recovery after unblocking, front/back and mirror stability near axes, retreat stability across collision-sized boundary jitter, retreat release, and stable engagement selection. Both opposing actors remain idle with zero stride advancement while blocked and retain opposite facing. Tests use deterministic simulation in Chromium with SwiftShader; they do not claim physical-device performance.

Repeat against the public deployment:

```bash
DEMO_URL=https://arkadia-whachat.fural.space/ node scripts/verify-collisions.mjs
```

Machine-readable evidence is stored in `docs/collisions/local.json`, `docs/collisions/live.json`, and `docs/collisions/arena-regression.json`.
