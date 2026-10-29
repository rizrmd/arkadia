## Tent shadow correction

The report showed a narrow strip detached from the tent volume at 13:00. The column-based folded billboard collapsed the depth of the roof. The tent now has explicit pitched-roof, eave, wall, rope and ground-stake geometry, while the original image alpha defines its silhouette. Both the WebGL shadow field and fallback ground caster use this geometry. Existing collision and occlusion code is unchanged.

Implementation: `56e11b9a`, pushed on `feat/stronghold`. Clean release `b5837c44` was deployed with the tracked `scripts/fural-deploy.sh`; later shared releases retain the fix.

Verification: geometry assertions; 47,683 shadow-field regression checks; TypeScript/Vite build; Android scenery alpha checks; Go tests and co-op smoke checks. Live morning, 13:00 and evening captures reached a ready shadow field with no JavaScript page errors. See `live-summary.json`, `deployment.log`, `live/live-.3.png`, `live/live-.5416667.png`, and `live-evening/live-.72.png`.

The live suite required separate runs because a sandbox OOM and concurrent releases interrupted loading; the final summary combines the successful captures. These are emulated phone viewports in software Chromium, not device performance measurements.

Reproduce: `BASE_URL=https://ark-whachat.fural.space TIMES=.3,.5416667,.72 node scripts/verify-tent-shadow.mjs`.
