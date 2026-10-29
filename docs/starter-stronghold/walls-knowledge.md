## Overview

Each placed segment has its own level. Connections and collision remain continuous; batch upgrades are priced per segment.

Construction requires completed Stronghold Core level **3**. Completed building levels run from **1 to 30**. Primary benefit: **Wall segment maximum HP**.

## Player benefits by level

The following values are the published balancing specification, not a claim that upgrade gameplay is implemented. Bonuses apply to this building, not directly to hero combat stats. Values are measured against level 1 and do not compound.

Each level adds **10% of level-1 maximum HP**. Absolute HP remain undefined where no level-1 baseline is published.

| Level | Maximum HP multiplier | HP bonus vs level 1 | Defensive benefit |
| --- | --- | --- | --- |
| 1 | 1.00× | +0% | HP scaling only |
| 2 | 1.10× | +10% | HP scaling only |
| 3 | 1.20× | +20% | HP scaling only |
| 4 | 1.30× | +30% | HP scaling only |
| 5 | 1.40× | +40% | HP scaling only |
| 6 | 1.50× | +50% | HP scaling only |
| 7 | 1.60× | +60% | HP scaling only |
| 8 | 1.70× | +70% | HP scaling only |
| 9 | 1.80× | +80% | HP scaling only |
| 10 | 1.90× | +90% | HP scaling only |
| 11 | 2.00× | +100% | HP scaling only |
| 12 | 2.10× | +110% | HP scaling only |
| 13 | 2.20× | +120% | HP scaling only |
| 14 | 2.30× | +130% | HP scaling only |
| 15 | 2.40× | +140% | HP scaling only |
| 16 | 2.50× | +150% | HP scaling only |
| 17 | 2.60× | +160% | HP scaling only |
| 18 | 2.70× | +170% | HP scaling only |
| 19 | 2.80× | +180% | HP scaling only |
| 20 | 2.90× | +190% | HP scaling only |
| 21 | 3.00× | +200% | HP scaling only |
| 22 | 3.10× | +210% | HP scaling only |
| 23 | 3.20× | +220% | HP scaling only |
| 24 | 3.30× | +230% | HP scaling only |
| 25 | 3.40× | +240% | HP scaling only |
| 26 | 3.50× | +250% | HP scaling only |
| 27 | 3.60× | +260% | HP scaling only |
| 28 | 3.70× | +270% | HP scaling only |
| 29 | 3.80× | +280% | HP scaling only |
| 30 | 3.90× | +290% | HP scaling only |

Apply HP scaling once; no separate function multiplier is applied to HP.

## Upgrade rules

For an upgrade from completed level L to L + 1: **Gold = ceil(50 × L²)**; **Wood (Log) = ceil(12.5 × L)**; **duration = ceil(min(720, 2 × L²) × 0.5) minutes**. Level-1 construction uses a separate recipe. Level 30 has no further upgrade.

Use the shared solo-base queue. Completed Core level must meet the target level. Keep the previous completed benefits during upgrades; apply new stats on completion. Charges, cancellation refunds and offline completion must be atomic and persistent. Full economy, inventory and save rules are in [Base Building](/organizations/ORd5dd6f99b4308d6187031557/projects/PJ8758f22f61165f3d3215e454/knowledge/NKBD438e05262b74d5e6355f5119).

## Approved snowy wall artwork

The approved wall family uses snow-covered timber, iron bindings and the snowy milestone progression below. The brown rope-only style-v2 wall images are outdated and have been removed from this page.

Level 1 uses the original snowy sprite, mirrored for the two enclosure directions. Ground contacts are registered to the existing 320-unit segment span. The twelve enclosure runs keep continuous collision and the existing gateway approach. The game and Pixi environment editor use matching wall artwork.

Visual milestones occur at **1, 5, 10, 15, 20, 25 and 30**. Intermediate levels follow the published milestone mapping. Higher-level artwork is a design reference, not a claim that wall upgrade gameplay is implemented.

### Level 1

![Approved snowy wall level 1](https://arkodia.online/buildings/walls/painted/level-01.png)

### Level 5

![Approved snowy wall level 5](https://arkodia.online/buildings/walls/painted/level-05.png)

### Level 10

![Approved snowy wall level 10](https://arkodia.online/buildings/walls/painted/level-10.png)

### Level 15

![Approved snowy wall level 15](https://arkodia.online/buildings/walls/painted/level-15.png)

### Level 20

![Approved snowy wall level 20](https://arkodia.online/buildings/walls/painted/level-20.png)

### Level 25

![Approved snowy wall level 25](https://arkodia.online/buildings/walls/painted/level-25.png)

### Level 30

![Approved snowy wall level 30](https://arkodia.online/buildings/walls/painted/level-30.png)

## Runtime and source references

[Snowy runtime art manifest](https://arkodia.online/buildings/starter-stronghold/manifest.json) · [Snowy milestone manifest](https://arkodia.online/buildings/walls/painted/manifest.json) · [Snowy source kit](https://arkodia.online/buildings/walls/painted/source-kit.zip)

The wall specification retains Core **3** construction requirements. Enclosure artwork does not grant built wall records, change construction costs, or automatically upgrade walls with the Core.

Only snowy wall images remain in this document. Unrelated tower and Core images, non-snowy wall variants, duplicate captures and obsolete calibration galleries have been removed.
