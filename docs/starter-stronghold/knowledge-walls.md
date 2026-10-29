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

## Building design

Dimensional isometric artwork follows Arkodia's weathered matte timber, textured gray stone, dark iron fittings and restrained warm directional light. Artwork uses the **imagegen skill**. English review controls are rendered in **Pixi**.

[Open English Pixi Walls viewer](https://arkodia.online/sprite-player/walls/)

<iframe src="https://arkodia.online/sprite-player/walls/" title="Walls painted levels 1–30" height="750"></iframe>

Visual milestones occur at levels **1, 5, 10, 15, 20, 25 and 30**; intermediate levels use the published asset mapping. Visual upgrades alone grant no extra gameplay unlocks.

[Download source kit](https://arkodia.online/buildings/walls/painted/source-kit.zip) · [30-level manifest](https://arkodia.online/buildings/walls/painted/manifest.json)

## Starter stronghold integration — delivered 29 October 2026

Gameplay commit `ebab2074a5a7d5afaf007252d36433c93ccf1d18` is live at [arkodia.online](https://arkodia.online/). It includes the cumulative wildlife, HUD and FX editor work. The release was serialized with `arkodia-deploy.lock`; health and the runtime release receipt match that commit. All 42 compiled file hashes and visible RGBA pixels of four new runtime sprites matched production. The published map remains revision **3**, **67 objects**; no map snapshot, draft or gameplay save was overwritten.

Twelve level-1 palisade runs replace the stone ramparts, with plain timber and rope, no snow and no glossy orange finish. Ground contacts are calibrated to the 2:1 projection, including mirrored runs and continuous collision through transparent log gaps. Decorative stone bastions and the loose broken wall are omitted. The existing gateway, animation and combat are preserved. Stronghold Core keeps the approved central placement, collision and saved-level composition from #YPMIZ; absent Core records still display Core level 1.

**Permissions are unchanged.** Enclosure art is the starter terrain presentation, not a grant of constructed wall records. Wall construction retains Core **3**. Stormshade Watchtower and Runeseekers Runetower retain completed Core **12**, faction, resource, duplicate and solo-play checks. Legal towers start with the new simple level-1 timber lookout art; no locked tower is granted. Runetower adds a restrained orb cradle. No Core relocation feature, automatic wall upgrade from Core level or invented Main Hall unlock is introduced.

Published terrain previously drew over the baked court and hid the walls and Core. Terrain now draws below the fixed court; the bake and its lighting preserve transparency outside the court so the published terrain remains visible there. The Pixi editor uses the same registered enclosure art. All UI remains Pixi.

Local and production Chromium checks passed: actual visible court pixels match the CPU bake (mean RGB difference **1**), Core-1 lock, legal construction of both factions, cross-faction rejection, persistent 100 Gold / 25 Wood charges, reload, reward retention, mobile resize, safe spawn and actual movement toward the gateway. Zero page errors. TypeScript, game/editor builds, geometric registration tests, Building Tree regressions and all Go tests passed. Browser fixtures use isolated offline storage and never write player saves.

[Runtime release receipt](https://arkodia.online/starter-stronghold/release.json) · [Production gameplay checks](https://arkodia.online/starter-stronghold/production-browser.json) · [Production file/pixel checks](https://arkodia.online/starter-stronghold/release-verification.json) · [Runtime art manifest](https://arkodia.online/buildings/starter-stronghold/manifest.json) · [Source kit and prompt](https://arkodia.online/buildings/starter-stronghold/source-kit.zip)

### Delivered raster assets

![Imagegen level-1 faction tower source sheet](https://arkodia.online/buildings/starter-stronghold/tower-source.png)

![Stormshade Watchtower level 1](https://arkodia.online/buildings/starter-stronghold/watchtower-01.png)

![Runeseekers Runetower level 1](https://arkodia.online/buildings/starter-stronghold/runetower-01.png)

![Preserved approved Core level 1](https://arkodia.online/buildings/stronghold-core/painted/level-01.png)

### Gameplay verification gallery

![Production Core-1 starter with locked faction defenses](https://arkodia.online/starter-stronghold/production-locked.webp)

![Production legally constructed Watchtower](https://arkodia.online/starter-stronghold/production-watchtower.webp)

![Production legally constructed Runetower; Core-12 fixture](https://arkodia.online/starter-stronghold/production-runetower.webp)

![Production full enclosure bake; dynamic gateway and actors are drawn in separate Pixi layers](https://arkodia.online/starter-stronghold/production-enclosure.webp)

### Local validation and superseded identity references

![Local full enclosure geometry export](https://arkodia.online/starter-stronghold/local-enclosure.webp)

![Local starter verification](https://arkodia.online/starter-stronghold/local-locked.webp)

![Local Watchtower verification](https://arkodia.online/starter-stronghold/local-watchtower.webp)

![Local Runetower verification](https://arkodia.online/starter-stronghold/local-runetower.webp)

![Local real-time capture after terrain layering correction](https://arkodia.online/starter-stronghold/local-real-screen.webp)

![Superseded snowy Watchtower identity reference](https://arkodia.online/building-tree/watchtower.png)

![Superseded snowy Runetower identity reference](https://arkodia.online/building-tree/runetower.png)

### Images attached to discussion

![Imagegen tower sheet attachment](/api/rooms/DR2d49ace0025f66084af0c78a/attachments/DAe3898ca96036ae60aeb4554d)

![Production starter attachment](/api/rooms/DR2d49ace0025f66084af0c78a/attachments/DA80197f3043a3797046789cf6)

![Production Runetower attachment](/api/rooms/DR2d49ace0025f66084af0c78a/attachments/DAf7b2b04106c5ba963c258303)

## Corrected gameplay art — 29 October 2026

The corrected sheet was generated with the **built-in imagegen tool**, using the actual approved gameplay Barracks, Forge and weathered wall images shown below. Snow, glossy orange wood and rounded cartoon shading have been removed. Level 1 is a simple timber palisade with rope bindings. Later milestones retain the published 1/5/10/15/20/25/30 progression, with restrained timber, stone, iron and red cloth detail. Read the sheet left to right: 1/5/10/15 on the first row, then 20/25/30 on the second row.

**Delivered:** corrected reference sheet at the original requested URL, seven transparent review sprites, a 30-level art mapping and source/reference files. Artwork commit `53644d555ab11aa884427855fc45176915a166d9`; deployment bootstrap commit `61399adfdafa4ffd827a045f31e19e60dba2e2eb`. Initial static layer `1793206797613-walls-style-v2-fce1f3c3e6e9`; source kit, provenance and verification delivered by commit `987fca835e1f1110f3ef9ed8f9f015f1b472de11` in applied layer `1793207238801-walls-style-v2-4f7bc8deae7c`. Source ZIP, provenance and verification bytes match production. Production pixel comparisons passed for all seven sprites and the sheet, the manifest matched, Chromium decoded the 1747 × 900 sheet, and gameplay health remained OK. The Go asset cache serves lossless WebP at PNG URLs; visible RGBA was verified rather than comparing container bytes.

**Integrated after prerequisite completion:** #YPMIZ was verified against its deployed release and direct production fresh/legacy browser checks, then marked done before starter integration. The seven milestone review sprites retain separate review registration; the level-1 runtime palisade now has calibrated endpoints, a mirrored direction and continuous collision. The old modular review remains a superseded reference.

Wall construction still requires completed Core level **3**. Stormshade Watchtower and Runeseekers Runetower construction still requires completed Core level **12**, legal faction, resources and duplicate checks. A legally built tower starts at tower level 1; no locked tower is granted to a new Core-1 player. No Core relocation feature or Main Hall unlock threshold is introduced.

[Corrected source kit](https://arkodia.online/buildings/walls/painted/style-v2/source-kit.zip) · [Production verification](https://arkodia.online/buildings/walls/painted/style-v2/verification.json)

[Corrected sprite manifest](https://arkodia.online/buildings/walls/painted/style-v2/manifest.json)

![Corrected wall milestones](https://arkodia.online/buildings/walls/painted/milestones.png?v=61399ad)

### Approved gameplay style references

![Actual gameplay Barracks reference](https://arkodia.online/buildings/walls/painted/style-v2/reference-barracks.png)

![Actual gameplay Forge reference](https://arkodia.online/buildings/walls/painted/style-v2/reference-forge.png)

![Actual gameplay weathered wall reference](https://arkodia.online/buildings/walls/painted/style-v2/reference-wall.png)

### Corrected transparent milestone sprites

![Corrected wall level 1](https://arkodia.online/buildings/walls/painted/style-v2/level-01.png)

![Corrected wall level 5](https://arkodia.online/buildings/walls/painted/style-v2/level-05.png)

![Corrected wall level 10](https://arkodia.online/buildings/walls/painted/style-v2/level-10.png)

![Corrected wall level 15](https://arkodia.online/buildings/walls/painted/style-v2/level-15.png)

![Corrected wall level 20](https://arkodia.online/buildings/walls/painted/style-v2/level-20.png)

![Corrected wall level 25](https://arkodia.online/buildings/walls/painted/style-v2/level-25.png)

![Corrected wall level 30](https://arkodia.online/buildings/walls/painted/style-v2/level-30.png)

## Superseded modular viewer gallery

The images below document the previous snowy art and legacy modular registration. They are retained for history, not current art direction. The corrected style-v2 sprites require endpoint/junction calibration before gameplay integration.

![Superseded snowy milestone overview](https://arkodia.online/buildings/walls/painted/style-v2/superseded-milestones.png)

![Imagegen Walls level 1](https://arkodia.online/buildings/walls/painted/level-01.png)

![Imagegen Walls level 5](https://arkodia.online/buildings/walls/painted/level-05.png)

![Imagegen Walls level 10](https://arkodia.online/buildings/walls/painted/level-10.png)

![Imagegen Walls level 15](https://arkodia.online/buildings/walls/painted/level-15.png)

![Imagegen Walls level 20](https://arkodia.online/buildings/walls/painted/level-20.png)

![Imagegen Walls level 25](https://arkodia.online/buildings/walls/painted/level-25.png)

![Imagegen Walls level 30](https://arkodia.online/buildings/walls/painted/level-30.png)

![Imagegen junction and end-cap](https://arkodia.online/buildings/walls/painted/junction.png)

![Imagegen intermediate repair fitting](https://arkodia.online/buildings/walls/painted/repair.png)

![Current Pixi corner preview](https://arkodia.online/buildings/walls/painted/pixi-desktop.png)

![Current Pixi straight run preview](https://arkodia.online/buildings/walls/painted/pixi-run.png)

![Current Pixi mobile preview](https://arkodia.online/buildings/walls/painted/pixi-mobile.png)

![Superseded calibration: undersized corner cap; corrected in current viewer](https://arkodia.online/buildings/walls/painted/pixi-corner-calibration-v1.png)

![Superseded calibration: undersized straight junction; corrected in current viewer](https://arkodia.online/buildings/walls/painted/pixi-run-calibration-v1.png)

### Discussion attachment

![Corrected wall sheet shared in discussion](/api/rooms/DR2d49ace0025f66084af0c78a/attachments/DAc2abed298a6236449570275d)