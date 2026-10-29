## Farm build and upgrade panels

Previous/Next controls browse every target; Return to current resets without save changes. The Farm badge sits below Core and stays within narrow viewport bounds.

Native Pixi image-backed details for Build 1 and upgrades 1→2 through 29→30. The only displayed prerequisite is completed Stronghold Core level equal to the target. Resource costs and operation duration are separate. Level 30 has no next recipe.

Gold = ceil(150 × 1.25^(target−1)), Wood = ceil(100 × 1.25^(target−1)), real minutes = ceil(3 × 1.20^(target−1)). The published Farm economy is unchanged.

The Farm-specific header was generated using built-in imagegen. Original RGBA image, exact prompt, hashes, shared Core imagegen component references, and all-target coverage are in public/farm-panels/kit. No baked dynamic text or procedural ornament substitutes.

The runtime reads optional farm.completedLevel metadata (default Not Built) without mutating saves. As in the existing Core and Lumber panels, build/upgrade transactions and persistent queues are not released; the operation button is explicitly unavailable. No provision baseline or Kitchen production rule is invented.

Verification: node scripts/farm-panels/test.mjs; node scripts/farm-panels/browser.mjs; npx tsc --noEmit. Browser captures include all 30 targets, desktop/mobile bounds, pointer interaction, Escape, proximity, co-op hiding, and maximum level. The browser fixture uses an isolated Vite cache and a real TypeScript entry to avoid duplicate Pixi instances.

Release: scripts/farm-panels/deploy.sh uses the shared arkodia-deploy.lock, rejects missing live ancestry, tests and compiles the cumulative game, then publishes a release layer.
