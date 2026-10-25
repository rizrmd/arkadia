## Approved-reference rebuild

Separate preview at `/ember-warden-review/flame-fan-flipbook/`; existing gameplay is untouched. The earlier delivered preview was rejected. This revision replaces its repeated small ignition blobs with an AI-generated, textured rolling fan atlas guided by the actual approved reference. The original ignition PNG remains byte-for-byte unchanged.

### Actual layer implementation

| Layer | Runtime mechanism | Blend |
|---|---|---|
| Hand ignition | Pixi sprite slices all 16 cells of the original attachment, left to right / top to bottom; compact hand anchor | Additive |
| Continuous flame sheet | Three actual NixieFX burst emitters, one overlapping quad each; `advanced.textureSheetAnimation`, 4×4 tiles, two cycles, deterministic random starting frames on secondary folds; opening scale rooted at the hand | Alpha |
| Thick curling tongues | Seven Pixi source-frame sprites; independently phased, rotated and scaled, attached along the body | Alpha |
| Hot interior | Sixteen baked material phases derived from rolling-fan heat, advected two-frequency erosion and an orange-to-yellow LUT; Pixi flipbook playback at 40 frames/sec, restrained 0.28 opacity | Additive |
| Ground heat | Four broad flattened soft-alpha ellipses below actors | Alpha |
| Three hit contacts | Three compact, independently offset source-flipbook bursts at enemy torsos, beginning at 220 ms | Alpha |
| Embers | Actual NixieFX burst with vector velocity, curl noise, size and alpha life curves; 22 particles maximum | Additive |
| Smoke | Actual NixieFX burst with soft multi-lobe alpha texture, dark tint, upward velocity, curl noise, expansion and alpha life curves; 18 particles | Alpha |

This uses five actual Nixie emitters, plus Pixi sprites/graphics for authored layers and the entire English UI. It does **not** claim a live ShaderGraph fire material: the hot core is a baked scrolling-noise/erosion/color-ramp equivalent. The procedural smoke texture is soft alpha density, not generated artwork. There are no geometry triangles or lightning paths.

Timing: ignition 0–80 ms; opening 80–220 ms; full rolling fire 220–450 ms; erosion/smoke 450–750 ms; recovery to 1250 ms. Source ignition plays through 480 ms to overlap the release. Actor reactions are illustrative preview animation, not authoritative damage. Actor atlases may contain their own baked hand glow; isolation keeps actors visible for scale.

### Reference and assets

Approved reference: `DAdc08915fdc604d78e5f223c0`; hand source: `DA14f9840922edc53aa33bf53f`.

New atlas: `public/flame-fan-flipbook/rolling-fan-v2.png`. Generated with the built-in imagegen tool, using the approved screenshot as style/composition reference. Prompt: create a transparent 4×4 sixteen-frame atlas of the same broad rolling orange-red fan rooted at left and widening right, dense curling tongues and yellow interior, successive advected phases, equal cells, no actors, UI, scenery, smoke, distant sparks, lightning or geometric substitute. Original generated output retained under the session imagegen directory. `bake-materials.mjs` creates derived core and smoke material textures; no per-frame CPU texture uploads.

### Review and validation

English Pixi controls provide Play/Pause, Replay, Loop, half-speed, Day/Night, reference toggle, scrubbing, all eight solo layers, and fixed 40/150/320/600 ms phase buttons. The reference view crops the actual approved screenshot to the spell region; the full original remains available as `approved-reference.png`. Desktop starts with comparison visible; phones start with a larger scene and can toggle comparison.

Verification is split into bounded viewport and iframe runs so cumulative screenshot capture time does not abort an otherwise passing run:

- `npx tsc --noEmit`
- `node scripts/flame-fan-flipbook/build.mjs`
- `node scripts/flame-fan-flipbook/verify.mjs --width=1440` (also 390 and 320)
- `node scripts/flame-fan-flipbook/verify.mjs --iframe`
- Append `--live` for public verification.

Checks exercise real Pixi pointer controls, all layer isolation, all controls within each viewport, four actors/three targets, original source frames, zero HTML controls, Nixie Sub-UV definitions and three rendered sheet quads, nonzero ember/smoke emission, smoke rise/expansion/fade, asset errors, and cross-origin iframe animation at 390/900 widths. Source hash/alpha remains validated by build. These are Chromium viewport checks, not physical Android performance measurements.

### Safe publication

Use `fural-agent repos ship RPe11327fbfe413dbeba246526 --mode script --script scripts/flame-fan-flipbook/deploy.sh`. The existing shared deployment lock and process guard serialize publication. Layers stay below 6 MiB decoded JSON, all register before one restart. Actor assets and evidence are read from committed HEAD; preview source/assets must match HEAD. Peer working-tree files are excluded. Versioned `*-v2` evidence preserves the prior delivery.
