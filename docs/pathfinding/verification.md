## Pathfinding and recovery

Player routes start at the actual foot position rather than replacing a rounded grid cell with an unchecked start. Every grid edge and final target connector is swept against collision and cliffs. String pulling rejects invalid segments. An overlapping starting footprint is left by a checked exit leg; corner waypoints slow the hero and are followed closely to avoid clipping. Manual keyboard or stick input still immediately cancels automatic walking. Existing bounded retries and gateway opening remain in place.

Revenants in both solo TypeScript and authoritative Go co-op simulation use bounded A* detours when their direct approach is obstructed. Routes can initially move away from the hero to escape concave obstacles. Edges are sampled every 0.05 tiles against footprints, safe zones and cliffs. Searches stop after 4,096 expansions, cache detours for 750 ms, and replan when targets move or the next leg becomes obstructed. Step distance is capped at the waypoint distance. Embedded enemies retain their existing movement escape rule. No movement teleport or reward/state changes are introduced.

## Verification

- `node scripts/verify-pathfinding.mjs`: U-shaped obstacle escape, moving and unreachable goals, collision-safe player detour, non-grid destination, footprint-overlap recovery, already-arrived destination and manual takeover.
- `node scripts/verify-relief.mjs`: cliffs block; ramps climb and descend; dense client/server terrain parity remains unchanged.
- `cd server && go test ./...`: complete server suite, including mirrored concave detour and thin obstacle/cliff sweep regression tests.
- `npx tsc --noEmit` and production Vite build: pass.

## Release

`scripts/pathfinding/ship.sh` builds committed source in a detached tree under the shared deployment lock and publishes the client plus matching Go server through the supported Arkodia release-layer publisher. Static artwork from existing releases is retained. `/pathfinding/release.json` identifies the deployed commit.

Search budgets keep planning bounded; an entirely sealed or unreachable destination cannot be reached. Player routing retains the existing 12 px resolution and enemies use a 0.25 tile grid.
