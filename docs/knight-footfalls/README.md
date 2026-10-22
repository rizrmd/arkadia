## Alternating low-clearance footfalls

The initial v4 diagonals and rear views repeated the same supporting leg. The previous checks verified frame visibility, proportions and playback, but did not establish that a walk cycle exchanged supporting legs. Human review identified the remaining hopping appearance. The straight-down walk was the accepted reference.

The correction uses three reviewed imagegen key poses per affected facing: grounded contact, screen-right foot swing, screen-left foot swing. Playback is contact → right swing → contact → left swing. Both swing poses have low boot clearance, with the opposite sole planted at the same baseline. Each group shares one scale. The grounded baseline is fixed, and the crown varies by at most two atlas pixels. Diagonal/rear cycles cover 1.6 times the old stride distance, reducing cadence without changing movement speed.

Straight-down walking and idle, plus attack, hurt and death, retain their previous metadata and exact RGBA pixels. Original rows remain in the atlas for reproducibility; nine replacement locomotion poses are appended. The atlas now has 57 unique frames. Frame counts alone are not a measure of animation quality.

### Assets and generation

Final unmodified imagegen sources:

- `assets-src/characters/knight-footfalls-front-v5.png`
- `assets-src/characters/knight-footfalls-rear-v5.png`

The built-in imagegen tool generated the correction. Earlier attempts still repeated the same leg or lifted the knees too high; those are archived under `attempts/` and are not used by the game. Exact generation and refinement prompts are in `prompts.json`.

### Reproduction and review

- `node scripts/pack-knight.mjs` rebuilds the full atlas and invokes the supplemental footfall packer.
- `node scripts/preview-knight-footfalls.mjs` produces a self-contained before/after animation player (`review.html`) with pause, a phase scrubber and normal/slow speeds.
- `npm run build` validates TypeScript and builds the game.
- `node scripts/verify-knight.mjs` verifies actual alternating boot pixels, grounded supporting soles, crown stability, all cell borders and clip indices, revision hashes, exact preservation of down-facing and combat artwork, desktop/mobile direction selection and successful combat without browser errors.
- `DEMO_URL=https://ark-whachat.fural.space/ node scripts/verify-knight.mjs` checks the deployed game.

The comparison player makes visual review repeatable. Numeric tests cover the listed invariants; they do not substitute for judging how natural an animation looks.
