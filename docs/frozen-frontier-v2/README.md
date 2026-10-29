## Deliverables

Fourteen new transparent sprites generated with the built-in image_gen tool: ruined gate, broken watchtower, snowy shrine, tall/broad/sapling pines, dead tree and snag, juniper and twig shrubs, dry grass tussock and patch, boulder and scattered rock clusters.

Review: https://ark-whachat.fural.space/environment-corners/frozen-frontier/v2/

Sources: `assets-src/frozen-frontier/v2/`. Exports, original source audit images, manifest, exact prompts, contact sheets and three assembled 64-sprite compositions: `public/frozen-frontier/v2/`. The old v1 kit is preserved. No gameplay assets are imported or preloaded.

## Placement

The camera follows the existing 2:1 dimetric axes (±0.5 ground slopes, 128 × 64 world pixel / 3 m tile). Upper-left light, ivory snow, grey beige limestone, ochre lichen and muted slate blue shadows match v1. Three pine silhouettes were generated separately; deadwood, shrubs, grass and rocks each have two independently generated forms. Variants are not mirrored.

Height scale is 37 world px / vertical meter, with a 1.8 m hero at 66.6 px. Each manifest pivot is the visual ground contact center of a padded PNG. Draw at ground position minus pivot times scale. Export bounds use alpha > 8 to exclude invisible fringe, retain internal transparency and add 24 px clear padding. Original PNGs remain unmodified. Footprints and height targets are initial art direction references; painted shapes need collision and occlusion calibration before later gameplay placement.

## Reproduce and verify

Run `node scripts/build-frozen-frontier-v2.mjs`, then `node scripts/verify-frozen-frontier-v2.mjs`. The browser captures compositions from the same canvas renderer used by the gallery; these are assemblies of the actual delivered PNGs. `compositions.json` records all 64 placements per scene. Neutral snow staging and the hero silhouette are review annotations.

Validation checks alpha, solid pixels, clear borders, pivots, all cards and scenes, category filtering, background switching, sprite and scene pivots, shared scale, desktop, portrait and landscape widths, page errors and failed network responses. Run with `--live` after deployment. Browser checks use the installed Playwright fallback because managed browser tools are not exposed in this session.

Ship only the supported review layer: `fural-agent repos ship RPe11327fbfe413dbeba246526 --mode script --script scripts/ship-frozen-frontier-v2.sh`. This applies a prefix-only layer through a coordinated sandbox restart, preserving the installed game release and gateway. Do not rebuild gameplay or commit peer WIP.

The existing Frozen Frontier Knowledge page is extended in place, preserving its ancestors and all previous content. Generation artifacts, review images, individual exports and compositions are embedded inline in English. One discussion result message attaches the contact sheet and three composition images after live verification.
