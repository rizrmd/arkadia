## Building Tree

Advanced fortress branches only:

- Stormshade (Rift Runner): Watchtower.
- Runeseekers (Amber Warden; persisted hero ID `ember-warden`): Runetower.

All controls and labels render in Pixi. Press B or use Building Tree. Portrait/landscape panels scroll without shrinking touch targets. Solo gameplay pauses while the panel is open.

## Construction and persistence

One fixed emplacement per character at court tile (12.5, 10.5). Cross-faction, unknown, duplicate, insufficient-resource and co-op requests fail before any mutation. Common buildings retain their existing economy rules.

The published Core-level gate is retained: completed Stronghold Core level 12 is required. The existing game has no Core upgrade interface; new and legacy bases default to Core level 1 and see a locked defense. The optional `strongholdCore.completedLevel` save field is the completed-level integration contract, validated as an integer from 1 to 30. This feature does not grant Core levels or introduce an upgrade system. Eligible fixtures are used to validate actual construction/combat. Do not bypass the gate in a player's save to demonstrate normal progression.

The initial level-1 construction recipe is 100 base Gold plus 25 carried Wood (Log). The transaction captures current gathering resources and acknowledges the live resource owner only after storage succeeds, preventing subsequent autosaves from refunding costs. Storage failures preserve resources. Existing economy/gameplay fields remain intact; the optional `careerDefenses` field and `arcane-tower` internal defense ID are retained for draft-save compatibility and are not displayed as product terminology.

Co-op construction is denied; the server has no authoritative fortress construction protocol. No client-only construction is sent to multiplayer. Core eligibility must be revalidated by a future server-side building implementation rather than trusting client saves.

## Defense behavior

Both initial defenses use 10 damage, 1.5-second interval and 12-tile range against the nearest living enemy in the existing solo foe registry. Runetower has a blue magic bolt; Watchtower has a warm shot. There is no hero damage scaling, critical chance or leech benefit. Kills use the existing enemy reward flow without activating hero leech. The saved gameplay state retains the attack cooldown.

This task does not add a separate Night Horde wave scheduler or new enemies. Existing enemies in range are targeted during day and night, with no faction or time exclusion. Proposed building-level upgrades, tower HP/resistance and Runetower's level-based magic defense are not implemented by this task.

The fixed footprint blocks movement but preserves the initial spawn and gate passage. Existing painted Watchtower and approved Runetower raster art are reused, without generation or geometry conversion.

## Verification

- `node scripts/building-tree/test.mjs`: mappings, action rejection, Core gate, atomic costs, old saves, unknown fields, common-building regression, target filtering, live gathering acknowledgement and failed writes.
- `npm run build`: TypeScript and Vite production build.
- `node scripts/building-tree/browser.mjs`: actual Pixi clicks for both factions, wrong-faction and duplicate menu actions, resource cost after autosave and reload, portrait/landscape scroll, day/night shots and kills, fixed-site collision and safe spawn, and starter Core lock.
- `BASE_URL=https://arkodia.online node scripts/building-tree/browser.mjs`: repeat against the deployed client in isolated browser storage.

Reports and screenshots are in this directory. The supported cumulative deployment stages them at `/building-tree/evidence/` and holds the existing Arkodia deployment lock. Production saves, environment revisions and released Main Hall/FX/editor functionality remain part of the cumulative release.
