## Mine build and upgrade panels

Native Pixi planning panels for build 1 and upgrades through 30, with exactly one completed-Core target-level prerequisite. Costs follow the unchanged 150 Gold / 100 Wood / 3 real minute baseline with direct exponential scaling. Transactions remain unavailable, matching Farm.

The new transparent Mine portrait was generated with built-in image_gen using the approved Core panel and Mine world art as references. The complete usable kit combines it with approved Core kit-v2 generated components. Exact prompt, manifest, SHA-256 hashes and PNG source ZIP are under public/mine-panels/kit/.

Checks: `npx tsc --noEmit`, `node scripts/mine-panels/test.mjs`, `node scripts/mine-panels/browser.mjs`. Thirty target captures include exact text assertions. The integrated five-module fixture checks hidden/disabled external badges, close, Escape, peer modal and destruction restoration. Captures use actual Pixi modules, outside the full world loading pipeline.

Deploy: use the cumulative release prepared with the Walls session, retaining Core/Kitchen/Farm/Lumber/Mine and Walls. Shared lock: ~/releases/arkodia-deploy.lock. Verify via `node scripts/mine-panels/verify-live.mjs`, then publish the scoped evidence layer with `bash scripts/mine-panels/deploy-evidence.sh`. Existing saves and published maps are retained by the standard release publisher.

A cumulative six-module check including Walls passes: `node scripts/mine-panels/integration.mjs`; evidence is integration.json.
