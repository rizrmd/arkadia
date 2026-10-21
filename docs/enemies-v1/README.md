## Delivered assets

Ashfang (Bite) and Mire Imp (Claw Swipe) each have 48 extracted frames, an independent manifest, 11 animation clips, and animated WebP previews. The interactive player supports slow motion, pause, scrubbing, diagonal mirroring, one-shot final holds, and idle/action transitions. These are generated review assets; gameplay code and the existing character manifest are untouched.

## Inspected pipeline

`assets-src/characters/enemy-v2.png` is a 1254 × 1254 six-column, six-row source. The actual `public/assets/characters/manifest.json` Revenant uses 48 frames after supplemental locomotion/idle/vertical sources. Its atlas is 784 × 996; cells are 126 × 120, pivot (74,114), gutter 4, alpha threshold 16. Rows are diagonal idle, diagonal move, attack, hit/death, rear idle, rear move, straight-down move, straight-up move. Hit is row 4 columns 1–2; death is columns 3–6. Straight idle reuses the first respective walk frame. The new manifest copies those exact frame indices and timings, including impact frame 3 (zero based). Front move is 7 fps; rear/vertical moves and attacks/hit are 10 fps, idle 6 fps, death 8 fps.

The new sources consolidate this into 6 × 8 poses, rather than pretending the original 6 × 6 alone covers the current contract. Ashfang source is 1536 × 1024; Mire Imp is 1086 × 1448. Their irregular spacing is extracted by connected alpha components, never blindly cropped by a nominal grid. Exactly 48 figures were found in each, with no unowned speck pixels dropped.

## Scale and registration

One scale per complete character is used; no per-frame resizing. The atlas/cell/pivot/gutters match Revenant exactly. Source pixel scales necessarily differ: Ashfang 0.3664921466, Mire Imp 0.4247787611, versus Revenant 0.5. These are measured in different-resolution source sheets. A uniform whole-character fit keeps the wide wolf and extended claw inside the existing cell/pivot, so the resulting wolf is lower than the biped and Mire Imp is smaller than Revenant. The manifest records actual scale and normalization instead of claiming a false 0.5 match. All facings share that scale. Alpha silhouette registration aligns X; shared row ground baselines preserve lifted feet instead of forcing each foot onto the floor. Every cell border is asserted transparent.

## Visual review and limitations

The gray/ochre wolf and moss/ochre swamp monster fit the painterly, elevated orthographic enemy style. Both keep recognizable anatomy and identity across the source facings; Bite and Claw Swipe read distinctly, and recoil/death are separately playable. No missing frame or clipped neighbour was found. Death ends in a settled corpse; non-looping playback holds that pose.

Generated poses are not a rigged gait. Ashfang has uneven paw spacing, similar extended-leg poses, slight body-length changes during attack, and a noticeable change from diagonal to straight-view silhouette. Mire Imp has shoulder/ear/moss silhouette changes, foot drift, and a sharper upper-body swing during its swipe. Idle/move transitions and walk loop seams can pop; the ground pivot does not prove planted-foot contact. The illustrative travel speed is not calibrated to game movement. Combat/hit/death cover only the source diagonal and its mirror, as in the existing contract; no eight-direction combat is claimed. Straight idle is a held walk pose. These assets need motion/art review before any future gameplay integration.

The original Ashfang already had real alpha; its hidden RGB looked brown in the image viewer. A requested background-cleanup variant also has alpha but increased orange highlights, so it is retained as an unused generated alternative and embedded in Knowledge. Neither is silently substituted.

## Reproduction and verification

- `node scripts/enemies/pack.mjs` extracts/normalizes source art, writes atlases, manifest, previews, and pixel audit.
- `node scripts/enemies/verify.mjs` verifies all clip frames in a real browser, one-shot holds, attack transition, mirror, mobile width, atlas dimensions, transparent borders, and all 22 animated WebPs.
- `DEMO_URL=https://arkadia-enemies-whachat.fural.space node scripts/enemies/verify.mjs` runs the same checks against deployment.
- `node scripts/enemies/deploy.mjs` deploys only this asset review site to its dedicated Fural sandbox. It never edits the shared game loader or the co-op sandbox.

Image generation used the built-in imagegen tool. Prompts requested the same 48-pose order, orthographic elevated camera, upper-left light, transparent background, constant anatomy and scale, separate full bodies, no labels, scenery, VFX, or ground shadows. Ashfang: ash-gray four-legged wolf, charcoal fur, ochre highlights, ember eyes; six-frame southeast breathing/trot/Bite; two recoil plus four death; northwest idle/trot; south/north walks. Mire Imp: moss-green hunched biped, long clawed arms, pointed ears, ochre eyes; same row structure with right-arm Claw Swipe. The unused Ashfang edit requested background extraction only with the 48 poses preserved; output changed highlights and was not selected.
