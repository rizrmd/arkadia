**Run correction in progress — not passed.** Hurt and Death direction-specific corrections are generated, but Run still needs its full opposite-leg gait and seam audit. The goal remains active.

## Current motion references and candidate

The new elegant Ember east candidate uses the approved Idle cell as identity reference and the eight-frame projected gait guide as pose reference only. It is not yet accepted. Legacy chibi artwork shown below is a historical gait diagnostic only, not an identity reference or active asset. The guide's simple rendering and proportions must never replace the elegant character design.

### sources/ember-run-E.png

![sources/ember-run-E.png](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAd18cf834fe790088de7f01bf)

### reference/run-E-pose-guide.png

![reference/run-E-pose-guide.png](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAbb45ef97b080ddce0f40230a)

## Previous rejected sheet

**Candidate rejected — task incomplete.** No final approved run sheet is available. Live gameplay sprites are unchanged.

## Candidate sheet

![Ember Warden run candidate, not approved](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA4e348393905675fc60c4c2af)

| Property | Value |
| --- | --- |
| Export | 3072 × 3072 transparent RGBA PNG |
| Layout | 384 × 384 cells; 8 directions × 8 frames |
| Direction rows | N, NE, E, SE, S, SW, W, NW |
| Source | Built-in imagegen, 1254 × 1254; cells upscaled during packing |
| Intended pivot | (192, 360); only bounding bottoms normalized, anatomical anchors not certified |
| Playback | Loop |

## Acceptance and verification

Structural checks pass: PNG dimensions, RGBA, 64 unique cell hashes and export margins at alpha >16. These checks do **not** establish correct motion or source completeness. Generated source cells touch boundaries; neighboring fragments and clipped silhouettes remain in some cells. Ivory clothing remains visible on dark/light composites. White pockets and halos are not certified clean in all frames.

Visual acceptance **fails**: inconsistent anatomical right-arm devices in some views, weak opposite-leg run phases and loop continuity, and prone death poses losing heading fidelity. Death timing/hold behavior belongs to the player; it does not fix art defects. Stronger direction-specific source art is needed before final delivery.

![Dark alpha composite](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA23db3848dd999e185334ca25)

![Light alpha composite](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA032becb789fd4acdc035c929)

## Animation player

<iframe src="https://ark-whachat.fural.space/rift-runner/elegant-actions/?hero=ember&amp;action=run&amp;direction=SE" title="Ember Warden run candidate inspection" height="900" width="100%"></iframe>

[Open player](https://ark-whachat.fural.space/rift-runner/elegant-actions/?hero=ember&action=run) · [Structural report](https://ark-whachat.fural.space/rift-runner/elegant-actions/verification.json) · [Generation audit](https://ark-whachat.fural.space/rift-runner/elegant-actions/manifest.json)

The English player provides all headings, Play/Pause, Restart, frame stepping, a frame scrubber, FPS, dark/light/checker backgrounds. Death plays once and holds frame eight; Run loops. No interpolation disguises source poses.

## Generated source archive

References were the approved elegant Idle and corrected SE Hurt attachments, inspected before generation. Generated in task sequence Hurt for both heroes, then Death for both, then Run for both.

![Original generated run candidate](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA6944d11e2eb007e2c8965920)

### Rejected larger E strip

The direction-specific retry still has inconsistent arm devices and unreliable opposite-leg phases; it is not used in the candidate sheet.

![Rejected E run strip](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAd2760b9b560d97cc136666d8)

## Delivery state

HTTP delivery and file-integrity checks passed for the initial 30-resource preview. Live browser verification timed out after 60 seconds; player behavior is not browser-certified.

Isolated branch: preview/elegant-actions. Task files only. Preview publication and commit receipt are recorded in docs/elegant-actions. These pages preserve failed candidates honestly and do not supersede the approved Idle pages.
