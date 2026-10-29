## Current review status — alpha correction

**V3 is the current imagegen review candidate; human art/camera approval remains pending.** No GLB, modeling or gameplay integration was used.

![Main Hall v3 — imagegen PNG with verified alpha](/api/rooms/DR7f0a660e4dfc6ca5002753b3/attachments/DA9d2d5b94dad5bc63f0903869)

Posted inline in the originating environment room first, message DM05ce3a9b95f57e80dc101478. Read-only decoded alpha checks found **722,104 fully transparent pixels**, all four corner alpha values **0**, and near-opaque building pixels. The PNG remains byte-for-byte as generated; alpha values such as 253/254 are preserved.

**Correction to earlier visual-only assessments:** v1 and v2 also have real transparency (731,038 and 727,015 fully transparent pixels, respectively). Their corners are transparent. The apparent studio backdrop in the image inspection is RGB content under transparent alpha; appearance in that preview alone was insufficient to declare background extraction failure. Earlier failure statements below are superseded by these decoded alpha checks. Final edge quality, faint partially transparent pixels and in-scene camera fit still need art review. No production integration is claimed.

The existing 30-level HP/Defense/XP proposal is unchanged. Original variants remain inline below for provenance.

## Status and review

**Design proposal only — awaiting human art approval.** No Main Hall stats, building, placement, unlocks or asset references have been integrated into gameplay. This is one proposed level-20 concept, not seven finished milestone assets or 30 generated paintings. First posted inline in environment room DR7f0a660e4dfc6ca5002753b3, message DM50e3a73b7dd8283b19e24014, on 28 October 2026.

![Main Hall concept v1 — pending approval](/api/rooms/DR7f0a660e4dfc6ca5002753b3/attachments/DA556a625dc8d51a9838105c0e)

The image matches the stone/timber materials, warm lanterns, red tiled roofs and blue heraldry of Arkodia. Camera fit, breadth relative to Barracks, and the visible backdrop/halo require review. Despite requesting transparency, the generated concept visibly includes a backdrop: it is not a production-ready cutout. Keep the original intact; any cleanup must use imagegen and be posted to the environment room first. No human approval is claimed.

## Role and relationship to existing buildings

Propose a **separate, optional Main Hall**, limited to one per solo base. The existing Stronghold Core remains the progression controller and base Gold store; this proposal does not rename or duplicate its storage. Construction unlocks at completed Core level 5. Main Hall completed level cannot exceed Core level. It grants modest preparation bonuses to the base owner's selected hero, in solo outdoor combat and expeditions only where the same hero stats are used. No radius aura, visitors, party sharing, guards, structures, Gate or Walls receive these hero bonuses. Co-op adoption needs separate authority/balance approval; co-op is paused.

The parent **Base Building** (the actual catalog title of the requested Building Base parent) already specifies building durability H(L)=1+0.10(L−1) and service output F(L)=1+0.05(L−1). Those describe buildings, not hero health. Barracks scales guard training, Forge crafting, Altar blessing service, Watchtower defensive damage, Core Gold storage. None of the reviewed pages grants a blanket hero combat bonus. Keep these roles intact. Do not apply H or F again to the hero table below.

## Current stat units and balance rationale

The current Battle Mechanic page specifies **Vitality +20 max/current HP**, **Ascendant Star +10 max/current HP**, and soul XP `10 + 4 × (monster level − 1)`. Its current threshold is `10 × hero level × (10 + 4 × (hero level − 1))`; the older Outdoor Combat page still contains superseded 20/35/55 XP examples. Use the newer Mechanic / Progression updates as the reference, and leave thresholds unchanged.

HP below is **flat hero HP points**, not percent and not building durability. Defense is explicitly proposed as **percentage damage reduction**, not an invented armor-point unit: the reviewed current rules do not establish a numeric Defense/armor conversion. This new reduction layer needs implementation approval. XP Gain is a percentage bonus on collectible combat soul XP only.

At level 30 the Hall grants +30 HP (1.5 Vitality choices), 6% damage reduction and +15% soul XP. On a 100-HP example hero, survivability becomes approximately 130/0.94 = 138.3 raw damage, rather than copying the building durability curve's 3.9× onto a hero. At 10 base XP a level-30 Hall averages 11.5 XP per soul; approximately 13% fewer same-level pickups, not an XP threshold reduction. Enemy scaling and earned blessing choices still matter. These are initial budgets requiring playtest, not measured balance results.

## Explicit proposed level 1–30 bonuses

Totals at the completed level; **replace the previous row, never sum rows**. Level 1 already grants its listed bonus; unbuilt grants zero. Formulas: HP = L; Defense = 0.2L%; XP Gain = 0.5L%.

| Completed level | Hero Max HP bonus (points) | Defense (damage reduction) | Soul XP Gain bonus |
| --- | --- | --- | --- |
| 1 | +1 HP | 0.2% | +0.5% |
| 2 | +2 HP | 0.4% | +1.0% |
| 3 | +3 HP | 0.6% | +1.5% |
| 4 | +4 HP | 0.8% | +2.0% |
| 5 | +5 HP | 1.0% | +2.5% |
| 6 | +6 HP | 1.2% | +3.0% |
| 7 | +7 HP | 1.4% | +3.5% |
| 8 | +8 HP | 1.6% | +4.0% |
| 9 | +9 HP | 1.8% | +4.5% |
| 10 | +10 HP | 2.0% | +5.0% |
| 11 | +11 HP | 2.2% | +5.5% |
| 12 | +12 HP | 2.4% | +6.0% |
| 13 | +13 HP | 2.6% | +6.5% |
| 14 | +14 HP | 2.8% | +7.0% |
| 15 | +15 HP | 3.0% | +7.5% |
| 16 | +16 HP | 3.2% | +8.0% |
| 17 | +17 HP | 3.4% | +8.5% |
| 18 | +18 HP | 3.6% | +9.0% |
| 19 | +19 HP | 3.8% | +9.5% |
| 20 | +20 HP | 4.0% | +10.0% |
| 21 | +21 HP | 4.2% | +10.5% |
| 22 | +22 HP | 4.4% | +11.0% |
| 23 | +23 HP | 4.6% | +11.5% |
| 24 | +24 HP | 4.8% | +12.0% |
| 25 | +25 HP | 5.0% | +12.5% |
| 26 | +26 HP | 5.2% | +13.0% |
| 27 | +27 HP | 5.4% | +13.5% |
| 28 | +28 HP | 5.6% | +14.0% |
| 29 | +29 HP | 5.8% | +14.5% |
| 30 | +30 HP | 6.0% | +15.0% |

## Stacking, timing and scope

- Recompute from source stats; never mutate a saved derived total repeatedly on load. Proposed max HP = existing hero max HP excluding Hall + Hall HP. Vitality and Star continue contributing their existing flat HP once. Preserve current absolute HP on upgrades (no free healing); clamp to the new maximum if a bonus is removed. Explicit respawn/healing rules may restore health normally.
- Apply Hall Defense once to positive ordinary enemy damage after existing reductions/shields: `damageAfterHall = damageBeforeHall × (1 − 0.002L)`. Multiplicative with other reduction sources, capped at 6% from this Hall; never additive percentage points of an unrelated armor stat. Preserve fractional combat damage; do not floor each hit into zero. Immunity remains immunity; bypass/scripted damage retains its bypass rules.
- Example: 100 ordinary damage becomes 94 at Hall 30. Another independent 20% reduction yields 100 × 0.8 × 0.94 = 75.2, not 74. Hall grants no attack, crit, healing rate, shield capacity or guard damage bonus.
- XP: snapshot the completed Hall level when a soul is created, alongside its existing frozen monster-level reward. On owner collection, award base XP × (1 + 0.005L) exactly once. Retain fractional XP in a persistent carry ledger; award whole XP via floor(total + carry), retaining the remainder. At Hall 30 two 10-XP souls yield 11 then 12 XP. Store bonus provenance to prevent double application after refresh. Soul creation/death itself still awards no XP.
- Add any future explicitly approved same-category XP percentages before one multiplication; do not compound duplicate Halls. No bonus on Gold, building XP, quest rewards, refunded XP, old saved XP or repeated collection. Existing thresholds and overflow stay intact.
- Owner-only, one active Hall bonus. Duplicates in corrupt/imported data resolve to the highest valid completed level, never stack. Hero switching recalculates the same base-owned entitlement once for the selected hero; each hero retains its own gameplay save. No bonus copying into a separate base or co-op room.
- Previous completed bonuses remain during the shared upgrade queue. Completion changes future derived stats and future soul snapshots only. No retroactive XP or offline combat rewards. Reload, death, reset and offline completion must follow existing persistent save ownership; demolition/removal cannot be used to heal or duplicate rewards.

## Upgrade proposal

Construct at Core 5 for **500 base Gold + 100 Wood (Log), 10 minutes**; this is a new proposed recipe, not a published requirement. Upgrade exactly one level at a time, using the parent's solo queue, atomic payment, completion and cancellation rules. Proposed cost/time factors are **1.25 / 1.25**, matching Altar service investment and sitting above Barracks (1.0), below Core (1.5). No new currency or Food charge.

From completed level L to L+1: Gold `ceil(125 × L²)`; Wood `ceil(31.25 × L)`; minutes `ceil(min(720, 2 × L²) × 1.25)`. Core must meet target level. Example 1→2: 125 Gold, 32 Logs, 3 min; 29→30: 105,125 Gold, 907 Logs, 900 min. Level 30 is Max Level, without next price/timer. Hall building durability would follow H(L) only if a separate building HP baseline is approved; do not interpret the hero HP table as Hall durability.

## Visual milestones and level mapping

| Levels | Proposed milestone appearance | Upgrade emphasis |
| --- | --- | --- |
| 1–4 | Level 1 compact timber command shelter, stone footing, one banner | Modest beginning, recognizable entrance |
| 5–9 | Level 5 braced hall, improved stone doorway | Reinforced timber and roof |
| 10–14 | Level 10 stone lower hall, paired lanterns | Durable civic silhouette |
| 15–19 | Level 15 upper hall and first lower wing | First tiered roof |
| 20–24 | Level 20 grand command hall with two lower wings | Current concept target |
| 25–29 | Level 25 restrained elite heraldry and reinforced trim | Material refinement without footprint growth |
| 30 | Level 30 master command hall | Finished roof and stonework; no extra bonus beyond table |

Every level in a range uses its preceding milestone silhouette. Intermediate levels add one cumulative small repair fitting per level after that milestone (maximum four); these remain an art plan, not existing generated assets. Keep entrance, ground anchor, scale and collision/access footprint stable across all milestones. Additional roof height must not block navigation or obscure hero readability. Milestones grant no separate stat multiplier, hero level, service or free blessing.

## Inspected art and camera references

These existing reference images were viewed before generation; they are not new Main Hall variants.

![Approved Barracks reference](https://arkodia.online/buildings/barracks/reference-barracks.png)

![Courtyard camera reference](https://arkodia.online/buildings/barracks/v2/reference-courtyard.webp)

![Existing painted Mine level 15](https://arkodia.online/buildings/mine/painted/level-15.png)

Match the courtyard's elevated orthographic diamond axes (approximately ±0.5 ground slopes), upright verticals, painted chunky masonry, timber proportions, iron fittings, snow edges and warm/cool light. The generated hall is a visual proposal, not a calibrated in-scene projection test.

## Sources and approval boundary

Read against Base Building, Stronghold Core, Barracks, Altar / Temple, Watchtower, Building Assets and Reference Comparison, Progression and Blessings, and Battle Mechanic on 28 October 2026. No existing page's bonuses have been overwritten.

[Base Building](/organizations/ORd5dd6f99b4308d6187031557/projects/PJ8758f22f61165f3d3215e454/knowledge/NKBD438e05262b74d5e6355f5119) · [Battle Mechanic](/organizations/ORd5dd6f99b4308d6187031557/projects/PJ8758f22f61165f3d3215e454/knowledge/NKBDea5d161f87627f236cead806) · [Progression and Blessings](/organizations/ORd5dd6f99b4308d6187031557/projects/PJ8758f22f61165f3d3215e454/knowledge/NKBD32edf8ad4d810576bd4f538c)

Human review is needed for silhouette/camera, then bonus budget and new Defense semantics. Approval of this design task does not authorize gameplay implementation. A later implementation task must validate saves, exactly-once rewards, derived stat recomputation, damage math and hero switching. This delivery publishes only art/document artifacts.

## Publication evidence

Design-only commit **a0103ec9** is pushed. Layer **1793167943047-main-hall-design-170956f3f0bb** was published under `arkodia-deploy.lock`, applied without restart or game binary changes. Public PNG and proposal were verified byte-for-byte using curl; Python urllib received HTTP 403. All 30 rows pass formula checks; Knowledge parent, ordering and content were checked after publication.

[Published concept](https://arkodia.online/design/main-hall/concept-v1.png) · [Published proposal](https://arkodia.online/design/main-hall/proposal.md)

## Imagegen revision v2 — pending review

![Main Hall v2 background-extraction attempt](/api/rooms/DR7f0a660e4dfc6ca5002753b3/attachments/DA46235685616435cfcaa1ba6d)

Generated with imagegen from concept v1, requesting transparent background extraction only. Posted inline in the originating environment room first (DM0da0a0f6e0987726495b427c). No GLB, 3D model or procedural render was used. Visual inspection still shows the studio backdrop/halo, so the extraction did not meet the requested cutout requirement. This revision is retained for review/provenance, not promoted as a production sprite. V1 remains the original concept; both await art/camera approval. The level 1–30 proposal and gameplay remain unchanged.