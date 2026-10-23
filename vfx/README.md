# Arkadia skill VFX (NixieFX)

Every skill, hit, level-up and combo effect in the Stronghold is a [NixieFX](https://nixiefx.com/) particle effect.
This folder is the NixieFX editor project (`vfx-editor.prj`): open it with **Open Folder** in the
[NixieFX editor](https://nixiefx.com/editor/) to inspect or tune any effect.

```
vfx/recipes/*.mjs        compact effect recipes, one file per hero + shared      ← edit these
scripts/vfx/lib/         layers.mjs (emitter layers) · kits.mjs (skill archetypes) · palettes.mjs · nixie.mjs (compiler)
vfx/effects/<owner>/     NixieFX effect JSON compiled from the recipes (listed in generated-effects.json)
vfx/assets/textures/     particle textures, painted by scripts/vfx/texture-painters.js
vfx/out/vfx/             official NixieFX export (git-ignored)
public/vfx/              what the game downloads: skills.bin (all effects, gzipped) + textures
src/fx/                  runtime: stage.ts (Pixi planes), space.ts (projection), cues.ts, heroes/*.ts, lab.ts
```

`npm run vfx` compiles the recipes, validates and exports with the NixieFX CLI, and packs `public/vfx/`.
`npm run vfx:textures` repaints the textures. `/fx-lab` in the game previews every hero's skills and cues.

## How an effect gets on screen

1. **Combat** (`src/stronghold/combat-vfx.ts`) names a moment: `flame-fan.cast`, `flame-fan.bolt`, `flame-fan.impact`,
   `ember-snare.telegraph`, `ember-snare.detonate`, `hit.crit`, `level-up`, …
2. **Cue profiles** (`src/fx/heroes/*.ts`) map that moment to NixieFX effects for the casting hero. A hero profile
   `extends` another (default `shared`), so it lists only what it does differently.
3. **The stage** (`src/fx/stage.ts`) plays each effect on one of two transparent WebGL planes: effects whose key
   ends in `.ground` lie flat on the snow under every figure, the rest play over the figures.

## Effect space

1 unit = 1 ground tile. **+X is the aim**, +Y is up, +Z is the caster's right. Cast effects start at the caster's
feet (her hand is about `[.28, .62, 0]`), impacts and detonations at the target's feet. A cue turns the effect to the
aim and can scale it by the skill's radius (`scale:'radius'` over `baseRadius`), so area skills grow with rank.
Ground effects are drawn as seen from above and squashed 2:1, so billboards become flat, correctly spinning decals.
NixieFX velocity alignment points a texture's **top** along the motion, so every motion texture is painted head-up.

## Blending and particle magic circles

Snow is bright by day, where additive light washes out to white. Soft bodies (flames, fire streams, cracks, outer magic circle beds) are therefore alpha-blended in saturated colours with intensity ≤ 1, and only thin highlights (sparks, embers, glints, arcs, cores, inner magic circle streaks) are additive. Additive particles add light without writing alpha (a blend override in `stage.ts`), so they brighten the world under the canvas instead of covering it. NixieFX bloom is off by default: it tone-maps every particle and dulls saturated fire (`?fxbloom=1` to compare).

Every magic circle and shock ring (`L.magicCircle`, `L.sigil`, `L.ring` in `scripts/vfx/lib/layers.mjs`) is constructed entirely from orbiting and expanding particle emitters (`streak`, `ember`, `flare`, `dot` with `shape: {type: 'circle', arcMode: 'burstSpread'}` and tangential `orbit`) rather than predefined vector or ring images.

## Adding a skill or a hero

1. Write the effects in `vfx/recipes/<hero>.mjs`: start from a kit (`kits.projectile`, `kits.trap`, `kits.slam`,
   `kits.dash`, `kits.cleave`, `kits.swing`) with a palette, add layers with `extra`, or stack layers by hand
   (see Flame Fan in `ember-warden.mjs`). A new element is a new palette in `palettes.mjs`.
2. `npm run vfx`.
3. Add `src/fx/heroes/<hero>.ts` with `defineHeroFx({id, extends:'shared', cues:{…}})` and import it in `src/fx/index.ts`.
4. Check it in `/fx-lab?hero=<hero>` and in the game, and capture evidence with `scripts/vfx/capture.mjs` (lab) or
   `scripts/vfx/capture-game.mjs` (game).

Effects authored directly in the NixieFX editor can live next to the generated ones in `vfx/effects/`; the build only
rewrites or prunes the files listed in `generated-effects.json`.
