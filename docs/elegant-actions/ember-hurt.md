**Candidate rejected — task incomplete.** No final approved hurt sheet is available. Live gameplay sprites are unchanged.

## Candidate sheet

![Ember Warden hurt candidate, not approved](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAbc155b6e2cdfe164fa5bdb9b)

| Property | Value |
| --- | --- |
| Export | 3072 × 3072 transparent RGBA PNG |
| Layout | 384 × 384 cells; 8 directions × 8 frames |
| Direction rows | N, NE, E, SE, S, SW, W, NW |
| Source | Built-in imagegen, 1254 × 1254; cells upscaled during packing |
| Intended pivot | (192, 360); only bounding bottoms normalized, anatomical anchors not certified |
| Playback | Once |

## Acceptance and verification

Structural checks pass: PNG dimensions, RGBA, 64 unique cell hashes and export margins at alpha >16. These checks do **not** establish correct motion or source completeness. Generated source cells touch boundaries; neighboring fragments and clipped silhouettes remain in some cells. Ivory clothing remains visible on dark/light composites. White pockets and halos are not certified clean in all frames.

Visual acceptance **fails**: inconsistent anatomical right-arm devices in some views, weak opposite-leg run phases and loop continuity, and prone death poses losing heading fidelity. Death timing/hold behavior belongs to the player; it does not fix art defects. Stronger direction-specific source art is needed before final delivery.

![Dark alpha composite](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA2e5648f28cf15daba51fdb55)

![Light alpha composite](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA4d97444c2bea102307748908)

## Animation player

<iframe src="https://ark-whachat.fural.space/rift-runner/elegant-actions/?hero=ember&amp;action=hurt&amp;direction=SE" title="Ember Warden hurt candidate inspection" height="900" width="100%"></iframe>

[Open player](https://ark-whachat.fural.space/rift-runner/elegant-actions/?hero=ember&action=hurt) · [Structural report](https://ark-whachat.fural.space/rift-runner/elegant-actions/verification.json) · [Generation audit](https://ark-whachat.fural.space/rift-runner/elegant-actions/manifest.json)

The English player provides all headings, Play/Pause, Restart, frame stepping, a frame scrubber, FPS, dark/light/checker backgrounds. Death plays once and holds frame eight; Run loops. No interpolation disguises source poses.

## Generated source archive

References were the approved elegant Idle and corrected SE Hurt attachments, inspected before generation. Generated in task sequence Hurt for both heroes, then Death for both, then Run for both.

![Original generated hurt candidate](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA312277974c1b4b8019358b84)

### Initial alpha inspection

![Initial dark-background check](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAbbd75242449861417412b818)

### Rejected cleanup attempt

![Cleanup attempt, rejected](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAe86593b6c1f2aaaca76fbf84)

## Delivery state

HTTP delivery and file-integrity checks passed for the initial 30-resource preview. Live browser verification timed out after 60 seconds; player behavior is not browser-certified.

Isolated branch: preview/elegant-actions. Task files only. Preview publication and commit receipt are recorded in docs/elegant-actions. These pages preserve failed candidates honestly and do not supersede the approved Idle pages.
