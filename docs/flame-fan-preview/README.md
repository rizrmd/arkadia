## Flame Fan connected-sheet review

Preview only. The actual game and previous player are unchanged. Human approved the generated reference DAe091fce2f57db19172f44833 in Ember Warden on 2026-10-25.

The preview uses the installed NixieFX/Pixi runtime (`PixiVfxRenderer`, normalized particle effect) with one stationary billboard. A procedural WebGL texture supplies continuous polar fire flow, a narrow source, a 108-degree connected body and turbulent curved rim. It has no projectile emitters. This is a procedural interpretation of the reference, not an exact recreation of its painted curls. Rank selection increases visual extent; it does not simulate combat or change balance. Native shader source lives with the preview; no generated raster asset or AI generation is claimed for this implementation.

Play/Pause, Replay, Loop, scrubbing, Lv.1–5 and Day/Night are English and responsive. Requires WebGL. The shader is preview-specific; game-world projection, lighting and occlusion integration await visual review.

Build: `node scripts/flame-fan-preview/build.mjs`.
Check: `node scripts/flame-fan-preview/verify.mjs` (local); `VERIFY_URL=https://ark-whachat.fural.space/ember-warden-review/flame-fan-preview/ node scripts/flame-fan-preview/verify.mjs` (live).
Publish: `node scripts/flame-fan-preview/deploy.mjs`, using existing supported additive publisher. Only its own URL prefix is written; the gateway applies all peer layers.

TypeScript and Vite build passed. Local checks cover desktop 1440×900, mobile 390×844 and compact 320×560; five ranks at .40/.95/1.65/2.20 seconds, controls, overflow and cross-origin iframe. See verification-local.json. Visual inspection covered desktop opening/full sheet and mobile full sheet/fade. Initial vector-texture experiment was replaced with procedural turbulence before delivery. One earlier repeated-navigation run timed out; the final material and complete local rerun passed without errors.

Live checks passed independently in fresh browsers for all three viewports, all five ranks/four phases, controls and cross-origin iframe with no browser errors or HTTP failures. An earlier combined live repeated-navigation run stalled after desktop; all final isolated reruns passed. The verifier now launches each viewport in a fresh process to avoid lingering software WebGL contexts. This is functional testing in headless Chromium, not a hardware-mobile performance benchmark.
