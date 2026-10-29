## Build and upgrade prerequisite

Building Lumber Mill level 1 requires **Stronghold Core level 1** completed. Upgrading to target level X (2–30) requires **Stronghold Core level X** completed or higher. An in-progress Core upgrade never satisfies the requirement. Display exactly one building prerequisite row; costs and duration remain separate. No supporting building, hidden unlock threshold or extra prerequisite row is implied.

## Construction and upgrade economy

Published balancing specification. The Pixi panels display these values; construction transactions and persistent upgrade timers remain unreleased.

Level-1 paid construction: **75 base Gold + 40 Wood (Log), 1 real minutes**. Each target level T uses Gold = ceil(75 × 1.25^(T−1)), Wood = ceil(40 × 1.25^(T−1)), duration = ceil(1 × 1.20^(T−1)) minutes. Calculate directly from the unrounded baseline; do not compound rounded rows. Values are per operation, never cumulative. Level 1 builds; level T ≥ 2 upgrades exactly from T−1. No timer cap; level 30 has no next operation.

Requirements: completed Core ≥ max(1, target level). Supporting conditions: **None; first construction may spend carried Logs**. Limit: 1 per solo base. The displayed building prerequisite is solely the completed Stronghold Core level for the target operation. 

A building not explicitly included in the starter layout begins Not Built; no free grant is implied.

All operations require ownership, solo mode, an idle shared base queue, both available resource balances and sufficient spending storage capacity. Construction additionally requires a legal unoccupied footprint/socket with clear access and no player overlap. Upgrades preserve footprint, previous completed function and the existing instance; validate placement without rejecting the building's own footprint. Reserve/deduct both resources once atomically, start a persistent real-clock timer, apply results only on completion. No Food, Mana or Soul Shards are required. Cancellation, bootstrap carrying, storage reservation, offline completion and migration follow [Base Building](/organizations/ORd5dd6f99b4308d6187031557/projects/PJ8758f22f61165f3d3215e454/knowledge/NKBD438e05262b74d5e6355f5119).

| Target level | Operation | Gold | Wood (Log) | Duration (real min) | Completed Core required |
| --- | --- | --- | --- | --- | --- |
| 1 | Build | 75 | 40 | 1 | ≥1 |
| 2 | Upgrade 1→2 | 94 | 50 | 2 | ≥2 |
| 3 | Upgrade 2→3 | 118 | 63 | 2 | ≥3 |
| 4 | Upgrade 3→4 | 147 | 79 | 2 | ≥4 |
| 5 | Upgrade 4→5 | 184 | 98 | 3 | ≥5 |
| 6 | Upgrade 5→6 | 229 | 123 | 3 | ≥6 |
| 7 | Upgrade 6→7 | 287 | 153 | 3 | ≥7 |
| 8 | Upgrade 7→8 | 358 | 191 | 4 | ≥8 |
| 9 | Upgrade 8→9 | 448 | 239 | 5 | ≥9 |
| 10 | Upgrade 9→10 | 559 | 299 | 6 | ≥10 |
| 11 | Upgrade 10→11 | 699 | 373 | 7 | ≥11 |
| 12 | Upgrade 11→12 | 874 | 466 | 8 | ≥12 |
| 13 | Upgrade 12→13 | 1,092 | 583 | 9 | ≥13 |
| 14 | Upgrade 13→14 | 1,365 | 728 | 11 | ≥14 |
| 15 | Upgrade 14→15 | 1,706 | 910 | 13 | ≥15 |
| 16 | Upgrade 15→16 | 2,132 | 1,137 | 16 | ≥16 |
| 17 | Upgrade 16→17 | 2,665 | 1,422 | 19 | ≥17 |
| 18 | Upgrade 17→18 | 3,331 | 1,777 | 23 | ≥18 |
| 19 | Upgrade 18→19 | 4,164 | 2,221 | 27 | ≥19 |
| 20 | Upgrade 19→20 | 5,205 | 2,776 | 32 | ≥20 |
| 21 | Upgrade 20→21 | 6,506 | 3,470 | 39 | ≥21 |
| 22 | Upgrade 21→22 | 8,132 | 4,337 | 47 | ≥22 |
| 23 | Upgrade 22→23 | 10,165 | 5,422 | 56 | ≥23 |
| 24 | Upgrade 23→24 | 12,706 | 6,777 | 67 | ≥24 |
| 25 | Upgrade 24→25 | 15,882 | 8,471 | 80 | ≥25 |
| 26 | Upgrade 25→26 | 19,853 | 10,588 | 96 | ≥26 |
| 27 | Upgrade 26→27 | 24,816 | 13,235 | 115 | ≥27 |
| 28 | Upgrade 27→28 | 31,020 | 16,544 | 138 | ≥28 |
| 29 | Upgrade 28→29 | 38,775 | 20,680 | 165 | ≥29 |
| 30 | Upgrade 29→30 | 48,468 | 25,850 | 198 | ≥30 |

## Overview

The Lumber Mill stores harvested **Wood (Log)**. Its design features whole-log storage bays, an open loading aisle, a chopping block and manual handling tools, with warm painted timber, dark iron, worn stone and patchy snow.

The approved artwork consists of seven transparent imagegen PNG sprites in Arkodia’s isometric painted style. Intermediate levels reuse the latest milestone sprite.

## Player benefits by level

The following values are the published balancing specification, not a claim that upgrade gameplay is implemented. Bonuses apply to this building, not directly to hero combat stats. Values are measured against level 1 and do not compound.

Wood capacity follows the exponential storage rule below; each upgrade still adds 50 maximum HP. Level-1 construction follows the Gold + Wood recipe above.

| Level | Wood (Log) storage capacity | Storage bonus vs level 1 | Maximum HP | HP bonus vs level 1 |
| --- | --- | --- | --- | --- |
| 1 | 1000 | +0.0% | 500 | +0% |
| 2 | 1250 | +25.0% | 550 | +10% |
| 3 | 1563 | +56.3% | 600 | +20% |
| 4 | 1954 | +95.3% | 650 | +30% |
| 5 | 2442 | +144.1% | 700 | +40% |
| 6 | 3052 | +205.2% | 750 | +50% |
| 7 | 3815 | +281.5% | 800 | +60% |
| 8 | 4769 | +376.8% | 850 | +70% |
| 9 | 5961 | +496.0% | 900 | +80% |
| 10 | 7451 | +645.1% | 950 | +90% |
| 11 | 9314 | +831.3% | 1000 | +100% |
| 12 | 11642 | +1064.2% | 1050 | +110% |
| 13 | 14552 | +1355.2% | 1100 | +120% |
| 14 | 18190 | +1719.0% | 1150 | +130% |
| 15 | 22738 | +2173.7% | 1200 | +140% |
| 16 | 28422 | +2742.2% | 1250 | +150% |
| 17 | 35528 | +3452.7% | 1300 | +160% |
| 18 | 44409 | +4340.9% | 1350 | +170% |
| 19 | 55512 | +5451.1% | 1400 | +180% |
| 20 | 69389 | +6838.9% | 1450 | +190% |
| 21 | 86737 | +8573.6% | 1500 | +200% |
| 22 | 108421 | +10742.0% | 1550 | +210% |
| 23 | 135526 | +13452.5% | 1600 | +220% |
| 24 | 169407 | +16840.7% | 1650 | +230% |
| 25 | 211759 | +21075.8% | 1700 | +240% |
| 26 | 264698 | +26369.8% | 1750 | +250% |
| 27 | 330873 | +32987.2% | 1800 | +260% |
| 28 | 413591 | +41259.0% | 1850 | +270% |
| 29 | 516988 | +51598.8% | 1900 | +280% |
| 30 | 646235 | +64523.5% | 1950 | +290% |


The Lumber Mill stores player-harvested Logs; it does not produce Wood passively.

## Visual gallery

![Lumber Mill milestone overview](https://arkodia.online/buildings/lumber-mill/painted/milestones.png)

### Level 1
Canvas-covered log rack with a chopping block.

![Lumber Mill level 1](https://arkodia.online/buildings/lumber-mill/painted/level-01.png)

### Level 5
Reinforced supports, braces and banded log bundles.

![Lumber Mill level 5](https://arkodia.online/buildings/lumber-mill/painted/level-05.png)

### Level 10
Raised timber platform, shallow steps and organized storage bays.

![Lumber Mill level 10](https://arkodia.online/buildings/lumber-mill/painted/level-10.png)

### Level 15
Shingle-roofed timber shed with side walls and stone post bases.

![Lumber Mill level 15](https://arkodia.online/buildings/lumber-mill/painted/level-15.png)

### Level 20
Improved manual handling tools and exterior rope storage.

![Lumber Mill level 20](https://arkodia.online/buildings/lumber-mill/painted/level-20.png)

### Level 25
Log heraldry and restrained brass fittings.

![Lumber Mill level 25](https://arkodia.online/buildings/lumber-mill/painted/level-25.png)

### Level 30
Masterwork joinery, ridge fittings and a signature log banner.

![Lumber Mill level 30](https://arkodia.online/buildings/lumber-mill/painted/level-30.png)

## Level progression

| Building level | Artwork milestone |
| --- | --- |
| 1–4 | 1 |
| 5–9 | 5 |
| 10–14 | 10 |
| 15–19 | 15 |
| 20–24 | 20 |
| 25–29 | 25 |
| 30 | 30 |

Storage and HP follow the Base Building balancing specification above. Artwork milestones do not establish additional gameplay bonuses.

## Integration

Use the original 1536 × 1024 RGBA PNGs as Pixi sprites, preserving transparency and contact shadows. Maintain the 6 × 5 m reserved slot, centre-ground pivot and clear front loading route. The proposed sprite anchor is (0.5, 0.95); confirm alignment in the scene. Keep collision independent of painted bounds. All game UI must use English and render inside Pixi.

## Assets

[PNG source kit](https://arkodia.online/buildings/lumber-mill/source-kit.zip) · [Level-to-sprite manifest](https://arkodia.online/buildings/lumber-mill/manifest.json)
## Storage capacity for exponential costs

This revision replaces linear Gold/Wood capacity growth. Lumber Mill Wood capacity = ceil(1,000 × 1.25^(L−1)) at completed level L. Capacity increases only on completion, generates no resources and preserves existing contents. HP retains H(L). Kitchen Food capacity remains linear; Vault is optional and never required to afford progression. See the shared capacity feasibility rules in [Base Building](/organizations/ORd5dd6f99b4308d6187031557/projects/PJ8758f22f61165f3d3215e454/knowledge/NKBD438e05262b74d5e6355f5119).

## Upgrade/Build Interaction

Approach the completed Core in solo mode and select the nearby **Lumber Mill** hammer to inspect the planned building. The starting state is **Not Built**; no Lumber Mill or resources are granted. The entire panel, controls and dynamic English text render in Pixi.

The current-operation view shows Build Level 1 for an unbuilt Mill, or the next upgrade for a saved completed level. **PREV** and **NEXT** browse all target recipes from 1 to 30, labelled **Target preview**; **Return to current** restores the actual operation. Browsing does not alter saves, completed levels or resources. The panel reads optional `lumberMill.completedLevel` metadata without rewriting legacy saves or assigning the Mill to another building ID.

For target X, the Requirements section contains one row: **Stronghold Core level X**. A green tick appears only when the Core's already completed level is at least X. For build 1, costs are **75 Gold + 40 Wood**, duration **1 minute**. For upgrade 29→30, costs are **48,468 Gold + 25,850 Wood**, duration **198 minutes**. Resource costs and build/upgrade time have separate sections.

All Build/Upgrade buttons remain disabled with an explicit unavailable message until authoritative construction transactions, shared queue and persistent timers ship. The panels introduce no purchase handler or save migration. Ownership, queue, resource and placement checks remain operational concerns rather than extra displayed building prerequisite rows. A completed level-30 Mill shows Maximum level with no next operation.

Escape closes the panel; leaving interaction range or entering co-op hides it. Desktop and 390px mobile compositions were checked in Chromium. All 30 recipe and below/equal/above-Core gating cases passed, including ignoring an in-progress target as a completed level.

### Image-backed panel kit

The Lumber Mill emblem was generated with **built-in imagegen**, with the original transparent PNG preserved. Runtime packaging only trims transparent margins and downsamples. Gold frame/crest/glow, charcoal texture, hammer badge, strips, divider, Gold/Wood/clock/tick icons and button states reuse the Core peer's separately imagegen-generated kit. No decorative procedural stand-ins, HTML/React game UI or 3D assets are used.

![Generated original Lumber Mill emblem](https://arkodia.online/lumber-panels/kit/lumber-original.png)

![Shared Stronghold Core visual reference](https://arkodia.online/core-upgrade/kit/reference.png)

![Lumber Mill build level 1 — Pixi composition](https://arkodia.online/lumber-panels/target-01.png)

![Lumber Mill upgrade 29 to 30 — Pixi composition](https://arkodia.online/lumber-panels/target-30.png)

![All 30 Lumber Mill build and upgrade compositions](https://arkodia.online/lumber-panels/coverage.png)

![Lumber Mill mobile panel](https://arkodia.online/lumber-panels/pixi-mobile.png)

[Complete PNG source kit](https://arkodia.online/lumber-panels/kit/source-kit.zip) · [Asset manifest](https://arkodia.online/lumber-panels/kit/manifest.json) · [Generation prompt](https://arkodia.online/lumber-panels/kit/prompts.md) · [Recipe and gating coverage](https://arkodia.online/lumber-panels/coverage.json) · [Chromium validation](https://arkodia.online/lumber-panels/browser.json)
