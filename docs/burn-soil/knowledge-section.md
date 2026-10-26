## Burn Soil — timing and visuals shipped; tick damage pending

**Current mechanic update — October 26, 2026.** Lv.1–2 deal initial damage only. Lv.3–5 leave burning ground at the initial hit for exactly **1 second**, with five scheduled tick events at **+0.2, +0.4, +0.6, +0.8 and +1.0 seconds**. There is no immediate damage-over-time tick; the fifth event is processed before expiry. The original initial-hit damage, range, cooldown and walls remain unchanged.

**Balance decision still required:** specify the damage amount/formula for each tick, including whether it varies across Lv.3–5. Existing authoritative TS/Go balance, this Flame Fan page, the Ember Ascension Tree and Progression Knowledge specify only initial-hit damage. Tick damage is explicitly **unset** (`null` client / `nil` server), so **extra HP damage is disabled pending approval**. Five scheduled events and burning-ground visuals run independently. This is not an approved zero-damage balance and the task remains in review.

| Level | Initial hit | Burn Soil duration | Tick events | Extra HP damage |
|---|---|---|---|---|
| 1–2 | Existing balance | None | None | None |
| 3–5 | Existing balance | 1.0s | +0.2/+0.4/+0.6/+0.8/+1.0s | Pending approved amount/formula |

### Interactive Pixi player

<iframe src="https://ark-whachat.fural.space/ember-warden-review/flame-fan-flipbook/" title="Flame Fan — levels and Burn Soil timing, damage pending" height="844"></iframe>

[Open live player](https://ark-whachat.fural.space/ember-warden-review/flame-fan-flipbook/) · [Play Ember Warden](https://ark-whachat.fural.space/?offline=1&hero=ember-warden) · [Release manifest](https://ark-whachat.fural.space/burn-soil/release.json).

Cycle **Level: 1–5**, select **9 Burn Soil** to isolate the ground, or use **Tick +0.2s … Tick +1.0s** to inspect every event. Play/Pause, Replay, Loop, half speed, Day/Night, Reference and timeline seeking remain available. All controls and labels are English, built in Pixi, with no HTML/React UI. The approved **two-thirds hand-relative forward reach**, closer targets, original ignition and broad curls remain intact. This is the current player; the earlier comparison players below are preserved historical baselines.

The preview's illustrative initial contact is at 220ms, so Burn Soil spans 220–1220ms and the five tick buttons inspect 420/620/820/1020/1220ms. Gameplay keeps its existing 420ms cast release; the relative tick offsets are the same. Ground is visible until expiry; the fifth-event inspection correctly shows five events and no remaining ground. The gameplay effect uses the existing sector, wall-ray clipping, cached object mask and ground projection.

![Live phone — Pixi level/tick inspection and burning ground](https://ark-whachat.fural.space/burn-soil/evidence/live-preview-390.png)

![Actual live game on phone — Burn Soil after initial sheet, normal production clock](https://ark-whachat.fural.space/burn-soil/evidence/live-game-390-burn.png)

### Verification and publication

Implementation **96d64f6a** was pushed and deployed through `repos ship --mode script --script scripts/burn-soil/ship.sh`, using the existing versioned release publisher, a shared deployment lock, committed-only detached worktree and one restart. **958 unrelated working-tree files remained untouched.** No test clock hook ships. The normal live game smoke confirms five events, expiry, unchanged HP after the initial hit, and a missing test hook. Initial damage remains server-authoritative online.

- Pure TS scheduling: 35 level/cadence cases across 30/60/144Hz, coarse/stalled/mixed frames, plus exact active/expiry boundaries. Go tests independently verify scheduling, all level gates, initial-hit damage and no unapproved tick damage. TypeScript and the complete Go suite pass.
- Actual gameplay modules: controlled simulation steps at 1440×900 and touch 390×844 cover Lv.1–5, five events only at Lv.3–5, expiry, three initial-hit targets, rear/range exclusion, rotated aim, masks, no projectiles and no tick HP loss. This fixture adds a clock hook through a **test-only Vite transform**; it is never deployed.
- Unmodified live game: phone smoke uses a diagnostic cast followed by the **normal production frame loop**, confirms Lv.3's five events and removal, and captures the real ground effect. This is separate from the controlled fixture; it does not claim to test all automatic-cast input paths again.
- Live player: 1440×900, 390×844, 844×390 and 320×560 pass level gating, boundaries, pointer controls, retained reach and no HTML controls, page errors or failed assets. A cross-origin iframe animates successfully. These are Chromium viewport checks, not physical-device GPU benchmarks. A first 15-second live initialization timeout was resolved with a bounded 45-second startup allowance; no runtime error or missing asset was found.

[Scheduling report](https://ark-whachat.fural.space/burn-soil/evidence/scheduling.json) · [Desktop gameplay](https://ark-whachat.fural.space/burn-soil/evidence/local-game-1440.json) · [Mobile gameplay](https://ark-whachat.fural.space/burn-soil/evidence/local-game-390.json) · [Unmodified live game](https://ark-whachat.fural.space/burn-soil/evidence/live-game-smoke.json) · [Live preview and iframe](https://ark-whachat.fural.space/burn-soil/evidence/live-preview.json) · [Implementation notes](https://ark-whachat.fural.space/burn-soil/evidence/README.md).

Both images above are also delivered as attachments in the originating discussion. Earlier hierarchy, images and approved visual history are preserved below. The historical initial-hit-only descriptions below are superseded by this section for Lv.3–5; extra HP ticks remain pending the explicit balance decision.

---

