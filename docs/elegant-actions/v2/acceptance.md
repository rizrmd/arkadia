## Current outcome

Incomplete: Hurt and Death have directional corrections; Run fails visual acceptance for both characters. Never integrate these Run candidates into gameplay or label them final.

The v2 six-sheet review is deployed at https://ark-whachat.fural.space/rift-runner/elegant-actions/v2/ . All six exports are 3072 × 3072 RGBA, eight direction rows N/NE/E/SE/S/SW/W/NW, eight 384-square frames per row. All 384 cells are distinct and have transparent margins; original source figures have no image-border contact. Distinct hashes do not prove distinct animation phases.

## Run failures

The four-pair source method covers all sixteen character/headings: pairs map to frames 1/5, 2/6, 3/7 and 4/8. Candidate review found repeated foreground-leg overlap despite opposite arm phases, emitters/gauntlets changing anatomical arm in multiple NE/NW panels, and inconsistent generated body scale between pairs. North flight sources also enlarge the body versus contact poses. A fixed atlas scale cannot repair these source errors. Front passing poses have inconsistent body height; wide coat tails force smaller bodies in SW/W. The frame-8-to-1 seam therefore cannot pass.

Targeted retries included explicit anatomical guides, explicit near/far overlap descriptions, guide-first references, reordered contact references without mirroring, one-figure generation, and a precise source edit. They did not resolve the failures. Retrying the same paired prompt has not provided reliable opposite-leg motion. Original and rejected sources, exact recorded prompts and diagnostic guides remain in the task directories and inline in Knowledge.

## Verification

- `node scripts/elegant-actions/assemble-run-v2.mjs`: two Run candidates assembled without clipping, one scale per heading, head X registration and support/flight sole Y360/Y348. This does not certify stable body scale or anatomical gait.
- `node scripts/elegant-actions/verify-v2.mjs`: six sheets / 384 cells structurally pass; visual rejection explicitly retained in report.
- `ACTIONS=hurt,death,run node scripts/elegant-actions/verify-player-v2.mjs`: local browser PASS, 16 behavior checks, all 384 direction/frame selections, Death holds final frame, Run continues beyond a cycle.
- Same browser command with `BASE=https://ark-whachat.fural.space/rift-runner/elegant-actions/v2/`: live PASS, no page/HTTP errors. Playback behavior is separate from artwork acceptance.
- `node scripts/elegant-actions/publish-v2.mjs`: supported persistent custom-sandbox layer, 22 resources hash verified; game homepage hash unchanged. No live gameplay sprites replaced.

## Remaining work

Correct Run anatomical arm consistency, true opposite leg phases, consistent body scale, continuous cloth and frame-8-to-1 seams, then re-review every cell on dark/light backgrounds. Only after visual acceptance may the two Run exports become finals and the complete six-sheet task be marked done. The full original scope remains unfulfilled.
