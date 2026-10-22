## Elegant idle preview

Preview only. No production character asset is replaced. Player: https://ark-whachat.fural.space/rift-runner/elegant-idle/

Sources are the two latest retained elegant posters in project Knowledge: Ember Warden `DAd70799ae3cd9f661c8513d23` and Rift Runner `DA29b8b200cef04aff12014c59`, both in character room `DRb4787514f3224844f3c207ab`. No purged concepts were downloaded or restored.

Built-in imagegen produced two whole-atlas attempts per character (rejected for missing/confused headings), then sixteen direction-specific eight-frame sheets. Explicit alpha extraction and heading/weapon corrections are retained beside their sources. The image viewer can show hidden background RGB even when the PNG alpha is transparent; light-background composites and pixel checks establish actual transparency. `generation.json` records the directional prompt set. NW final edits removed the weapon from the visible anatomical left arm and placed a small glow on the occluded right arm. SW final edits redrew the body facing left while retaining the weapon on the right arm. No generated poses are mirrored.

Final atlases: `public/elegant-idle/ember-idle.png` and `rift-idle.png`, each 3072×3072, 8×8 cells of 384×384. Rows N, NE, E, SE, S, SW, W, NW; columns chronological frames 1–8. Fixed 5 FPS, 1.6-second idle loops. Sources contain the breathing, cloth/hair and weapon-light movement; the player only selects raster frames.

The packer extracts 4×2 directional source cells, isolates the largest alpha component with a two-pixel fringe to exclude neighboring-cell fragments, uses one fixed scale per heading, and aligns the lowest boot contact to `(192,360)`. It does not deform bodies, interpolate synthetic poses or duplicate a static image. Ground alignment is silhouette-based, not a rig constraint.

## Validation

`node scripts/elegant-idle/assemble.mjs`

`node scripts/elegant-idle/verify.mjs`

All 128 exported frames have unique hashes within their clips, transparent margins, no occupied cell-border pixels, and a boot baseline at y=356–360. All eight headings and their eight frames were visually inspected against the posters, including the corrected SW/NW views. The loop seam is recorded alongside every adjacent-frame pixel difference; numerical differences support inspection and do not prove anatomical correctness. Small generated embroidery and face variations remain appropriate to this review preview; production acceptance is separate.

Chromium checks scrub all 128 hero/direction/frame combinations and execute all eight frames in actual timed playback. Pause, previous/next wrapping, heading selection, speed and 390-pixel mobile overflow pass with zero page/resource errors. Desktop, mobile, snow and atlas-light evidence are retained. Chromium uses the existing home-installed browser library path; no host packages were installed.

## Publication

Commit only this task's three directories. Push the isolated `preview/elegant-idle` branch. Deploy with `node scripts/elegant-idle/publish.mjs`, using the repository's supported persistent `publishLayer` gateway path. It creates a scoped `/rift-runner/elegant-idle` layer in the existing Arkadia sandbox, verifies every deployed file by SHA-256, and checks that the gameplay homepage bytes are unchanged. `deployment.json` records the actual code commit, public URL and resource checksums.

Knowledge pages remain under their existing character parents; all source attempts, final atlases and shown evidence are inline. Retained poster embeds remain untouched.
