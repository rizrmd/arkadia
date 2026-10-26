## Solo active skill persistence — 27 October 2026

Learned active skills and equipped slots now survive refresh and reopening the solo game. Rift Runner and Ember Warden have separate records. Every saved active, including a fourth learned but unequipped skill, returns at Lv. 1 and can be equipped or used immediately without another blessing or payment.

Run-only progression retains its existing lifecycle: level, XP, run gold, passive blessings, stars, additional active ranks, queued choices, cooldowns and combat effects start fresh on reload. Restored base ranks do not count toward cards spent in the new run. Tier gates, owned-skill rank-up bypass, four learned actives and three equipped slots remain intact. Diagnostic co-op continues to use the authoritative server run and never hydrates or writes solo skill records.

Unlocks are written immediately to versioned per-hero records, independently of the Stronghold economy and inventory. Existing Mage Tower purchases remain saved as before. A failed write preserves the pending blessing or old loadout and displays English feedback inside Pixi. Malformed, unsupported-version and cross-hero records are retained rather than silently overwritten. Missing records use the original starter skill; progress lost before this fix was never saved and cannot be reconstructed. Settings → Reset Progression explicitly clears both heroes' unlocks and loadouts while preserving preferences and hero choice.

### Verification and release

Feature `238d9644`, integrated game release `b73b0fc1`, pushed to `feat/stronghold` and `fix/permanent-skill-unlocks`. Latest gate-health and Houdini peer commits were included; shared-clone uncommitted files were preserved. Deployment used the supported `scripts/fural-deploy.sh` game pipeline. Layer: `1793041610507-game-b73b0fc1-d22bd858e2e3`.

- Production and live browser checks passed for **both heroes** at **1440×900 desktop** and **390×844 touch/mobile**, with **zero page errors**. Actual Pixi blessing selection, failed-save rollback/retry, two reloads per case, learned tree node, casting without repurchase, independent hero records and unchanged legacy currency/inventory passed.
- Deterministic checks cover XP/roll/choose, four learned/three equipped, an unequipped fourth skill, persisted swaps, temporary progression reset, fresh-run tier gates, paid Mage Tower rank retention, missing/invalid/future saves, failed writes and the explicit reset allowlist.
- Existing progression/settings tests, **608 TypeScript/Go parity cases**, all Go tests, production builds, co-op smoke and the supported release checks passed.
- Public health and game return HTTP 200. The live main client bundle exactly matches the deployed release archive by SHA-256.

[Play Arkodia](https://ark-whachat.fural.space/) · [Live browser report](https://ark-whachat.fural.space/ember-warden-review/skill-unlocks/browser-live.json) · [Local browser report](https://ark-whachat.fural.space/ember-warden-review/skill-unlocks/browser-local.json) · [Deterministic checks](https://ark-whachat.fural.space/ember-warden-review/skill-unlocks/unit.json) · [Release verification](https://ark-whachat.fural.space/ember-warden-review/skill-unlocks/release.json)

Reproduce with `node scripts/skill-unlocks/test.mjs` and `VERIFY_URL=https://ark-whachat.fural.space node scripts/skill-unlocks/browser.mjs`. No HTML/React game UI was introduced.
