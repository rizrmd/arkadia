## Inspected references

The existing Ember Warden character sheet v02 is the canonical visual identity: dark curls, ochre jacket, charcoal trousers, boots and a bronze fire gauntlet on the anatomical right forearm. [Existing concept](https://fural.space/organizations/ORd5dd6f99b4308d6187031557/knowledge/NKBDc8ca8c735a55009062b64a64).

Rift Runner concept DA5e4990dbee175645ab893e11 and its v1/v2 production reviews were inspected before generation. v1 showed anatomy swaps and sliding feet. Ember uses one controlled scene derived from the existing rig helper code, with its own model, materials and animation files. This is a candidate source; it has not earned final visual acceptance or gameplay integration.

## Generated source — material atlas

![Ember Warden generated material atlas](https://ark-whachat.fural.space/ember-warden-review/source/material-atlas.png)

Built-in imagegen, 2026-10-21. Prompt: one square seamless material atlas, four equal quadrants, no gaps or labels; ochre worn jacket canvas (top left), charcoal trouser cloth (top right), dark brown boot leather (bottom left), aged bronze gauntlet metal (bottom right). Flat even lighting, subtle hand-painted fantasy texture, no objects, scene shadows or flames. This texture is used by the controlled scene shaders. No independently generated body sheets are mixed.

## Initial source inspection study

![Initial brown-hair idle inspection sheet, E and SE](https://ark-whachat.fural.space/ember-warden-review/studies/initial-brown-hair-idle.png)

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

![Selected painted character turnaround — eight directions](https://ark-whachat.fural.space/ember-warden-review/v2/source/turnaround.png)

#### Selected action key poses — revised layout with isolated effects

![Selected action key poses — revised layout with isolated effects](https://ark-whachat.fural.space/ember-warden-review/v2/source/action-poses.png)

#### Earlier layout study — superseded because Flame Fan overlaps the neighboring cell

![Earlier layout study — superseded because Flame Fan overlaps the neighboring cell](https://ark-whachat.fural.space/ember-warden-review/v2/source/action-poses-layout-study.png)

#### Run motion study — four phases per direction; gait and heading cleanup required

![Run motion study — four phases per direction; gait and heading cleanup required](https://ark-whachat.fural.space/ember-warden-review/v2/source/run.png)

#### Rejected attack animation experiment — heading drift; excluded from playback

![Rejected attack animation experiment — heading drift; excluded from playback](https://ark-whachat.fural.space/ember-warden-review/v2/source/flame-fan.png)

### Exported presentation sprites

Each image below is an extracted presentation sprite. The fixed 384px cell and pivot are for this art viewer, not measured production foot contacts or VFX sockets.

![idle E](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/idle-E.png)

![idle N](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/idle-N.png)

![idle NE](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/idle-NE.png)

![idle NW](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/idle-NW.png)

![idle S](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/idle-S.png)

![idle SE](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/idle-SE.png)

![idle SW](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/idle-SW.png)

![idle W](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/idle-W.png)

![pose 0](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/pose-0.png)

![pose 1](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/pose-1.png)

![pose 2](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/pose-2.png)

![pose 3](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/pose-3.png)

![pose 4](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/pose-4.png)

![pose 5](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/pose-5.png)

![pose 6](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/pose-6.png)

![pose 7](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/pose-7.png)

![previous ember](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/previous-ember.png)

![rift reference](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/rift-reference.png)

![run E 0](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-E-0.png)

![run E 1](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-E-1.png)

![run E 2](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-E-2.png)

![run E 3](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-E-3.png)

![run N 0](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-N-0.png)

![run N 1](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-N-1.png)

![run N 2](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-N-2.png)

![run N 3](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-N-3.png)

![run NE 0](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-NE-0.png)

![run NE 1](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-NE-1.png)

![run NE 2](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-NE-2.png)

![run NE 3](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-NE-3.png)

![run NW 0](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-NW-0.png)

![run NW 1](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-NW-1.png)

![run NW 2](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-NW-2.png)

![run NW 3](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-NW-3.png)

![run S 0](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-S-0.png)

![run S 1](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-S-1.png)

![run S 2](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-S-2.png)

![run S 3](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-S-3.png)

![run SE 0](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-SE-0.png)

![run SE 1](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-SE-1.png)

![run SE 2](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-SE-2.png)

![run SE 3](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-SE-3.png)

![run SW 0](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-SW-0.png)

![run SW 1](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-SW-1.png)

![run SW 2](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-SW-2.png)

![run SW 3](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-SW-3.png)

![run W 0](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-W-0.png)

![run W 1](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-W-1.png)

![run W 2](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-W-2.png)

![run W 3](https://ark-whachat.fural.space/ember-warden-review/v2/sprites/run-W-3.png)

### Browser evidence

Desktop and phone viewport checks cover direction switching, the four-frame run study, snow contrast, all eight key-pose dialogs and manifest-load recovery. Public HTTPS is fetched through Node into Chromium because direct browser navigation times out in this sandbox. This is not a physical-device test.

![Painted art viewer live 1440](https://ark-whachat.fural.space/ember-warden-review/v2/evidence/live-1440.png)

![Painted art viewer live 390](https://ark-whachat.fural.space/ember-warden-review/v2/evidence/live-390.png)

![Painted art viewer local 1440](https://ark-whachat.fural.space/ember-warden-review/v2/evidence/local-1440.png)

![Painted art viewer local 390](https://ark-whachat.fural.space/ember-warden-review/v2/evidence/local-390.png)

### Comparison references shown during the redesign

![Approved painted Rift Runner idle reference](https://ark-whachat.fural.space/rift-runner/v1/source/idle-s-sw-w-nw.png)

![Previous Ember 3D idle sheet, superseded style](https://ark-whachat.fural.space/ember-warden-review/sheets/idle-2.png)

## Painted animation sprite sheets — v03

[Open the sprite sheet collection](/organizations/ORd5dd6f99b4308d6187031557/knowledge/NKBD7b917bae8fc62a6603d6f6fa) · [Animation player](https://ark-whachat.fural.space/ember-warden-review/v3/). This export contains eight eight-frame SE clips. Skills have baked effects. Other headings, physically measured foot contacts and gameplay integration are not claimed.

### Generation originals and studies

The following source images are unprocessed generations or extracted guides. The first and third run studies were excluded; the second study supplies the exported run candidate. Gait and shoulder continuity still require animator review. The original Flame Fan layout was superseded by a revision with smaller effects. Legacy 3D pose guides are references only, not painted animation output.

![Ember animation source cinder step SE.png](https://ark-whachat.fural.space/ember-warden-review/v3/source/cinder-step-SE.png)

![Ember animation source death SE.png](https://ark-whachat.fural.space/ember-warden-review/v3/source/death-SE.png)

![Ember animation source ember snare SE.png](https://ark-whachat.fural.space/ember-warden-review/v3/source/ember-snare-SE.png)

![Ember animation source flame fan SE layout study.png](https://ark-whachat.fural.space/ember-warden-review/v3/source/flame-fan-SE-layout-study.png)

![Ember animation source flame fan SE.png](https://ark-whachat.fural.space/ember-warden-review/v3/source/flame-fan-SE.png)

![Ember animation source furnace heart SE.png](https://ark-whachat.fural.space/ember-warden-review/v3/source/furnace-heart-SE.png)

![Ember animation source hurt SE.png](https://ark-whachat.fural.space/ember-warden-review/v3/source/hurt-SE.png)

![Ember animation source idle SE.png](https://ark-whachat.fural.space/ember-warden-review/v3/source/idle-SE.png)

![Ember animation source run SE first study.png](https://ark-whachat.fural.space/ember-warden-review/v3/source/run-SE-first-study.png)

![Ember animation source run SE second study.png](https://ark-whachat.fural.space/ember-warden-review/v3/source/run-SE-second-study.png)

![Ember animation source run SE third study.png](https://ark-whachat.fural.space/ember-warden-review/v3/source/run-SE-third-study.png)

![Ember animation source run SE.png](https://ark-whachat.fural.space/ember-warden-review/v3/source/run-SE.png)

![Ember animation source run pose guide.png](https://ark-whachat.fural.space/ember-warden-review/v3/source/run-pose-guide.png)

### Calibrated exported sheets

![Ember animation sheets cinder step SE.png](https://ark-whachat.fural.space/ember-warden-review/v3/sheets/cinder-step-SE.png)

![Ember animation sheets death SE.png](https://ark-whachat.fural.space/ember-warden-review/v3/sheets/death-SE.png)

![Ember animation sheets ember snare SE.png](https://ark-whachat.fural.space/ember-warden-review/v3/sheets/ember-snare-SE.png)

![Ember animation sheets flame fan SE.png](https://ark-whachat.fural.space/ember-warden-review/v3/sheets/flame-fan-SE.png)

![Ember animation sheets furnace heart SE.png](https://ark-whachat.fural.space/ember-warden-review/v3/sheets/furnace-heart-SE.png)

![Ember animation sheets hurt SE.png](https://ark-whachat.fural.space/ember-warden-review/v3/sheets/hurt-SE.png)

![Ember animation sheets idle SE.png](https://ark-whachat.fural.space/ember-warden-review/v3/sheets/idle-SE.png)

![Ember animation sheets run SE.png](https://ark-whachat.fural.space/ember-warden-review/v3/sheets/run-SE.png)

### Animated previews

![Ember animation previews cinder step SE.webp](https://ark-whachat.fural.space/ember-warden-review/v3/previews/cinder-step-SE.webp)

![Ember animation previews death SE.webp](https://ark-whachat.fural.space/ember-warden-review/v3/previews/death-SE.webp)

![Ember animation previews ember snare SE.webp](https://ark-whachat.fural.space/ember-warden-review/v3/previews/ember-snare-SE.webp)

![Ember animation previews flame fan SE.webp](https://ark-whachat.fural.space/ember-warden-review/v3/previews/flame-fan-SE.webp)

![Ember animation previews furnace heart SE.webp](https://ark-whachat.fural.space/ember-warden-review/v3/previews/furnace-heart-SE.webp)

![Ember animation previews hurt SE.webp](https://ark-whachat.fural.space/ember-warden-review/v3/previews/hurt-SE.webp)

![Ember animation previews idle SE.webp](https://ark-whachat.fural.space/ember-warden-review/v3/previews/idle-SE.webp)

![Ember animation previews run SE.webp](https://ark-whachat.fural.space/ember-warden-review/v3/previews/run-SE.webp)

### Browser evidence and unused legacy guide

![Ember animation evidence live cinder step.png](https://ark-whachat.fural.space/ember-warden-review/v3/evidence/live-cinder-step.png)

![Ember animation evidence live death.png](https://ark-whachat.fural.space/ember-warden-review/v3/evidence/live-death.png)

![Ember animation evidence live ember snare.png](https://ark-whachat.fural.space/ember-warden-review/v3/evidence/live-ember-snare.png)

![Ember animation evidence live flame fan.png](https://ark-whachat.fural.space/ember-warden-review/v3/evidence/live-flame-fan.png)

![Ember animation evidence live furnace heart.png](https://ark-whachat.fural.space/ember-warden-review/v3/evidence/live-furnace-heart.png)

![Ember animation evidence live hurt.png](https://ark-whachat.fural.space/ember-warden-review/v3/evidence/live-hurt.png)

![Ember animation evidence live idle.png](https://ark-whachat.fural.space/ember-warden-review/v3/evidence/live-idle.png)

![Ember animation evidence live phone.png](https://ark-whachat.fural.space/ember-warden-review/v3/evidence/live-phone.png)

![Ember animation evidence live run.png](https://ark-whachat.fural.space/ember-warden-review/v3/evidence/live-run.png)

![Ember animation evidence local cinder step.png](https://ark-whachat.fural.space/ember-warden-review/v3/evidence/local-cinder-step.png)

![Ember animation evidence local death.png](https://ark-whachat.fural.space/ember-warden-review/v3/evidence/local-death.png)

![Ember animation evidence local ember snare.png](https://ark-whachat.fural.space/ember-warden-review/v3/evidence/local-ember-snare.png)

![Ember animation evidence local flame fan.png](https://ark-whachat.fural.space/ember-warden-review/v3/evidence/local-flame-fan.png)

![Ember animation evidence local furnace heart.png](https://ark-whachat.fural.space/ember-warden-review/v3/evidence/local-furnace-heart.png)

![Ember animation evidence local hurt.png](https://ark-whachat.fural.space/ember-warden-review/v3/evidence/local-hurt.png)

![Ember animation evidence local idle.png](https://ark-whachat.fural.space/ember-warden-review/v3/evidence/local-idle.png)

![Ember animation evidence local phone.png](https://ark-whachat.fural.space/ember-warden-review/v3/evidence/local-phone.png)

![Ember animation evidence local run.png](https://ark-whachat.fural.space/ember-warden-review/v3/evidence/local-run.png)

![Ember animation evidence unused NE pose guide.png](https://ark-whachat.fural.space/ember-warden-review/v3/evidence/unused-NE-pose-guide.png)

### Combined atlas

![Ember Warden combined animation atlas — 8 animations, 64 frames, SE](https://ark-whachat.fural.space/ember-warden-review/v3/ember-warden-SE.png)
