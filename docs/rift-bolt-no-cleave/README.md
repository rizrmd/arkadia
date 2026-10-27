## Rift Bolt visual correction

Removed the Bolt-only `spawnSlash` cast call and the three Nixie cast emitters `crescent void sheath`, `crescent violet blade`, and `crescent cyan core`. The remaining hand singularity, plasma orb, forearm flare, streaks and motes are unchanged. Projectile, impact and ground effects are unchanged. Other skills retain their crescents and slashes.

Combat damage, targeting, rank offsets, speed (7.5 tiles/s), range (5.2 tiles), collision and cooldowns are unchanged. No UI or balance changes. Rift Dash's dedicated player and the hexagonal Skill Tree are untouched.

Rebuild FX with `node scripts/vfx/build.mjs && node scripts/vfx/pack.mjs`. Run `node scripts/rift-bolt-no-cleave/verify.mjs` for deterministic desktop (1440×900) and phone (390×844) casting, projectile speed/count, target damage, zero slash trails and preserved Astral Cleave slash checks. `GAME=https://ark-whachat.fural.space` runs against production. Captures show actual Pixi game rendering.

`npm run build` passes. Use the supported repository ship script with `--script scripts/rift-bolt-no-cleave/deploy.sh`; its shared deployment lock serializes releases with Flame Fan. The underlying standard game release preserves additive review layers. Only explicit task paths are committed; peer work remains untouched.

## Follow-up: automatic basic attack overlap

The human reported a remaining purple crescent during ordinary close-range combat. The first browser test used preview mode, which freezes basic attacks; it therefore missed a separate `attack.swing` cue emitted by `heroStep` in solo play and `netStep` in co-op. Rift Runner's basic swing now exits the cosmetic `spawnSlash` helper before creating a slash trail or Nixie swing cue. Hit calculation and damage happen independently and are unchanged. Explicit skill calls pass `skipCue=true`, preserving Rift Dash, Astral Cleave and other skill slashes; Ember Warden's basic swing is unaffected.

Run `node scripts/rift-bolt-no-cleave/verify-auto.mjs` for real automatic close-range combat at desktop and phone sizes. It requires an actual basic attack pose, auto-launched Bolt, target HP loss, zero active slash trails throughout the sampled interval, and a retained Astral Cleave slash. `GAME=https://ark-whachat.fural.space` checks production. Follow-up captures and reports are in `followup/`, including the human's reported screenshot.
