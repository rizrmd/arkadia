<!-- frozen-frontier-v2 -->

## Landmarks and winter growth — v2

The expanded review kit contains **14 new transparent sprites**: three landmarks, three pine silhouettes and sizes, two dead trees, two winter shrubs, two dry grass forms and two snowy rock clusters. Each of the three assembled compositions uses 64 delivered sprites with the same hero scale. This is asset and gallery work; gameplay placement remains a later phase.

[Open v2 review gallery](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/) · [Pivots and scale manifest](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv2%2Fmanifest.json) · [Exact generation prompts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Ffrozen-frontier-v2%2Fgeneration-prompts.json) · [Composition placements](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv2%2Fcompositions.json)

### Contact sheet

![All fourteen reusable sprites on checkerboard](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/contact-sheet.png)

### Assembled compositions

These scenes are rendered from the delivered PNGs, depth sorted at their ground pivots. Snow staging is a neutral review surface; it is not a new gameplay terrain asset. The human scale marker is 1.8 m (66.6 world pixels); the scene camera displays world pixels at 1.2×. Irregular clusters combine pine canopy, deadwood, juniper, bare shrubs, dry grass and snow-covered stones around an open landmark approach.

#### The Frostbound Passage

![The Frostbound Passage assembled from delivered assets](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/ruined-gate-composition.png)

#### The Silent Lookout

![The Silent Lookout assembled from delivered assets](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/broken-watchtower-composition.png)

#### The Winter Sanctuary

![The Winter Sanctuary assembled from delivered assets](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/snowy-shrine-composition.png)

### Individual reusable sprites and placement contract

All PNGs have real alpha and 24 px transparent padding. The manifest pivot is measured in padded export pixels at visual ground contact. Draw at `(groundX - pivot.x × scale, groundY - pivot.y × scale)`, with export dimensions multiplied by scale. Height targets use 37 world pixels per vertical meter, matching the existing hero reference. Painted perspective and footprint estimates require collision, occlusion and walkability calibration during future map integration.

| Asset | Export px | Ground pivot px | Scale | Height target m | Footprint target m |
|---|---|---|---|---|---|
| ruined-gate | 1008 × 726 | 504, 614 | 0.2508 | 4 | 5 × 1.5 |
| broken-watchtower | 1008 × 1004 | 514, 846 | 0.2701 | 6 | 4 × 4 |
| snowy-shrine | 1008 × 1130 | 504, 955 | 0.1192 | 3 | 3 × 3 |
| pine-tall | 688 × 1423 | 344, 1344 | 0.1962 | 7 | 2.5 × 2.5 |
| pine-broad | 688 × 650 | 344, 590 | 0.3269 | 5 | 3.8 × 3.8 |
| pine-sapling | 688 × 1202 | 344, 1120 | 0.0608 | 1.8 | 1 × 1 |
| dead-tree | 688 × 647 | 344, 587 | 0.2629 | 4 | 2 × 2 |
| dead-snag | 688 × 892 | 325, 800 | 0.1192 | 2.5 | 1.2 × 1.2 |
| shrub-juniper | 688 × 422 | 344, 334 | 0.0955 | 0.8 | 1.3 × 1 |
| shrub-twigs | 688 × 451 | 344, 387 | 0.0917 | 0.9 | 1.2 × 1 |
| grass-tussock | 688 × 536 | 344, 463 | 0.0464 | 0.55 | 0.65 × 0.65 |
| grass-patch | 688 × 235 | 344, 164 | 0.0661 | 0.25 | 1.3 × 0.7 |
| rock-boulders | 688 × 319 | 344, 219 | 0.1708 | 0.9 | 2 × 1.4 |
| rock-scatter | 688 × 214 | 344, 125 | 0.1099 | 0.3 | 1.4 × 0.8 |

#### ruined-gate

![ruined-gate transparent reusable sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/assets/ruined-gate.png)

[PNG export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv2%2Fassets%2Fruined-gate.png)

#### broken-watchtower

![broken-watchtower transparent reusable sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/assets/broken-watchtower.png)

[PNG export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv2%2Fassets%2Fbroken-watchtower.png)

#### snowy-shrine

![snowy-shrine transparent reusable sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/assets/snowy-shrine.png)

[PNG export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv2%2Fassets%2Fsnowy-shrine.png)

#### pine-tall

![pine-tall transparent reusable sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/assets/pine-tall.png)

[PNG export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv2%2Fassets%2Fpine-tall.png)

#### pine-broad

![pine-broad transparent reusable sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/assets/pine-broad.png)

[PNG export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv2%2Fassets%2Fpine-broad.png)

#### pine-sapling

![pine-sapling transparent reusable sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/assets/pine-sapling.png)

[PNG export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv2%2Fassets%2Fpine-sapling.png)

#### dead-tree

![dead-tree transparent reusable sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/assets/dead-tree.png)

[PNG export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv2%2Fassets%2Fdead-tree.png)

#### dead-snag

![dead-snag transparent reusable sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/assets/dead-snag.png)

[PNG export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv2%2Fassets%2Fdead-snag.png)

#### shrub-juniper

![shrub-juniper transparent reusable sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/assets/shrub-juniper.png)

[PNG export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv2%2Fassets%2Fshrub-juniper.png)

#### shrub-twigs

![shrub-twigs transparent reusable sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/assets/shrub-twigs.png)

[PNG export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv2%2Fassets%2Fshrub-twigs.png)

#### grass-tussock

![grass-tussock transparent reusable sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/assets/grass-tussock.png)

[PNG export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv2%2Fassets%2Fgrass-tussock.png)

#### grass-patch

![grass-patch transparent reusable sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/assets/grass-patch.png)

[PNG export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv2%2Fassets%2Fgrass-patch.png)

#### rock-boulders

![rock-boulders transparent reusable sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/assets/rock-boulders.png)

[PNG export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv2%2Fassets%2Frock-boulders.png)

#### rock-scatter

![rock-scatter transparent reusable sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/assets/rock-scatter.png)

[PNG export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv2%2Fassets%2Frock-scatter.png)

### Source art and audit images

Generated with the built-in image_gen tool using one independent call per asset and transparent output. Exact prompts and unmodified generation artifacts are retained. The v1 reference contact sheet remains embedded in the original kit overview above. The initial source contact sheet used during visual inspection is preserved below.

![Initial source contact sheet](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/source-contact-sheet.png)

#### ruined-gate original generation

![ruined-gate unmodified generation source](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/sources/ruined-gate.png)

#### broken-watchtower original generation

![broken-watchtower unmodified generation source](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/sources/broken-watchtower.png)

#### snowy-shrine original generation

![snowy-shrine unmodified generation source](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/sources/snowy-shrine.png)

#### pine-tall original generation

![pine-tall unmodified generation source](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/sources/pine-tall.png)

#### pine-broad original generation

![pine-broad unmodified generation source](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/sources/pine-broad.png)

#### pine-sapling original generation

![pine-sapling unmodified generation source](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/sources/pine-sapling.png)

#### dead-tree original generation

![dead-tree unmodified generation source](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/sources/dead-tree.png)

#### dead-snag original generation

![dead-snag unmodified generation source](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/sources/dead-snag.png)

#### shrub-juniper original generation

![shrub-juniper unmodified generation source](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/sources/shrub-juniper.png)

#### shrub-twigs original generation

![shrub-twigs unmodified generation source](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/sources/shrub-twigs.png)

#### grass-tussock original generation

![grass-tussock unmodified generation source](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/sources/grass-tussock.png)

#### grass-patch original generation

![grass-patch unmodified generation source](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/sources/grass-patch.png)

#### rock-boulders original generation

![rock-boulders unmodified generation source](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/sources/rock-boulders.png)

#### rock-scatter original generation

![rock-scatter unmodified generation source](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/sources/rock-scatter.png)

### Verification and deployment

Local browser verification passed at 1440 px desktop, 390 px portrait and 844 px landscape: all 14 images and three scenes render, filters and both pivot controls work, shared hero scale and background controls work, zero page errors or failed requests, and no horizontal overflow. Export validation confirms transparent and solid pixels, clear 24 px borders and in-bounds pivots.

[Local validation](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Ffrozen-frontier-v2%2Fverification.json) · [Live validation](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Ffrozen-frontier-v2%2Flive-verification.json)

Deployment uses the supported prefix-only review layer at /environment-corners/frozen-frontier/v2. It preserves the installed combined game and gateway, including peer loading and memory fixes. No game source, map placement or asset preload was changed.
