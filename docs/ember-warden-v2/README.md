## Painted redesign

Ember Warden now has a painted female character-art set aligned to the approved Rift Runner idle artwork: dark drawn edges, textured cloth and leather, compact adult proportions, and warm material highlights. Long flowing dark hair, an ochre jacket, cream rolled sleeves, charcoal trousers, brown boots and an anatomical right-arm bronze furnace gauntlet define Ember's identity.

[Open the painted art viewer](https://ark-whachat.fural.space/ember-warden-review/v2/).

## Deliverables

- Eight transparent directional turnaround views.
- Eight action key poses: idle, run, Flame Fan, Cinder Step, Ember Snare, Furnace Heart, hurt and death.
- A four-frame run study for each of the eight headings.
- A responsive English art viewer with direction controls, a snow contrast check, before/after/Rift comparison, and enlarged action-pose dialogs.
- Original generated sources, calibrated presentation sprites, resource hashes, local/public browser receipts, and inline Knowledge galleries.

## Source and extraction

The built-in imagegen tool generated the turnaround using the approved painted Rift idle sheet as a style reference and the previous Ember render as an identity reference. Subsequent generations used the new turnaround to preserve costume, palette and face. The action sheet was revised once to separate the Flame Fan and Cinder Step effects into their own cells. Both source revisions are retained.

`build-painted.mjs` extracts the generated grid cells, removes disconnected neighboring-cell fragments, and packs transparent 384 × 384 presentation images. Standing views share a displayed height; each run direction uses one fixed scale and ground origin for its four frames. These are presentation pivots, not measured animation foot contacts or gauntlet sockets. Artwork is not mirrored.

## Motion limitations

This change completes the character art redesign. It does not replace the gameplay hero or claim a complete rebuilt animation pack. The run is a four-frame visual study: gait, headings and temporal consistency need production cleanup. Skill, hurt and death images are key poses, with painted effects, rather than separately animated body/VFX layers.

The generated eight-direction Flame Fan animation study changes heading during attack and is excluded from active playback. It remains in the Knowledge sources gallery, labeled as a rejected motion experiment. The previous 3D animation viewer remains available for timing and mechanics reference; it is superseded as the visual style target.

## Reproduce and verify

1. `node scripts/ember-warden/build-painted.mjs`
2. `node scripts/ember-warden/verify-painted.mjs`
3. `npm run build`
4. `node scripts/ember-warden/publish-painted.mjs`
5. `DEMO_URL=https://ark-whachat.fural.space/ember-warden-review/v2/ node scripts/ember-warden/verify-painted.mjs`
6. Publish once more to include the new public screenshots, then run `node scripts/ember-warden/publish-painted-knowledge.mjs`.

The verifier exercises all eight directions and pose dialogs, sees all four run frames, checks the snow toggle and failed-manifest retry, and checks horizontal overflow at 1440px and 390px. Every source and presentation sprite is compared to its SHA-256 over public HTTPS. The publisher verifies all deployed bytes, including HTML, CSS, JavaScript, manifest, and screenshots.

The home-installed Chromium times out on direct navigation to the public hostname. The public browser check therefore fulfills Chromium requests with actual public HTTPS responses fetched by Node. This verifies the deployed page's execution and interactions, but is not a direct browser-network or physical-device test.

The scoped deployment uses the existing Arkadia gateway layer mechanism at `/ember-warden-review/v2/`. It does not alter gateway code, game bundles, or the other session's hero-selection work.
