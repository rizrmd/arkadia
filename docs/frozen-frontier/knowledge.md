## Scope and review

Concept and initial 15-sprite snowy ruins kit, ready for human art review. Full-map dressing is a later decision. No gameplay placement or asset preload was added.

[Open interactive gallery](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v1/) · [Asset manifest](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv1%2Fmanifest.json) · [Prompts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Ffrozen-frontier%2Fprompts.json) · [Validation report](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Ffrozen-frontier%2Fverification.json)

## Concept sheet

![Frozen Frontier Ruins concept sheet](/api/rooms/DR7f0a660e4dfc6ca5002753b3/attachments/DAaeb34c9d4c75946473af36aa)

## Assembled example

This courtyard uses the delivered PNG sprites and manifest pivots. The 1.8 m human silhouette is approximately 67 world pixels, based on the existing hero display. Cyan crosses indicate footprint centers; snow caps attach at their centers.

![Assembly from delivered sprites](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v1/assembled-preview.png)

## Kit overview

![Transparent kit on checkerboard](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v1/kit-preview.png)

## Placement and scale

Arkadia uses 2:1 dimetric ground axes with slopes ±0.5, 64/32 px half-axes, and a 3 m tile. Use each manifest pivot in export pixels: draw at position minus pivot times scale. Snow caps are attachment overlays. Existing Environment, Court & Snow Corner Assets, and Technical Handoff & Future Areas pages were audited before generation.

Palette: weathered grey/beige limestone, ivory snow, muted slate blue shadows and sparse ochre lichen. Light comes from upper left. Orientations were independently generated rather than mirrored. Full-resolution sources remain in assets-src/frozen-frontier/v1.

These are initial design dimensions and placement references. Painted geometry varies from exact projection; final modular joins, physical scale, collision and occlusion need calibration during a later integration phase. Foundation and paving use 6 m review footprints to match their displayed 256 world pixel width.

| Module | Export px | Pivot px | World width px | Footprint m | Height target m |
|---|---|---|---|---|---|
| wall-ne | 768 × 508 | 384, 381 | 144 | 3 × 0.45 | 2.4 |
| wall-se | 768 × 509 | 384, 382 | 144 | 3 × 0.45 | 2.4 |
| corner-n | 768 × 523 | 384, 397 | 144 | 1.5 × 1.5 | 2.4 |
| corner-s | 768 × 511 | 384, 388 | 144 | 1.5 × 1.5 | 2.4 |
| arch-ne | 768 × 694 | 384, 590 | 156 | 3 × 0.65 | 3.6 |
| arch-se | 768 × 759 | 384, 645 | 156 | 3 × 0.65 | 3.6 |
| pillar-intact | 768 × 2068 | 384, 1944 | 36 | 0.65 × 0.65 | 2.4 |
| pillar-broken | 768 × 1363 | 384, 1186 | 32 | 0.65 × 0.65 | 1.1 |
| stairs-ne | 768 × 578 | 384, 387 | 110 | 1.5 × 1.5 | 0.75 |
| stairs-nw | 768 × 660 | 384, 442 | 110 | 1.5 × 1.5 | 0.75 |
| foundation | 768 × 507 | 384, 284 | 256 | 6 × 6 | 0.3 |
| paving | 768 × 529 | 384, 265 | 256 | 6 × 6 | 0 |
| rubble | 768 × 420 | 384, 302 | 86 | 1.5 × 1 | 0.5 |
| snow-cap-ne | 768 × 282 | 384, 141 | 144 | 3 × 0.5 | 0.08 |
| snow-cap-se | 768 × 242 | 384, 121 | 144 | 3 × 0.5 | 0.08 |

## Individual transparent assets

### wall-ne

![wall-ne transparent sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v1/assets/wall-ne.png)

[PNG source export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv1%2Fassets%2Fwall-ne.png)

### wall-se

![wall-se transparent sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v1/assets/wall-se.png)

[PNG source export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv1%2Fassets%2Fwall-se.png)

### corner-n

![corner-n transparent sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v1/assets/corner-n.png)

[PNG source export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv1%2Fassets%2Fcorner-n.png)

### corner-s

![corner-s transparent sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v1/assets/corner-s.png)

[PNG source export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv1%2Fassets%2Fcorner-s.png)

### arch-ne

![arch-ne transparent sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v1/assets/arch-ne.png)

[PNG source export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv1%2Fassets%2Farch-ne.png)

### arch-se

![arch-se transparent sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v1/assets/arch-se.png)

[PNG source export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv1%2Fassets%2Farch-se.png)

### pillar-intact

![pillar-intact transparent sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v1/assets/pillar-intact.png)

[PNG source export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv1%2Fassets%2Fpillar-intact.png)

### pillar-broken

![pillar-broken transparent sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v1/assets/pillar-broken.png)

[PNG source export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv1%2Fassets%2Fpillar-broken.png)

### stairs-ne

![stairs-ne transparent sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v1/assets/stairs-ne.png)

[PNG source export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv1%2Fassets%2Fstairs-ne.png)

### stairs-nw

![stairs-nw transparent sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v1/assets/stairs-nw.png)

[PNG source export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv1%2Fassets%2Fstairs-nw.png)

### foundation

![foundation transparent sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v1/assets/foundation.png)

[PNG source export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv1%2Fassets%2Ffoundation.png)

### paving

![paving transparent sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v1/assets/paving.png)

[PNG source export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv1%2Fassets%2Fpaving.png)

### rubble

![rubble transparent sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v1/assets/rubble.png)

[PNG source export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv1%2Fassets%2Frubble.png)

### snow-cap-ne

![snow-cap-ne transparent sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v1/assets/snow-cap-ne.png)

[PNG source export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv1%2Fassets%2Fsnow-cap-ne.png)

### snow-cap-se

![snow-cap-se transparent sprite](https://ark-whachat.fural.space/environment-corners/frozen-frontier/v1/assets/snow-cap-se.png)

[PNG source export](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=public%2Ffrozen-frontier%2Fv1%2Fassets%2Fsnow-cap-se.png)

## Audit references and source studies

Reference images and source studies viewed during this task are preserved inline below. The two snow-cap candidates included unwanted stone walls; corrective image-generation edits removed those walls from the final exports.

### existing-game

![existing-game](/api/rooms/DR7f0a660e4dfc6ca5002753b3/attachments/DAbb6a6c39b7103b9a3f45d6f0)

### existing-stone

![existing-stone](/api/rooms/DR7f0a660e4dfc6ca5002753b3/attachments/DAbbb5ce59f63fe709069ab79e)

### source-wall

![source-wall](/api/rooms/DR7f0a660e4dfc6ca5002753b3/attachments/DA6b7fcebcb2de96918d18bc96)

### source-foundation

![source-foundation](/api/rooms/DR7f0a660e4dfc6ca5002753b3/attachments/DA1ee77670f7a7ec0f166a3cbe)

### source-arch

![source-arch](/api/rooms/DR7f0a660e4dfc6ca5002753b3/attachments/DA4b4466029d19ec7e0328fc2e)

### source-pillar

![source-pillar](/api/rooms/DR7f0a660e4dfc6ca5002753b3/attachments/DAe6e05700944b8db36b564cc3)

### candidate-ne

![candidate-ne](/api/rooms/DR7f0a660e4dfc6ca5002753b3/attachments/DA4a3787fddc043b3932ed78b0)

### candidate-se

![candidate-se](/api/rooms/DR7f0a660e4dfc6ca5002753b3/attachments/DA1cc7c28362ead4ce69a54b02)

## Verification and delivery

All 15 exports contain transparent and solid pixels, with pivots inside their bounds. Browser verification passed: all 15 images loaded, zero page errors, pivot toggle works, and no horizontal overflow at 390 px. The isolated review gallery has no imports in gameplay code. Asset-only shipping uses the supported repository script workflow and preserves the current combined game release and gateway memory fixes.
