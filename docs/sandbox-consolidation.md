## Canonical preview

Use https://arkadia-stronghold-whachat.fural.space/ for the arena, `/stronghold.html` for Stronghold, and `/expedition.html` for Expedition.

On 20 October 2026 the three custom sandboxes were consolidated into `arkadia-stronghold` (`CS13a31c114a666008eb9cafa5`), the last-created sandbox with the latest character release. The original `arkadia` and incomplete `arkadia-expedition` were deleted. They were separate preview environments for successive feature work; Expedition had no boot process or HTML entry.

The two active previews had identical HTML entries. Stronghold retained its later character overlays. Before deletion, 28 resources unique to the old main preview were transferred in `consolidated-legacy.gz` and loaded by the retained boot script. All 191 resulting public resources were fetched and checked against SHA-256 manifests. Knowledge links were updated to the retained host.

Future incremental releases must read the current live loader, preserve existing overlays, and publish only to the retained sandbox. The three publisher scripts reject other target IDs.

Browser saves are scoped to the hostname. Use the existing JSON export/import for progress transfer; sandbox consolidation does not merge browser localStorage.
