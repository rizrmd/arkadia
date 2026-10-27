## Resource gathering release

Wood and Food live in the existing `arkodia-stronghold-v1` envelope as `resources`. `gathering` stores a shared, monotonic simulation day, stable tree identities/cycles and animal/loot deadlines. Both heroes share the per-player resource balances and depletion state. Gold's existing kill rewards are unchanged. This remains the existing solo/browser save ownership model.

### Agreed rules

| Scene asset / reference | Wood | Required time | Respawn from harvest |
| --- | ---: | ---: | ---: |
| Dead snag / Image 1 | 10 | 2 seconds | 1 game day |
| Snowy pine variants / Image 2 | 100 | 10 seconds | 5 game days |
| Dead tree / Image 3 | 30 | 3 seconds | 3 game days |

The 10-second pine duration follows the provisionally associated Image 2 value in published Knowledge; it is not a newly invented balance value. A day uses the real gameplay `DAY_MS` (10 minutes of simulation), including the existing pause behavior. System time, offline time, pinned lighting and reloads do not advance gathering. The visible live clock follows the same gathering simulation clock; pinned lighting remains cosmetic.

An Axe is allocated once to new/legacy inventories that lack the tool field. Explicit zero remains zero. It is permanent, has no durability/equip action, and cannot be consumed with Use. Automatic chopping starts without a click when a stationary, living hero is within 1.524 ground meters (5 feet), measured using the existing 3 meters per tile conversion. Leaving range, movement, incoming hit stun or nearby combat cancels partial chopping; no reward is given. Chopping uses the existing hero attack pose. On completion, Wood and the depleted tree/deadline save together. Tree visuals, collision, occlusion and depth-shadow scene update. Respawn chooses a valid position within 20m of the fixed original anchor; invalid positions retry later, without drift or reward. Original and editor-authored tree instances have stable identities; authored ground remains intact.

### Hunting decisions where earlier Knowledge had no rule

One stable deer slot and one crocodile slot are initialized per world revision; existing saves retain their slots. Deer yields 100 Food and reappears after 1 game day; crocodile yields 500 Food and reappears after 3 game days. The deadline begins at the successful hunt. Crocodiles prefer a valid position near an authored pond; otherwise both species use collision-checked wild ground near the gate.

The existing hero automatic melee swing hunts a reachable animal on its impact frame. No Axe requirement is added to hunting, and no unapproved HP/damage/XP/Gold table is introduced for wildlife: a successful melee hit creates meat loot. Wildlife is a non-retaliating target in this first integration. Loot must be approached within 5 feet to collect. Damage alone grants no Food. A slot cannot respawn while its loot is uncollected. Once collected, it waits for its saved deadline; missed days never accumulate multiple animals or rewards. Repeated impacts, collection, reload and hero switches cannot replay the same reward. Animals animate in place, matching the approved motion-study scope; roaming/flight/attacks are not claimed.

The approved #XXFOP model and articulated animation source from `3e2e8b3f` is preserved under `src/stronghold/wildlife`. All four clips (deer walk/run; crocodile crawl/swim) are baked into 64 transparent frames for the Pixi world with `node scripts/gathering/bake-wildlife.mjs`. Runtime mesh rendering was tested and replaced because software WebGL made the game simulation too slow. This is a rendered animation atlas from the actual approved 3D models, not a new animal illustration or a claim of full runtime 3D meshes. The atlas is 253KB. The generated atlas and source remain reproducible.

### UI and save safety

English Pixi resource counters use separate log and meat icons. The HUD sits beneath the upper-left console, with room reserved for the existing bag/settings controls. The same meat symbol labels loot. The inventory contains the Axe alongside existing consumables; keyboard traversal includes all three item slots. No HTML/React gameplay controls are added.

Resource and depletion/loot mutations commit through the existing gameplay/economy ownership lock and atomic envelope write. The gameplay revision acknowledgement occurs only after a successful write. Injected storage failure rolls back totals and object state, retains the original save, stops gathering and activates the existing gameplay save-error guard. Explicit Reset Progression clears gathering together with the existing save.

Stored Wood/Food are initialized independently for compatibility with the resource catalog, but building storage transfer/upgrades and Food eating/hunger are not implemented by this task. Hunger cost/restoration/depletion balancing remains unconfirmed in Knowledge; no substitute values or passive production are added.

### Verification

- `node scripts/gathering/test.mjs`: 8 behavior scenarios covering migration, yields, duplicate rewards, fixed-anchor respawns, deadlines, simulation time, blocked respawn and invalid/overflow saves.
- `node scripts/gathering/component.mjs`: actual Pixi controller in a controlled browser harness, existing gameplay save adapter, all chopping durations, missing Axe, range/interruption, both species' loot, exactly-once collection/reload, one full simulated day, three viewport captures and injected quota rollback. Controlled stepping avoids conflating software-GPU frame throughput with simulation duration.
- `node scripts/gathering/smoke.mjs`: full real game scene/collision/save integration, controller harvest with controlled simulation stepping, reload, and genuine existing automatic melee hunting without invoking the controller impact helper. Desktop, portrait and landscape captures; no page errors. Uses existing `3d=0&shadowField=0` fallbacks on software Chromium; physical-device FPS is not claimed.
- Existing economy, inventory transaction and full gameplay-save suites; TypeScript/Vite production build and Go tests through the release script.

Initial full-game wall-time duration checks exposed software rendering delays and were replaced by deterministic simulation checks plus the genuine-melee smoke. Test receipts identify this scope explicitly.

### Shipping

`scripts/gathering/deploy.sh` uses the repository's supported cumulative release publisher with the shared `arkodia-deploy.lock`, client/server build, editor staging, resource art, evidence and a hash manifest. Existing production assets and server save directories remain in place. The publisher rejects a release that lacks the latest applied gameplay ancestor. Real deployment evidence is recorded in `deployment.json` and `live-release.json`; a push alone is not treated as deployment.

### Production recovery

The first release registered successfully but could not apply: production's boot workload had already been OOM-killed, leaving a stale gateway socket. Incident and boot logs were inspected before any restart. PNG-to-WebP encodes previously ran concurrently across unrelated image paths; native encoders retain multiple full-resolution buffers. The release now serializes these conversions, serves originals for images above 8 megapixels, and gives the Go child a 256 MiB soft memory target and two runtime workers. These are delivery safeguards; original art and game saves are preserved.


## Superseding wildlife visuals
The model-baked atlas described above is retired by task #GYECL. Production now loads imagegen PNG sheets; see `docs/wildlife-sprites/README.md`. Historical standalone motion previews remain archived. Gameplay rules and persistence are unchanged.
