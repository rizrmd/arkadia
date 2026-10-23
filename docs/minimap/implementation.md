## Transparent minimap

Shipped in commit 95943be on feat/stronghold, using the supported scripts/fural-deploy.sh release workflow. The isolated game release included terrain peer commit 4e42377 and preserved shared uncommitted work.

A compact transparent overlay follows the player below the existing top-right telemetry. The gold frame is 1 CSS pixel; cyan indicates the player's actual ground position and movement heading. It does not intercept pointer input. The geometry remains in Pixi graphics on the GPU; movement changes only transforms.

Geometry comes from the real court, placed ramparts/bastions, built building slots, terrain relief outlines and map boundary. Building symbols are simplified footprints sized from slot width. Court-local world pixels are unprojected with the shared 2:1 isometric transform; map coordinates add STRONGHOLD_ORIGIN. Terrain elevation is excluded from tracking. No decorative map raster, network requests, extra ticker, or new renderer is added.

The local view spans 32 projected tile units so the stronghold stays readable on the 936-tile world. At distant empty snow, the map correctly contains only nearby real geometry; boundaries enter the viewport near map edges. The marker stays centered while the map scrolls beneath it.

## Verification

TypeScript/Vite build, Go tests and release smoke checks passed. Local and deployed browser checks passed at 390×844, 320×568, 844×390 and 1440×900, with no player-console, telemetry or skill-socket overlap. Sizes are 103×103, 85×85, 109×109 and 148×148 CSS pixels respectively. Keyboard movement changed both tile position and heading. Three reachable corner/edge positions verified court-to-map offsets, including map U=0.5 and V=0.5. No page errors were reported.

The local 5,000-update microbenchmark averaged 0.00262 ms per update. This measures minimap CPU transforms, not total gameplay GPU/frame cost; software-rendered browser FPS is not a physical-device performance measurement. The current map has 22 static geometry primitives.

The deployed verifier uses timed readiness polling: animation-frame polling stalled in two runs even though a separate live diagnostic loaded successfully. The final live report passed with timed polling. Portrait/desktop/landscape screenshots are included alongside local and live JSON reports.
