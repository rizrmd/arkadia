## Overview

Damage progression depends on base attacks and a defined level-1 damage baseline. Each tower retains its own level.

Construction requires completed Stronghold Core level **12**. Completed building levels run from **1 to 30**. Primary benefit: **Defensive damage**.

## Player benefits by level

The following values are the published balancing specification, not a claim that upgrade gameplay is implemented. Bonuses apply to this building, not directly to hero combat stats. Values are measured against level 1 and do not compound.

Each level adds **10% of level-1 maximum HP** and **5% of the level-1 primary function**. Absolute outputs and HP remain undefined where no level-1 baseline is published.

| Level | Maximum HP multiplier | HP bonus vs level 1 | Defensive damage multiplier | Defensive damage bonus vs level 1 |
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

## Upgrade rules

For an upgrade from completed level L to L + 1: **Gold = ceil(100 × L²)**; **Wood (Log) = ceil(25 × L)**; **duration = ceil(min(720, 2 × L²) × 1) minutes**. Level-1 construction uses a separate recipe. Level 30 has no further upgrade.

Use the shared solo-base queue. Completed Core level must meet the target level. Keep the previous completed benefits during upgrades; apply new stats on completion. Charges, cancellation refunds and offline completion must be atomic and persistent. Full economy, inventory and save rules are in [Base Building](/organizations/ORd5dd6f99b4308d6187031557/projects/PJ8758f22f61165f3d3215e454/knowledge/NKBD438e05262b74d5e6355f5119).

## Building design

Dimensional isometric artwork follows Arkodia's weathered matte timber, textured gray stone, dark iron fittings and restrained warm light. Artwork uses the **imagegen skill**. English review controls are rendered in **Pixi**.

[Open Pixi review](https://watchtower-review-arkodia.fural.space/)

<iframe src="https://watchtower-review-arkodia.fural.space/" title="Watchtower design preview" height="650"></iframe>

Visual milestones occur at levels **1, 5, 10, 15, 20, 25 and 30**; intermediate levels use the published asset mapping. Visual upgrades alone grant no extra gameplay unlocks.

[Download source kit](https://watchtower-review-arkodia.fural.space/source-kit.zip) · [Level manifest](https://watchtower-review-arkodia.fural.space/manifest.json)

## Legacy design gallery

Superseded milestone review artwork. The current level-1 runtime sprite is shown in the delivered integration below.

![Current painted Watchtower milestone sheet](https://watchtower-review-arkodia.fural.space/milestones.png)

![Current level 1 transparent sprite](https://watchtower-review-arkodia.fural.space/level-01.png)

![Current level 5 transparent sprite](https://watchtower-review-arkodia.fural.space/level-05.png)

![Current level 10 transparent sprite](https://watchtower-review-arkodia.fural.space/level-10.png)

![Current level 15 transparent sprite](https://watchtower-review-arkodia.fural.space/level-15.png)

![Current level 20 transparent sprite](https://watchtower-review-arkodia.fural.space/level-20.png)

![Current level 25 transparent sprite](https://watchtower-review-arkodia.fural.space/level-25.png)

![Current level 30 transparent sprite](https://watchtower-review-arkodia.fural.space/level-30.png)

![Level 14 with four imagegen repair plates](https://watchtower-review-arkodia.fural.space/level-14.png)

![Original current imagegen level 1](https://watchtower-review-arkodia.fural.space/originals/level-01-imagegen.png)

![Original current imagegen level 5](https://watchtower-review-arkodia.fural.space/originals/level-05-imagegen.png)

![Original current imagegen level 10](https://watchtower-review-arkodia.fural.space/originals/level-10-imagegen.png)

![Original current imagegen level 15](https://watchtower-review-arkodia.fural.space/originals/level-15-imagegen-final.png)

![Original current imagegen level 20](https://watchtower-review-arkodia.fural.space/originals/level-20-imagegen.png)

![Original current imagegen level 25](https://watchtower-review-arkodia.fural.space/originals/level-25-imagegen.png)

![Original current imagegen level 30](https://watchtower-review-arkodia.fural.space/originals/level-30-imagegen.png)

![Original imagegen repair-fitting painting](https://watchtower-review-arkodia.fural.space/originals/repair-plate-imagegen.png)

![Live Pixi review at 1440 pixels](https://watchtower-review-arkodia.fural.space/browser-1440.png)

![Live Pixi review at 390 pixels](https://watchtower-review-arkodia.fural.space/browser-390.png)

![Live Pixi review at 320 pixels](https://watchtower-review-arkodia.fural.space/browser-320.png)

## Building Tree integration

**Stormshade → Watchtower** is implemented in the Pixi Building Tree. Runeseekers permits Runetower. Completed Core level 12 is enforced by both menu and build action. The initial recipe is 100 base Gold + 25 Wood (Log), with one fixed fortress emplacement per character. Initial damage is 10 per hit, at 1.5-second intervals against the nearest living enemy within 12 tiles, during day and night. Building-level upgrades and durability remain proposed.

Core upgrade gameplay is not available yet, so new and legacy bases remain locked at default Core level 1. Eligible isolated fixtures verified actual construction and combat. [Building Tree — Advanced Building Branches](/organizations/ORd5dd6f99b4308d6187031557/projects/PJ8758f22f61165f3d3215e454/knowledge/NKBD4c0365cb719e1121eccbe5f6) records the shipped commit, persistence rules, production verification and screenshots.

## Delivered level-1 runtime art — 29 October 2026

Gameplay commit `ebab2074a5a7d5afaf007252d36433c93ccf1d18` uses the new built-in imagegen watchtower sprite, matched to actual gameplay Barracks/Forge and corrected palisade materials. It uses weathered matte timber without snow or glossy orange varnish. The registered 640 × 900 canvas has ground baseline y=860. Saved defenses and legal new construction use this level-1 visual. Completed Core **12**, faction, solo-play, resource and duplicate checks remain unchanged. No free locked tower, upgrade stats or new level progression was added. Production Chromium verified both factions, Core-1 rejection, costs, reload and zero page errors. [Full integration and evidence](/organizations/ORd5dd6f99b4308d6187031557/projects/PJ8758f22f61165f3d3215e454/knowledge/NKBD619328694199253411752eda).

![Delivered watchtower level 1](https://arkodia.online/buildings/starter-stronghold/watchtower-01.png)

![Production watchtower verification](https://arkodia.online/starter-stronghold/production-watchtower.webp)
