import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const run=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',maxBuffer:8e6,timeout:60000}));
// Read fresh published bodies so peer edits and every existing inline image survive.
const tree=run(['knowledge','list','--project','PJ8758f22f61165f3d3215e454']);
const ids={progression:'NKBD32edf8ad4d810576bd4f538c',loadout:'NKBDb25945da946ef91f0762494f',mechanic:'NKBDea5d161f87627f236cead806',offline:'NKBDbf2f702c385e77f8993ddacd'};
for(const id of Object.values(ids))assert(tree.some(p=>p.id===id));
const release=await(await fetch('https://ark-whachat.fural.space/gameplay-progress/release.json')).json();
const verified=JSON.parse(await fs.readFile('docs/gameplay-progress/release-verification.json','utf8'));assert(verified.passed&&verified.commit===release.commit);
const local=JSON.parse(await fs.readFile('docs/gameplay-progress/browser-local.json','utf8'));assert.equal(local.cases.length,4);assert.equal(local.errors.length,0);
const checks=`[Desktop/mobile browser checks](https://ark-whachat.fural.space/gameplay-progress/evidence/browser-local.json) · [Live browser checks](https://ark-whachat.fural.space/gameplay-progress/evidence/browser-live.json) · [Co-op server restart checks](https://ark-whachat.fural.space/gameplay-progress/evidence/coop.json) · [Release verification](https://ark-whachat.fural.space/gameplay-progress/evidence/release-verification.json)`;
const intro=`## Complete gameplay persistence — 27 October 2026

Solo gameplay now autosaves and resumes across refresh and a fully closed/reopened browser, separately for Rift Runner and Ember Warden. Refreshing resumes the current game; only an explicit Reset Progression starts over. Skill unlocks stay learned at their saved ranks and require no repeated purchase.

### Saved gameplay

The checkpoint retains level, current/max HP, XP, run gold, elapsed gameplay time, stars, learned active/passive ranks, all equipped slots and pending blessing offers. It also retains position and route destination, hero/enemy combat state and remaining immunity/hit/death timers, enemies/corpses, spawn timer and RNG, uncollected souls, projectile position and prior-hit membership, pending AoEs, burn-soil elapsed time/emitted ticks, skill cooldowns, gate condition/animation/HP and day-clock phase. Active projectiles and pending areas rebuild their Pixi presentation without replaying damage. The current game has no separate poison/slow/buff inventory; all implemented timed gameplay states are retained.

Gameplay and effect timers pause while the page is hidden or closed. Reopening does not advance elapsed play, cooldowns, respawn or effects by wall-clock time. Existing passive Stronghold resource income keeps its established economy behavior.

### Compatibility and save integrity

The existing Stronghold save gains a per-hero gameplay map; existing currency, inventory, buildings, upgrades and reward ledgers are preserved. Old skill-only saves migrate on first use, retaining learned identities and slots; legacy records remain intact. Additional ranks/passives and current progression now resume, superseding the earlier temporary-run limitation. Progress lost before any save existed cannot be reconstructed.

Autosave runs every 500 ms, after choices/loadout changes, when hidden and on pagehide. Exclusive Web Locks serialize gameplay and economy writes; another solo tab waits before starting. Consumable counts and gameplay effects commit together. Revision checks reject stale/reset snapshots. Invalid/future saves stay intact with English Pixi feedback. A saved foot position blocked by a collision update moves only to nearby valid ground while all progression/timers remain intact; no nearby ground leaves the original checkpoint protected. Failed writes pause gameplay and retry the same in-memory state. Settings → Reset Progression explicitly erases both heroes' saved games and legacy unlocks while preserving preferences and hero choice.

### Co-op ownership

Normal play remains solo/offline; developer opt-in co-op stays server-authoritative. The browser retains a private resume credential, not a reward/state claim. Durable server checkpoints retain rooms, RNG, players, cooldowns, souls and effects across server restart. Empty rooms pause; if teammates remain, their shared world continues while disconnected heroes and personal timers wait. Public player IDs cannot reclaim another hero, and reconnect does not silently create a replacement run or accept client HP/reward claims. Explicit Leave ends automatic resume.

### Verified release

Runtime \`${release.commit.slice(0,8)}\` is live at [Play Arkodia](https://ark-whachat.fural.space/). Both heroes passed desktop 1440×900 and touch 390×844 checks with exact repeated refreshes and actual persistent-profile Chromium shutdown/relaunch. Checks include damaged HP/death, active cooldowns/in-flight effects, rank/passive/pending choice retention, souls and reward integrity, independent heroes and paused offline time. Co-op checks include real combat, forged claims, private resume and actual server stop/restart. Release assets were verified against their SHA-256 manifest. No HTML/React game UI was introduced.

${checks}

`;
const updates=[];
for(const [name,id] of Object.entries(ids)){
 const page=run(['knowledge','get',id]);const old=page.markdown;let body;
 if(name==='progression')body=intro+old.slice(old.indexOf('## Monster soul pickups'));
 if(name==='loadout')body=intro+old.slice(old.indexOf('## Loadout bar'));
 if(name==='mechanic')body=intro+old.slice(old.indexOf('## Soul pickup XP update'));
 if(name==='offline')body=`## Gameplay resume update — 27 October 2026\n\nSolo/offline remains the default. The current game now resumes its full saved state per hero after refresh or browser reopen, with gameplay/effect timers paused offline. Diagnostic \`?coop\` uses durable authoritative server checkpoints and a private browser resume credential; rooms pause when empty and survive server restart. Explicit Leave clears automatic room resume. Details: [Progression and Blessings](/organizations/ORd5dd6f99b4308d6187031557/projects/PJ8758f22f61165f3d3215e454/knowledge/${ids.progression}).\n\n${checks}\n\n`+old.replace('The Go co-op server and netcode stay in place, untouched, so co-op can come back by flipping the default in `main.ts`.','The Go co-op server and netcode remain available behind `?coop`; durable checkpoints and private resume credentials now preserve diagnostic co-op sessions.');
 body=body.replace('| While choosing | Hero stops attacking and is immune; party members and enemies keep playing |','| While choosing | Movement and combat continue; the queued offer and hero immunity are retained in the checkpoint |').replace('| Kill reward | `10 + (foe level - 1) × 4` XP and 5 run gold to the final hitter; revenants scale to the hero\'s level |','| Kill reward | 5 run gold immediately; a soul stores `10 + (foe level - 1) × 4` XP for one owner-only pickup |');
 body=body.replace('Souls remain through defeat/respawn. Disconnect removes that player\'s souls; run/room replacement clears old soul elements.','Souls remain through defeat/respawn and reconnect. Disconnected owners retain uncollected souls in the authoritative checkpoint; explicit run/room replacement clears old soul elements.').replace('Souls persist through defeat/respawn, are removed on disconnect, and clear when the local run/room changes.','Souls persist through defeat/respawn and reconnect, with owner-only collection; explicit run/room changes clear old soul elements.').replace('| Run lifetime | Run level/XP/gold/passives/ranks survive death and safe-zone visits and reset on reload/rejoin/mode change. Solo active unlocks and loadouts persist separately across refresh/reopening; restored active ranks start at Lv. 1. |','| Run lifetime | Full gameplay, ranks and durations resume after death, safe-zone visits, refresh and browser reopen. Offline simulation pauses. Explicit Reset Progression clears both solo games; co-op resumes only server-owned state. |');
 // Keep every image byte-for-byte, including data URLs embedded by earlier work.
 for(const image of old.match(/!\[[^\]]*\]\([^\n]+\)/g)||[])assert(body.includes(image),'Existing inline image lost');
 const file=`/home/dev/releases/gameplay-knowledge-${name}.md`;await fs.writeFile(file,body);run(['knowledge','update',id,'--markdown-file',file]);updates.push({id,title:page.title,parent_id:page.parent_id,bytes:body.length});
}
await fs.writeFile('docs/gameplay-progress/knowledge.json',JSON.stringify({release:release.commit,updates},null,2));console.log(updates);
