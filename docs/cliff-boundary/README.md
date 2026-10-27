## Change

Task zvjcirtiepnkiphromouebju aligns player feet with visible cliff snow surfaces. Original discussion image DAe06780879164f7cca906791f identifies the west terrace.

The old height function added invisible one-meter shoulder rises. Collision checked only changes in foot-center height. The fix uses the same atlas-fit bounds for rendering and collision, removes the invisible rises, checks the 9 × 4.5 world-pixel foot ellipse against the snow-top contour (mirrored for the terrace), and sweeps movement at four-pixel intervals. Rock faces and alpha snow skirts remain outside the walking surface. Solo navigation, auto-walk, prediction, server walking and server dash collision use the shared terrain rules. No game UI changes.

If the new contour invalidates a legacy saved foot, startup searches nearby ground at the same height before trying the usual spawn. This also works when built props block the usual spawn. Ordinary valid saves are unchanged. Full gameplay persistence remains owned by the peer task.

## Verification

- TypeScript and all Go packages pass, including existing traversal, authority, gate and skill collision regressions.
- 7,290 dense client/server contour samples agree; the revised height golden covers 21,901 samples.
- Sixteen directions from four summit/ramp positions remain within the surface. Large steps cannot tunnel across a hill.
- Recovery tests cover both hills, height preservation, a fully blocked search and unchanged court positions.
- Real desktop keyboard and trusted portrait-mobile touch tests pass for both Ember Warden and Rift Runner: terrace back/front, ridge corner/side, diagonal input, ramp ascent/descent. Rift Runner tests additionally verify recovery from an unsafe legacy save and all intermediate samples at full precision.
- See `verified/` (Ember) and `verified-rift/` (Rift Runner). Browser presentation pauses between captures; real game simulation and controls continue with sparse 100 ms clock advances. This avoids hundreds of redundant software-GPU frames. The tutorial is marked seen in test storage so the feet remain visible.
- Earlier `before/` images are baselines. Earlier `after/` images are incomplete attempts and are excluded from acceptance.

## Release

The supported `scripts/fural-deploy.sh` packages the game server and client together. It includes these captures and an exact client/binary SHA-256 manifest at `/cliff-boundary/release.json`. `/healthz` exposes `movementBoundary: hill-foot-contour-v1` so the running authority can be verified separately from static files. Public release checks and public browser reports are written to `live/` after deployment.

## Commands

- `node scripts/cliff-boundary/parity.mjs`
- `node scripts/cliff-boundary/test.mjs`
- `ONLY=desktop node scripts/cliff-boundary/browser.mjs` (Ember; `ONLY=mobile` for touch)
- `HERO=rift-runner OUT=docs/cliff-boundary/verified-rift ONLY=desktop node scripts/cliff-boundary/browser.mjs`
- `BASE_URL=https://ark-whachat.fural.space OUT=docs/cliff-boundary/live ONLY=mobile node scripts/cliff-boundary/browser.mjs`
- `RELEASE_COMMIT=<shipped SHA> node scripts/cliff-boundary/verify-release.mjs`

Shared base clone and peer worktrees are preserved. Releases serialize through `$HOME/releases/arkodia-deploy.lock` and must retain current public ancestry.
