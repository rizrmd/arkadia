## Implemented treatment

The Stronghold now has alpha-fitted foundation transitions on ramparts, bastions, the gateway, forge, barracks, altar, mage tower and mine. Damp earth and fine grit meet the opaque bottom contour; broken low olive moss clusters and sparse dry winter grass soften the contact. Small moss flecks climb the lowest visible masonry, clipped to the owning sprite. Exterior foreground walls receive intermittent snow shoulders. The gateway center approach is kept clear; forge and mine vegetation is sparse.

Two new transparent assets were created with the built-in imagegen tool. Originals are retained in `assets-src/foundation-transitions/`. `scripts/prepare-foundations.mjs` reproduces the trimmed runtime PNGs and source previews without removing alpha. The existing snowdrift asset is reused.

The dressing uses deterministic per-asset seeds and is cached by sprite/width/layer. It renders before and after its owning structure within the existing depth order, then becomes part of the static world surface. Pan/zoom only transform that surface. Selection alpha masks remain based on the original building images. This release contains foundation work only; the parallel lighting work is excluded from its release build.

## Verification

An isolated build of the committed foundation changes passes TypeScript and Vite. Browser checks pass at 1536×1024, 390×844 and 2560×1080: no page errors or failed resources, identical baked surface after reload, no surface rebakes during drag and wheel zoom. Desktop building selection still repaints and focuses the scene. The same checks also pass against the deployed HTTPS Stronghold host. Desktop, mobile and closer views were visually inspected. `scripts/verify-foundations.mjs` reproduces these checks; `public/foundation-transitions/verification.json` records the latest run.

## Live result

[Open Stronghold](https://ark-whachat.fural.space/)

![Desktop foundation transitions](https://ark-whachat.fural.space/foundation-transitions/desktop.png)

![Mobile foundation transitions](https://ark-whachat.fural.space/foundation-transitions/mobile.png)

![Wide foundation transitions](https://ark-whachat.fural.space/foundation-transitions/wide.png)

![Desktop closer view](https://ark-whachat.fural.space/foundation-transitions/desktop-detail.png)

![Mobile closer view](https://ark-whachat.fural.space/foundation-transitions/mobile-detail.png)

![Wide closer view](https://ark-whachat.fural.space/foundation-transitions/wide-detail.png)

## Generated assets

![Generated soil and moss source](https://ark-whachat.fural.space/foundation-transitions/soil-moss-source.webp)

![Generated creeping moss source](https://ark-whachat.fural.space/foundation-transitions/moss-source.webp)

![Runtime soil and grit strip](https://ark-whachat.fural.space/foundation-transitions/soil-moss.png)

![Runtime low moss cluster](https://ark-whachat.fural.space/foundation-transitions/moss.png)

## Original human report

![Human screenshot showing plain ground-to-wall transitions](/api/organizations/ORd5dd6f99b4308d6187031557/task-attachments/TA29ffc978bb9457f37f0fb1d5)

## Source and reproduction

[Generation prompts](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=assets-src%2Ffoundation-transitions%2Fprompts.json) · [Live verification report](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fground-transitions%2Flive-verification.json)

## Furniture contact correction

The follow-up screenshot identified the expedition table and stools as still disconnected from the paving. Furniture now has eleven authored ground-contact landmarks covering the table feet, stool legs, rack and tripod. Tight elliptical contact shadows, tiny grit marks ground the furniture without treating its open underside as a continuous wall or adding climbing moss to chairs.

The isolated production build and three-viewport browser checks pass again, including deterministic reload, selection and pan/zoom without rebakes. The broad under-table shadow was removed following the lighting overlap concern. This module owns only tiny non-directional foot contact occlusion and dirt wear. All directional cast shadows, their length and angle, and time-of-day lighting remain the lighting system’s responsibility. No light anchors, lightmaps, phase logic or lighting files are changed by this correction.

![Furniture report from the human](https://ark-whachat.fural.space/foundation-transitions/table-feedback.jpg)

![Table and stool ground-contact detail](https://ark-whachat.fural.space/foundation-transitions/table-detail.png)

![Original expedition furniture sprite](https://ark-whachat.fural.space/assets/stronghold/expedition.png)
