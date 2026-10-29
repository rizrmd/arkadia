## Stronghold Core floating upgrade panel

The proximity hammer and floating details panel render entirely in Pixi with the existing MSDF fonts. The panel follows the Core screen anchor, clamps inside the viewport, closes outside interaction range or on Escape, and hides during co-op. Completed level 30 shows the maximum-level state. The existing campfire, saved IDs, collision, economy, and higher-tier artwork remain unchanged.

The panel displays the published Stronghold Core recipe calculated directly from the baseline: target level T costs ceil(300 × 1.25^(T−1)) Gold, ceil(150 × 1.25^(T−1)) Wood and ceil(5 × 1.20^(T−1)) real minutes. Level 1 → 2 is 375 Gold, 188 Wood and 6 minutes.

This release implements the requested interaction and information. **Upgrade unavailable** is explicit: the released game has no authoritative Core upgrade transaction, shared construction queue or persistent build timer. Requirements are displayed as requirements, without fabricated checkmarks or resource deductions. Adding those mechanics is outside this visual/interaction task.

## Design provenance

Built-in imagegen, ui-mockup; input: discussion attachment DAaa291c20667fc022a48d75f5. Output: `/core-upgrade/design.png`; attachment DA9c0546875a0cd3160d6216ef in base building room DR2d49ace0025f66084af0c78a, also inline in Stronghold Core Knowledge.

Prompt: Generate a polished readable single snowy isometric fantasy scene: one small stone-ring campfire as level-1 Core, nearby hooded player, circular gold proximity hammer, compact charcoal floating panel with gold border and downward anchor. Exact English text: STRONGHOLD CORE; Level 1 → Level 2; REQUIREMENTS; Core Level 1; Owned solo base; Build queue idle; Storage capacity; RESOURCE COST; Gold 375; Wood 188; UPGRADE TIME; 6 min; UPGRADE. Native Pixi implementation reference; no additional buildings or mechanics.

The generated image is a concept, not an in-game screenshot. Actual isolated Pixi screenshots are `pixi-desktop.png` and `pixi-mobile.png`. The prior animated-fire preview request is still unverified; no flame animation is claimed or modified here.

## Validation

TypeScript, published level 2–30 recipe arithmetic, proximity bounds, level-30 state, existing fresh/legacy save and exact higher-tier mapping regressions pass. Isolated Chromium tests exercise actual Pixi pointer taps, Escape, range exit, co-op hiding and mobile bounds without loading the full world.

A bounded 60-second full-world Chromium attempt still stopped at 97%, Preparing visibility · 1/3 ready, without page errors. This is an incomplete gameplay acceptance check, not a successful full-world movement test. Independent Pixi validation avoids an indefinite browser blocker. Previous campfire release evidence remains under `/core-campfire/`.

## Reference-matched bitmap composition

The 13-component imagegen kit is in `public/core-upgrade/kit/`: originals, runtime PNGs, source reference, contact sheet, manifest and generation prompt specifications. Each component used the actual approved reference. Pixi loads these sprites before displaying the interaction; dynamic text remains English MSDF typography. The original campfire continues as the one world Core. No economy, save, map, completed-level or higher artwork mapping changes.

The isolated browser fixture installs the same MSDF effects as gameplay and waits for bitmap loading. Checks cover real pointer tap, Escape, range exit, co-op suppression, mobile bounds and maximum level. This fixture is test-only and adds no production editor or player route. Full-world production browser validation remains limited by the previously bounded visibility preparation timeout; release hashes and isolated runtime rendering provide independent evidence.

Production bitmap release: `8d967e4d03375e51bfa492c45852017a7cf8f7ee`. The deployment terminal reached its 200-second limit after registering the layer; independent `/healthz`, release receipt and SHA-256 checks confirm application. All 70 cumulative files matched, including all 32 kit deliverables. Production evidence is in `production.json`. No full-world production screenshot is claimed.

## Corrected requirement presentation

Core uses the separately generated `kit-v2` PNG components. Requirements contains only `Core level N` for a completed level N. Gold/Wood costs and duration remain separate. The replacement image and contact sheet are inline in Stronghold Core Knowledge, with stale interaction images removed and read-back verified. Original shared kit paths are retained for peer building modules. The completed kit now includes seven separately generated tier portraits selected by the existing milestone mapping. All 29 transitions have native Pixi captures and exact rendered requirement/cost/duration assertions in `public/core-upgrade/kit-v2/transitions.json`. Shared frame, resources and button states are reused; no world visual, repair plate or economy mapping is modified.

## Approved layout and interaction ownership

The reference supplied as DAfcede280bf1345039fb1387f remains visual authority; DA01fb1bea162e06ff469ca4cf is labeled issue evidence in Knowledge. Core now uses a 540×478 layout and 458-high supplied bitmap frame, icon/glyph-center alignment for cost and duration rows, and clear button gaps above/below. No new raster artwork was required for this spacing correction.

`building-interactions.ts` registers each real building module by UI stage, hides and disables every external badge while a panel opens, and restores appropriate badges on close, Escape, leaving range, co-op transition and destruction. The integrated native Pixi fixture imports Core, Farm, Lumber Mill and Kitchen and tests actual pointer events, unavailable badges, close paths, mobile clamping and all 29 Core transitions. It adds no production tool route. Recipes, gates, preview controls, saves and world artwork remain unchanged.

A bounded full-world initialization attempt stopped at Drawing the world · 0/83 (95%) after 60 seconds with no page errors. See `world-browser.json`; it is not a full-world visual pass. The real four-module integration and screenshot checks pass independently.
