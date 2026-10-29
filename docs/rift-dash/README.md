## Rift Dash acceptance evidence

Game commit: `912328f8`, pushed on `feat/stronghold` and deployed to https://ark-whachat.fural.space using the existing release script from a clean committed worktree. Peer shadow/asset WIP was excluded from the release and preserved in the shared clone.

- Mobile: hold the gold hexagon, drag to aim, release to dash. Tap without dragging opens skill equip, including during cooldown.
- Desktop: aim at the world and press the equipped slot key (usually 2), or click the hexagon to cast using the last world cursor aim. Right-click inspects; K opens the Pixi Skill Tree.
- Rift Dash alone is manual. Other skills retain their automatic casting.
- Movement sweeps up to 1.5 tiles in 0.05-tile steps, stopping at blockers/cliffs. Fully blocked casts consume no cooldown. Arrival damage uses the actual endpoint.
- All new control, icon, aiming and trail UI uses Pixi Graphics / MSDF text.

`local-verification.json` and `live-verification.json` record before/after hero positions for desktop, portrait touch and landscape touch. Tests use Playwright Chromium with mobile touch emulation and actual pointer/key casting inputs. The live run also checks drag direction and touch cancellation. Go tests cover the authoritative queued input, cooldown, invalid aim, equipment and automatic-cast exclusion.

The generated artwork is a concept illustration, separately labeled from real gameplay screenshots. Its normalized prompt is in `artwork-prompt.txt`; the built-in image_gen tool used original 68079.jpg as the edit target and 68083.jpg as a styling reference. It is attached in the task room and inline in the existing Rift Dash Knowledge page. Both original inline references were preserved and matched against fresh DA downloads by SHA-256.
