## Directional Run repair

Both selectable heroes have new imagegen-authored NE/E/SE Run artwork, normalized into the existing 384 × 384 cell grid with pivot (192, 360). NW/W/SW mirror those canonical directions. N/S retain their artwork, re-ordered from alternating left/right variants into contiguous gait phases. One complete eight-frame cycle takes 800 ms at 10 fps in all directions. Gameplay movement constants are unchanged.

The old N/S source ordering alternated opposing contacts nearly every frame, while side rows grouped similar leg poses. Exact duplicate hashes alone did not explain the visual cadence mismatch: the important difference was repeated gait phases and cycle ordering. The runtime also selected SE/SW during horizontal movement, making E/W authored artwork unreachable. It now uses horizontal-angle hysteresis to select E/W and retains one gait clock through direction changes.

Sprite Player uses regenerated Run sheets at full and half resolution, with hash revisions. Skill Player and FX Lab now offer a Run pose selection (`?pose=run`), rendering the same packed game atlas. Skill mode still plays Attack. Only Run cells are replaced in each game atlas. `atlas-proof.json` checks all 130 non-Run frames per hero against decoded pre-edit pixels, including the Attack sheets integrated in a9ec0af.

## Image generation

Built-in imagegen was used, with transparent backgrounds. Six final assets are in `public/run-cadence/source/{hero}-{NE,E,SE}.png`. Each uses the corresponding identity reference extracted from the existing sheet. The prompt set requested: “NEW eight-frame run animation of this exact character. Sprite sheet EXACTLY FOUR COLUMNS TWO ROWS, eight full-body figures, fixed [NE back three-quarter / E right profile / SE front three-quarter] view, equal cells, consistent scale, transparent background. Chronological phases: left contact, compressed left support, left push-off/right knee forward, airborne right reach, right contact, compressed right support, right push-off/left knee forward, airborne left reach. Exchange arms and legs at frame 5. Preserve identity, costume, colors and detailed painted fantasy style. No labels, grid, ground, shadows or VFX.” Ember SE required an additional imagegen background-extraction pass. Earlier rejected grid candidates are retained in `public/run-cadence/candidates` for the Knowledge inline image record.

## Rebuild and verification

1. `node scripts/sprite-player/build-run-cadence.mjs`
2. `node scripts/sprite-player/prepare-sample.mjs --force --run-only`, then copy only Run outputs to `public/sprite-player/sheets`.
3. `node scripts/sprite-player/patch-run-atlases.mjs` replaces Run cells in the existing game atlases and preserves all other poses.
4. `npm run build`
5. `node scripts/sprite-player/verify-run-cadence.mjs`
6. Deploy via `scripts/fural-deploy.sh`; run `BASE=https://ark-whachat.fural.space node scripts/sprite-player/verify-run-cadence.mjs`.

`verification.json` and `verification-live.json` record checks for both heroes in every direction across Sprite Player, Skill Player, FX Lab and Stronghold. The live check additionally compares atlas SHA-256 bytes to local assets. The synchronized `/run-cadence/` review compares all sixteen hero/direction combinations at once, with a shared frame scrubber and foot-pivot marks.
