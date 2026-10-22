## Inspected references

The existing Ember Warden character sheet v02 is the canonical visual identity: dark curls, ochre jacket, charcoal trousers, boots and a bronze fire gauntlet on the anatomical right forearm. [Existing concept](https://fural.space/organizations/ORd5dd6f99b4308d6187031557/knowledge/NKBDc8ca8c735a55009062b64a64).

Rift Runner concept DA5e4990dbee175645ab893e11 and its v1/v2 production reviews were inspected before generation. v1 showed anatomy swaps and sliding feet. Ember uses one controlled scene derived from the existing rig helper code, with its own model, materials and animation files. This is a candidate source; it has not earned final visual acceptance or gameplay integration.

## Generated source — material atlas



Built-in imagegen, 2026-10-21. Prompt: one square seamless material atlas, four equal quadrants, no gaps or labels; ochre worn jacket canvas (top left), charcoal trouser cloth (top right), dark brown boot leather (bottom left), aged bronze gauntlet metal (bottom right). Flat even lighting, subtle hand-painted fantasy texture, no objects, scene shadows or flames. This texture is used by the controlled scene shaders. No independently generated body sheets are mixed.

## Initial source inspection study



This early inspection sheet was rejected because the curls read too light under the scene lighting. The final material is darker. The sheet is retained separately and is excluded from the runtime manifest. It was reproduced deterministically from the initial material setting after the final exports, preserving the source-inspection image without overwriting the corrected production scene.

## Reproducible source

[Controlled model and motion source](/organizations/ORd5dd6f99b4308d6187031557/repositories/RPe11327fbfe413dbeba246526/files?file=scripts%2Fember-warden%2Frig.py). The scoped source, packed Blender scene, exact generation prompt and source audits are committed with the asset pack. Renderer setup and reproduction steps are documented in the Ember Warden repository docs.


## Painted redesign — v03

[Open painted art review](https://ark-whachat.fural.space/ember-warden-review/v2/). The built-in imagegen tool used the approved painted Rift idle sheet as the style reference, the old Ember render as the identity reference, and the new turnaround for later poses. The v1 3D model is retained for motion reference but is superseded as the art direction.

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


### Generated originals

#### Selected painted character turnaround — eight directions



#### Selected action key poses — revised layout with isolated effects



#### Earlier layout study — superseded because Flame Fan overlaps the neighboring cell



#### Run motion study — four phases per direction; gait and heading cleanup required



#### Rejected attack animation experiment — heading drift; excluded from playback



### Exported presentation sprites

Each image below is an extracted presentation sprite. The fixed 384px cell and pivot are for this art viewer, not measured production foot contacts or VFX sockets.





































































































### Browser evidence

Desktop and phone viewport checks cover direction switching, the four-frame run study, snow contrast, all eight key-pose dialogs and manifest-load recovery. Public HTTPS is fetched through Node into Chromium because direct browser navigation times out in this sandbox. This is not a physical-device test.









### Comparison references shown during the redesign





## Painted animation sprite sheets — v03

[Open the sprite sheet collection](/organizations/ORd5dd6f99b4308d6187031557/knowledge/NKBD7b917bae8fc62a6603d6f6fa) · [Animation player](https://ark-whachat.fural.space/ember-warden-review/v3/). This export contains eight eight-frame SE clips. Skills have baked effects. Other headings, physically measured foot contacts and gameplay integration are not claimed.

### Generation originals and studies

The following source images are unprocessed generations or extracted guides. The first and third run studies were excluded; the second study supplies the exported run candidate. Gait and shoulder continuity still require animator review. The original Flame Fan layout was superseded by a revision with smaller effects. Legacy 3D pose guides are references only, not painted animation output.



























### Calibrated exported sheets

















### Animated previews

















### Browser evidence and unused legacy guide







































### Combined atlas

<!-- elegant-idle-2026-10-22 -->
## Elegant idle generation — retained sources and evidence

Source of truth: the latest retained Ember Warden elegant poster, attachment **DAd70799ae3cd9f661c8513d23**. Earlier purged artwork was not used or restored. All images generated or shown during this task are embedded below for traceability. Rejected candidates are not the final sheet.

### Final sprite sheet

![Ember Warden final transparent eight-direction idle sheet](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA643ce3d7b15fb6e943e49c3c)

### Rejected whole-atlas attempts

Attempt 1 omitted one direction row. Attempt 2 still confused profile/rear headings. Direction-specific sources supersede both.

![Ember Warden rejected whole-atlas attempt 1](https://ark-whachat.fural.space/rift-runner/elegant-idle/sources/ember-draft-1.png)

![Ember Warden rejected whole-atlas attempt 2](https://ark-whachat.fural.space/rift-runner/elegant-idle/sources/ember-draft-2.png)

### Direction-specific generations and corrections

Each source uses four columns by two rows, eight chronological frames. Initial SW/NW generations repeated right-facing views; clean SW/NW edits remained unsuitable in heading or arm assignment. The **final** SW/NW edits are used in the exported atlas. Other headings use their **clean** source. NW final removes the weapon from the visible anatomical left arm and leaves its glow on the occluded right side. SW final redraws the body toward the left with the right-arm weapon retained.

**N**

![Ember Warden N — Initial source](https://ark-whachat.fural.space/rift-runner/elegant-idle/sources/ember-N.png)

![Ember Warden N — Alpha / heading correction](https://ark-whachat.fural.space/rift-runner/elegant-idle/sources/ember-N-clean.png)


**NE**

![Ember Warden NE — Initial source](https://ark-whachat.fural.space/rift-runner/elegant-idle/sources/ember-NE.png)

![Ember Warden NE — Alpha / heading correction](https://ark-whachat.fural.space/rift-runner/elegant-idle/sources/ember-NE-clean.png)


**E**

![Ember Warden E — Initial source](https://ark-whachat.fural.space/rift-runner/elegant-idle/sources/ember-E.png)

![Ember Warden E — Alpha / heading correction](https://ark-whachat.fural.space/rift-runner/elegant-idle/sources/ember-E-clean.png)


**SE**

![Ember Warden SE — Initial source](https://ark-whachat.fural.space/rift-runner/elegant-idle/sources/ember-SE.png)

![Ember Warden SE — Alpha / heading correction](https://ark-whachat.fural.space/rift-runner/elegant-idle/sources/ember-SE-clean.png)


**S**

![Ember Warden S — Initial source](https://ark-whachat.fural.space/rift-runner/elegant-idle/sources/ember-S.png)

![Ember Warden S — Alpha / heading correction](https://ark-whachat.fural.space/rift-runner/elegant-idle/sources/ember-S-clean.png)


**SW**

![Ember Warden SW — Initial source](https://ark-whachat.fural.space/rift-runner/elegant-idle/sources/ember-SW.png)

![Ember Warden SW — Alpha / heading correction](https://ark-whachat.fural.space/rift-runner/elegant-idle/sources/ember-SW-clean.png)

![Ember Warden SW — Selected final correction](https://ark-whachat.fural.space/rift-runner/elegant-idle/sources/ember-SW-final.png)


**W**

![Ember Warden W — Initial source](https://ark-whachat.fural.space/rift-runner/elegant-idle/sources/ember-W.png)

![Ember Warden W — Alpha / heading correction](https://ark-whachat.fural.space/rift-runner/elegant-idle/sources/ember-W-clean.png)


**NW**

![Ember Warden NW — Initial source](https://ark-whachat.fural.space/rift-runner/elegant-idle/sources/ember-NW.png)

![Ember Warden NW — Alpha / heading correction](https://ark-whachat.fural.space/rift-runner/elegant-idle/sources/ember-NW-clean.png)

![Ember Warden NW — Selected final correction](https://ark-whachat.fural.space/rift-runner/elegant-idle/sources/ember-NW-final.png)

### Transparency and playback evidence

![Ember Warden light-background source check — intermediate source](https://ark-whachat.fural.space/rift-runner/elegant-idle/sources/ember-S-light-check.png)

![Ember Warden light-background source check — intermediate source](https://ark-whachat.fural.space/rift-runner/elegant-idle/sources/ember-NW-light-check.png)

![Ember Warden review evidence — ember-atlas-light.png](https://ark-whachat.fural.space/rift-runner/elegant-idle/evidence/ember-atlas-light.png)

![Ember Warden review evidence — player-desktop.png](https://ark-whachat.fural.space/rift-runner/elegant-idle/evidence/player-desktop.png)

![Ember Warden review evidence — player-mobile.png](https://ark-whachat.fural.space/rift-runner/elegant-idle/evidence/player-mobile.png)

![Ember Warden review evidence — player-snow.png](https://ark-whachat.fural.space/rift-runner/elegant-idle/evidence/player-snow.png)

### Validation and publication record

The packer isolates the main alpha component and retains a two-pixel fringe, excluding neighboring-cell fragments. One fixed scale per heading preserves frame-to-frame breathing; lowest boot contacts align to the common pivot. This is silhouette registration, not a rig constraint. No body deformation or synthetic pose interpolation is used.

Across both characters: **128 frames / 16 clips**, eight unique hashes per clip, transparent margins, zero occupied border pixels, boot baselines at y=356–360. The browser exercised every hero/direction/frame combination, all eight frames in timed playback, pause, step wrapping, heading selection and mobile layout at 390 pixels, with zero page/resource errors. All headings and chronological frames were visually reviewed; generated detail variation remains for art review. Loop-seam differences are recorded alongside adjacent-frame differences, not presented as proof of anatomy.

Reproduce with `node scripts/elegant-idle/assemble.mjs` and `node scripts/elegant-idle/verify.mjs`. Task files only were committed and pushed on isolated branch `preview/elegant-idle` in commits `1de0e6d` and `5cd8de5`; shared gameplay files were untouched. The first `/elegant-idle/` publication exposed the gateway's game-page fallback, so a scoped layer was subsequently uploaded under the supported character-review route. Source/evidence image URLs above return PNG responses. The latest human instruction requests direct Knowledge embedding instead of a preview, so no further preview work is required.

