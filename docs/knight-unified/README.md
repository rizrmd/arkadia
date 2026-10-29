## Unified knight v4

The knight previously combined hero-v2 combat, idle-v3, locomotion-v2, and vertical-v3. The new 48-frame sheet uses one character identity for idle, walking, attacking, recoil and death. Silver and gold armor, the closed T visor, blue cape and tabard, and the sword stay consistent across movements.

Generated with the built-in imagegen tool, then refined once for an upright walking cycle. The unmodified selected source is `assets-src/characters/knight-unified-v4.png`; the previous hero-v2 was the identity reference. `first-pass.png` records the rejected running poses.

### Final refinement prompt

Edit this production knight sheet. Preserve the identical knight identity, silver/gold armor, T visor helmet, blue cape/tabard, sword, painterly style and all eight rows/six columns. Critical changes: shrink every figure to occupy at most 75% of its equal grid cell so ALL 48 figures including swords are separated by clear transparent padding; no cropped body parts or touching figures. In row 2 change all six RUNNING lunges to UPRIGHT WALKING cycle: nearly vertical torso, calm short steps, alternating left/right planted foot, arm sword carried down relaxed, same helmet and shoulder height as idle row1. In row6 use clear alternating walking steps, not repeated standing. Row7 front and row8 back must alternate feet too. Exact 6 columns x8 rows regular grid, transparent background, no labels. Each upright knight has same height/proportions across all rows and a shared foot baseline within each cell. Preserve row3 attack sequence, row4 two hurt then four death sequence, row5 rear idle. No floor or cast shadow.

### Packing and playback

Run `node scripts/pack-knight.mjs` to rebuild only the knight and its manifest entry. Full character extraction also invokes this packer. Torso-seeded alpha flood fill isolates figures, including swords crossing grid columns, and removes disconnected scraps. Every frame uses the same 0.60 scale, padded 200 × 150 cell and pivot (100, 130). Upright crowns share a height; lifted boots are not forced onto the ground each frame. Transparent alpha is preserved and atlas revision hashes invalidate cached artwork.

Rows: diagonal front idle, diagonal front walk, sword attack, two hurt plus four death, diagonal back idle, diagonal back walk, straight front walk, straight back walk. Vertical idle uses a contact pose from its respective walk cycle. All existing clip names, timings and attack impact index are retained. Diagonal directions mirror as before.

### Verification

`npm run build` and `node scripts/verify-knight.mjs` pass. The latter checks 48 nonempty isolated frames, transparent borders, one source identity, idle/walk helmet width and crown registration, all clip indices, cached revision, keyboard direction selection on desktop/mobile, successful combat kills and no browser errors. Local and live JSON reports and screenshots are saved alongside this document. Run against the published host with `DEMO_URL=https://ark-whachat.fural.space/ node scripts/verify-knight.mjs`.

Use `node scripts/publish-knight.mjs` to publish the atlas, manifest and evidence through the canonical managed sandbox without replacing the current game JS/CSS.
