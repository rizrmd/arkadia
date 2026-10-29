## Centered Stronghold Core

Uses the published imagegen Stronghold Core artwork, never the Main Hall image. The court midpoint is tile (7.5, 7.5), world (577, 320). The artwork's registered front foundation tip is placed at (577, 384), width 320 and anchor (0.5, 1300/1440), putting its reserved 6 × 6 metre ground diamond exactly around the midpoint. Collision is authored from that reservation and stays constant at every level; roof/snow alpha fringes do not affect navigation.

The saved `strongholdCore.completedLevel` selects the existing 30-level composition manifest, including intermediate repair decals. A missing Core record displays level 1. This visual does not grant levels, bonuses or upgrade gameplay. The historical `expedition` slot, building level and actions remain compatible. Core level 12 faction defense gates and existing defenses remain unchanged. Main Hall is a future advanced building for high-level players, with no decided unlock threshold and no starter construction entry.

The Pixi environment editor uses the same starter art, pivot and scale. No published/draft map or gameplay save is bundled. The deployment builds the cumulative game and editor and takes the shared `arkodia-deploy.lock`; the publisher preserves the durable `GAME_SAVE_DIR` and existing release layers.

Validation: `scripts/core-center-verify.mjs` checks fresh and legacy saves, real keyboard movement, clear spawn-to-gateway approach, retained Core level/defense/resources and no page errors against the production map snapshot. TypeScript, Vite, Building Tree rules and all Go server tests pass. Only the old Hall's 82 navigation columns are replaced by 85 authored Core columns; all other embedded navigation columns remain unchanged.
