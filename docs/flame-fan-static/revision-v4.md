## Static recomposition revision 4

Restores the preferred ac984ad4 composition: original fine crust, fan silhouette, connected low fire runs and quiet ground gaps. The rejected plates-v3 texture is no longer loaded or instanced. No gameplay files changed.

Two supplemental smoke assets are used selectively: smoke-veil-v1 at five sites and smoke-split-curl-v1 at two. Both remain screen-up, reduced in scale and alpha, mixed with original smoke across base/middle/tip. The junction candidate is excluded because its baked flames constrain orientation. Added restrained warm source-glow spill at fire feet and 35 small perimeter fragments. No new final illustration or bitmap art was created.

### Render comparison

section-first-pass.png and local-section.png use the identical 900×700 viewport, scene transform and section query. The first pass made smoke too faint; the second increases its legibility without changing ground framing. Full desktop/mobile renders were inspected afterward. These are an iteration comparison, not proof of equal fidelity to the supplied reference.

Remaining gaps: ground is flatter and more finely pebbled than the target; flame lanes still repeat and have regular directional structure; smoke is less textured/dense, especially at phone scale; warm lighting is a restrained sprite overlay rather than material illumination. The target's irregular large fractures are not reproduced. The earlier rejected plate experiment is not represented as an improvement.

### Verification and shipment

TypeScript and production build pass. Local and public Chromium checks at 1440×1000, 390×844, 320×560 assert revision 4, one canvas, no HTML controls, working Pixi checker/reference controls, stopped ticker, upright air sprites, no page errors and no failed assets. Live section/full screenshots were inspected. These are browser viewport checks, not physical phone tests.

Implementation 62f7b7d2; supported script shipment decf295c (includes preserved peer dbfa1f9b). Public release.json matched decf295cad62ec6add790ad26ef98d15c368f3b2, revision 4 passed, and game /healthz returned ok. Shared deploy lock was acquired normally, never bypassed. Only task-owned paths were staged. Final evidence is recorded in the subsequent documentation release.

Live: https://ark-whachat.fural.space/ember-warden-review/flame-fan-static/
