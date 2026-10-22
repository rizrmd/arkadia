## Implemented combat progression

Outdoor Stronghold combat now grants the killer 10 XP and 5 run gold per revenant. Level 1 needs 20 XP; each subsequent level needs 10 more XP. There is no level cap. Overflow XP is retained, and every earned level queues one choice from three distinct randomized cards. No card costs gold. Solo rolls locally; co-op rewards, offers and card effects are authoritative on the Go server. Selecting another hero does not change this run build.

| Card | First pick and repeated ranks |
| --- | --- |
| Titan Strike | +0.5 attack damage per rank |
| Arc Nova | Unlock a reach passive; +20% base attack reach per rank |
| Soul Feast | Heal 2 health per rank per kill |
| Ascendant Star | +0.25 attack damage and +10 maximum/current health |
| Vitality | +20 maximum/current health per rank |
| Second Wind | Heal 35% maximum health, capped at maximum |

The hero stops auto attacking and is immune to damage while choices are pending. Other party members and enemies continue playing. Three cards fit desktop and 390 px mobile layouts; buttons support keyboard focus. The HUD shows level, XP, run gold and stars. Run progression lasts for the current offline visit or connected co-op player; it survives death and safe-zone visits, but resets on reload/rejoin or switching between offline and online. Run gold is separate from the Stronghold economy and currently has no spending or bank transfer. This is a progression foundation, not the complete Hades moveset: dash/cast controls and active skill VFX remain future work.

## Skill tree plan

The implemented cards are the first tier of three planned branches. Ranks are uncapped in this foundation; the following unlock gates and evolutions are a proposed next iteration, not shipped behavior.

| Branch | Tier 1 (implemented) | Tier 2 (planned prerequisite) | Tier 3 evolution (planned) |
| --- | --- | --- | --- |
| War | Titan Strike | Cleaving Rush after Strike rank 3: dash ends in a frontal cleave | Executioner after Rush rank 2 + 2 stars: bonus damage below 25% enemy health |
| Rift | Arc Nova | Chain Spark after Nova rank 3: attack chains to one extra target | Storm Circuit after Spark rank 2 + 2 stars: three-target arc with an internal cooldown |
| Soul | Soul Feast / Vitality | Blood Ward after Feast rank 3: overheal forms a capped temporary shield | Phoenix Heart after Ward rank 2 + 2 stars: one revive per run |

Stars currently grant immediate stats. In the planned tree they also gate evolutions; they are earned through cards, not paid purchases. First unlocks should be marked New Skill; owned skills should show current → next rank and exact effect before selection. Duplicate IDs are excluded within each offer. Future prerequisite filtering must keep at least three valid choices using heal, vitality and gold fallback cards.

## Skill combinations

Current combinations already stack mechanically:

- Titan Strike + Arc Nova: stronger attacks over a wider area, up to the existing three-target cleave limit.
- Arc Nova + Soul Feast: reach more targets and recover health from each confirmed kill.
- Vitality + Second Wind: larger maximum health increases the absolute healing from Second Wind.
- Ascendant Star + Titan Strike + Soul Feast: damage and health growth with kill sustain.

Proposed named duo evolutions should require both skills at rank 3 and one star, appear as an optional level-up offer, and never silently replace existing skills: **Thunder Cleave** (Strike + Spark, chained cleave), **Siphon Field** (Nova + Feast, controlled area drain), and **Crimson Aegis** (Vitality + Ward, shield from healing). Give each duo an explicit cooldown and budget so area damage and healing cannot recursively trigger themselves. Co-op kill rewards currently go to the final hitter; shared XP and support credit need a separate balance decision.

## Verification

`npm run build`, `node scripts/test-progression.mjs`, and Go `go test ./...` pass. New Go tests cover reward thresholds, duplicate-free offers, rejection of invalid/stale choices, XP overflow and upgrade effects. `node scripts/verify-progression.mjs` uses real combat against summoned enemies and checks rewards, three cards, protection while selecting, mobile overflow, selection consumption and page errors. Screenshots are test fixtures, not natural encounter difficulty evidence.
