## Current movement correction

The v4 sheet below is the initial identity pass. Human review found repeated supporting-leg poses in diagonal and rear walking. The current game uses reviewed alternating low-clearance footfalls and a slower cadence for those views; straight-down movement is preserved. See **Knight — Alternating Footfalls** in this section and [open the before/after animation player](https://arkadia-custom-whachat.fural.space/knight-footfalls/review.html).

[Play the updated Stronghold](https://arkadia-custom-whachat.fural.space/).

## One knight identity across every movement

The knight now uses a single regenerated 48-frame sheet for idle, diagonal walking, straight walking, sword attacks, recoil and death. The silver and gold armor, T visor, blue cape and tabard, and sword share one design throughout. The walking pose is upright with short alternating steps.

Previously these clips came from four independently generated sheets. The new sheet replaces that mixture. Every atlas frame uses the same scale and pivot. Crown registration keeps the helmet steady when movement starts; lifted boots retain their gait offsets. Diagonal views mirror for opposite directions. Straight idle uses a contact frame from the matching walk cycle.

![Selected unified knight source sheet](https://arkadia-custom-whachat.fural.space/knight-unified/source.png)

![Packed transparent knight atlas used by the game](https://arkadia-custom-whachat.fural.space/knight-unified/atlas.png)

## In the game

![Knight in the mobile Stronghold](https://arkadia-custom-whachat.fural.space/knight-unified/local-390.png)

![Knight in the desktop Stronghold](https://arkadia-custom-whachat.fural.space/knight-unified/local-1440.png)

## Generation and integration

Generated with the built-in imagegen tool and refined once to replace running lunges with upright walking. The source remains unmodified. Torso-seeded alpha flood fill separates the figures, including weapons crossing grid columns, and drops disconnected scraps. All cells have transparent borders; the atlas revision hash prevents stale cached sprites.

[Original source](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=assets-src%2Fcharacters%2Fknight-unified-v4.png) · [Packing script](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fpack-knight.mjs) · [Generation prompt and reproduction notes](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fknight-unified%2FREADME.md)

### Reference and rejected first pass

The original knight supplied the visual identity. The first generated pass was rejected because its diagonal steps still resembled running.

![Original knight identity reference](https://arkadia-custom-whachat.fural.space/knight-unified/reference.png)

![Rejected first pass with running poses](https://arkadia-custom-whachat.fural.space/knight-unified/first-pass.png)

## Verification

Production build and local/live browser checks passed. Checks cover 48 nonempty isolated frames, transparent cell borders, one source sheet, idle/walk helmet proportions and crown alignment, all clip indices, the deployed atlas revision, four movement directions on desktop and mobile layouts, a successful combat kill, and no browser errors.

The live revision is `c9a0e18bb327a0bd`. Implementation commit: `619743b`, pushed to `feat/stronghold`. The atlas and manifest are deployed on the canonical Stronghold host.

[Verification script](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fverify-knight.mjs) · [Live report](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fknight-unified%2Flive.json)