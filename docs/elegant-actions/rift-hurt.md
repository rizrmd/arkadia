**Candidate rejected — task incomplete.** No final approved hurt sheet is available. Live gameplay sprites are unchanged.

## Candidate sheet

![Rift Runner hurt candidate, not approved](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA5e74e1d9368e1cf0856577e3)

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

![Dark alpha composite](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA6b68fff1ff136ad2ad00cc86)

![Light alpha composite](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAbcb7c45f5f0c8632ba089df6)

## Animation player

<iframe src="https://ark-whachat.fural.space/rift-runner/elegant-actions/?hero=rift&amp;action=hurt&amp;direction=SE" title="Rift Runner hurt candidate inspection" height="900" width="100%"></iframe>

[Open player](https://ark-whachat.fural.space/rift-runner/elegant-actions/?hero=rift&action=hurt) · [Structural report](https://ark-whachat.fural.space/rift-runner/elegant-actions/verification.json) · [Generation audit](https://ark-whachat.fural.space/rift-runner/elegant-actions/manifest.json)

The English player provides all headings, Play/Pause, Restart, frame stepping, a frame scrubber, FPS, dark/light/checker backgrounds. Death plays once and holds frame eight; Run loops. No interpolation disguises source poses.

## Generated source archive

References were the approved elegant Idle and corrected SE Hurt attachments, inspected before generation. Generated in task sequence Hurt for both heroes, then Death for both, then Run for both.

![Original generated hurt candidate](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAae3e88d661fd38081c5fb102)

## Delivery state

HTTP delivery and file-integrity checks passed for the initial 30-resource preview. Live browser verification timed out after 60 seconds; player behavior is not browser-certified.

Isolated branch: preview/elegant-actions. Task files only. Preview publication and commit receipt are recorded in docs/elegant-actions. These pages preserve failed candidates honestly and do not supersede the approved Idle pages.
