Shipped and verified live. New NE/E/SE Run artwork is integrated into the game atlas and both players. NW/W/SW mirror the corresponding canonical directions. N/S artwork is preserved and re-ordered into the same complete gait sequence.

## Eight-direction Run

![Ember Warden Run source sheet: N, NE, E, SE, S; eight frames per row](https://ark-whachat.fural.space/run-cadence/ember-warden-run.png)

![Ember Warden animated eight-direction preview](https://ark-whachat.fural.space/sprite-player/sheets/ember-warden-run-preview.webp)

| Property | Value |
| --- | --- |
| Stored sheet | 3072 × 1920, five rows: N, NE, E, SE, S |
| Logical directions | N, NE, E, SE, S, SW, W, NW |
| Cells / foot pivot | 384 × 384, transparent / (192, 360) |
| Cycle | Eight unique stored frames per direction, one complete gait at 10 fps (800 ms) |
| Left-facing views | NW from NE, W from E, SW from SE, mirrored horizontally |

## Cadence diagnosis and integration

The original vertical rows rapidly alternated opposing leg phases, while side rows grouped similar contacts. Exact frame hashes were unique, so a duplicate-file check alone could not explain the apparent speed difference. The repair regenerates the side artwork and orders both vertical rows into comparable gait phases. Frame counts and playback rates match in every direction. Gameplay movement speeds are unchanged.

Stronghold previously selected SE/SW during horizontal movement. It now selects E/W with angle hysteresis and keeps the continuous distance-normalized gait clock when direction changes. Sprite Player uses regenerated full/half sheets and content revisions. Skill Player and FX Lab offer a **Run** pose, using the packed game atlas. Choose **Skill** to return to Attack playback.

Only 40 Run cells changed in each character atlas. All 130 non-Run frames per hero, including Attack from a9ec0af, were checked against the pre-edit decoded atlas and remain pixel-identical.

## Sprite Player

<iframe src="https://ark-whachat.fural.space/sprite-player/?hero=ember-warden&amp;pose=run&amp;row=S&amp;controls=simple&amp;v=run-cadence-v7" title="Ember Warden Run Sprite Player" height="560"></iframe>

Use the eight heading buttons, Play/Pause, Loop/Once and frame scrubber to inspect the loop and last-to-first transition.

## Packed atlas in Skill Player

<iframe src="https://ark-whachat.fural.space/skill-player/?hero=ember-warden&amp;pose=run&amp;dir=SE&amp;controls=simple&amp;autoplay=0" title="Ember Warden Run from game atlas" height="560"></iframe>

[Open FX Lab in Run mode](https://ark-whachat.fural.space/fx-lab?hero=ember-warden&pose=run) · [Compare all sixteen hero/direction combinations](https://ark-whachat.fural.space/run-cadence/)

## Regenerated directional artwork

Generated with the built-in imagegen tool from the existing character identity references. Each final direction has eight authored poses in a 4 × 2 source grid; normalization retains the established game cell and pivot.

### NE

![Ember Warden NE regenerated eight-frame artwork](https://ark-whachat.fural.space/run-cadence/source/ember-warden-NE.png)

![Ember Warden NE identity reference](https://ark-whachat.fural.space/run-cadence/source/ember-warden-NE-identity.png)

### E

![Ember Warden E regenerated eight-frame artwork](https://ark-whachat.fural.space/run-cadence/source/ember-warden-E.png)

![Ember Warden E identity reference](https://ark-whachat.fural.space/run-cadence/source/ember-warden-E-identity.png)

### SE

![Ember Warden SE regenerated eight-frame artwork](https://ark-whachat.fural.space/run-cadence/source/ember-warden-SE.png)

![Ember Warden SE identity reference](https://ark-whachat.fural.space/run-cadence/source/ember-warden-SE-identity.png)

## Verification

Local browser checks passed for both heroes in all eight directions: all 64 Sprite Player cells per hero, all eight packed frames per direction in Skill Player and FX Lab, correct mirrored views, preserved Attack mode, and movement direction selection in Stronghold. Live browser checks passed for the same full matrix, with zero page errors and byte-identical deployed character atlases.

[Source phase audit](https://ark-whachat.fural.space/run-cadence/audit.json) · [Non-Run preservation proof](https://ark-whachat.fural.space/run-cadence/atlas-proof.json) · [Local verification](https://ark-whachat.fural.space/run-cadence/verification/verification.json) · [Live verification](https://ark-whachat.fural.space/run-cadence/verification/verification-live.json)

## Runtime evidence

![Synchronized live comparison of both heroes in all eight directions](https://ark-whachat.fural.space/run-cadence/verification/synchronized-live.webp)

![Ember Warden live Stronghold Run](https://ark-whachat.fural.space/run-cadence/verification/ember-warden-runtime-live.webp)

![Ember Warden packed Run in Skill Player](https://ark-whachat.fural.space/run-cadence/verification/ember-warden-skill-live.webp)

## Earlier generation candidates

These are retained for the image record and are not the integrated artwork. Multi-direction attempts failed the required grid; the first Ember SE pass required transparent-background extraction.

![Ember Warden earlier unapproved candidate ember-before](https://ark-whachat.fural.space/run-cadence/candidates/ember-before.png)

![Ember Warden earlier unapproved candidate ember-sheet-v1](https://ark-whachat.fural.space/run-cadence/candidates/ember-sheet-v1.png)

![Ember Warden earlier unapproved candidate ember-multidir-rejected](https://ark-whachat.fural.space/run-cadence/candidates/ember-multidir-rejected.png)

![Ember Warden earlier unapproved candidate ember-SE-before-alpha](https://ark-whachat.fural.space/run-cadence/candidates/ember-SE-before-alpha.png)
