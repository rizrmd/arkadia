## Approved projecting Flame Fan in gameplay

The human approved the directional sprite from asset review #JQHWD (asset publication 21c29725). This task integrates that original sprite into playable Ember Warden Flame Fan ranks 1–5. No new image was generated. Source bytes and asset review remain intact.

The cast has a 420 ms windup, then a forceful outward reveal, moving flame streams and a fade over 850 ms. The original 108° ground sector, cast direction, authoritative radius, wall rays and object mask bound the burst. One shared source texture uses Pixi's existing WebGL2 context with pooled render textures, at most three active bursts and 30 Hz effect updates. The fallback uses the same source with canvas strip animation. Actor depth, hand ignition, contact effects and existing animated soil embers remain in place. Burn Soil reuses the approved revision-6 crust-a/crust-b, straight fissure and coal crops, baked once into each clipped ground footprint. Static review pages remain historical references.

| Rank | Radius (tiles) | Damage multiplier | Base cooldown (ms) | Burn Soil |
|---|---:|---:|---:|---|
| 1 | 4.400 | 1.00× | 1400 | None |
| 2 | 5.192 | 1.25× | 1288 | None |
| 3 | 5.984 | 1.50× | 1185 | Five events over 1 second |
| 4 | 6.776 | 1.75× | 1090 | Five events over 1 second |
| 5 | 7.568 | 2.00× | 1003 | Five events over 1 second |

These are existing rank values before other buffs/combos. The initial-hit factor remains 0.78. Burn Soil events stay at +200/+400/+600/+800/+1000 ms after release; damage amount/formula is still unset, so no additional HP damage is applied. The existing 0.38-tile target collision allowance remains unchanged. Rank growth retains the documented broad gameplay reach, including on phones.

HUD touch/click and the configured skill shortcut open native Pixi inspection/equip controls. Flame Fan casts automatically when equipped and a foe enters the existing engagement radius. Level-up choices learn/upgrade it; existing cap, tree gates, loadout rules and solo-only loadout editing in co-op are retained. No HTML/React UI was added. UI and documentation are English.

## Authority and persistence

Solo captures rank, radius, damage and geometry when the cast starts. Co-op now also queues damage for the 420 ms release (quantized by the existing 20 Hz server) instead of applying it at cast start. The server captures origin, aim, rank and damage, owns hits/rewards, and sends cast geometry for local visual replay. Movement or upgrades during windup cannot change a pending hit. Client hit/reward claims are not accepted.

Pending authoritative casts survive server checkpoints without advancing offline or duplicating damage. Active client bursts save/restore their remaining phase; old saves without burst state retain the previous Burn Soil reconstruction path. Existing complete gameplay persistence is merged and preserved.

## Verification evidence

`local-game-1440.json` and `local-game-390.json` run actual combat/render modules with a test-only controlled simulation clock. They cover five ranks/directions, three forward targets, rear/range exclusion, original radius, no projectiles, animation, rank-gated soil, five events and expiry without unapproved tick damage. The test clock is never shipped.

`runtime-local-1440.json` verifies the unmodified frame loop, five ranks, and desktop inspection/equip/auto-cast. `live-*.json` records public normal-runtime checks, real keyboard/touch inspection, pointer equip, and normal auto-casts at every rank. Debugger pauses are only for representative captures. Existing diagnostics seed eligible ranks and targets for repeatability; this is not a claim of organically earning every rank or physical-device performance.

Go tests cover all-rank sectors, no early release, immutable cast geometry/rank/damage, no duplicate hit, checkpoint resume, soil gates and pending balance. GPU checks cover source/fallback parity, zero extra WebGL contexts, zero steady-state flame uploads and the three-burst cap. Two Ember clients verify identical authoritative snapshots and rejection of forged damage/rewards.

The additive cumulative game release uses `scripts/flame-fan-gameplay/deploy.sh`, the normal shared lock and existing versioned `publishRelease` pipeline. Compiled client/server, approved asset and evidence ship while existing artwork/players remain. `release.json` identifies the runtime commit; deployment and public verification are recorded separately.
