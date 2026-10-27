import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const cli=a=>JSON.parse(execFileSync('fural-agent',a,{encoding:'utf8',maxBuffer:4e6})),id='NKBDbd185330904c8926506f945e',project='PJ8758f22f61165f3d3215e454',out='docs/flame-fan-gameplay/soil-v2',base='https://arkodia.online',prefix=base+'/ember-warden-review/flame-fan-gameplay/soil-v2';
const nodes=cli(['knowledge','list','--project',project]);if(!nodes.some(n=>n.id===id&&n.parent_id==='NKBD4e400e0774ede4382c22e651'))throw Error('Flame Fan hierarchy changed');const before=cli(['knowledge','get',id]);
const release=JSON.parse(await fs.readFile(out+'/release-verification.json'));if(!release.passed)throw Error('Release not verified');const coop=JSON.parse(await fs.readFile(out+'/coop-live.json'));if(!coop.ok)throw Error('Public co-op not verified');
const chat={};for(const name of ['desktop','phone','rank1'])chat[name]=JSON.parse(await fs.readFile(out+'/chat-'+name+'.json')).attachments[0].url;
let section=`## Approved soil adopted visibly in gameplay — correction, October 27, 2026

The earlier four-crop gameplay integration was incomplete: it loaded only crust-a, crust-b, straight and coal, omitted the approved branching cracks, ash, char, source low flames, smoke and cinders, and hid all soil at ranks 1–2. This section supersedes that earlier adoption claim while preserving its history below.

The correction is live at [Play Ember Warden](${base}/?offline=1&hero=ember-warden), runtime **8cd0a2df**. It uses the inspected, approved static revision-6 soil sources, with a 1024-pixel ground raster for readable crust detail and 72 pooled upright source sprites per cast. The approved projecting burst remains unchanged. The independently approved ember-v2 overlay, Rift Dash correction and latest floating skill preview are preserved in the cumulative release.

### Source reconciliation

| Approved soil layer | Actual gameplay adoption |
|---|---|
| Crust, perimeter, fragments, scorch and ash | Both original crust crops plus all four surface-detail crops, baked once per cast |
| Connected glowing fissures | Straight, bend, fork, tee, cross and terminal crops |
| Coal and char | Both original solid source crops |
| Broken low flame seams | Low-a/b/c, ribbon, accent and lick; upright sprites with projected feet |
| Distributed smoke | Wisp, puff, bank, billow, ash-puff and both approved supplemental smoke pieces |
| Embers and warm accents | Original ember, spark, cinders and glow retained; independent approved ember-v2 overlay preserved |

This is **29 original atlas pieces plus two supplemental smoke images**. The unused haze crop and rejected giant plates-v3 remain excluded. No approved source image was regenerated or modified. The ground follows combat direction, radius, wall clipping and object masks; upright layers remain upright rather than inheriting ground squash. At most three casts are retained. The static ground texture uploads once per cast.

### Rank behavior and timing

| Ranks | Soil visibility | Existing gameplay behavior |
|---|---|---|
| 1–2 | Transient soil during the 850 ms burst | No persistent Burn Soil and no scheduled burn events |
| 3–5 | Soil through the existing one-second lifetime | Five scheduled events; extra tick damage remains unset |

Soil now stays readable before a continuous final 420 ms fade. Expiry is unchanged. The 420 ms release windup, 108° combat fan, radius, progression, cooldowns, initial damage, authoritative co-op scheduling and pending tick-damage specification are preserved. All UI remains English Pixi.

### Actual public screenshots delivered in chat

![Live desktop rank 3 — approved soil and connected hot seams](${chat.desktop})

![Live touch phone rank 5 — approved soil and ember-v2 overlay](${chat.phone})

![Live desktop rank 1 — transient approved soil during the cast](${chat.rank1})

These exact three PNGs are attached to the task discussion and embedded inline here.

### All-rank desktop and phone evidence

`;
for(let rank=1;rank<=5;rank++)section+=`![Live desktop rank ${rank} — soil during the late burst](${prefix}/live-1440-rank${rank}-tail.png)\n\n![Live phone rank ${rank} — soil during the late burst](${prefix}/live-390-rank${rank}-tail.png)\n\n`;
section+=`### Post-burst lingering soil

![Live desktop rank 3 — soil after the projecting burst ends](${prefix}/live-1440-rank3-lingering.png)

![Live phone rank 5 — final lingering soil fade](${prefix}/live-390-rank5-lingering.png)

### Verification and release

Local compiled gameplay passes all five ranks at **1440×900** and touch **390×844**: three forward targets damaged, rear/range exclusions, no projectiles, soil visibility, correct Burn Soil rank gates, five events only at ranks 3–5, unchanged HP after the initial hit, expiry, and keyboard/touch HUD inspection. The final GPU probe passes parity, three-cast pool, no added WebGL contexts and no steady texture uploads. TypeScript, production build, progression, Rift Dash input checks and all Go tests pass.

The unmodified public runtime passes active and tail captures at both sizes for all five ranks. Additional rank 3–5 frames confirm lingering soil after the 850 ms burst, at approximately **875–908 ms**, before one-second expiry. Public two-Ember co-op passes normal Flame Fan auto-casts, shared authoritative state and forged-message rejection. This correction changes no Flame Fan server or network timing code.

Public server build and client manifest match **8cd0a2df**. All **40 compiled assets** match hashes. All **33 images** (31 soil sources, approved burst and ember-v2) have zero decoded alpha and visible RGB differences. The supported publisher used the shared deployment lock. Old review pages and peer work remain intact. The canonical URL is now arkodia.online; the former ark-whachat alias returned 404 during this validation.

Browser captures use existing diagnostic rank/target seeding. Local combat assertions use test-only simulation stepping; public captures use browser-clock stepping of the normal simulation, pause redundant continuous presentation and explicitly render the real Pixi application at capture. No testStep hook ships. These are desktop/mobile Chromium viewport checks, not organic progression or physical-device GPU benchmarks. Blank pre-render capture attempts were rejected and are excluded.

[Full source inventory and verification notes](${prefix}/README.md) · [Public release verification](${prefix}/release-verification.json) · [All-rank combat report](${prefix}/local-game-all.json) · [Live frame report](${prefix}/live-frames.json) · [Post-burst frame report](${prefix}/live-lingering-frames.json) · [Public two-Ember co-op](${prefix}/coop-live.json).

<!-- flame-soil-correction-end -->

`;
const old=before.markdown.replace(/^## Approved soil adopted visibly[\s\S]*?<!-- flame-soil-correction-end -->\s*/,'');const markdown=section+old;cli(['knowledge','update',id,'--markdown',markdown]);const after=cli(['knowledge','get',id]);if(after.markdown!==markdown||!after.markdown.endsWith(old))throw Error('Knowledge verification failed');
await fs.writeFile(out+'/knowledge-publication.json',JSON.stringify({id,published:true,historyPreserved:true,chatImages:Object.values(chat),runtime:release.commit,beforeSha256:createHash('sha256').update(before.markdown).digest('hex'),afterSha256:createHash('sha256').update(after.markdown).digest('hex'),at:new Date().toISOString()},null,2));console.log({id,published:true,historyPreserved:true,chatImages:3});
