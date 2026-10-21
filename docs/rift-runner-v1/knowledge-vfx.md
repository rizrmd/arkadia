## Playback and status

[Open interactive animation review](https://arkadia-custom-whachat.fural.space/rift-runner/v1/) · [Browser playback recording](https://arkadia-custom-whachat.fural.space/rift-runner/v1/playback.webm)

Generated assets and independent previews only; the live hero is unchanged. **Rendering verified; final art acceptance blocked. Not game-ready.** Foot sliding, pose popping, emitter-side inconsistency, direction drift and neutral-pose discontinuity remain after targeted corrections. The complete findings are in the [art review](https://arkadia-custom-whachat.fural.space/rift-runner/v1/review.json).

## Separate effects and timing

Body images contain no baked projectile, afterimage, trap or aura layer. Projectile and afterimage each have four phases in eight requested direction slots. Charge/travel/impact/fade are semantic states, not one looping travel animation. Trap and aura each have 12 omnidirectional frames. Trap pull can hold frames 4–6; aura sustain can hold 7–9, with seam cleanup still required.

## Projectile

![projectile animated VFX preview](https://arkadia-custom-whachat.fural.space/rift-runner/v1/previews/projectile-clip.webp)

![projectile-n-ne-e-se calibrated separate VFX atlas](https://arkadia-custom-whachat.fural.space/rift-runner/v1/sheets/projectile-n-ne-e-se.png)

![projectile-s-sw-w-nw calibrated separate VFX atlas](https://arkadia-custom-whachat.fural.space/rift-runner/v1/sheets/projectile-s-sw-w-nw.png)

![projectile actual browser playback screenshot](https://arkadia-custom-whachat.fural.space/rift-runner/v1/evidence/projectile-playback.png)

## Afterimage

![afterimage animated VFX preview](https://arkadia-custom-whachat.fural.space/rift-runner/v1/previews/afterimage-clip.webp)

![afterimage-n-ne-e-se calibrated separate VFX atlas](https://arkadia-custom-whachat.fural.space/rift-runner/v1/sheets/afterimage-n-ne-e-se.png)

![afterimage-s-sw-w-nw calibrated separate VFX atlas](https://arkadia-custom-whachat.fural.space/rift-runner/v1/sheets/afterimage-s-sw-w-nw.png)

![afterimage actual browser playback screenshot](https://arkadia-custom-whachat.fural.space/rift-runner/v1/evidence/afterimage-playback.png)

## Trap

![trap animated VFX preview](https://arkadia-custom-whachat.fural.space/rift-runner/v1/previews/trap-clip.webp)

![trap calibrated separate VFX atlas](https://arkadia-custom-whachat.fural.space/rift-runner/v1/sheets/trap.png)

![trap actual browser playback screenshot](https://arkadia-custom-whachat.fural.space/rift-runner/v1/evidence/trap-playback.png)

## Aura

![aura animated VFX preview](https://arkadia-custom-whachat.fural.space/rift-runner/v1/previews/aura-clip.webp)

![aura calibrated separate VFX atlas](https://arkadia-custom-whachat.fural.space/rift-runner/v1/sheets/aura.png)

![aura actual browser playback screenshot](https://arkadia-custom-whachat.fural.space/rift-runner/v1/evidence/aura-playback.png)


## Public deployment evidence

Live browser playback passed all 66 clips with zero page/resource errors. All 70 initially deployed resources matched SHA-256 against the task package; the game homepage bytes were unchanged by the overlay. [Live playback results](https://arkadia-custom-whachat.fural.space/rift-runner/v1/evidence/live-playback.json) · [Checksum evidence](https://arkadia-custom-whachat.fural.space/rift-runner/v1/evidence/live-byte-verification.json).

![projectile public-site browser playback](https://arkadia-custom-whachat.fural.space/rift-runner/v1/evidence/live-projectile-playback.png)

![afterimage public-site browser playback](https://arkadia-custom-whachat.fural.space/rift-runner/v1/evidence/live-afterimage-playback.png)

![trap public-site browser playback](https://arkadia-custom-whachat.fural.space/rift-runner/v1/evidence/live-trap-playback.png)

![aura public-site browser playback](https://arkadia-custom-whachat.fural.space/rift-runner/v1/evidence/live-aura-playback.png)

