## Frozen Frontier and ICE integration

The original imagegen kit from task lrtskdrxdwsrkwnqhiljqgzo supplies all material pixels. No concept screenshot is used as texture. Original master PNGs remain unchanged under frozen-terrain-review/v1. Build derives alpha-masked world segments and six editable palette patches with inward feathering and original snow/dirt, snow/ice and snow/paving edge artwork blended through joins.

The annotated DA164a1a1fb84052585c51d9b4 silhouette is registered around the existing Stronghold. Concept coordinates (637,480) map to world (577,320), with six world pixels per concept pixel. This is an explicit design registration: the concept is illustrative and the existing world does not contain authoritative Magma/Plains/Undead polygons. Nothing outside the registered polygon is painted. Western ICE receives an ice channel; central ponds, packed trails, dirt/paving around existing ruins and rocky patches use actual landmark positions. Existing scenery, collision, height features, other authored objects and room/hero archives remain intact.

62 ground segments are ordinary authored map objects using the established environment renderer and persistence. Six material patches are available in the Ground palette. Segment entries are hidden from the palette but remain selectable/removable map objects. English Pixi controls are retained. Old saved games keep revision 1; new games receive the newly published map.

Build: node scripts/frozen-terrain-apply/build.mjs, then node scripts/environment-editor/catalog.mjs. Coverage/source hashes and registration: public/frozen-terrain-apply/v1/manifest.json. Original textures retain known repeated motifs and close-up seam limitations. Derived surfaces are rasterized at two world pixels per texel.

Apply uses authenticated draft save, load verification, publication and published reload. It first backs up both current maps, refuses divergent unpublished edits, retains every original object and verifies the archived prior publication. Full original maps-state.json and editor key were copied privately before writes. The key is never committed or included in evidence. Release uses a clean committed worktree, live ancestry check and existing arkodia-deploy.lock through the supported repos ship script. GAME_SAVE_DIR and earlier release layers are preserved.

## Live verification — 28 October 2026

Runtime d43ff853f4c3757e50fa0692f6a68009fc835c53 and matching compiled editor deployed through repos ship. Published revision 3 contains 67 objects (62 ground segments plus the original 5). Draft save and reload, publish and reload, old revision retrieval and isolated process restart passed. 68 public PNG files downloaded and SHA-256 matched. Actual desktop/mobile editor and new-game revision 3 screenshots captured without page errors or failed HTTP asset responses. Player navigation/teleport on the new map passed. The origin room contains actual live screenshots in message DM0a66a5b53c126d5ec3afa320.

Live editor: https://arkodia.online/environment-editor/
