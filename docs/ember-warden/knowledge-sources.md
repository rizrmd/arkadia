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
