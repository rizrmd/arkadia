## Scope and design status

This page expands the published [Base Building](/organizations/ORd5dd6f99b4308d6187031557/projects/PJ8758f22f61165f3d3215e454/knowledge/NKBD438e05262b74d5e6355f5119) specification. Rules and balancing values are design targets, not evidence of implemented gameplay or approved artwork. The parent specification remains authoritative. Building-specific visual descriptions below are proposed art briefs pending review.

## Role and availability

- Primary function: **Gold production rate and collection capacity**.
- Minimum completed Stronghold Core level for construction: **3**.
- Independent completed levels: **1–30**. Construction is not level 0.
- Upgrade cost factor: **1**. Upgrade time factor: **1**.

Produces base Gold, separate from combat run gold. Collection capacity is ten hours of production at the completed level. Numeric output requires a defined level-1 rate; do not invent a rate or grant income merely because art is delivered.

## Progression and economy

For completed level L, H(L) = 1 + 0.10 × (L − 1); F(L) = 1 + 0.05 × (L − 1). Apply multipliers directly to the building's own level-1 baseline, never compound them. Gate and Walls apply H(L) once, without F(L) multiplying HP. Numeric baselines and level-1 construction recipes not specified by the parent remain undefined.

For target level T > 1, use source level L = T − 1: Gold = ceil(100 × L² × 1); Wood (Log) = ceil(25 × L × 1); duration = ceil(min(720, 2 × L²) × 1) minutes. These are per-upgrade values, not cumulative totals. Gold means base Gold; Wood uses resource key `wood`. Food, Mana and Soul Shards are not added as upgrade costs.

| Target level | HP multiplier | Function multiplier* | Base Gold | Wood (Log) | Duration (min) |
| --- | --- | --- | --- | --- | --- |
| 1 | 1.00 | 1.00 | Separate construction recipe | Separate recipe | Separate recipe |
| 2 | 1.10 | 1.05 | 100 | 25 | 2 |
| 3 | 1.20 | 1.10 | 400 | 50 | 8 |
| 4 | 1.30 | 1.15 | 900 | 75 | 18 |
| 5 | 1.40 | 1.20 | 1600 | 100 | 32 |
| 6 | 1.50 | 1.25 | 2500 | 125 | 50 |
| 7 | 1.60 | 1.30 | 3600 | 150 | 72 |
| 8 | 1.70 | 1.35 | 4900 | 175 | 98 |
| 9 | 1.80 | 1.40 | 6400 | 200 | 128 |
| 10 | 1.90 | 1.45 | 8100 | 225 | 162 |
| 11 | 2.00 | 1.50 | 10000 | 250 | 200 |
| 12 | 2.10 | 1.55 | 12100 | 275 | 242 |
| 13 | 2.20 | 1.60 | 14400 | 300 | 288 |
| 14 | 2.30 | 1.65 | 16900 | 325 | 338 |
| 15 | 2.40 | 1.70 | 19600 | 350 | 392 |
| 16 | 2.50 | 1.75 | 22500 | 375 | 450 |
| 17 | 2.60 | 1.80 | 25600 | 400 | 512 |
| 18 | 2.70 | 1.85 | 28900 | 425 | 578 |
| 19 | 2.80 | 1.90 | 32400 | 450 | 648 |
| 20 | 2.90 | 1.95 | 36100 | 475 | 720 |
| 21 | 3.00 | 2.00 | 40000 | 500 | 720 |
| 22 | 3.10 | 2.05 | 44100 | 525 | 720 |
| 23 | 3.20 | 2.10 | 48400 | 550 | 720 |
| 24 | 3.30 | 2.15 | 52900 | 575 | 720 |
| 25 | 3.40 | 2.20 | 57600 | 600 | 720 |
| 26 | 3.50 | 2.25 | 62500 | 625 | 720 |
| 27 | 3.60 | 2.30 | 67600 | 650 | 720 |
| 28 | 3.70 | 2.35 | 72900 | 675 | 720 |
| 29 | 3.80 | 2.40 | 78400 | 700 | 720 |
| 30 | 3.90 | 2.45 | 84100 | 725 | 720 |

*The function multiplier does not apply to Gate/Wall HP. Undefined service baselines must not be presented as numeric outputs. Level 30 has no next upgrade.

## Imagegen art direction

Use the **imagegen skill** to create painted transparent 2D sprites with the dimensional snowy isometric appearance of approved Arkodia assets. No GLB, OBJ, procedural model or model-render substitute. Inspect the approved [Barracks and Mine references](/organizations/ORd5dd6f99b4308d6187031557/projects/PJ8758f22f61165f3d3215e454/knowledge/NKBDf8d00615bc10f57ea3124f7d) and the preferred [Farm revision](/organizations/ORd5dd6f99b4308d6187031557/projects/PJ8758f22f61165f3d3215e454/knowledge/NKBD4815921d447074c939a7a96c) before generation. Match silhouette, chunky proportions, painted timber and stone, palette, lighting, snow treatment and perspective; color matching alone is insufficient.

| Milestone level | Proposed visual identity |
| --- | --- |
| 1 | Timber-supported mine entrance |
| 5 | Reinforced entrance beams |
| 10 | Stone entrance and organized tools |
| 15 | Fortified covered loading bay |
| 20 | Refined mining fittings |
| 25 | Elite mine frontage |
| 30 | Masterwork mining hall |

Milestone appearances take effect at the exact listed levels. Explicitly map every intermediate level to its preceding milestone plus documented minor detail improvements; do not claim 30 independently generated paintings if using seven masters. Keep scale, anchor, ground contact, entrance, collision footprint and walkways stable. Decorative tools, banners and fittings grant no unapproved gameplay unlocks.

## Upgrade interaction and persistence

One shared construction/upgrade queue exists per solo base. Except for the Core's own upgrade, completed Core level must meet the target level. The Core must not acquire a circular building prerequisite. Retain the previous completed function while upgrading; apply new values only on completion.

Deduct Gold and available stored Logs atomically exactly once. Insufficient balances spend neither resource. Reserve refundable Logs against Lumber Mill capacity. Manual cancellation before completion refunds both costs once and discards progress; reconcile completion before accepting cancellation. Completed upgrades cannot be refunded.

Persist instance ID, type, owner/base identity, completed level, pending source/target levels, timestamps and reserved resource amounts. Use real-clock completion timestamps for offline construction and idempotent completion/refunds with existing solo save locking. Hero changes, death and reload preserve progress. Co-op remains paused. Preserve legacy resources and valid levels; missing levels on built instances default to 1. Follow the parent's Core migration rule rather than resetting progression.

## Pixi interface

All controls and text are English and rendered inside **Pixi**, with no HTML/React game interface. Show `Mine · Level 8 / 30`, current/next function and HP where defined, Gold, Wood (Log), duration and required Core level. States: `Not Built`, `Ready`, `Upgrading`, `Upgrade Complete`, `Max Level`. Actions: `Build`, `Upgrade`, `Cancel Upgrade`, `Close`. Explain unavailable actions with `Not Enough Gold`, `Not Enough Wood (Log)`, `Construction Queue Busy` or `Requires Stronghold Level …`.

## Delivery and acceptance

- Deliver transparent imagegen sources, seven milestone masters and an explicit 30-level asset/composition manifest. Record dimensions, alpha, anchor, scale and placement metadata; preserve original generation provenance.
- Embed every chat-shared image inline here, including comparisons and reference images. Label rejected/superseded art clearly. 
- Validate all 30 progression rows, exact milestone changes, Core gating, queue contention, insufficient balances, cancellation, offline completion and reload without duplicate charges or lost resources.
- Verify silhouettes against approved references, alpha edges, stable anchor/footprint, clear entrances, occlusion and English Pixi controls. Distinguish technical verification from human art approval.
- Push and deploy implementation/asset changes; record commit, release URL and verification evidence. Resolve browser-tool problems proactively with alternative checks rather than leaving validation indefinitely blocked.

## Delivered imagegen Mine kit — 28 October 2026

Seven original painted milestone masters and one generated repair-strap decal are delivered with an explicit 30-row composition manifest. They use imagegen, not meshes or model renders. Technical validation is complete; human art approval is not implied. The approved Mine/Barracks references supplied the painted texture, chunky joinery, compact proportions, amber lantern and cool stone. Snow and later terracotta roofing adapt them to the established winter setting.

[Open English Pixi review](https://arkodia.online/sprite-player/mine/) · [Download raster source kit](https://arkodia.online/buildings/mine/painted/source-kit.zip) · [30-level manifest](https://arkodia.online/buildings/mine/painted/manifest.json)

<iframe src="https://arkodia.online/sprite-player/mine/" title="Mine painted levels 1–30" height="650"></iframe>

![Mine milestone comparison](https://arkodia.online/buildings/mine/painted/milestones.png)

## References inspected

![Approved Mine reference](https://arkodia.online/buildings/mine/painted/reference-mine.png)

![Approved Barracks reference](https://arkodia.online/buildings/mine/painted/reference-barracks.png)

## Placement and material contract

- All masters: **1254 × 1254 px**, 8-bit RGBA PNG, sRGB; retain original alpha and canvas. Common pivot **(627,1130)**; normalized Pixi anchor **(0.5,0.9011164274)**. Do not trim, independently fit, rescale or recenter levels.
- Proposed integration reservation: **6 × 5 m**, same for every level, with a **1.5 m approach** along rails toward screen bottom-right. These are art integration targets, not changes to existing gameplay collision. Preserve existing blockers and route access. Minor painted contour differences do not redefine collision.
- Orthographic camera target: azimuth **45°**, elevation **30°**. Light from upper left; amber lantern and cool shadows. Timber, rock, iron, terracotta and snow are baked painted materials. No PBR or GLB export settings apply. Preserve original PNGs; any atlas export must retain padding and pivot. Use Pixi standard alpha loading and linear filtering; avoid doubled contact shadows.
- Sort by the common ground pivot. Single sprites have no separate roof/interior occlusion masks. Gameplay integration must validate actor depth ordering; splitting masks for walking behind individual props is separate work. The review does not claim in-scene integration.
- Intermediate levels use their preceding milestone plus cumulative generated repair straps on rail sleepers. Each step adds one 42 px decal at source positions recorded in the manifest; exact milestone changes reset decals. These are cosmetic repairs, without collision or gameplay effects.
- Mine retains its published base-Gold production role and Core level 3 prerequisite. No numeric rate, income, collection, upgrade system or new equipment unlock is implemented in this asset task.

## Explicit level mapping

| Level | Active master | Incremental detail |
| --- | --- | --- |
| 1 | level-01.png | Timber-supported mine entrance |
| 2 | level-01.png | 1 cumulative cosmetic rail-sleeper repair straps |
| 3 | level-01.png | 2 cumulative cosmetic rail-sleeper repair straps |
| 4 | level-01.png | 3 cumulative cosmetic rail-sleeper repair straps |
| 5 | level-05.png | Reinforced entrance beams |
| 6 | level-05.png | 1 cumulative cosmetic rail-sleeper repair straps |
| 7 | level-05.png | 2 cumulative cosmetic rail-sleeper repair straps |
| 8 | level-05.png | 3 cumulative cosmetic rail-sleeper repair straps |
| 9 | level-05.png | 4 cumulative cosmetic rail-sleeper repair straps |
| 10 | level-10.png | Stone entrance and organized tools |
| 11 | level-10.png | 1 cumulative cosmetic rail-sleeper repair straps |
| 12 | level-10.png | 2 cumulative cosmetic rail-sleeper repair straps |
| 13 | level-10.png | 3 cumulative cosmetic rail-sleeper repair straps |
| 14 | level-10.png | 4 cumulative cosmetic rail-sleeper repair straps |
| 15 | level-15.png | Fortified covered loading bay |
| 16 | level-15.png | 1 cumulative cosmetic rail-sleeper repair straps |
| 17 | level-15.png | 2 cumulative cosmetic rail-sleeper repair straps |
| 18 | level-15.png | 3 cumulative cosmetic rail-sleeper repair straps |
| 19 | level-15.png | 4 cumulative cosmetic rail-sleeper repair straps |
| 20 | level-20.png | Refined mining fittings |
| 21 | level-20.png | 1 cumulative cosmetic rail-sleeper repair straps |
| 22 | level-20.png | 2 cumulative cosmetic rail-sleeper repair straps |
| 23 | level-20.png | 3 cumulative cosmetic rail-sleeper repair straps |
| 24 | level-20.png | 4 cumulative cosmetic rail-sleeper repair straps |
| 25 | level-25.png | Elite mine frontage |
| 26 | level-25.png | 1 cumulative cosmetic rail-sleeper repair straps |
| 27 | level-25.png | 2 cumulative cosmetic rail-sleeper repair straps |
| 28 | level-25.png | 3 cumulative cosmetic rail-sleeper repair straps |
| 29 | level-25.png | 4 cumulative cosmetic rail-sleeper repair straps |
| 30 | level-30.png | Masterwork mining hall |

## Individual original masters

### Level 1 — Timber-supported mine entrance

![Mine level 1](https://arkodia.online/buildings/mine/painted/level-01.png)

### Level 5 — Reinforced entrance beams

![Mine level 5](https://arkodia.online/buildings/mine/painted/level-05.png)

### Level 10 — Stone entrance and organized tools

![Mine level 10](https://arkodia.online/buildings/mine/painted/level-10.png)

### Level 15 — Fortified covered loading bay

![Mine level 15](https://arkodia.online/buildings/mine/painted/level-15.png)

### Level 20 — Refined mining fittings

![Mine level 20](https://arkodia.online/buildings/mine/painted/level-20.png)

### Level 25 — Elite mine frontage

![Mine level 25](https://arkodia.online/buildings/mine/painted/level-25.png)

### Level 30 — Masterwork mining hall

![Mine level 30](https://arkodia.online/buildings/mine/painted/level-30.png)

### Intermediate repair strap

![Generated Mine repair strap](https://arkodia.online/buildings/mine/painted/repair-strap.png)

## Verification and release evidence

Commit **eedebe8a3ada0ba43670d071c0a175da49a2ba8d** is pushed to `feat/character-sprites`. The additive asset release uses the existing Arkodia layer publisher and shared deployment lock; existing game/save data is preserved. The repository ship wrapper timed out after publishing, so public verification was used to establish the release outcome. The game-shell fallback intercepted the initial `/buildings/` viewer navigation; publishing the dedicated `/sprite-player/mine/` route resolved it.

Managed browser tools were unavailable. Installed Playwright Chromium with SwiftShader passed all **30** level transitions, milestone/decal selection, desktop and 390 px mobile rendering, with **zero page errors**. Public verification matched **13** resources, including manifest/source archive byte equality and all milestone/decal/comparison decoded pixels. All masters passed common canvas and real alpha checks. These are visual-asset checks, not assertions that future economy or upgrade gameplay is implemented.

[Public verification](https://arkodia.online/buildings/mine/painted/public-verification.json) · [Asset validation](https://arkodia.online/buildings/mine/painted/asset-validation.json)

![Desktop Mine Pixi review](https://arkodia.online/buildings/mine/painted/pixi-desktop.png)

![Mobile Mine Pixi review](https://arkodia.online/buildings/mine/painted/pixi-mobile.png)

## Source reproducibility

Original generated raster sources, prompt lineage, packaging script and viewer source are in the source kit. Imagegen generation is nondeterministic; committed originals and hashes are authoritative. The packaging script validates assets and assembles a sheet without repainting them. Run `node assets-src/buildings/mine/painted/package.mjs` then `node assets-src/buildings/mine/painted/verify.mjs`. The deployment script reuses the installed shared publisher; override `MINE_LAYER_PUBLISHER` if that tool resides elsewhere.
