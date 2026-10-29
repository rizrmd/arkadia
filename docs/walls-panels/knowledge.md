## Overview

Walls planning panels cover paid build level 1 and every upgrade from 1→2 through 29→30. Prices are per placed segment, never the entire enclosure. Existing starter segments remain free; this panel does not create building records or replace world artwork. The primary benefit is wall durability; HP increases by 10% of the level-1 baseline per completed level. Absolute HP remains undefined without a published baseline.

## Build and Upgrade Interaction

Approach the Stronghold Core in solo play and select the Walls hammer badge in the second planning row. English labels, navigation, requirements, resource costs and duration are composed entirely in Pixi. Previous/Next browses targets 1–30; Return to current restores the operation implied by read-only completed-level metadata. Escape, Close, leaving range or entering co-op closes the panel. Completed level 30 has no further upgrade.

The sole building prerequisite for target Wall level X is **Stronghold Core level X**, already completed at X or higher. Build level 1 requires Core 1, target 2 requires Core 2, and this continues through target 30. An in-progress Core upgrade never counts. This explicit rule replaces the previous Core-3 floor. Gold and Wood appear separately under Resource Cost; real minutes appear separately under Build Time or Upgrade Time.

The planning scope matches Farm: Build/Upgrade remains unavailable pending shared construction transactions, queues and persistent timers. No resources are spent, timers started, buildings granted, sockets occupied or saves changed. Optional `walls.completedLevel` metadata is read without mutation; absent metadata selects build planning, not a claim that existing decorative starter walls are missing. Socket legality and shared ownership/queue rules belong to future transactions, not additional prerequisite rows.

All registered external building interaction badges are hidden and disabled while the panel is open. They restore according to range, readiness and solo/co-op visibility when it closes. Walls uses Core's interaction registry and corrected 540×478 layout, 458-high frame, centered icon/text rows, and button at y=338–392 with clear separation from the clock ending at y=319. The panel scales to fit mobile width and height.

## Construction and upgrade economy

Preserved published Walls balancing: Gold = ceil(25 × 1.25^(T−1)), Wood = ceil(30 × 1.25^(T−1)), duration = ceil(1 × 1.20^(T−1)) real minutes. Calculate directly from unrounded baselines; do not compound rounded rows. No timer cap. Prices apply once per segment operation. No Food, Mana or Soul Shards.

| Target | Operation | Gold | Wood (Log) | Real minutes | Completed Core required |
| --- | --- | --- | --- | --- | --- |
| 1 | Build | 25 | 30 | 1 | ≥1 |
| 2 | Upgrade 1→2 | 32 | 38 | 2 | ≥2 |
| 3 | Upgrade 2→3 | 40 | 47 | 2 | ≥3 |
| 4 | Upgrade 3→4 | 49 | 59 | 2 | ≥4 |
| 5 | Upgrade 4→5 | 62 | 74 | 3 | ≥5 |
| 6 | Upgrade 5→6 | 77 | 92 | 3 | ≥6 |
| 7 | Upgrade 6→7 | 96 | 115 | 3 | ≥7 |
| 8 | Upgrade 7→8 | 120 | 144 | 4 | ≥8 |
| 9 | Upgrade 8→9 | 150 | 179 | 5 | ≥9 |
| 10 | Upgrade 9→10 | 187 | 224 | 6 | ≥10 |
| 11 | Upgrade 10→11 | 233 | 280 | 7 | ≥11 |
| 12 | Upgrade 11→12 | 292 | 350 | 8 | ≥12 |
| 13 | Upgrade 12→13 | 364 | 437 | 9 | ≥13 |
| 14 | Upgrade 13→14 | 455 | 546 | 11 | ≥14 |
| 15 | Upgrade 14→15 | 569 | 683 | 13 | ≥15 |
| 16 | Upgrade 15→16 | 711 | 853 | 16 | ≥16 |
| 17 | Upgrade 16→17 | 889 | 1,066 | 19 | ≥17 |
| 18 | Upgrade 17→18 | 1,111 | 1,333 | 23 | ≥18 |
| 19 | Upgrade 18→19 | 1,388 | 1,666 | 27 | ≥19 |
| 20 | Upgrade 19→20 | 1,735 | 2,082 | 32 | ≥20 |
| 21 | Upgrade 20→21 | 2,169 | 2,603 | 39 | ≥21 |
| 22 | Upgrade 21→22 | 2,711 | 3,253 | 47 | ≥22 |
| 23 | Upgrade 22→23 | 3,389 | 4,066 | 56 | ≥23 |
| 24 | Upgrade 23→24 | 4,236 | 5,083 | 67 | ≥24 |
| 25 | Upgrade 24→25 | 5,294 | 6,353 | 80 | ≥25 |
| 26 | Upgrade 25→26 | 6,618 | 7,941 | 96 | ≥26 |
| 27 | Upgrade 26→27 | 8,272 | 9,927 | 115 | ≥27 |
| 28 | Upgrade 27→28 | 10,340 | 12,408 | 138 | ≥28 |
| 29 | Upgrade 28→29 | 12,925 | 15,510 | 165 | ≥29 |
| 30 | Upgrade 29→30 | 16,156 | 19,388 | 198 | ≥30 |

## Generated bitmap assets and approved reference

The Walls portrait was generated using the imagegen skill and built-in tool and retained as its original transparent PNG. Frame, charcoal texture, crest/ornament, hammer, header strips, divider, ticks, resource/clock icons and disabled button reuse Core's generated bitmap kit. Dynamic labels and values render in Pixi; no HTML/React UI or procedural ornament replacements.

![Generated Walls panel portrait](/api/rooms/DR2d49ace0025f66084af0c78a/attachments/DAe26e4a1b1ad0e4024ef59e3f)

![Approved Core panel visual reference](https://arkodia.online/core-upgrade/kit-v2/reference.png)

[Walls original PNG and exact generation prompt](https://arkodia.online/walls-panels/kit/source-kit.zip) · [Walls manifest](https://arkodia.online/walls-panels/kit/manifest.json) · [Shared Core component provenance](https://arkodia.online/core-upgrade/kit-v2/manifest.json)

## World artwork and placement

Preserve the approved sparse starter boundary, makeshift gate, snow-covered timber family and all existing higher-tier mappings. Panel artwork is an illustrative header, not a replacement world sprite. Gates and Walls retain independent levels; no Gate requirement is added. One wall segment per legal enclosure socket; placement and collision remain unchanged.

[Existing snowy wall milestones](https://arkodia.online/buildings/walls/painted/manifest.json) · [Existing world source kit](https://arkodia.online/buildings/walls/painted/source-kit.zip)

## Validation

All 30 direct-baseline recipes, completed Core thresholds, maximum level and read-only save metadata checks pass. All 30 targets render in Chromium without page errors, with exact English requirement/cost/duration labels and centered icon/text rows. Actual pointer opening, Previous/Next/reset, Close, Escape, range closing, co-op hiding, level 30, mobile bounds and shared badge suppression/restoration (Core, Farm, Lumber, Kitchen, Mine, Walls) pass. The full-world browser attempt reached Preparing visibility at 97% but did not finish within the bounded 60-second initialization window, without page errors. The native six-module Pixi suite and compiled game integration serve as alternate checks; production deployment is complete.

## Validated Pixi panel captures

![Walls desktop build panel](https://arkodia.online/walls-panels/pixi-desktop.png)

![Walls mobile build panel](https://arkodia.online/walls-panels/pixi-mobile.png)

### Target level 1

![Walls build level 1](https://arkodia.online/walls-panels/target-01.png)

### Target level 2

![Walls upgrade 1 to 2](https://arkodia.online/walls-panels/target-02.png)

### Target level 3

![Walls upgrade 2 to 3](https://arkodia.online/walls-panels/target-03.png)

### Target level 4

![Walls upgrade 3 to 4](https://arkodia.online/walls-panels/target-04.png)

### Target level 5

![Walls upgrade 4 to 5](https://arkodia.online/walls-panels/target-05.png)

### Target level 6

![Walls upgrade 5 to 6](https://arkodia.online/walls-panels/target-06.png)

### Target level 7

![Walls upgrade 6 to 7](https://arkodia.online/walls-panels/target-07.png)

### Target level 8

![Walls upgrade 7 to 8](https://arkodia.online/walls-panels/target-08.png)

### Target level 9

![Walls upgrade 8 to 9](https://arkodia.online/walls-panels/target-09.png)

### Target level 10

![Walls upgrade 9 to 10](https://arkodia.online/walls-panels/target-10.png)

### Target level 11

![Walls upgrade 10 to 11](https://arkodia.online/walls-panels/target-11.png)

### Target level 12

![Walls upgrade 11 to 12](https://arkodia.online/walls-panels/target-12.png)

### Target level 13

![Walls upgrade 12 to 13](https://arkodia.online/walls-panels/target-13.png)

### Target level 14

![Walls upgrade 13 to 14](https://arkodia.online/walls-panels/target-14.png)

### Target level 15

![Walls upgrade 14 to 15](https://arkodia.online/walls-panels/target-15.png)

### Target level 16

![Walls upgrade 15 to 16](https://arkodia.online/walls-panels/target-16.png)

### Target level 17

![Walls upgrade 16 to 17](https://arkodia.online/walls-panels/target-17.png)

### Target level 18

![Walls upgrade 17 to 18](https://arkodia.online/walls-panels/target-18.png)

### Target level 19

![Walls upgrade 18 to 19](https://arkodia.online/walls-panels/target-19.png)

### Target level 20

![Walls upgrade 19 to 20](https://arkodia.online/walls-panels/target-20.png)

### Target level 21

![Walls upgrade 20 to 21](https://arkodia.online/walls-panels/target-21.png)

### Target level 22

![Walls upgrade 21 to 22](https://arkodia.online/walls-panels/target-22.png)

### Target level 23

![Walls upgrade 22 to 23](https://arkodia.online/walls-panels/target-23.png)

### Target level 24

![Walls upgrade 23 to 24](https://arkodia.online/walls-panels/target-24.png)

### Target level 25

![Walls upgrade 24 to 25](https://arkodia.online/walls-panels/target-25.png)

### Target level 26

![Walls upgrade 25 to 26](https://arkodia.online/walls-panels/target-26.png)

### Target level 27

![Walls upgrade 26 to 27](https://arkodia.online/walls-panels/target-27.png)

### Target level 28

![Walls upgrade 27 to 28](https://arkodia.online/walls-panels/target-28.png)

### Target level 29

![Walls upgrade 28 to 29](https://arkodia.online/walls-panels/target-29.png)

### Target level 30

![Walls upgrade 29 to 30](https://arkodia.online/walls-panels/target-30.png)

## Production verification

Live cumulative game release: `7b6c3851cde1cb8531ad419e2d469c14eb3537c5`, including Core correction `42aee507` and Mine integration `5bf04cf9`. Deployment used the shared Arkodia lock and normal release publisher. A transient gateway-write connection reset was recovered by resuming the exact existing package; no game rebuild or sandbox restart was needed.

All 37 Walls public artifact checks pass, including original source ZIP integrity, decoded visible pixels for the generated icon and all 30 target captures, desktop/mobile captures, manifest, browser report and this document. The lazy-loaded game chunk matches its release SHA-256 and contains all six panel hooks. Walls and Mine PNG entries are in the live asset inventory. TypeScript, all Walls/Mine recipe checks and Go server tests passed before packaging. Full-world initialization remains the bounded browser limitation described above; native Pixi six-panel rendering and interactions pass.

[Public verification report](https://arkodia.online/walls-panels/production.json) · [Native Pixi browser report](https://arkodia.online/walls-panels/browser.json) · [Bounded world attempt](https://arkodia.online/walls-panels/world-browser.json)
