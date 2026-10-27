## Environment map editor

Implementation under verification. The editor is a separate native Pixi application at `/environment-editor/`; it does not initialize gameplay or load game UI. All controls, dialogs, fields and the numeric keypad render in Pixi.

Drag empty ground to pan; scroll, pinch, or use +/− to zoom around the pointer. Map coordinates are tile U/V on the existing 936 × 936 map, at 3 meters per tile. Choose a palette asset and tap the map. Select an authored object to drag it, edit coordinates and spawn properties, duplicate, or delete. Undo/redo retains up to 100 operations; Ctrl/Cmd+Z, Shift+Z, D, and S are supported.

The original map remains as reference terrain; authored placements are editable. The Stronghold palette object is a full enclosure assembled from existing art with the original navigation columns. Other palette entries include the expedition tent, cliff, both pond sizes, skeleton spawn markers and the Frozen Frontier asset kit.

### Drafts, publication and access

Writes require the deployment's 256-bit editor key. Enter it on the Access tab (native Pixi field, keyboard paste or Paste key). The key is held only in the current tab, never in browser persistence or URLs. Public GET access exposes only published configurations. Failed authorization cannot save or publish.

Save draft persists to the server without changing gameplay. Load draft requires the key and confirms discarding local unsaved edits. Publish has a separate confirmation. Draft writes and publication use optimistic revision checks; stale editors must reload. One fsync + atomic rename commits the draft, live revision and immutable historical versions together. Corrupt/unknown map storage is retained and causes an error instead of reset.

Storage is `GAME_SAVE_DIR/environment/maps-state.json`; the access key is `GAME_SAVE_DIR/environment/editor-key`. The supported gateway retains `GAME_SAVE_DIR` under the persistent sandbox home. Room checkpoint discovery ignores the environment subdirectory.

### Gameplay and existing progress

New solo games and co-op rooms use the latest published revision. Saved solo heroes and room checkpoints retain their map revision, objects, spawn identities and remaining spawn timers. Existing checkpoints without map metadata retain legacy map revision 0. Publishing never resets health, currency, skills, actors, effects or progression, and does not silently replace a saved map. Switching to a hero saved on another map reloads after saving the current hero.

Spawn count is the marker's population cap (1–50, at most 200 across a map); radius is ground meters (0.5–150), sampled uniformly by area; interval is seconds (0.5–3600) between population/replenishment checks. Dead skeletons remain for the existing corpse duration and replenish only on a marker check. The full map outside the actual court is eligible, including north of the old gate-only half-plane. The server owns co-op spawns; clients never submit spawn or reward claims. Solo uses the same marker algorithm and collisions.

Both ponds are walkable for player and enemy. The water areas are approximately 5 m² and 25 m²; their full shoreline sprite footprints are larger. Their width/height ratio is √5. Their opaque dark water uses the approved large-pond attachment DA7e6086a588e50dd7a5dcaec7. No new pond art was invented. Pond validation, in both editor and server, requires clearance from authored objects and the original terrain, including cliffs and ruins. Existing base-map collision remains intact.
