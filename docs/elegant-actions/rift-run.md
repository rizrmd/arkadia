**Candidate rejected — task incomplete.** No final approved run sheet is available. Live gameplay sprites are unchanged.

## Candidate sheet

![Rift Runner run candidate, not approved](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA37fe453eed3967e033b25a23)

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

![Dark alpha composite](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA0b3006d4e84006e53cfbee2c)

![Light alpha composite](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DAd209b8e6f787ec4070d3ff48)

## Animation player

<iframe src="https://ark-whachat.fural.space/rift-runner/elegant-actions/?hero=rift&amp;action=run&amp;direction=SE" title="Rift Runner run candidate inspection" height="900" width="100%"></iframe>

[Open player](https://ark-whachat.fural.space/rift-runner/elegant-actions/?hero=rift&action=run) · [Structural report](https://ark-whachat.fural.space/rift-runner/elegant-actions/verification.json) · [Generation audit](https://ark-whachat.fural.space/rift-runner/elegant-actions/manifest.json)

The English player provides all headings, Play/Pause, Restart, frame stepping, a frame scrubber, FPS, dark/light/checker backgrounds. Death plays once and holds frame eight; Run loops. No interpolation disguises source poses.

## Generated source archive

References were the approved elegant Idle and corrected SE Hurt attachments, inspected before generation. Generated in task sequence Hurt for both heroes, then Death for both, then Run for both.

![Original generated run candidate](/api/rooms/DRb4787514f3224844f3c207ab/attachments/DA7b1a46a31a82784914851a45)

## Delivery state

HTTP delivery and file-integrity checks passed for the initial 30-resource preview. Live browser verification timed out after 60 seconds; player behavior is not browser-certified.

Isolated branch: preview/elegant-actions. Task files only. Preview publication and commit receipt are recorded in docs/elegant-actions. These pages preserve failed candidates honestly and do not supersede the approved Idle pages.
