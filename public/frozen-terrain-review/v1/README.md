## Frozen Frontier terrain review kit

Six individual generated base PNGs and all six unordered edge pairs among snow, dirt, ice and paving. Generated with built-in imagegen; no procedural terrain substitute, 3D or GLB. Original PNG bytes are preserved. Every tile is 1254 × 1254 pixels. Strict overhead, muted cold grays, flat surfaces with local painted material shading and no directional cast shadows, vegetation, buildings, labels or props. Reference: approved Frozen Frontier-centered world concept, task anszwgqlnnpycsijgovprmiq.

### Use and scale

The intended footprint is 3 metres per square; this is an art brief, not a measured world-space calibration. Base files fill their square without alpha. Edge files place the first named material on the left and second on the right. Rotate as needed for other orientations; the paving pattern rotates with the image. These six are a material-edge review family, not a complete Wang/autotile kit: no dedicated concave corners, caps or multiway junctions. Independent edges are visually coordinated, not pixel-identical copies of the base surfaces. Blend/overlap their outer joins during future integration rather than hard-butting them as guaranteed shared borders.

### Seam inspection and limits

Inspected originals, material family sheet, edge family sheet and unaltered 3 × 3 repeated-base sheets. Broad illumination is fairly even and the material family is coherent. Snow repeats show recurring cloudy motifs; paving repetition is particularly recognizable and stone joints can stop at a wrap. Bases are visually tileable review materials, **not mathematically seamless periodic maps**. Opposite-edge mean absolute RGB differences below are nonzero. No seam-healing, mirroring, procedural synthesis or hidden pixel edits were applied. Fine discontinuities remain visible at close zoom, especially stone and ice. Use the repeat PNGs to assess suitability at intended game scale. Further seam polish may be needed before production integration.

| Material | Left/right edge MAE | Top/bottom edge MAE | Interior horizontal MAE |
|---|---:|---:|---:|
| cracked-ice.png | 14.64 | 13.03 | 9.84 |
| frozen-dirt.png | 27.67 | 30.42 | 23.63 |
| packed-snow.png | 15.87 | 15.35 | 9.56 |
| rocky-ground.png | 23.35 | 27.07 | 16.97 |
| ruined-stone-paving.png | 19.05 | 18.84 | 14.48 |
| snow-ground.png | 14.90 | 14.29 | 9.30 |

MAE uses decoded RGB channels on a 0–255 scale. This numerical check catches discontinuity, not artistic quality. Transitions intentionally have different left/right materials; their left/right MAE is not a seamlessness test.

### Review-only release

No editor palette entry, gameplay renderer, save or map publication changes. Separate from ground integration task hypvgnnbwicblaisnsopqcpg. Additive deploy uses scripts/frozen-terrain-review/deploy.sh, the existing arkodia-deploy.lock and only /frozen-terrain-review/v1. No runtime replacement, gateway rewrite or branch reset. manifest.json records dimensions, original byte sizes and SHA-256; prompts.json records the generation brief and retained exact transition prompts.

Review sheets order: bases — cracked ice, frozen dirt, packed snow / rocky ground, ruined stone paving, snow ground. Edges — dirt/ice, dirt/paving, ice/paving / snow/dirt, snow/ice, snow/paving. All repeated-base sheets are evidence composites only, not replacement assets.
