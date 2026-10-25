## Result

Frozen Frontier scenery now loads a content-addressed atlas paired with its frame catalog. Repacking the atlas can no longer make a newer image load with an older client's sprite rectangles. The legacy atlas is retained at the bytes served by the previous live build, and future builds retain their older hashed atlas files.

Both modular doorway arches now follow the 2:1 floor edges while their piers remain vertical. The correction is specific to `arch-ne` and `arch-se`; the already-aligned landmark gate keeps its existing projection. The same transform is applied to hero cutouts and camera bounds, so the opening remains clear, characters behind stone are occluded correctly, and the top of an arch stays visible at the camera edge.

## Player reference

The report showed fragmented scenery and a doorway that appeared misaligned. The player also noted that another arch with the same orientation looked normal; orientation alone was therefore insufficient to diagnose the issue.

![Original player screenshot showing the fragmented ruins](/api/organizations/ORd5dd6f99b4308d6187031557/task-attachments/TAcf161541b209a321a7d518ff)

## Verified appearance

![East doorway aligned with its floor](https://ark-whachat.fural.space/frontier-rendering/desktop-east.webp)

![West doorway aligned with the opposite floor edge](https://ark-whachat.fural.space/frontier-rendering/desktop-west.webp)

![Hero behind an arch pier](https://ark-whachat.fural.space/frontier-rendering/desktop-behind.webp)

![East doorway on a portrait phone](https://ark-whachat.fural.space/frontier-rendering/portrait-east.webp)

## Verification

- TypeScript validation passed.
- Artifact validation passed for all 45 sprites: atlas hash and catalog agree, frame rectangles are in bounds and do not overlap, every frame contains visible pixels, and calibrated doorway baselines match the 2:1 floor within 0.01 slope.
- The real Pixi transform and hero cutout coordinates agree to less than 0.001 world pixels for both arches; camera-edge culling passed.
- Desktop verification captured nine positions, including both doorway openings, the front and rear of the east arch, the settlement, temple, entrance gate and cemetery. All 43 occlusion images loaded; no page errors.
- Portrait verification at 390 × 844 with DPR 2 captured both doorways, the rear of the east arch and the entrance gate. All scenery and occlusion images loaded; no page errors. An earlier interrupted capture was replaced by this completed run.

[Verification report](https://ark-whachat.fural.space/frontier-rendering/verification.json) · [Live game](https://ark-whachat.fural.space/)

## Implementation

[Atlas builder](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Ffrozen-frontier-map%2Fbuild-assets.mjs) · [Scenery renderer](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Fstronghold%2Ffrontier-view.ts) · [Artifact validation](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Ffrozen-frontier-map%2Fverify-artifacts.mjs)
