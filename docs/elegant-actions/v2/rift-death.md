**Hurt and Death correction pass published. Full task incomplete: Run visual acceptance failed.** The six-clip player is available; all 384 frame selections and timed Death hold / Run continuation pass. These functional checks do not accept the Run artwork.

## Corrected Death sheet

![Rift Runner corrected Death sheet](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA9dc6c5997e83e261128fb23c)

3072 × 3072 transparent PNG, 384 × 384 cells; rows N, NE, E, SE, S, SW, W, NW; eight chronological poses per row. Standing stagger → knees buckle → one knee → both knees → hands to ground → elbows/chest collapse → prone settling → prone final. Each heading retains its identity and final ground-plane direction. No mirrored rows, procedural limb deformation, duplicated still or per-frame scaling is used.

## Validation

All source strips contain eight connected complete figures with zero source-border contacts. All 64 atlas cells per character are unique and fit within transparent margins. The cell root stays fixed at (192, 360); Death naturally moves boots as the body collapses, rather than forcing boot centers to stay fixed after ground contact changes. One uniform scale is used per heading throughout the fall.

Live browser checks pass for sheet loading, all eight headings and scrubbing; timed Death playback stops on frame eight and continues holding it. No page/resource errors. Live files match local hashes and the game homepage hash stayed unchanged. These checks are separate from the full six-sheet completion audit.

![Dark alpha check](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAb599ae7df9c0412437bbed90)

![Light alpha check](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA92af0f2d44f0a03c92edfd4c)

<iframe src="https://ark-whachat.fural.space/rift-runner/elegant-actions/v2/?hero=rift&amp;action=death" title="Rift Runner corrected Death player" height="900" width="100%"></iframe>

[Open player](https://ark-whachat.fural.space/rift-runner/elegant-actions/v2/?hero=rift&action=death). Death plays once; Play or Restart begins again.

## Generated source archive

Built-in imagegen, with each exact approved elegant Idle heading as identity/direction reference. Source filenames containing rejected are archived failures and are not packed into the new sheet. Corrected sources preserve anatomical right-arm devices and opaque ivory clothing.

### rift-death-E-rejected-six-poses

![rift-death-E-rejected-six-poses.png](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAaf4314a99670499f96ff7b73)

### rift-death-E

![rift-death-E.png](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAbdd574eb5bbb70443fa5858a)

### rift-death-N

![rift-death-N.png](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA60da6e4ddbfcdf9005a9b54a)

### rift-death-NE

![rift-death-NE.png](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA7bfaaa8d823df0d05d3ae041)

### rift-death-NW

![rift-death-NW.png](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAcdf8f3e16b3fddd6c661e457)

### rift-death-S

![rift-death-S.png](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAcd81fef7b6f674a5a9216556)

### rift-death-SE

![rift-death-SE.png](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA342628d8068b0f5ca3826fc5)

### rift-death-SW

![rift-death-SW.png](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAb8e360e9ac3fdedae59390fd)

### rift-death-W

![rift-death-W.png](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAb97ac05e521a8baa709aa846)

## Previous rejected candidate

**Candidate rejected — task incomplete.** No final approved death sheet is available. Live gameplay sprites are unchanged.

## Candidate sheet

![Rift Runner death candidate, not approved](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA7f1108bdb20c639385e4676d)

| Property | Value |
| --- | --- |
| Export | 3072 × 3072 transparent RGBA PNG |
| Layout | 384 × 384 cells; 8 directions × 8 frames |
| Direction rows | N, NE, E, SE, S, SW, W, NW |
| Source | Built-in imagegen, 1254 × 1254; cells upscaled during packing |
| Intended pivot | (192, 360); only bounding bottoms normalized, anatomical anchors not certified |
| Playback | Once, holds final frame |

## Acceptance and verification

Structural checks pass: PNG dimensions, RGBA, 64 unique cell hashes and export margins at alpha >16. These checks do **not** establish correct motion or source completeness. Generated source cells touch boundaries; neighboring fragments and clipped silhouettes remain in some cells. Ivory clothing remains visible on dark/light composites. White pockets and halos are not certified clean in all frames.

Visual acceptance **fails**: inconsistent anatomical right-arm devices in some views, weak opposite-leg run phases and loop continuity, and prone death poses losing heading fidelity. Death timing/hold behavior belongs to the player; it does not fix art defects. Stronger direction-specific source art is needed before final delivery.

![Dark alpha composite](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAcb71f003499d736e9e3a6eb6)

![Light alpha composite](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA3def7b3bb4c40b65e67570ba)

## Animation player

<iframe src="https://ark-whachat.fural.space/rift-runner/elegant-actions/?hero=rift&amp;action=death&amp;direction=SE" title="Rift Runner death candidate inspection" height="900" width="100%"></iframe>

[Open player](https://ark-whachat.fural.space/rift-runner/elegant-actions/?hero=rift&action=death) · [Structural report](https://ark-whachat.fural.space/rift-runner/elegant-actions/verification.json) · [Generation audit](https://ark-whachat.fural.space/rift-runner/elegant-actions/manifest.json)

The English player provides all headings, Play/Pause, Restart, frame stepping, a frame scrubber, FPS, dark/light/checker backgrounds. Death plays once and holds frame eight; Run loops. No interpolation disguises source poses.

## Generated source archive

References were the approved elegant Idle and corrected SE Hurt attachments, inspected before generation. Generated in task sequence Hurt for both heroes, then Death for both, then Run for both.

![Original generated death candidate](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAd6716d39358af39f28abd798)

## Delivery state

HTTP delivery and file-integrity checks passed for the initial 30-resource preview. Live browser verification timed out after 60 seconds; player behavior is not browser-certified.

Isolated branch: preview/elegant-actions. Task files only. Preview publication and commit receipt are recorded in docs/elegant-actions. These pages preserve failed candidates honestly and do not supersede the approved Idle pages.

## Latest full-task verification

The Run sources for both characters cover all headings but are rejected for repeated leg phases, device-arm swaps and body-scale jumps. Hurt/Death corrections remain available. All six exports pass size, alpha/margin, source-edge and distinct-cell checks. The live player passes all 384 frame selections, Death final-frame hold and Run continuation. No live gameplay sprite has been replaced.

[Six-clip review player](https://ark-whachat.fural.space/rift-runner/elegant-actions/v2/) · [Structural report with Run rejection](https://ark-whachat.fural.space/rift-runner/elegant-actions/v2/verification.json)
