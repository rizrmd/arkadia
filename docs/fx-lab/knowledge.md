## Unified preview

[Open FX Lab](https://arkodia.online/fx-lab/). This is the sole VFX preview entry point. Legacy Skill Player, Flame Fan/Burst, Rift Bolt/Dash and Houdini Flame Fan pages redirect here; gameplay asset URLs remain valid.

The Pixi interface uses production 3D Ember Warden/Rift Runner rendering, production combat VFX, and the original skill-tree diagram. Inspect all 15 nodes per hero; preview each hero’s five implemented active skills at ranks 1–5, in eight directions, idle/run, day/night, with replay, loop, pause and zoom. Planned ultimate/evolution nodes are explicitly labelled; passives show their gameplay descriptions. Preview progression is isolated from player saves.

Snow uses the same asset and shared material function as gameplay: snow-soft-texture.png, .7 density and the 2:1 isometric projection. There is no substitute background texture.

## Verification

Desktop 1440×900 and mobile 390×844: all 30 nodes, both full trees, all eight directions, ranks 1/3/5, no HTML controls, no JavaScript errors. Legacy redirects and gateway release lifecycle are verified. The loading-render fixture supplies a deterministic published map and passes without early world draws.

[Source](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=src%2Ffx%2Flab.ts)

## Screenshots

![ember warden desktop](https://arkodia.online/fx-lab/evidence/ember-warden-desktop.png)

![rift runner desktop](https://arkodia.online/fx-lab/evidence/rift-runner-desktop.png)

![ember warden tree](https://arkodia.online/fx-lab/evidence/ember-warden-tree.png)

![rift runner tree](https://arkodia.online/fx-lab/evidence/rift-runner-tree.png)

![mobile](https://arkodia.online/fx-lab/evidence/mobile.png)

![mobile tree](https://arkodia.online/fx-lab/evidence/mobile-tree.png)

## Shared visual editor

The right sidebar is resizable and contains the skill dropdown and full tree. WASD moves the 3D hero; wheel and two-finger pinch zoom the snowy gameplay stage. Selecting an implemented active skill immediately plays it, including after a visible cold-load preparation step. Planned nodes and passives retain honest status messages.

FX Lab starts a dedicated renderer/font runtime. It does not load the game HUD atlas, request the world/map API, spawn enemies or initialize player progression.

The visual editor modifies the definitions used by gameplay. Select a hero, skill, rank, phase and emitter; edit tint, opacity, visual size, particle count/rate/lifetime/motion, emitter offsets, timing, texture/flipbook and blend mode. Preview uses the gameplay renderer, including the authored Flame Fan and Rift Dash adapters. Play/pause, replay, loop, speed, timeline scrubbing and solo layer are preview controls.

Local draft, undo/redo and Reset saved are separate from **Save** and **Apply to Game**. Save persists an authenticated visual document; Apply publishes the saved revision. Existing game tabs refresh applied textures before adopting the new revision. Storage is under `GAME_SAVE_DIR/vfx`; combat definitions and player save files are unchanged. Visual area labels explicitly distinguish appearance from damage area.

## Import Spritesheet with Codex

Upload through the native image picker or paste an image. Pixel analysis estimates repeated occupied regions, grid, margins and gutters. Review frame outlines, animated playback and separate slicing/order/group confidence. Correct the grid, individual frame rectangle, frame order, FPS, pivot, loop and groups through Pixi controls. Uncertain defaults remain estimates. A static image imports as one full-image frame; no new frames are generated.

Save asset stores the original PNG, a packed atlas and metadata. Use asset changes the selected layer's draft; it does not implicitly Save or Apply the effect. Imported assets are available in the saved asset catalog. Import drafts retain image and metadata after reload when browser storage permits. The fixed importer header remains accessible during mobile scrolling.

**Codex connection status:** the server adapter is implemented, but live provider analysis requires server `OPENAI_API_KEY` (optionally `VFX_CODEX_MODEL`, default `gpt-5.3-codex`). No account credentials are copied into production. If unavailable, Analyze with Codex explicitly reports the missing connection and preserves pixel evidence. Real Codex provider success is pending configuration; pixel-only results are never labelled Codex analysis.

## Editor verification evidence

Local browser tests passed real clipboard image paste, Pixi keyboard edits, persistent drafts, explicit Save/Apply separation, live texture/color/opacity refresh in an already-running game, and unchanged player-save/progression data. Actual mouse/WASD/wheel and CDP two-finger touch tests passed. Pixel tests cover grid/margins/gutters and one-frame static fallback; Go tests cover durable asset metadata, bounds and path validation.

![Resizable sidebar and desktop controls](https://arkodia.online/fx-lab/evidence/interaction/desktop.png)

![Visible loading before immediate playback](https://arkodia.online/fx-lab/evidence/interaction/loading.png)

![Mobile gameplay stage](https://arkodia.online/fx-lab/evidence/interaction/mobile-stage.png)

![Mobile sidebar](https://arkodia.online/fx-lab/evidence/interaction/mobile-sidebar.png)

![Visual editor](https://arkodia.online/fx-lab/evidence/editor/editor-desktop.png)

![Actual gameplay renderer parity](https://arkodia.online/fx-lab/evidence/editor/gameplay-parity.png)

![Independent Flame Fan visual layers](https://arkodia.online/fx-lab/evidence/editor/flame-layers.png)

![Spritesheet outlines, animated preview and corrections](https://arkodia.online/fx-lab/evidence/importer/importer-desktop.png)

![Mobile importer after touch scrolling](https://arkodia.online/fx-lab/evidence/importer/importer-mobile.png)

### Superseded reference

The human supplied this top-panel screenshot as the layout to remove. It is preserved here for context; the current UI uses the right sidebar above.

![Rejected top-panel layout supplied by the human](https://arkodia.online/fx-lab/evidence/interaction/rejected-top-panel.png)

The previous production baseline was commit `a329211ad48f6507061f74abc07c48b9ec79abd6`. Releases use `scripts/fx-lab/deploy.sh` and the standard publisher. The script builds a detached committed worktree and uses the shared deployment lock, preserving unrelated local peer work and persistent game data.
