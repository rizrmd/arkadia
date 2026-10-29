## Closed tent shadow volume

The prior camera-height sheet left openings in projected cloth shadows because it represented visible fabric without the far walls/floor. The new proxy has two pitched roof faces, front/back gables, two walls and a floor. It uses the existing 756 × 498 artwork reference plane. Eaves remain at reference height 142; ridge heights 294/267 place the front/back ridges over the ground footprint midlines. These are authored geometry heights, never brightness measurements.

Native geometry now accepts explicit face topology and receiver-face indices. Original source alpha clips every face. Original-alpha ropes, poles and ink outside the body retain their nearest authored structural height. The height callback now applies pivot, mirror, shear and lift consistently. The proxy is approximate geometry, not recovered measured tent volume.

Validation: 92,928 numeric checks; closed-body edge incidence, RGB independence, mirror/lift, alpha fringe; 28 existing native prop cases exactly match the prior sampler. Full static rerun: 313 variants, 939 directional cases and 939 independent high/low receiver controls pass. All 296 frontier receiver/color records agree. No collision, navigation, source artwork, pillar or stair geometry changed.

The first refreshed audit had a stale diagnostic texture binding after chunked uploads replaced height texture sources. It exercised cast controls but skipped reception. The diagnostic now binds the current texture before readback and fails when expected receiver pixels are absent. Only the final rerun is reception evidence.

Remaining visual findings: drift-ne, drift-se and drift-mound show layered proxy edges; forge level 3 has a thin opening in the afternoon projection. These are not declared fixed. Physical-device dense-scene performance is also not established by the software GPU tests.
