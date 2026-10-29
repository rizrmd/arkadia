## Ground palette

The native Pixi Environment Editor opens on Ground: Green Grass, Dry Grass, Bare Soil and Gravel. Choose a patch, then tap the map. Overlap patches to blend the original alpha edges; later placements cover earlier ones. Objects retains all previous assets. Select and drag a patch, edit Map U/V under Properties, duplicate/delete, or use Undo/Redo as with existing placements. Size is 768 × 384 world pixels in the 2:1 projection; no artwork is regenerated, cropped, recolored or flattened. Original SHA-256 and alpha inspection are recorded in originals.json.

Ground is walkable and sits over the base surface, under frontier ground details, shadows, relief and upright objects. Court paving and raised terrain remain authoritative surfaces. Ponds may have flat ground underneath, while their existing solid-object clearance rules remain enforced. Placement IDs are ground:green-grass, ground:dry-grass, ground:bare-soil and ground:gravel. Catalog generation keeps the client and embedded Go catalog identical. Authored gameplay containers follow the camera transform.

Use the existing protected Access → Save / Load draft → Publish flow. Publishing applies to new runs; archived map revisions, existing saves, GAME_SAVE_DIR and editor keys remain intact. Integration adds assets and does not publish a replacement production map. Validation publishes only into temporary isolated save directories.

## Verification and release

Run scripts/ground-textures/verify.mjs after building /home/dev/releases/environment-editor-test from server/cmd/arkodia, then scripts/ground-textures/gameplay.mjs. These use actual browser pointer/keyboard interactions, authenticated draft/publication requests and desktop/mobile gameplay. Go tests cover overlapping ground, pond clearance, immutable publication and restart. The screenshots show the original PNG alpha and a tent over blended terrain.

scripts/ground-textures/deploy.sh builds a detached committed worktree and delegates to the cumulative environment release, which holds $HOME/releases/arkodia-deploy.lock. The additive publisher retains previous public assets and durable saves. Its preflight verifies that the currently running game build is an ancestor. Live release evidence is recorded separately in deployment.json and release-verification.json.
