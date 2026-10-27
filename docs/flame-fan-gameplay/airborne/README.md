## Airborne Flame Fan correction

The approved projecting burst and ember v2 now use the world-effects layer (zIndex 38), independently of soil (zIndex 22). The burst starts 44 world pixels above its unchanged combat origin and rises another 22 pixels along its forward reach. Ember billboards follow the same elevated trajectory, including reveal advance and sway. Soil plates, fissures, low flames, smoke and cinders retain their existing ground-relative composition.

Air and soil have separate cached object-occlusion masks. Ground masking uses flat-plane coverage; airborne masking samples the elevated projected position while retaining the world foot for depth. Both retain radial wall-sector clipping. The native Pixi render-texture path and canvas fallback use the air mask. Existing three-cast pooling and lifetimes remain unchanged. No texture artwork, combat radius, damage, cooldown, progression, save format or network timing changed.

### Verification and evidence

Baseline: a12892f7. `before/` contains matched actual gameplay frames from that source; current frames use the corrected source. Both use the same test-only encounter clock, empty server-environment fixture and normal production Pixi scene, with seeded diagnostic targets and ranks. They are repeatable renderer/gameplay captures, not physical-device measurements. All five ranks cover five aim directions on 1440×900 desktop and 390×844 touch viewports.

`local-game-1440.json` and `local-game-390.json` verify forward damage, behind/outside exclusions, no projectile addition, unchanged radius, Burn Soil five ticks at ranks 3–5, no pending tick damage, expiry, and real Pixi keyboard/touch skill-tree controls. `comparison.json` verifies unchanged soil state against baseline and positive screen-space origin separation in all ten cases. `renderer-verification.json` independently checks all ranks, approved texture, world layering and expiry through the actual effect renderer.

`human-reference.png` is the unmodified discussion attachment DA6ab8609e7597f6565c432567 that prompted this correction. Each `*-burst` frame shows airborne fan above soil; tail frames retain ground-only fading composition. PNG captures are archived as lossless WebP with decoded RGBA equality verified, except the original human reference which retains its bytes.

TypeScript, production build, progression, persistence and Go checks run before deployment. Public verification records the client/server release SHA, all compiled file hashes and unchanged approved asset pixels. Public browser validation uses the unmodified production bundle and diagnostic target/rank seeding; bounded failures and their limits are recorded honestly in the report.
