import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const cli=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',timeout:120000,maxBuffer:4e6}));
const project='PJ8758f22f61165f3d3215e454',id='NKBDbd185330904c8926506f945e',treeId='NKBDd961f11ef4da28d4544d39f2';
const nodes=cli(['knowledge','list','--project',project]);
if(!nodes.some(n=>n.id===id&&n.parent_id==='NKBD4e400e0774ede4382c22e651')||!nodes.some(n=>n.id===treeId))throw Error('Existing Knowledge hierarchy changed');
const old=cli(['knowledge','get',id]),oldTree=cli(['knowledge','get',treeId]);
for(const name of ['automatic-local-1440','automatic-local-390','automatic-live-1440','automatic-live-390','legacy-player-local','legacy-player-live'])if(!JSON.parse(await fs.readFile(`docs/flame-fan-gameplay/${name}.json`)).passed)throw Error('Missing acceptance: '+name);
for(const mode of ['local','live'])if(!JSON.parse(await fs.readFile(`docs/flame-fan-preview/verification-${mode}.json`)).passed)throw Error('Missing player acceptance');
const base='https://ark-whachat.fural.space',evidence=base+'/ember-warden-review/flame-fan-gameplay/',preview=base+'/ember-warden-review/flame-fan-preview/';
const used=new Set();
const picture=(label,url)=>{used.add(url);return `![${label}](${url})\n\n`;};
const approved=[...old.markdown.matchAll(/!\[([^\]]*)\]\(([^\s)]+)\)/g)].find(m=>m[2].includes('DAe091fce2f57db19172f44833'));
let body=`## Live gameplay — automatic skills and skill tree

**Integrated into the actual game in commit \`e6bfc959\`.** [Play Ember Warden](${base}/?offline=1&hero=ember-warden). Clicking/tapping a HUD skill or pressing **1/2/3 opens the skill tree** for that slot. Select a learned active node to equip it or swap slots. These inputs do not cast skills. Equipped skills auto-cast when a living enemy enters the existing detection radius and their cooldown permits it. K opens the tree; X, Escape and outside close it.

Learning and rank upgrades still come from the existing level-up cards. While a card choice is pending, 1/2/3 selects a card. The existing 0/4/8-card tier gates, Lv.20 capstone, rank-five cap, four learned actives and three equipped slots remain unchanged. Co-op loadout editing retains its existing solo-only restriction; online damage remains server-authoritative.

## Compact connected flame

Flame Fan is one stationary **108° forward AoE from Lv.1 through Lv.5**, with **zero fireball projectiles**. It damages every living target in the sector once per cast and excludes rear/out-of-range targets and targets behind blocking walls. The renderer uses the actual 64/32 isometric projection, caster tile, camera scale and combat radius. It does not add cosmetic range.

Compared with the prior review, maximum sheet opacity is reduced from 0.675–0.975 to **0.385–0.565**, added height and bloom are zero, and Flame Fan contact particles use **0.28× their former linear scale**. One through five curled strata and increasing heat distinguish ranks. The full existing attack reach remains broad, especially at Lv.5 on a phone; it was preserved rather than silently changing balance. The sheet lasts 850 ms after the existing 420 ms cast release. It lies under actors and uses wall-ray clipping plus a cached upright-object silhouette mask through the existing ground occlusion contract.

| Rank | Curled layers | Radius (tiles) | Rank damage multiplier | Cooldown (ms) |
|---|---:|---:|---:|---:|
| Lv.1 | 1 | 4.400 | 1.00× | 1400 |
| Lv.2 | 2 | 5.192 | 1.25× | 1288 |
| Lv.3 | 3 | 5.984 | 1.50× | 1185 |
| Lv.4 | 4 | 6.776 | 1.75× | 1090 |
| Lv.5 | 5 | 7.568 | 2.00× | 1003 |

Damage remains 0.78× base skill damage, multiplied by rank and existing combo modifiers. Existing critical-hit handling, cooldown/passive modifiers and the 0.38-tile target-body collision allowance remain unchanged. That collision allowance does not enlarge the flame graphic. Cast and network timing rules are unchanged.

## Embedded comparison player

<iframe src="${preview}" title="Flame Fan — compact gameplay material and rank comparison" height="820"></iframe>

[Open player](${preview}) · [Alternate player URL](${base}/ember-warden-review/flame-fan-levels/). Both URLs use the same material as gameplay. The selected scene and five comparison cards share one clock, camera and scale: 38 pixels per world unit, a 0.5 ground squash and actor scale proportional to the game's 0.66 display scale. The review player illustrates contact reactions; actual damage is verified in the game, not simulated by this player. English controls provide rank selection, Play/Pause, Replay, Loop, Day/Night and scrubbing; the comparison scrolls horizontally on mobile.

## Verification and delivery

Local and public actual-game checks pass at **1440×900** and touch **390×844**, for every rank. They check HUD click/touch and 1/2/3 opening the tree without casting, real pointer selection/equip, normal automatic casting, three forward enemies damaged, rear/range exclusion, rotated aim, correct radius/rank/layers and zero projectiles. **The primary acceptance tests call no manual cast API or forced auto-cast helper.** They prepare controlled eligible level-up offers and enemies, use the real input/selection/equip handlers, then let normal gameplay perform the casts. Preview mode is used only to arrange and inspect the fixture, then disabled for the actual automatic cast.

[Live desktop auto-cast/tree report](${evidence}automatic-live-1440.json) · [Live mobile report](${evidence}automatic-live-390.json) · [Local desktop](${evidence}automatic-local-1440.json) · [Local mobile](${evidence}automatic-local-390.json) · [Validation](${evidence}validation.json) · [TS/Go gate parity](${evidence}progression-parity.json).

TypeScript and production builds, all Go tests (including Flame Fan sector and Lv.1 multi-target auto-cast), progression checks and 608 exact TS/Go progression cases pass. Existing Ember gates and Rift progression remain intact. The main player passes local/live desktop, portrait and compact 320×560 checks across all ranks and four phases, synchronized comparisons, controls, loop completion, loaded actors, no overflow and cross-origin iframe playback. The alternate player passes desktop/mobile actor/rank/control checks. Final reports contain no page errors or failed HTTP asset requests. These are Chromium desktop/mobile emulation checks, not a real-device GPU benchmark.

[Live player report](${preview}evidence/verification-live.json) · [Alternate URL report](${evidence}legacy-player-live.json).

The supported clean-checkout game pipeline built the committed code and preserved peer WIP. Game layer: \`1792939846632-game-e6bfc959-b2a6b2f4027b\`. The first upload stopped before registration after a TLS handshake timeout; the same archive resumed through the supported release publisher. Immutable part transfers now have bounded transient retries; registrations and restarts are not blindly retried. The first evidence package exceeded the gateway boot memory budget before application and caused OOM/502. Only its unprocessed manifest was quarantined; peer game manifests were preserved and the service recovered. Evidence now uses layers bounded to 8 MiB of decoded JSON with one restart after all batches register. Batch byte bounds and exact reconstruction are tested. No fast deployment or host injection was used.

## Live automatic gameplay evidence

`;
for(const width of [1440,390])for(let rank=1;rank<=5;rank++)body+=picture(`Live ${width}px — automatic Flame Fan Lv.${rank}`,evidence+`live-auto-${width}-lv${rank}.png`);
body+='## Skill-tree equip evidence\n\n';
for(const width of [1440,390])body+=picture(`Live ${width}px — Cinder Step equipped through the tree; Flame Fan swapped to Skill 2`,evidence+`live-tree-equipped-${width}.png`);
body+='## Before and after scale comparison\n\nThese earlier controlled sector captures use the same actor assets, camera, fixture and time of day, with the original combat module from edaf903 for the before view. Capture scheduling and random critical hits can differ. They isolate the VFX change; the automatic-gameplay reports above are the evidence for the corrected control flow.\n\n';
for(const width of [1440,390])for(const phase of ['before','local'])body+=picture(`${width}px — ${phase==='before'?'previous particles':'compact connected sheet'} at Lv.1`,evidence+`${phase}-game-${width}-lv1.png`);
body+='## Local supporting evidence\n\n';
body+=picture('Local desktop — automatic Lv.3 cast with combat actors',evidence+'local-auto-1440-lv3.png');
body+=picture('Local mobile — equip through the actual skill tree',evidence+'local-tree-equipped-390.png');
body+='## Approved reference\n\n';
if(approved)body+=picture(approved[1],approved[2]);else throw Error('Approved reference missing');
body+='## Retained player and historical evidence\n\nPrevious inline image links are retained below. The shared-player images now show the compact revision. Images under the older flame-fan-levels/evidence path document the superseded particle release and do not show the new gameplay integration.\n\n';
for(const m of old.markdown.matchAll(/!\[([^\]]*)\]\(([^\s)]+)\)/g))if(!used.has(m[2]))body+=picture('Flame Fan evidence — '+m[2].split('/').at(-1),m[2]);
const update=`## Current controls — automatic skills\n\nUpdated for gameplay commit \`e6bfc959\`: Ember now follows the same automatic-skill control flow as Rift. **Tap/left-click a HUD skill or press 1/2/3 to open the skill tree** for that slot, then tap a learned active node to equip or swap it. These inputs do not cast. Equipped skills auto-cast on nearby enemies when ready. Existing level-up cards still grant learning/ranks; 1/2/3 selects a pending card instead of opening the tree. Hold/right-click remains an alternate way to inspect the tree. K toggles; X, Escape and outside close. Tier gates, rank limits and co-op authority are unchanged. This supersedes the earlier tap-to-cast specification below.\n\n[Current Flame Fan gameplay and inline evidence](/organizations/ORd5dd6f99b4308d6187031557/knowledge/${id}) · [Live desktop checks](${evidence}automatic-live-1440.json) · [Live touch/mobile checks](${evidence}automatic-live-390.json).\n\n`;
let tree=oldTree.markdown.replace(/^## Current controls — automatic skills[\s\S]*?(?=## Flame Fan AoE correction)/,'');
tree=tree.replace(/For \*\*Ember\*\*, tap\/left-click casts[^\n]*/g,'For **both heroes**, tap/left-click a HUD skill or press 1/2/3 to open the skill tree for that slot. Tap a learned active node to equip or swap it. Skills cast automatically on nearby enemies when ready; HUD and tree taps do not cast. Hold (450 ms on touch/pen) or right-click remains an alternate inspection gesture. K toggles; X, Escape and outside close. Co-op retains server authority.');
tree=tree.replace(/quick-tap casting/g,'quick-tap tree opening').replace(/Tap\/left click must still cast[^.\n]*\./g,'Tap/left click opens the skill tree; equipped skills cast automatically.');
tree=(update+tree).trim();body=body.trim();
await fs.writeFile('docs/flame-fan-gameplay/knowledge.md',body);await fs.writeFile('docs/flame-fan-preview/knowledge.md',body);await fs.writeFile('docs/flame-fan-gameplay/tree-knowledge.md',tree);
if(process.argv.includes('--publish')){
 cli(['knowledge','update',id,'--markdown',body]);cli(['knowledge','update',treeId,'--markdown',tree]);
 if(cli(['knowledge','get',id]).markdown!==body||cli(['knowledge','get',treeId]).markdown!==tree)throw Error('Published Knowledge differs');
 console.log('Both English Knowledge pages published and exact markdown verified');
}else console.log('Knowledge drafts prepared; existing hierarchy/reference and inline images retained');
