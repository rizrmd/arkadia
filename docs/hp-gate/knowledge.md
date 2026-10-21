[Play the Stronghold](https://arkadia-stronghold-whachat.fural.space/). Updated and verified on the public site on 21 October 2026, commit `ce56e31`, branch `feat/stronghold`.

## New game: a lone tent

A new game starts as a camp. Only the expedition tent stands, in the centre of the court (tile 7.5, 7.5). The walls and gateway stay. The hero starts just in front of the tent.

- The forge, barracks, altar, mage tower and mine are hidden. So are the supply cart, crate, barrel and brazier.
- The save now has a `built` list (`src/stronghold/economy.ts`). A new game holds `expedition` and `gate`. A save made before this field also starts as the camp. A building comes back once it is added to `built`. There is no build menu yet.
- QA: `?buildings=all` shows the old layout, with every building and prop in its original slot.

![New game: only the tent in the centre of the court](https://arkadia-stronghold-whachat.fural.space/encounters/1-tent-only-start.webp)

## Hero health and auto attack

- **Health bar:** the generated brass-frame meter (top left) shows `Health 100 / 100`, the zone (without distance) and the number of revenants defeated. A small bar also floats over the hero's head. It shows once the hero is hurt or out in the wilds. It turns red below 30%.
- **Hit points:** 100, plus the Stronghold bonuses the arena and Frostpass already use (Warden, training, skills, weapon).
- **Auto attack:** stop moving next to a revenant and the hero swings at it. If one is within 2 tiles (6 m), the hero first steps in. Holding a direction always wins, so you can run away.
- **Defeat:** the hero falls, then returns to the tent at full health after 3.5 s.
- **Shared rules:** the fight uses the arena's rules, now in `src/characters/combat.ts`: `Fighter`, reach, swing targets (cleave 3) and facing. The arena and Frostpass use the same code. Hit points (hero 100, revenant 2), damage (1 and 4), hit stun and swing timing are the same. Reach is scaled to the Stronghold's smaller figures (0.48 instead of 1.1).

![Auto attack: the hero swings at a revenant; the wounded revenant shows its own bar](https://arkadia-stronghold-whachat.fural.space/encounters/2-auto-attack.webp)

![Out in the wilds: the hero lost health and the bar over its head shows it](https://arkadia-stronghold-whachat.fural.space/encounters/3-health-bar.webp)

## Gate encounters

One ground tile is 3 meters. Every revenant, including each pack member and respawn, appears exactly **10 ground meters from the gate threshold**, in the outward-facing 120-degree arc on walkable snow. The gate is at world (577, 790), ground tile (14.84375, 14.84375). The hero's position does not move the spawn origin.

Up to 8 revenants appear in packs of 1–3, one pack every 2 seconds. They chase within 39 meters and move at 55% of hero speed. The courtyard side of the gateway is safe: monsters cannot enter it, attacks stop there, and the hero heals 8 HP per second. The old 100-meter radius around the tent has been removed. The HUD shows only **Safe zone**, **Wilds · revenants roam**, or defeat status; it has no distance indicator.

## Generated health frame

Created with the built-in imagegen tool on a transparent background. The original image is preserved in the repository and displayed inline below. Transparent outer padding is trimmed for the runtime WebP. CSS uses the actual 2166:212 aspect ratio at every viewport size, keeping the brass frame proportional. Health fill remains dynamic and turns red below 30%; health numbers remain live text.

![Original imagegen health frame](https://arkadia-stronghold-whachat.fural.space/hp-gate/health-frame-source.png)

![320-pixel mobile health HUD](https://arkadia-stronghold-whachat.fural.space/hp-gate/320.png)

![390-pixel mobile health HUD](https://arkadia-stronghold-whachat.fural.space/hp-gate/390.png)

![Wounded hero and dynamic health fill](https://arkadia-stronghold-whachat.fural.space/hp-gate/wounded.png)

## Verification

Both the isolated committed build and the public site passed the browser acceptance suite. The build passed npm run build. Public verification ran scripts/verify-hp-gate.mjs with DEMO_URL and checked:

- 20,000 spawn samples exactly 10 meters from the gate, outside the court, plus rejection of unwalkable ground.
- 320, 390, and 1440-pixel viewports: native artwork proportions, no overlap with the clock, English HUD, and no distance text.
- Automatic attacks and kills, damage reducing the health fill, healing inside the safe court, and monsters remaining outside it.
- No browser page errors.

The old scripts/verify-encounters.mjs entry point invokes the current gate-based acceptance suite. Public verification results: [live-results.json](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fhp-gate%2Flive-results.json).

[Artwork source, generation prompt, behavior and publishing notes](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=docs%2Fhp-gate%2FREADME.md). Published through the managed Stronghold sandbox with scripts/publish-hp-gate.mjs; only committed release files were used.
