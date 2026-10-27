## Developer menu availability

The reported Bad Gateway was reproduced on 27 October 2026. All twelve developer menu paths first returned HTTP 200; during another release the same paths returned `404 unknown sandbox domain` and Cloudflare 502. The sandbox boot log showed a release being applied at that time. DNS records correctly point the domain at the existing sandbox.

The publisher previously power-cycled the entire sandbox for every release, temporarily removing its public routing and gateway. It now applies ordinary asset and game layers through an owner-only local Unix socket while the gateway continues serving `/dev` and independent players. Archive spooling uses one reusable 1 MiB buffer; extraction runs asynchronously. Files are replaced with atomic renames and the game entry page is replaced after its assets.

Review layers keep the game process running. A changed game executable is replaced atomically, then the old game process receives SIGTERM to flush its normal persistent saves before the replacement starts. Existing save storage stays at `game-saves/`. Co-op clients may reconnect during a game binary update. Gateway source upgrades still require replacing the boot process once, without powering off the sandbox or removing its network/domain bindings.

A failed live application is reported to the publisher; it never silently falls back to a sandbox power cycle. The local control socket is not a public HTTP endpoint.

## Verification

- `node scripts/arkodia/verify-live-release.mjs`: continuous real HTTP requests across review and full game releases; unchanged gateway PID, graceful game save, corrupt archive failure with existing pages still available.
- `node scripts/arkodia/verify-publish-lifecycle.mjs`: publisher uses live apply, boot-only gateway upgrade, and explicit failure without power cycling.
- `node scripts/arkodia/verify-release-memory.mjs`: a 96 MiB archive following a 64 MiB JSON layer stays below the existing 100 MiB gateway RSS limit.
- `node scripts/arkodia/verify-json-layer-memory.mjs`: streaming JSON decoding and validation remain intact.

Local results: [local-verification.json](local-verification.json). Public deployment results are recorded in [live-verification.json](live-verification.json).

## Public result — 27 October 2026

The gateway upgrade was deployed with the supported publisher. A subsequent real review layer applied with the same gateway PID throughout: **78 public HTTP requests, zero failures**. `/dev` and all twelve menu destinations returned HTTP 200, as did their external entry scripts. Chromium rendered both the Pixi developer menu and the dedicated Rift Dash player without page exceptions or HTTP failures. No game build or save data was replaced by this gateway-only deployment.

Browser evidence: [browser-verification.json](browser-verification.json). Re-run `node scripts/arkodia/verify-menu-public.mjs` under the deployment lock to publish a small diagnostic layer while monitoring menu availability; `node scripts/arkodia/verify-menu-browser.mjs` checks the live Pixi pages.
