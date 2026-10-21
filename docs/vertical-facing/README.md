## Straight up and down locomotion

[Play the arena](https://arkadia-custom-whachat.fural.space/). Hold **W** to walk straight up or **S** to walk straight down; release to retain that facing. Enemy pursuit and wandering use the same screen direction selection.

Both current character types (blue knight hero and red revenant enemy) now have dedicated frontal and rear six-frame walking cycles. Vertical idle holds the first matching pose. Existing diagonal movement remains available. Vertical sprites retain weapon handedness instead of being mirrored. Direction hysteresis prevents tiny path corrections from switching art repeatedly.

Movement animation remains tied to distance after collision resolution. All clips share the existing foot pivot and transparent gutters.

### Reference and generated artwork

![Hero identity reference](https://arkadia-custom-whachat.fural.space/vertical-facing/hero-reference.png)

![Enemy identity reference](https://arkadia-custom-whachat.fural.space/vertical-facing/enemy-reference.png)

![Generated vertical movement sheet](https://arkadia-custom-whachat.fural.space/vertical-facing/source.png)

Generated with the built-in imagegen tool, using both identity references. Prompt: create exactly four rows of six isolated transparent full-body frames: frontal knight walking down, rear knight walking up, frontal revenant walking down, rear revenant walking up; preserve silver/gold armour, blue cape, red ragged cloak, sword and axe; orthographic frontal/rear views with no diagonal rotation; alternate feet across a six-frame cycle. The original generated sheet is preserved at assets-src/characters/vertical-v3.png.

### Runtime evidence

![Hero and enemies using vertical views in the rendered arena](https://arkadia-custom-whachat.fural.space/vertical-facing/runtime.png)

### Verification

- TypeScript and Vite production build passed.
- 20 vertical-facing browser checks passed locally and at the public URL: both character types, both directions, six distinct gait frames, retained idle facing, no vertical mirroring, near-axis stability, diagonal transitions, W/S input.
- Seven collision regression checks passed locally and publicly.
- Public release returns HTTP 200. Initial publish timed out and left an incomplete package; all assets were staged under unique filenames before switching the loader. Final public browser verification passed.

Run npm run build, node scripts/verify-vertical.mjs, and node scripts/verify-collisions.mjs. Set DEMO_URL=https://arkadia-custom-whachat.fural.space/ to repeat the public checks.

### Scope

This adds vertical locomotion and matching stationary poses for all currently implemented character types. Attack, hit and death still use the existing artwork. Vertical idle is a held pose. Generated walk poses can still vary slightly in proportions and cape shape.
