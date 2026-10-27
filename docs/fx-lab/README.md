## Unified 3D FX Lab

Open https://arkodia.online/fx-lab/. All controls are Pixi, including the full production skill-tree diagram. Select Ember Warden or Rift Runner, inspect all 15 nodes each, and preview the five implemented active skills per hero. Passive descriptions and planned ultimate/evolution nodes are retained; planned nodes explicitly have no gameplay VFX.

The lab uses `create3dHeroRenderer`, `createCombatVfx`, the production tree definitions and `SkillTree`. Rank 1–5, eight directions, idle/run, replay, loop, pause, zoom and day/night are available. Query parameters preserve hero, skill, rank, direction, pose, loop and lighting. Gameplay saves are never read or written.

Snow uses `GAMEPLAY_SNOW` and `gameplaySnowPattern`, shared with `world-view.ts`, including its .7 texture density and 2:1 projection.

Legacy skill-player, Flame Fan/Burst, Rift Dash/Bolt and Houdini Flame Fan page entry points redirect to FX Lab. Gameplay texture/model files remain accessible. Old standalone VFX builds are no longer staged by the release script.

Run `node scripts/fx-lab-verify.mjs` for desktop/mobile, all 30 nodes, both full trees, ranks 1/3/5, all directions, legacy redirects, no HTML controls and JavaScript-error checks. Set BASE_URL to validate a deployed release.
