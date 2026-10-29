## Overview

Farm panels cover paid construction at level 1 and every upgrade from 1→2 through 29→30. Completed Farm levels run from 1 to 30. The primary function is provision production rate and collection capacity; collection capacity equals ten hours of production. Provisions do not automatically become hunted Food or expedition supplies. Absolute production and HP remain undefined until their level-1 baseline is specified.

## Build and Upgrade Interaction

The Farm planning interaction appears beside the Stronghold Core in solo play. Open the Farm hammer badge to view the image-backed Pixi panel. Escape or the close control closes it; leaving the interaction range or entering co-op hides it. Game UI uses Pixi only and English text. Previous/Next controls browse every target from 1 through 30; Return to current restores the actual operation without changing the saved completed level.

The sole displayed building prerequisite for target Farm level X is **Stronghold Core level X**, completed at least at X. An in-progress Core upgrade does not count. Build level 1 requires Core 1; upgrade to level 2 requires Core 2; the same rule continues through target level 30. There is no Core-5 floor or Kitchen row in this panel. Gold and Wood are shown under Resource Cost; the real-clock duration is shown separately under Build Time or Upgrade Time. Level 30 has no next operation.

Panels and all 30 recipes are implemented and verified. Farm transactions, construction queue and persistent upgrade timers are not released. The Build/Upgrade button is explicitly unavailable; this panel does not charge resources, grant buildings, start timers, or change saves. Optional `farm.completedLevel` metadata is read without modifying it; absent metadata means Not Built. This matches the current Core/Lumber details-panel scope. Shared ownership, queue, storage and placement checks belong to a future transaction system and are not extra displayed prerequisite rows.

## Construction and upgrade economy

Preserved published Farm balancing: Gold = ceil(150 × 1.25^(T−1)), Wood = ceil(100 × 1.25^(T−1)), duration = ceil(3 × 1.20^(T−1)) real minutes for target T. Calculate directly from the unrounded baseline; do not compound rounded rows. Prices are per operation, not cumulative. No timer cap. No Food, Mana or Soul Shards are required.

| Target | Operation | Gold | Wood (Log) | Real minutes | Completed Core required |
| --- | --- | --- | --- | --- | --- |
| 1 | Build | 150 | 100 | 3 | ≥1 |
| 2 | Upgrade 1→2 | 188 | 125 | 4 | ≥2 |
| 3 | Upgrade 2→3 | 235 | 157 | 5 | ≥3 |
| 4 | Upgrade 3→4 | 293 | 196 | 6 | ≥4 |
| 5 | Upgrade 4→5 | 367 | 245 | 7 | ≥5 |
| 6 | Upgrade 5→6 | 458 | 306 | 8 | ≥6 |
| 7 | Upgrade 6→7 | 573 | 382 | 9 | ≥7 |
| 8 | Upgrade 7→8 | 716 | 477 | 11 | ≥8 |
| 9 | Upgrade 8→9 | 895 | 597 | 13 | ≥9 |
| 10 | Upgrade 9→10 | 1,118 | 746 | 16 | ≥10 |
| 11 | Upgrade 10→11 | 1,397 | 932 | 19 | ≥11 |
| 12 | Upgrade 11→12 | 1,747 | 1,165 | 23 | ≥12 |
| 13 | Upgrade 12→13 | 2,183 | 1,456 | 27 | ≥13 |
| 14 | Upgrade 13→14 | 2,729 | 1,819 | 33 | ≥14 |
| 15 | Upgrade 14→15 | 3,411 | 2,274 | 39 | ≥15 |
| 16 | Upgrade 15→16 | 4,264 | 2,843 | 47 | ≥16 |
| 17 | Upgrade 16→17 | 5,330 | 3,553 | 56 | ≥17 |
| 18 | Upgrade 17→18 | 6,662 | 4,441 | 67 | ≥18 |
| 19 | Upgrade 18→19 | 8,327 | 5,552 | 80 | ≥19 |
| 20 | Upgrade 19→20 | 10,409 | 6,939 | 96 | ≥20 |
| 21 | Upgrade 20→21 | 13,011 | 8,674 | 116 | ≥21 |
| 22 | Upgrade 21→22 | 16,264 | 10,843 | 139 | ≥22 |
| 23 | Upgrade 22→23 | 20,329 | 13,553 | 166 | ≥23 |
| 24 | Upgrade 23→24 | 25,411 | 16,941 | 199 | ≥24 |
| 25 | Upgrade 24→25 | 31,764 | 21,176 | 239 | ≥25 |
| 26 | Upgrade 25→26 | 39,705 | 26,470 | 287 | ≥26 |
| 27 | Upgrade 26→27 | 49,631 | 33,088 | 344 | ≥27 |
| 28 | Upgrade 27→28 | 62,039 | 41,360 | 413 | ≥28 |
| 29 | Upgrade 28→29 | 77,549 | 51,699 | 495 | ≥29 |
| 30 | Upgrade 29→30 | 96,936 | 64,624 | 594 | ≥30 |

## Player benefits by level

The following values are the published balancing specification, not a claim that upgrade gameplay is implemented. Bonuses apply to this building, not directly to hero combat stats. Values are measured against level 1 and do not compound.

Each level adds **10% of level-1 maximum HP** and **5% of the level-1 primary function**. Absolute outputs and HP remain undefined where no level-1 baseline is published.

| Level | Maximum HP multiplier | HP bonus vs level 1 | Provision production rate and collection capacity multiplier | Provision production rate and collection capacity bonus vs level 1 |
| --- | --- | --- | --- | --- |
| 1 | 1.00× | +0% | 1.00× | +0% |
| 2 | 1.10× | +10% | 1.05× | +5% |
| 3 | 1.20× | +20% | 1.10× | +10% |
| 4 | 1.30× | +30% | 1.15× | +15% |
| 5 | 1.40× | +40% | 1.20× | +20% |
| 6 | 1.50× | +50% | 1.25× | +25% |
| 7 | 1.60× | +60% | 1.30× | +30% |
| 8 | 1.70× | +70% | 1.35× | +35% |
| 9 | 1.80× | +80% | 1.40× | +40% |
| 10 | 1.90× | +90% | 1.45× | +45% |
| 11 | 2.00× | +100% | 1.50× | +50% |
| 12 | 2.10× | +110% | 1.55× | +55% |
| 13 | 2.20× | +120% | 1.60× | +60% |
| 14 | 2.30× | +130% | 1.65× | +65% |
| 15 | 2.40× | +140% | 1.70× | +70% |
| 16 | 2.50× | +150% | 1.75× | +75% |
| 17 | 2.60× | +160% | 1.80× | +80% |
| 18 | 2.70× | +170% | 1.85× | +85% |
| 19 | 2.80× | +180% | 1.90× | +90% |
| 20 | 2.90× | +190% | 1.95× | +95% |
| 21 | 3.00× | +200% | 2.00× | +100% |
| 22 | 3.10× | +210% | 2.05× | +105% |
| 23 | 3.20× | +220% | 2.10× | +110% |
| 24 | 3.30× | +230% | 2.15× | +115% |
| 25 | 3.40× | +240% | 2.20× | +120% |
| 26 | 3.50× | +250% | 2.25× | +125% |
| 27 | 3.60× | +260% | 2.30× | +130% |
| 28 | 3.70× | +270% | 2.35× | +135% |
| 29 | 3.80× | +280% | 2.40× | +140% |
| 30 | 3.90× | +290% | 2.45× | +145% |

## Generated bitmap assets

The Farm wheat-and-barn header icon was generated with the built-in imagegen tool and retained as the original transparent RGBA PNG. The charcoal texture, double gold frame, crest and lower ornament, hammer badge, slate strips, divider, resource icons, tick and disabled button reuse the generated Core bitmap kit. All labels, levels, requirements, costs and durations are rendered dynamically in Pixi; no GLB or procedural ornament replacement is used.

[Original Farm PNG source kit](https://arkodia.online/farm-panels/kit/source-kit.zip) · [Farm asset manifest and exact generation prompt](https://arkodia.online/farm-panels/kit/manifest.json) · [Core component provenance](https://arkodia.online/core-upgrade/kit/manifest.json)

![Farm generated header icon](https://arkodia.online/farm-panels/kit/farm.png)

The approved Core style reference below defines the visual language; its old requirement rows are superseded by the target-level rule above.

![Approved Core visual reference](https://arkodia.online/core-upgrade/kit/reference.png)

## Production verification

Current production release: `8f10887137cbe5137198b5851aca4f4fcb24b2db`. All 37 public Farm asset/content checks pass, including every target capture and the byte-identical original PNG source ZIP. PNG URLs may be served as lossless WebP; decoded visible pixels match the originals.

[Production verification report](https://arkodia.online/farm-panels/production.json)

## Validated panel captures

All 30 target panels rendered in Chromium with no page errors. Recipe and gating checks cover every target and reject completed Core one level below the target. Pointer opening, Escape, range closing, co-op hiding, mobile bounds and the level-30 maximum state pass. Captures are native Pixi compositions, not generated static UI mockups.

![Farm desktop build panel](https://arkodia.online/farm-panels/pixi-desktop.png)

![Farm mobile build panel](https://arkodia.online/farm-panels/pixi-mobile.png)

### Target level 1

![Farm build level 1](https://arkodia.online/farm-panels/target-01.png)

### Target level 2

![Farm upgrade 1 to 2](https://arkodia.online/farm-panels/target-02.png)

### Target level 3

![Farm upgrade 2 to 3](https://arkodia.online/farm-panels/target-03.png)

### Target level 4

![Farm upgrade 3 to 4](https://arkodia.online/farm-panels/target-04.png)

### Target level 5

![Farm upgrade 4 to 5](https://arkodia.online/farm-panels/target-05.png)

### Target level 6

![Farm upgrade 5 to 6](https://arkodia.online/farm-panels/target-06.png)

### Target level 7

![Farm upgrade 6 to 7](https://arkodia.online/farm-panels/target-07.png)

### Target level 8

![Farm upgrade 7 to 8](https://arkodia.online/farm-panels/target-08.png)

### Target level 9

![Farm upgrade 8 to 9](https://arkodia.online/farm-panels/target-09.png)

### Target level 10

![Farm upgrade 9 to 10](https://arkodia.online/farm-panels/target-10.png)

### Target level 11

![Farm upgrade 10 to 11](https://arkodia.online/farm-panels/target-11.png)

### Target level 12

![Farm upgrade 11 to 12](https://arkodia.online/farm-panels/target-12.png)

### Target level 13

![Farm upgrade 12 to 13](https://arkodia.online/farm-panels/target-13.png)

### Target level 14

![Farm upgrade 13 to 14](https://arkodia.online/farm-panels/target-14.png)

### Target level 15

![Farm upgrade 14 to 15](https://arkodia.online/farm-panels/target-15.png)

### Target level 16

![Farm upgrade 15 to 16](https://arkodia.online/farm-panels/target-16.png)

### Target level 17

![Farm upgrade 16 to 17](https://arkodia.online/farm-panels/target-17.png)

### Target level 18

![Farm upgrade 17 to 18](https://arkodia.online/farm-panels/target-18.png)

### Target level 19

![Farm upgrade 18 to 19](https://arkodia.online/farm-panels/target-19.png)

### Target level 20

![Farm upgrade 19 to 20](https://arkodia.online/farm-panels/target-20.png)

### Target level 21

![Farm upgrade 20 to 21](https://arkodia.online/farm-panels/target-21.png)

### Target level 22

![Farm upgrade 21 to 22](https://arkodia.online/farm-panels/target-22.png)

### Target level 23

![Farm upgrade 22 to 23](https://arkodia.online/farm-panels/target-23.png)

### Target level 24

![Farm upgrade 23 to 24](https://arkodia.online/farm-panels/target-24.png)

### Target level 25

![Farm upgrade 24 to 25](https://arkodia.online/farm-panels/target-25.png)

### Target level 26

![Farm upgrade 25 to 26](https://arkodia.online/farm-panels/target-26.png)

### Target level 27

![Farm upgrade 26 to 27](https://arkodia.online/farm-panels/target-27.png)

### Target level 28

![Farm upgrade 27 to 28](https://arkodia.online/farm-panels/target-28.png)

### Target level 29

![Farm upgrade 28 to 29](https://arkodia.online/farm-panels/target-29.png)

### Target level 30

![Farm upgrade 29 to 30](https://arkodia.online/farm-panels/target-30.png)

