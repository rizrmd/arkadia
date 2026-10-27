## Rift Bolt visual correction

Removed the Bolt-only `spawnSlash` cast call and the three Nixie cast emitters `crescent void sheath`, `crescent violet blade`, and `crescent cyan core`. The remaining hand singularity, plasma orb, forearm flare, streaks and motes are unchanged. Projectile, impact and ground effects are unchanged. Other skills retain their crescents and slashes.

Combat damage, targeting, rank offsets, speed (7.5 tiles/s), range (5.2 tiles), collision and cooldowns are unchanged. No UI or balance changes. Rift Dash's dedicated player and the hexagonal Skill Tree are untouched.

Rebuild FX with `node scripts/vfx/build.mjs && node scripts/vfx/pack.mjs`. Run `node scripts/rift-bolt-no-cleave/verify.mjs` for deterministic desktop (1440×900) and phone (390×844) casting, projectile speed/count, target damage, zero slash trails and preserved Astral Cleave slash checks. `GAME=https://ark-whachat.fural.space` runs against production. Captures show actual Pixi game rendering.

`npm run build` passes. Use the supported repository ship script with `--script scripts/rift-bolt-no-cleave/deploy.sh`; its shared deployment lock serializes releases with Flame Fan. The underlying standard game release preserves additive review layers. Only explicit task paths are committed; peer work remains untouched.
