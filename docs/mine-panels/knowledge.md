## Overview

Mine produces base Gold, separate from combat-run gold. Collection capacity equals ten hours of production. Completed levels run from 1 to 30; level 30 has no next upgrade. An unbuilt Mine starts at Not Built and receives no free grant.

## Construction and upgrade economy

Published balancing specification. Build and upgrade transactions remain unavailable pending the shared construction queue and persistent timers, matching the Farm panel scope. Viewing targets never changes resources, saves, the world building or its completed level.

Build level 1 costs **150 base Gold + 100 Wood (Log)** and takes **3 real minutes**. For target T, Gold = ceil(150 × 1.25^(T−1)), Wood = ceil(100 × 1.25^(T−1)), and duration = ceil(3 × 1.20^(T−1)) minutes. Calculate each operation directly from the baseline without rounded compounding or timer caps.

The sole displayed building prerequisite for target Mine level X is **completed Stronghold Core level X or higher**: build 1 requires Core 1, upgrade 1→2 requires Core 2, through upgrade 29→30 requiring Core 30. An in-progress Core upgrade does not count. Costs and duration are separate. Limit: one Mine per solo base.

| Target | Operation | Gold | Wood | Real minutes | Completed Core |
| --- | --- | --- | --- | --- | --- |
| 1 | Build | 150 | 100 | 3 | ≥1 |
| 2 | 1→2 | 188 | 125 | 4 | ≥2 |
| 3 | 2→3 | 235 | 157 | 5 | ≥3 |
| 4 | 3→4 | 293 | 196 | 6 | ≥4 |
| 5 | 4→5 | 367 | 245 | 7 | ≥5 |
| 6 | 5→6 | 458 | 306 | 8 | ≥6 |
| 7 | 6→7 | 573 | 382 | 9 | ≥7 |
| 8 | 7→8 | 716 | 477 | 11 | ≥8 |
| 9 | 8→9 | 895 | 597 | 13 | ≥9 |
| 10 | 9→10 | 1,118 | 746 | 16 | ≥10 |
| 11 | 10→11 | 1,397 | 932 | 19 | ≥11 |
| 12 | 11→12 | 1,747 | 1,165 | 23 | ≥12 |
| 13 | 12→13 | 2,183 | 1,456 | 27 | ≥13 |
| 14 | 13→14 | 2,729 | 1,819 | 33 | ≥14 |
| 15 | 14→15 | 3,411 | 2,274 | 39 | ≥15 |
| 16 | 15→16 | 4,264 | 2,843 | 47 | ≥16 |
| 17 | 16→17 | 5,330 | 3,553 | 56 | ≥17 |
| 18 | 17→18 | 6,662 | 4,441 | 67 | ≥18 |
| 19 | 18→19 | 8,327 | 5,552 | 80 | ≥19 |
| 20 | 19→20 | 10,409 | 6,939 | 96 | ≥20 |
| 21 | 20→21 | 13,011 | 8,674 | 116 | ≥21 |
| 22 | 21→22 | 16,264 | 10,843 | 139 | ≥22 |
| 23 | 22→23 | 20,329 | 13,553 | 166 | ≥23 |
| 24 | 23→24 | 25,411 | 16,941 | 199 | ≥24 |
| 25 | 24→25 | 31,764 | 21,176 | 239 | ≥25 |
| 26 | 25→26 | 39,705 | 26,470 | 287 | ≥26 |
| 27 | 26→27 | 49,631 | 33,088 | 344 | ≥27 |
| 28 | 27→28 | 62,039 | 41,360 | 413 | ≥28 |
| 29 | 28→29 | 77,549 | 51,699 | 495 | ≥29 |
| 30 | 29→30 | 96,936 | 64,624 | 594 | ≥30 |

## Player benefits by level

The following values are the published balancing specification, not a claim that upgrade gameplay is implemented. Bonuses apply to this building, not directly to hero combat stats. Values are measured against level 1 and do not compound.

Each level adds **10% of level-1 maximum HP** and **5% of the level-1 primary function**. Absolute outputs and HP remain undefined where no level-1 baseline is published.

| Level | Maximum HP multiplier | HP bonus vs level 1 | Gold production rate and collection capacity multiplier | Gold production rate and collection capacity bonus vs level 1 |
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

## Building artwork

Existing Mine world artwork and milestone mappings at levels 1, 5, 10, 15, 20, 25 and 30 remain unchanged. The panel uses a separately generated reusable Mine portrait; target selection does not imply a new world-art mapping or gameplay unlock.

![Existing Mine world reference](https://arkodia.online/buildings/mine/painted/level-01.png)

![Existing Mine milestone artwork](https://arkodia.online/buildings/mine/painted/milestones.png)

## Upgrade interaction

Approach the Core base-planning area and tap the Mine hammer badge. Mine occupies the left slot on the first planning row. The English Pixi panel shows the current Build or Upgrade operation and provides Previous, Next and Return to current controls for all 30 targets. Maximum level has no next operation. No HTML or React controls are used.

The approved Core proportions govern the 540×478 responsive panel and its 458-high frame. Cost icons, labels and values share horizontal centers; the clock and time align. The button starts at y=338, leaving 19 logical pixels below the clock and ample frame padding. Dynamic labels and numbers are rendered in Pixi, never baked into artwork.

Every registered external building badge, including the tapped Mine hammer, becomes invisible, non-renderable and non-interactive immediately while a panel is open. Closing through the close control, Escape, leaving range, co-op transition or destruction restores only currently appropriate badges. The shared registry coordinates Mine, Core, Farm, Lumber Mill and Kitchen; Walls uses the same registry.

Build/Upgrade is visibly unavailable. The panel introduces no unsupported construction transaction, resource deduction, queue, timer or save migration.

![Approved Core visual authority](https://arkodia.online/core-upgrade/kit-v2/reference.png)

### Generated bitmap kit

The Mine portrait was generated using the imagegen skill and built-in image_gen tool with the approved Core style and existing Mine artwork as references. Frame, charcoal, hammer, headers, resource and clock icons, tick, divider and disabled button reuse the approved imagegen Core kit-v2. Original alpha is preserved. The same complete kit composes every target panel.

![Generated Mine portrait](https://arkodia.online/mine-panels/kit/mine.png)

![Shared generated Core components](https://arkodia.online/core-upgrade/kit-v2/contact-sheet.png)

[Complete usable PNG source kit](https://arkodia.online/mine-panels/kit/source-kit.zip) · [Generation prompt](https://arkodia.online/mine-panels/kit/prompts.json) · [Asset hashes and all target recipes](https://arkodia.online/mine-panels/kit/manifest.json)

### Rendered Pixi panels

![Mine desktop panel](https://arkodia.online/mine-panels/pixi-desktop.png)

![Mine mobile panel](https://arkodia.online/mine-panels/pixi-mobile.png)

![All thirty Mine targets](https://arkodia.online/mine-panels/all-targets.png)

![Mine target 1 — Build](https://arkodia.online/mine-panels/target-01.png)

![Mine target 2 — 1→2](https://arkodia.online/mine-panels/target-02.png)

![Mine target 3 — 2→3](https://arkodia.online/mine-panels/target-03.png)

![Mine target 4 — 3→4](https://arkodia.online/mine-panels/target-04.png)

![Mine target 5 — 4→5](https://arkodia.online/mine-panels/target-05.png)

![Mine target 6 — 5→6](https://arkodia.online/mine-panels/target-06.png)

![Mine target 7 — 6→7](https://arkodia.online/mine-panels/target-07.png)

![Mine target 8 — 7→8](https://arkodia.online/mine-panels/target-08.png)

![Mine target 9 — 8→9](https://arkodia.online/mine-panels/target-09.png)

![Mine target 10 — 9→10](https://arkodia.online/mine-panels/target-10.png)

![Mine target 11 — 10→11](https://arkodia.online/mine-panels/target-11.png)

![Mine target 12 — 11→12](https://arkodia.online/mine-panels/target-12.png)

![Mine target 13 — 12→13](https://arkodia.online/mine-panels/target-13.png)

![Mine target 14 — 13→14](https://arkodia.online/mine-panels/target-14.png)

![Mine target 15 — 14→15](https://arkodia.online/mine-panels/target-15.png)

![Mine target 16 — 15→16](https://arkodia.online/mine-panels/target-16.png)

![Mine target 17 — 16→17](https://arkodia.online/mine-panels/target-17.png)

![Mine target 18 — 17→18](https://arkodia.online/mine-panels/target-18.png)

![Mine target 19 — 18→19](https://arkodia.online/mine-panels/target-19.png)

![Mine target 20 — 19→20](https://arkodia.online/mine-panels/target-20.png)

![Mine target 21 — 20→21](https://arkodia.online/mine-panels/target-21.png)

![Mine target 22 — 21→22](https://arkodia.online/mine-panels/target-22.png)

![Mine target 23 — 22→23](https://arkodia.online/mine-panels/target-23.png)

![Mine target 24 — 23→24](https://arkodia.online/mine-panels/target-24.png)

![Mine target 25 — 24→25](https://arkodia.online/mine-panels/target-25.png)

![Mine target 26 — 25→26](https://arkodia.online/mine-panels/target-26.png)

![Mine target 27 — 26→27](https://arkodia.online/mine-panels/target-27.png)

![Mine target 28 — 27→28](https://arkodia.online/mine-panels/target-28.png)

![Mine target 29 — 28→29](https://arkodia.online/mine-panels/target-29.png)

![Mine target 30 — 29→30](https://arkodia.online/mine-panels/target-30.png)

## Validation

TypeScript, all thirty recipe and completed-Core boundary checks, exact rendered English text, native Pixi pointer opening, target navigation/reset, Escape, proximity and co-op behavior, maximum level, mobile bounds and the five-module modal suppression/restoration suite pass. A separate cumulative six-module check including Walls also passes all modal lifecycle checks. Native Pixi captures are fixture-based; full-world initialization is not claimed as a visual pass.

[Six-module integration report](https://arkodia.online/mine-panels/integration.json) · [Browser report](https://arkodia.online/mine-panels/browser.json) · [Production verification](https://arkodia.online/mine-panels/production.json)
