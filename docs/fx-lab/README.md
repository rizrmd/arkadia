## FX Lab visual editor

Open https://arkodia.online/fx-lab/. The entire editor UI is Pixi, including the resizable right sidebar, skill dropdown, input keypad, full skill-tree diagrams and loading feedback. The rejected top information panel has been removed.

### Preview controls

- WASD / arrows move the actual 3D hero. Release, blur and modal input clear movement.
- Scroll or pinch over the stage zooms around the pointer/gesture. The sidebar can collapse on phones; drag its left edge to resize.
- Select Ember Warden or Rift Runner, skill or shared feedback, rank 1–5, and available phase. Selecting an implemented skill plays it immediately, including selection from the full tree. Cold assets display a loading overlay before playing.
- Preview the gameplay cast/projectile/telegraph/impact/detonate phases and authored aura/trail layers where available. Concept nodes and passives with no standalone VFX say so.
- Replay, pause/resume, loop, speed, timeline span/scrubbing and solo layer affect only the isolated preview.

### Visual authoring

The Visual editor tab browses the actual gameplay cue definitions and emitter layers. Scroll/swipe the inspector. Click a parameter and type with the keyboard or use the Pixi keypad; Enter commits, Escape cancels. Visual parameters include tint, opacity, size, count/rate, lifetime, speed/direction/spread/gravity, emitter offsets, layer start/duration, texture path, blend and flipbook grid/FPS. Authored sprite layers display only supported controls.

Size/spread/emitter placement are VISUAL. Damage areas, targeting, hitboxes, cooldowns, damage and progression remain authoritative gameplay values. `runtime/flame-fan` and `runtime/rift-dash` are shared adapters on the original gameplay renderers, not preview replacements. Basic attack, hit types, healing, level-up and combo feedback use the same shared cue catalog.

The FX bootstrap loads renderer/fonts/snow/selected hero/effects, without the HUD atlas, world/map, enemy roster, network session or player checkpoints. Hero dependencies warm on selection.

### Draft, Save and Apply

- Every committed change is an isolated local draft (`arkodia.fx-editor.draft.v1`) and immediately previews through the gameplay visual compiler. Undo/redo and Reset saved are available.
- Save explicitly writes the saved visual document. It does **not** publish it.
- Apply to Game explicitly publishes the saved revision. Save first if the draft is dirty. Existing game tabs receive a notification or poll within 15 seconds, preload changed textures, and use the applied settings on the next visual spawn.
- Save/Apply no longer require an editor access key. Production writes commit and push visual snapshots to the `fx-lab-visuals` data branch using the human member identity. A failed push leaves the draft unsaved for retry. Invalid values/assets, stale revisions, persistence errors and successful operations are shown in the sidebar.
- Backend storage is `GAME_SAVE_DIR/vfx/visuals.json`, separate from map and player checkpoint files. Optimistic revision checks prevent lost updates. The strict schema rejects combat fields.

### Shared source of truth

Authored NixieFX bundle → shared visual document → `compileVisualEffect` → existing Nixie renderer. Authored Flame Fan / Rift Dash sprites → the same visual document → shared sprite adapters in their original gameplay modules. The editor changes these visual documents rather than maintaining a second preview recipe.

### Verification

`node scripts/fx-lab/verify-interactions.mjs` exercises real mouse/keyboard/touch: movement, blur, wheel, resize, dropdown, cold loading, tree selection and pinch. `node scripts/fx-lab/verify-editor.mjs` exercises parameters, undo/redo, reload, isolation, speed, scrubbing, Save versus Apply, an already-running actual game, player-save preservation, visual parity and restoration of test settings. Set BASE_URL and OUT_DIR for production verification. Use `scripts/fx-lab/verify-keyless-save.mjs` for the current desktop/mobile Save workflow.

TypeScript and all Go tests pass, including API authorization, forbidden combat fields, range/asset validation, revision conflicts, explicit publication and persistence across store reopen.

## Spritesheet import

Open **Visual editor → Import Spritesheet with Codex**. Upload through the native file picker or paste an image from the clipboard. Pixel projection analysis estimates repeated grid regions, margins and gutters; ambiguous/static images remain one frame. Review frame outlines, animation, slicing/order/group confidence and estimated playback defaults. Correct the grid or individual rectangle, frame order (one-based numbers), FPS, pivot, groups and loop using Pixi controls. The import draft includes the image and survives reload when browser storage permits.

**Save asset** persists the original PNG, a packed playback atlas and metadata in `GAME_SAVE_DIR/vfx/assets`. It does not save or apply VFX overrides. **Use asset** changes the selected layer's local visual draft; normal **Save** then **Apply to Game** remain explicit. Saved assets can be selected again from the importer catalog. Single images do not generate additional frames.

**Analyze with Codex** sends the original image and pixel evidence to a server-side Codex model through the Responses API. Configure server `OPENAI_API_KEY` and optionally `VFX_CODEX_MODEL` (default `gpt-5.3-codex`). No account/session credentials are copied into the app. Without that connection the editor reports that Codex is unavailable and retains the pixel draft; it does not label pixel analysis as AI analysis. Real provider analysis remains pending until credentials are configured.

Verification: `node scripts/fx-lab/verify-spritesheet-analysis.mjs`, `node scripts/fx-lab/verify-importer.mjs`; durable metadata/path validation tests in `server/internal/vfx/assets_test.go`. The browser checks actual clipboard import, Pixi keyboard correction, asset/visual isolation, draft restoration and mobile touch scrolling/close. The production provider success path cannot be verified without its configured connection.

### Visual Git snapshots

The deployed gateway sets `VFX_GIT_DIR=$HOME/fx-visuals`. Provision this dedicated data repository with `node scripts/fx-lab/provision-git.mjs` before deploying. Credentials stay server-side outside source and release archives. Save and Apply each commit `visuals.json` and push to `fx-lab-visuals`; source branches and player saves are excluded. The UI reports the pushed commit. Revision checks still reject stale edits. Save remains separate from Apply to Game. Imported textures stay in persistent `GAME_SAVE_DIR/vfx/assets`; the data branch contains visual definitions, not texture binaries. Local development without `VFX_GIT_DIR` uses file persistence.
