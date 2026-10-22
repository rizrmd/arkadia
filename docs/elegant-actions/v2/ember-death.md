**Hurt and Death correction pass published. Full task incomplete: Run visual acceptance failed.** The six-clip player is available; all 384 frame selections and timed Death hold / Run continuation pass. These functional checks do not accept the Run artwork.

## Corrected Death sheet

![Ember Warden corrected Death sheet](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAf848defd25fb17b5fa37b2c1)

3072 × 3072 transparent PNG, 384 × 384 cells; rows N, NE, E, SE, S, SW, W, NW; eight chronological poses per row. Standing stagger → knees buckle → one knee → both knees → hands to ground → elbows/chest collapse → prone settling → prone final. Each heading retains its identity and final ground-plane direction. No mirrored rows, procedural limb deformation, duplicated still or per-frame scaling is used.

## Validation

All source strips contain eight connected complete figures with zero source-border contacts. All 64 atlas cells per character are unique and fit within transparent margins. The cell root stays fixed at (192, 360); Death naturally moves boots as the body collapses, rather than forcing boot centers to stay fixed after ground contact changes. One uniform scale is used per heading throughout the fall.

Live browser checks pass for sheet loading, all eight headings and scrubbing; timed Death playback stops on frame eight and continues holding it. No page/resource errors. Live files match local hashes and the game homepage hash stayed unchanged. These checks are separate from the full six-sheet completion audit.

![Dark alpha check](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAa6ed8c4da70015ffb00f7fbf)

![Light alpha check](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAcff760da2e8108dd3a0bf948)

<iframe src="https://ark-whachat.fural.space/rift-runner/elegant-actions/v2/?hero=ember&amp;action=death" title="Ember Warden corrected Death player" height="900" width="100%"></iframe>

[Open player](https://ark-whachat.fural.space/rift-runner/elegant-actions/v2/?hero=ember&action=death). Death plays once; Play or Restart begins again.

## Generated source archive

Built-in imagegen, with each exact approved elegant Idle heading as identity/direction reference. Source filenames containing rejected are archived failures and are not packed into the new sheet. Corrected sources preserve anatomical right-arm devices and opaque ivory clothing.

### ember-death-E-rejected-alpha

![ember-death-E-rejected-alpha.png](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA32ec9e404ac07b88c7f49dfb)

### ember-death-E-rejected-seven-poses

![ember-death-E-rejected-seven-poses.png](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA08baf046146dcba1f6245360)

### ember-death-E

![ember-death-E.png](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA1c39e8ab472ecf8f4f283081)

### ember-death-N

![ember-death-N.png](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAd96513d05b609d6d7f4226f5)

### ember-death-NE

![ember-death-NE.png](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA8e2e60421acca9f44c0d95d2)

### ember-death-NW

![ember-death-NW.png](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA51de0638d6d29954da8fbedc)

### ember-death-S

![ember-death-S.png](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA676bfdf61c4e843fb5f6207a)

### ember-death-SE

![ember-death-SE.png](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA2f1c0b9500950c93ab30bc53)

### ember-death-SW

![ember-death-SW.png](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAab332eda83f18a30eba5733a)

### ember-death-W

![ember-death-W.png](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA28007a82c3f45658b8e4c900)

### Rejected alpha repair evidence

![Rejected east repair with opaque matte; not used](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA9d89123221824c7d31ae785c)

## Previous rejected candidate

**Candidate rejected — task incomplete.** No final approved death sheet is available. Live gameplay sprites are unchanged.

## Candidate sheet

![Ember Warden death candidate, not approved](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA4a0787b6130cbfb17a3f4b02)

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

![Dark alpha composite](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA30c69f4b70418f1825ca81ab)

![Light alpha composite](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAfd61c9a1fc9f50b0fde04c6b)

## Animation player

<iframe src="https://ark-whachat.fural.space/rift-runner/elegant-actions/?hero=ember&amp;action=death&amp;direction=SE" title="Ember Warden death candidate inspection" height="900" width="100%"></iframe>

[Open player](https://ark-whachat.fural.space/rift-runner/elegant-actions/?hero=ember&action=death) · [Structural report](https://ark-whachat.fural.space/rift-runner/elegant-actions/verification.json) · [Generation audit](https://ark-whachat.fural.space/rift-runner/elegant-actions/manifest.json)

The English player provides all headings, Play/Pause, Restart, frame stepping, a frame scrubber, FPS, dark/light/checker backgrounds. Death plays once and holds frame eight; Run loops. No interpolation disguises source poses.

## Generated source archive

References were the approved elegant Idle and corrected SE Hurt attachments, inspected before generation. Generated in task sequence Hurt for both heroes, then Death for both, then Run for both.

![Original generated death candidate](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA2d513521211eafff73afb3ff)

## Delivery state

HTTP delivery and file-integrity checks passed for the initial 30-resource preview. Live browser verification timed out after 60 seconds; player behavior is not browser-certified.

Isolated branch: preview/elegant-actions. Task files only. Preview publication and commit receipt are recorded in docs/elegant-actions. These pages preserve failed candidates honestly and do not supersede the approved Idle pages.

## Latest full-task verification

The Run sources for both characters cover all headings but are rejected for repeated leg phases, device-arm swaps and body-scale jumps. Hurt/Death corrections remain available. All six exports pass size, alpha/margin, source-edge and distinct-cell checks. The live player passes all 384 frame selections, Death final-frame hold and Run continuation. No live gameplay sprite has been replaced.

[Six-clip review player](https://ark-whachat.fural.space/rift-runner/elegant-actions/v2/) · [Structural report with Run rejection](https://ark-whachat.fural.space/rift-runner/elegant-actions/v2/verification.json)
