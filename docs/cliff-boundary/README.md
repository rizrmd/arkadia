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

Final cumulative release: `f2fd319f9c6e125a41623962d46571fa3a80d4c7` retains persistence, Pixi Settings and this cliff fix. All 41 manifest client files match SHA-256; backend build matches. All 14 public keyboard/touch/recovery cases pass again. See `cumulative/both.json` and `cumulative/release-verification.json`. The initial release was temporarily superseded by a peer persistence-only release; coordinated cumulative deployment resolved it.

Shipped and publicly verified: `d775613a75b2bb4df97279c33397ec70cd8eab8b` at https://ark-whachat.fural.space. All 42 manifest client files match SHA-256; the running server reports the new authoritative movement boundary. Public desktop/mobile browser tests pass all 14 cases, including legacy position recovery. See `live/both.json` and `live/release-verification.json`.

The supported `scripts/fural-deploy.sh` packages the game server and client together. It includes these captures and an exact client/binary SHA-256 manifest at `/cliff-boundary/release.json`. `/healthz` exposes `movementBoundary: hill-foot-contour-v1` so the running authority can be verified separately from static files. Public release checks and public browser reports are written to `live/` after deployment.

## Commands

- `node scripts/cliff-boundary/parity.mjs`
- `node scripts/cliff-boundary/test.mjs`
- `ONLY=desktop node scripts/cliff-boundary/browser.mjs` (Ember; `ONLY=mobile` for touch)
- `HERO=rift-runner OUT=docs/cliff-boundary/verified-rift ONLY=desktop node scripts/cliff-boundary/browser.mjs`
- `BASE_URL=https://ark-whachat.fural.space OUT=docs/cliff-boundary/live ONLY=mobile node scripts/cliff-boundary/browser.mjs`
- `RELEASE_COMMIT=<shipped SHA> node scripts/cliff-boundary/verify-release.mjs`

Shared base clone and peer worktrees are preserved. Releases serialize through `$HOME/releases/arkodia-deploy.lock` and must retain current public ancestry.

Cumulative verification: `MANIFEST_PATH=/settings-pixi/release.json REQUIRE_ANCESTOR=d775613a RELEASE_COMMIT=f2fd319f9c6e125a41623962d46571fa3a80d4c7 OUT=docs/cliff-boundary/cumulative node scripts/cliff-boundary/verify-release.mjs`.
