## Wood, Food and wildlife — shipped integration

Task #BHWDOG is implemented and deployed at [Arkodia](https://arkodia.online/), with **Fatan** retaining task ownership. Gameplay release `65dd7c4a` includes the current resource implementation. The earlier “not implemented” and Knowledge-only authorization notes on this page are retained as history and superseded by this release record.

### Gathering rules in the game

- Wood and Food are separate carried, per-player resources in the existing Stronghold save, shared by both heroes. Gold kill rewards remain unchanged. Food has a meat icon; Wood has a log icon. All resource counters, tool inventory, progress text and loot are English **Pixi** UI.
- The starter **Axe** is added once to new saves and legacy inventories that lack its field. An explicit zero remains zero. It is a permanent tool: no equip/durability action or consumable Use is required.
- A living, stationary hero automatically starts chopping within **5 feet / 1.524 ground meters**, using the existing 3 meters per tile conversion. **No tree tap is required.** Movement, leaving range, hit stun or nearby combat cancels partial progress without awarding Wood.

| Tree reference / scene family | Wood | Chopping | Respawn after completion |
| --- | ---: | ---: | ---: |
| Image 1 / dead snag | 10 | 2 seconds | 1 game day |
| Image 2 / snowy pine variants | 100 | 10 seconds | 5 game days |
| Image 3 / dead tree | 30 | 3 seconds | 3 game days |

The 10-second pine time uses the existing provisional Image 2 association in the specification above; the underlying reference ambiguity has not been rewritten as a new human confirmation. On harvest the tree disappears from rendering, collision, occlusion and the depth-shadow scene. Respawn samples a valid position no farther than **20m from its fixed original anchor**. Invalid positions retry; repeated cycles do not drift. Original scenery and published editor tree placements have stable instance identities.

### Hunting implementation decisions

Earlier Knowledge left hunting mechanics open. This first integration uses the **existing automatic hero melee swing**: a reachable animal becomes meat loot on a successful impact frame, without adding unapproved wildlife HP, damage, XP or Gold balance tables. No Axe requirement is added to hunting. Wildlife does not retaliate; its approved motion studies animate in place.

| Species | Food per collected animal | Spawn cooldown after hunt |
| --- | ---: | ---: |
| Deer | 100 | 1 game day |
| Crocodile | 500 | 3 game days |

Each world revision has one stable slot per species, initialized on first entry. Crocodiles prefer valid wild ground near an authored pond, with valid gate-area wild ground as fallback. Damage alone grants no Food: approach meat loot within 5 feet to collect. A slot cannot respawn while its loot is uncollected. After collection it waits for its saved hunt deadline; missed days do not accumulate a backlog of animals. Repeated impacts, collection, reload or hero switching cannot replay the same reward.

The actual gameplay day is **10 minutes of simulation**, using `DAY_MS` and the game's pause behavior. Its persisted resource clock also drives the live visible clock. Offline time, system-time changes, pinned lighting and reloads do not advance gathering. Depletion, loot state, deadlines and resource awards save atomically through the existing gameplay/economy ownership lock and revision guard. A failed write rolls back the resource/object changes, retains the original save and stops gathering. Reset Progression clears these states with the existing save.

Food eating/hunger balance and building storage transfers are outside this task's implementation. Their existing Knowledge specifications remain intact; no unconfirmed consumption amounts, hunger rates or passive production were added. Gathered resources remain carried where no functional storage building exists.

### Approved 3D animation integration

The model and articulated clip sources from #XXFOP, branch `feat/wildlife-motion-previews`, commit `3e2e8b3f`, are preserved under `src/stronghold/wildlife`. Deer walk/run and crocodile crawl/swim are baked into a **64-frame transparent atlas** used by Pixi. Runtime mesh rendering was tested and replaced because it slowed the game simulation in software WebGL. These are frames rendered from the approved 3D models, not new animal designs; continuous runtime 3D mesh rendering and animal roaming are not claimed. The original interactive motion player and inline GIF references above remain available.

### Verification and deployment evidence

- Production TypeScript/Vite build and all Go server tests passed. Existing economy, inventory transaction and gameplay-save regression suites passed.
- Eight gathering behavior scenarios passed, including duplicate rewards, fixed-anchor respawn, invalid/overflow save rejection and simulation-clock persistence.
- The real Pixi controller browser harness passed all three chopping durations, missing Axe, range/interruption, both species' exactly-once loot, reload, a full simulated day, three viewport layouts and injected storage-quota rollback. It uses controlled simulation steps with the real existing gameplay save adapter.
- The full local **and live game** passed real scene/collision/save integration, controller harvesting with controlled simulation steps, reload without repeated Wood, and genuine automatic melee hunting of a deer without calling the impact helper. Screenshots cover desktop, portrait and landscape; there were zero page errors. Software Chromium used the existing `3d=0&shadowField=0` fallbacks. Physical-device FPS is not claimed.
- Live `/healthz` reports build `65dd7c4a18278245327575c2d8e73083024cd718`. **46 served files/routes** were checked; client bundles, Axe and wildlife atlas match release SHA-256 hashes. Environment Editor and FX Lab remain available.
- This is an actual client/server deployment through the repository-supported cumulative publisher and shared deploy lock, not push-only. The first apply found a stale gateway after an existing production OOM. Incident/boot logs were inspected; serialization of PNG conversion, an 8-megapixel conversion ceiling with original-PNG fallback, and a 256 MiB Go soft-memory target were added before recovery. Existing production artwork, map revisions and `GAME_SAVE_DIR` were preserved.

[Live release hash proof](https://arkodia.online/gathering-verification/live-release.json) · [Live gameplay smoke](https://arkodia.online/gathering-verification/live-smoke.json) · [Controller behavior proof](https://arkodia.online/gathering-verification/controller-results.json) · [Implementation and reproduction guide](https://arkodia.online/gathering-verification/README.md)

### Final live game captures

![Live game landscape — English Pixi Wood/Food counters below the left console](https://arkodia.online/gathering-verification/live-game-landscape.png)

![Live game portrait — Food meat loot after genuine automatic melee hunting](https://arkodia.online/gathering-verification/live-game-portrait.png)

![Live game desktop — integrated resource HUD and hunting scene](https://arkodia.online/gathering-verification/live-game-desktop.png)

### Controlled browser captures

These show the actual Pixi resource controller and approved model-derived animation atlas in an isolated test scene, not the full world. The sample 140 Wood / 600 Food comes from verifying all three tree profiles and both species. The Axe is deliberately absent while advancing a simulated day.

![Desktop Pixi controller — test balances and approved deer animation](https://arkodia.online/gathering-verification/controller-desktop.png)

![Portrait Pixi controller — responsive resource counters](https://arkodia.online/gathering-verification/controller-portrait.png)

![Landscape Pixi controller — resource and animation layout](https://arkodia.online/gathering-verification/controller-landscape.png)

### Superseded layout diagnostics

These pre-release captures were inspected during debugging and exposed resource counters overlapping the bag/settings area. The final live captures above show the corrected left-side placement. They are retained inline because they appeared during the implementation conversation.

![Superseded local landscape — resource overlap discovered before the final HUD correction](https://arkodia.online/gathering-verification/local-game-landscape.png)

![Superseded local portrait — resource overlap discovered before the final HUD correction](https://arkodia.online/gathering-verification/local-game-portrait.png)
