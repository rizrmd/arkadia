## Overview

Runetower is a Watchtower-shaped magical defense. The delivered level-1 runtime art is a simple raised timber lookout with front ladder, small stone footings, dark iron fittings and a restrained glowing orb cradle. Snowy roofed concepts below are superseded identity references, not the current starter appearance.

**Status: initial Building Tree defense integration shipped.** The approved raster is reused for Runeseekers’ Runetower. Level-based upgrades, tower HP/resistance and magical defense remain design proposals, not active bonuses.

## Player benefits by level

All values below are **proposed**, relative to this tower's level-1 baseline, and never compound. HP follows Watchtower: `H(L) = 1 + 0.10 × (L − 1)`. Watchtower's +5% primary growth is split into **+4% magic damage and +1% magical defense rating per level**: `D(L) = 1 + 0.04 × (L − 1)`; `M(L) = 1 + 0.01 × (L − 1)`.

This allocates the same five percentage points of nominal growth between offense and defense, rather than granting two full Watchtower growth curves. It is a budget proposal, not proof of equal combat power. The initial implementation uses 10 damage per hit for both defenses. Tower HP and magical defense rating have no active baseline yet; the proposed upgrade curves are not applied to the fixed runtime damage. Baselines must be jointly balanced so Runetower's combined offense/defense value fits the Watchtower budget before gameplay adoption.

Magic damage belongs to this tower's orb bolts. Magical defense rating protects **this tower only** against incoming magic; it is not percent damage reduction, immunity, physical defense or a hero/base-wide aura. The future resistance conversion and enemy magic profile require a separate combat decision. No extra splash, slow, armor bypass or attack-speed bonus is assumed. Duplicate towers retain independent levels and never stack an aura.

| Level | Maximum HP | HP bonus | Magic damage | Damage bonus | Magical defense rating | Defense bonus |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1.00× | +0% | 1.00× | +0% | 1.00× | +0% |
| 2 | 1.10× | +10% | 1.04× | +4% | 1.01× | +1% |
| 3 | 1.20× | +20% | 1.08× | +8% | 1.02× | +2% |
| 4 | 1.30× | +30% | 1.12× | +12% | 1.03× | +3% |
| 5 | 1.40× | +40% | 1.16× | +16% | 1.04× | +4% |
| 6 | 1.50× | +50% | 1.20× | +20% | 1.05× | +5% |
| 7 | 1.60× | +60% | 1.24× | +24% | 1.06× | +6% |
| 8 | 1.70× | +70% | 1.28× | +28% | 1.07× | +7% |
| 9 | 1.80× | +80% | 1.32× | +32% | 1.08× | +8% |
| 10 | 1.90× | +90% | 1.36× | +36% | 1.09× | +9% |
| 11 | 2.00× | +100% | 1.40× | +40% | 1.10× | +10% |
| 12 | 2.10× | +110% | 1.44× | +44% | 1.11× | +11% |
| 13 | 2.20× | +120% | 1.48× | +48% | 1.12× | +12% |
| 14 | 2.30× | +130% | 1.52× | +52% | 1.13× | +13% |
| 15 | 2.40× | +140% | 1.56× | +56% | 1.14× | +14% |
| 16 | 2.50× | +150% | 1.60× | +60% | 1.15× | +15% |
| 17 | 2.60× | +160% | 1.64× | +64% | 1.16× | +16% |
| 18 | 2.70× | +170% | 1.68× | +68% | 1.17× | +17% |
| 19 | 2.80× | +180% | 1.72× | +72% | 1.18× | +18% |
| 20 | 2.90× | +190% | 1.76× | +76% | 1.19× | +19% |
| 21 | 3.00× | +200% | 1.80× | +80% | 1.20× | +20% |
| 22 | 3.10× | +210% | 1.84× | +84% | 1.21× | +21% |
| 23 | 3.20× | +220% | 1.88× | +88% | 1.22× | +22% |
| 24 | 3.30× | +230% | 1.92× | +92% | 1.23× | +23% |
| 25 | 3.40× | +240% | 1.96× | +96% | 1.24× | +24% |
| 26 | 3.50× | +250% | 2.00× | +100% | 1.25× | +25% |
| 27 | 3.60× | +260% | 2.04× | +104% | 1.26× | +26% |
| 28 | 3.70× | +270% | 2.08× | +108% | 1.27× | +27% |
| 29 | 3.80× | +280% | 2.12× | +112% | 1.28× | +28% |
| 30 | 3.90× | +290% | 2.16× | +116% | 1.29× | +29% |

## Construction and upgrades

Construction requires completed Stronghold Core level **12**, matching Watchtower. The remaining level and upgrade rules in this section are proposed, not implemented. Every tower starts at level 1, caps at 30 and cannot upgrade beyond the completed Core level. The shipped level-1 recipe is 100 base Gold + 25 Wood (Log). Initial attacks deal 10 damage every 1.5 seconds to the nearest living enemy within 12 tiles. Tower HP, magical resistance and upgrade outputs remain unimplemented.

For completed level `L` upgrading to `L + 1`, match Watchtower factors **1.00 cost / 1.00 time**: Gold `ceil(100 × L²)`, Wood (Log) `ceil(25 × L)`, duration `ceil(min(720, 2 × L²))` minutes. For example, reaching level 2 costs 100 Gold + 25 Logs / 2 minutes; reaching level 30 costs 84,100 Gold + 725 Logs / 720 minutes. Level 30 has no next upgrade.

Use the shared solo-base queue; retain previous completed benefits during upgrades. Apply costs, completion and cancellation refunds atomically, with the established storage reservation and offline save rules in [Base Building](/organizations/ORd5dd6f99b4308d6187031557/projects/PJ8758f22f61165f3d3215e454/knowledge/NKBD438e05262b74d5e6355f5119). These are future implementation requirements, not active mechanics.

## Visual progression

The concept establishes the visual direction; separate milestone sprites are not delivered or implied.

| Levels | Visual target |
| --- | --- |
| 1–4 | Basic timber lookout and small orb cradle |
| 5–9 | Reinforced posts and iron orb supports |
| 10–14 | Stronger snowy stone footings and restrained rune inlays |
| 15–19 | Fortified lookout, tiled roof and prominent orb; current concept direction |
| 20–24 | Refined cradle and stronger defensive fittings |
| 25–29 | Elite material finish and restrained arcane heraldry |
| 30 | Complete masterwork tower and signature orb cradle |

Milestones begin exactly at 1, 5, 10, 15, 20, 25 and 30. Intermediate levels keep that milestone silhouette with small material refinements. Keep camera, scale, footprint, ground anchor and ladder access stable. Cosmetic effects grant no additional stats. Any future game controls and English labels must render in Pixi.

## Legacy design gallery

Runetower imagegen raster concept, with genuine transparent background. The painted discharge communicates its intended attack; this static image is not an animation or active attack effect.

![Runetower concept — snowy timber lookout with glowing magic orb](/api/rooms/DR2d49ace0025f66084af0c78a/attachments/DA7b141bd4b4baf919ac018f66)

[Full-resolution deployed artwork](https://arkodia.online/design/arcane-tower/concept-v1.png)

## Building Tree integration status

**Runeseekers → Runetower** is implemented in the Pixi Building Tree. Stormshade permits Watchtower. Both the construction menu and the actual build transaction enforce faction, Core-level, resource and duplicate checks. The fixed emplacement is inside the fortress. Common buildings retain their existing rules.

The release is live at [arkodia.online](https://arkodia.online/) with gameplay commit `c7cd99f1ebb1845ee6f47e6080e24844b1fd7329`. Construction requires completed Core level 12; Core upgrade gameplay is not yet available, so new and legacy bases remain locked at the default Core level 1. Eligible isolated fixtures verified actual construction, retained resource costs, reload persistence, shots and kills, day/night targeting, collision and mobile layouts in production.

See [Building Tree — Advanced Building Branches](/organizations/ORd5dd6f99b4308d6187031557/projects/PJ8758f22f61165f3d3215e454/knowledge/NKBD4c0365cb719e1121eccbe5f6) for runtime behavior, validation reports and deployed screenshots.

## Delivered level-1 runtime art — 29 October 2026

Gameplay commit `ebab2074a5a7d5afaf007252d36433c93ccf1d18` uses the new built-in imagegen runetower sprite, matched to actual gameplay Barracks/Forge and corrected palisade materials. It uses weathered matte timber without snow or glossy orange varnish. The registered 640 × 900 canvas has ground baseline y=860. Saved defenses and legal new construction use this level-1 visual. Completed Core **12**, faction, solo-play, resource and duplicate checks remain unchanged. No free locked tower, upgrade stats or new level progression was added. Production Chromium verified both factions, Core-1 rejection, costs, reload and zero page errors. [Full integration and evidence](/organizations/ORd5dd6f99b4308d6187031557/projects/PJ8758f22f61165f3d3215e454/knowledge/NKBD619328694199253411752eda).

![Delivered runetower level 1](https://arkodia.online/buildings/starter-stronghold/runetower-01.png)

![Production runetower verification](https://arkodia.online/starter-stronghold/production-runetower.webp)
