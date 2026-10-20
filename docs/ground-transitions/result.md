## Implemented treatment

The Stronghold now has alpha-fitted foundation transitions on ramparts, bastions, the gateway, forge, barracks, altar, mage tower and mine. Damp earth and fine grit meet the opaque bottom contour; broken low olive moss clusters and sparse dry winter grass soften the contact. Small moss flecks climb the lowest visible masonry, clipped to the owning sprite. Exterior foreground walls receive intermittent snow shoulders. The gateway center approach is kept clear; forge and mine vegetation is sparse.

Two new transparent assets were created with the built-in imagegen tool. Originals are retained in `assets-src/foundation-transitions/`. `scripts/prepare-foundations.mjs` reproduces the trimmed runtime PNGs and source previews without removing alpha. The existing snowdrift asset is reused.

The dressing uses deterministic per-asset seeds and is cached by sprite/width/layer. It renders before and after its owning structure within the existing depth order, then becomes part of the static world surface. Pan/zoom only transform that surface. Selection alpha masks remain based on the original building images. This release contains foundation work only; the parallel lighting work is excluded from its release build.

## Verification

An isolated build of the committed foundation changes passes TypeScript and Vite. Browser checks pass at 1536×1024, 390×844 and 2560×1080: no page errors or failed resources, identical baked surface after reload, no surface rebakes during drag and wheel zoom. Desktop building selection still repaints and focuses the scene. Desktop, mobile and closer views were visually inspected. `scripts/verify-foundations.mjs` reproduces these checks; `public/foundation-transitions/verification.json` records the latest run.

## Live result

[Open Stronghold](https://arkadia-stronghold-whachat.fural.space/stronghold.html)

![Desktop foundation transitions](https://arkadia-stronghold-whachat.fural.space/foundation-transitions/desktop.png)

![Mobile foundation transitions](https://arkadia-stronghold-whachat.fural.space/foundation-transitions/mobile.png)

![Wide foundation transitions](https://arkadia-stronghold-whachat.fural.space/foundation-transitions/wide.png)

![Desktop closer view](https://arkadia-stronghold-whachat.fural.space/foundation-transitions/desktop-detail.png)

![Mobile closer view](https://arkadia-stronghold-whachat.fural.space/foundation-transitions/mobile-detail.png)

![Wide closer view](https://arkadia-stronghold-whachat.fural.space/foundation-transitions/wide-detail.png)

## Generated assets

![Generated soil and moss source](https://arkadia-stronghold-whachat.fural.space/foundation-transitions/soil-moss-source.webp)

![Generated creeping moss source](https://arkadia-stronghold-whachat.fural.space/foundation-transitions/moss-source.webp)

![Runtime soil and grit strip](https://arkadia-stronghold-whachat.fural.space/foundation-transitions/soil-moss.png)

![Runtime low moss cluster](https://arkadia-stronghold-whachat.fural.space/foundation-transitions/moss.png)

## Original human report

![Human screenshot showing plain ground-to-wall transitions](/api/organizations/ORd5dd6f99b4308d6187031557/task-attachments/TA29ffc978bb9457f37f0fb1d5)
