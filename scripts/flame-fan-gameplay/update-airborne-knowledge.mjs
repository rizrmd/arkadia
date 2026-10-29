import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const cli=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',maxBuffer:8e6})),id='NKBDbd185330904c8926506f945e',out='docs/flame-fan-gameplay/airborne';
const tree=cli(['knowledge','list','--project','PJ8758f22f61165f3d3215e454']);const node=tree.find(n=>n.id===id);if(!node?.parent_id)throw Error('Existing Flame Fan hierarchy missing');
const before=cli(['knowledge','get',id]),live=JSON.parse(await fs.readFile(out+'/public-runtime.json')),release=JSON.parse(await fs.readFile(out+'/release-verification.json'));if(!live.passed||!release.passed)throw Error('Public verification missing');
const pair=JSON.parse(await fs.readFile(out+'/chat-before-after.json')).attachments,chat=JSON.parse(await fs.readFile(out+'/chat-live.json')).attachments;
const prefix='https://arkodia.online/ember-warden-review/flame-fan-gameplay/airborne';
const title='## Airborne Flame Fan separated from ground soil — October 27, 2026';
const section=`${title}

The human confirmed “Lanjutkan koreksi” after the approved flames appeared attached to soil. This correction supersedes the earlier ground-plane placement while retaining all artwork and prior history. Live client/server release **${release.commit}** is pushed and deployed.

The approved projecting burst now starts **44 world pixels above the caster's ground origin**, rising another **22 pixels along its forward reach**. Approved ember v2 follows the same elevated trajectory with existing sway/reveal. Both use the world-effects layer (zIndex 38), independently of ground soil (zIndex 22). The soil's transform, all 31 source layers, ground composition and upright source flames/smoke are unchanged. Separate object masks sample each plane; radial wall clipping remains in place. Source textures, damage, radius, cooldown, progression, saves and authoritative co-op timing are preserved. Game controls remain English and Pixi.

### Human reference

![Human screenshot showing the fan attached to soil](/api/rooms/DRe6a2c6f1487f8fcbeed0d6b5/attachments/DA6ab8609e7597f6565c432567)

### Matched before and after — actual gameplay renderer

![Before — desktop rank 3, previous ground-plane fan](${pair[0].url})

![After — desktop rank 3, elevated fan with soil remaining below](${pair[1].url})

![Before — phone rank 5, previous ground-plane fan](${pair[2].url})

![After — phone rank 5, elevated burst and approved ember v2](${pair[3].url})

These matched frames use the actual compiled game/Pixi scene, seeded targets/ranks, an empty server-environment fixture and a test-only simulation clock. Five ranks cover five aim directions on each viewport. No test clock or environment fixture is shipped.

### Verified public production frames

![Live public desktop rank 3 — airborne burst above independent ground soil](${chat[0].url})

![Live public phone rank 5 — airborne approved ember v2 and projecting burst](${chat[1].url})

Actual public unmodified production gameplay passes ranks **1–5 at 1440×900 and 390×844**, with visible approved embers, positive origin separation and zero page errors. Diagnostic target/rank seeding and the browser clock make frames repeatable. First phone loading attempt timed out at 60 seconds; one bounded retry passed all ranks. These are emulated touch viewport checks, not physical-device certification. Production tutorial/UI state remains visible.

All **40 compiled files** match the live release hashes; client and server SHAs agree. Approved ember v2 has **zero alpha and visible RGB differences**. TypeScript, production build, progression, save persistence, input and Go checks pass. Local gameplay verifies forward damage, behind/outside exclusion, no added projectiles, unchanged radius, expiry, five Burn Soil ticks at ranks 3–5 and real Pixi keyboard/touch controls. Matched state comparisons confirm unchanged soil across all ten rank/viewport cases. Independent effect-renderer checks pass both viewports and expiry. Three-cast pooling remains intact.

[Play Ember Warden](https://arkodia.online/?hero=ember-warden) · [Implementation and limits](${prefix}/README.md) · [Public runtime report](${prefix}/public-runtime.json) · [Live release verification](${prefix}/release-verification.json) · [Matched soil comparison](${prefix}/comparison.json) · [Independent renderer report](${prefix}/renderer-verification.json).

All chat images from this correction are embedded above. Earlier reference/candidate/soil screenshots and approval history remain below.

---

`;
if((before.markdown||'').includes(title))throw Error('Airborne section already exists; inspect before updating');
const current=cli(['knowledge','get',id]);if(current.markdown!==before.markdown)throw Error('Concurrent Knowledge edit; rerun with fresh page');
cli(['knowledge','update',id,'--markdown',section+(before.markdown||'')]);const after=cli(['knowledge','get',id]);if(after.markdown!==section+before.markdown)throw Error('Knowledge verification mismatch');
await fs.writeFile(out+'/knowledge-publication.json',JSON.stringify({id,parent:node.parent_id,historyPreserved:true,images:7,markdownSha256:createHash('sha256').update(after.markdown).digest('hex'),at:new Date().toISOString()},null,2));console.log('English Flame Fan Knowledge updated with seven inline images; existing history preserved');
