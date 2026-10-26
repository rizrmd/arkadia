## Active Rift Dash Skill Tree correction

Rift Dash retains its active kind and English name. The Skill Tree now shares the Equipped gold hexagon geometry and stroke renderer (`src/typography/skill-hex.ts`), cropping the existing artwork with a six-sided Pixi mask. Rank pips, level plate, slot badge and other skills retain their behavior. No HTML/React controls were added; manual dash and the dedicated VFX player are preserved.

Reference: original discussion attachment DA673a21d3f11b4d9177d738a0, downloaded via messages download-attachment and inspected without preprocessing. Preserved inline in the existing Rift Dash Knowledge page, along with the two earlier references, artwork and player.

`node scripts/rift-dash/skill-tree-verify.mjs` and `VERIFY_URL=https://ark-whachat.fural.space node scripts/rift-dash/skill-tree-verify.mjs` passed at desktop 1440×900, touch portrait 390×844 and touch landscape 844×390. Checks cover active kind, hexagon before/after learning and swapping slots, five rank pips, slot badge, actual tree input and manual dash displacement (1.5 tiles). No page errors. Touch uses Chromium emulation, not physical devices. The first local screenshot attempt exceeded 30 seconds; the complete rerun using 120-second screenshots passed.

TypeScript, production build, Go tests and the 40-second co-op smoke check passed. The retained dedicated player passed an actual Pixi Arrival-button click at 760×560, and live health returned 200.

The clean isolated worktree preserves shared-clone peer WIP. Latest published integration changes were merged before shipping. `bash scripts/rift-dash/ship-skill-tree.sh` uses the existing supported versioned tgz publisher, shared deployment lock, peer process checks and gateway equality guard. This additive runtime release contains compiled client, matching server and evidence; existing static artwork and dedicated players remain deployed. Runtime commit 36bb272; layer 1793024325994-rift-dash-skill-tree-36bb272-fb25532d0bcc. See deployment.json and local/live-verification.json.


## Final deployment after peer release

A day-cycle peer published an older full-game archive after the first live run, replacing the correction and the gateway with its earlier version. The gateway equality guard rejected publication. The exact routing difference was reconciled against the known pre-Rift-Dash gateway. After the peer completed, merged integration runtime ef60a91 was published as layer 1793026326707-rift-dash-tree-final-ef60a91-c40543ee75b9. Both task and integration branches include the correction. The final desktop, portrait and landscape interaction run passed with no page errors; it rechecked active classification, hexagon, slot swapping and manual displacement without repeating the screenshots. See final-verification.json. Earlier live screenshots show the same correction from the initial release.
