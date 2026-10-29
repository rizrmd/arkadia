# Release staging folder cleanup — 21 October 2026

`before.png` is the reported file tree: 17 `publish-*` folders (~150 MB) at the repo root.

Each packaging script wrote its own root folder, and ad-hoc chunk copies
(`publish-stage-*`, `publish-fortress-remaining`) were left beside them. Since
`3ceb644` every script stages under the single ignored `.publish/<name>/` folder:

| Script | Output |
|---|---|
| `scripts/package-site.mjs` | `.publish/site` |
| `scripts/package-isometric.mjs` | `.publish/isometric` |
| `scripts/package-fortress-update.mjs` | `.publish/fortress-v2` |
| `scripts/package-mobile-fortress.mjs` | `.publish/mobile-fortress` |
| `scripts/publish-angle-alignment.mjs` | `.publish/angle-alignment` |
| `scripts/publish-vertical.mjs` | `.publish/vertical` |

Existing staging output was moved into `.publish/`. The stage copies were
byte-identical duplicates of chunks already in `.publish/fortress*` and
`.publish/isometric`, so they were deleted.
