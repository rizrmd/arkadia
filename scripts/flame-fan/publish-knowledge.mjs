import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const run=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',maxBuffer:8e6}));
const url='https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/';
const iframe=`<iframe src="${url}" title="Flame Fan Level 1–5 Animation Player" height="560"></iframe>`;
const id='NKBDbd185330904c8926506f945e',tree='NKBDd961f11ef4da28d4544d39f2';
const marker='## Level 1–5 animation player';
let section=`${marker}\n\n${iframe}\n\n[Open the level animation player](${url}) · [Live verification report](${url}evidence/verification-live.json).\n\nLevel selector, Play/Pause, Replay, Loop and Day/Night use the shipped Rift Bolt player pattern. This is a rendering preview using the actual Ember cast, fireball and impact assets, not a static mockup.\n\n${await fs.readFile('docs/flame-fan/README.md','utf8')}\n\n### Live verification\n\nTypeScript and production build pass. All five levels, all three animation phases, actual emitter counts, pause/resume, replay, loop on/off and cross-origin iframe controls pass locally and live at 1440 × 900, 390 × 844 and 320 × 560. Zero page errors, missing effects or failed HTTP requests. Screenshots below are simulation-paused checkpoints. Published as an additive review layer over the delivered Stage 3 game; peer work is preserved. Implementation commit: f23ee5b.\n`;
for(const width of [1440,390]){
 section+=`\n### ${width===1440?'Desktop':'Mobile portrait'} evidence\n`;
 for(const [lv,phase] of [[1,'casting'],[2,'projectile'],[3,'projectile'],[4,'projectile'],[5,'impact']]){
 section+=`\n![Flame Fan live ${width}px Lv.${lv} ${phase}](${url}evidence/live-${width}-lv${lv}-${phase}.png)\n`;
 }
}
section+=`\n### Local visual review\n\n![Local mobile Lv.5 projectile review](${url}evidence/local-390-lv5-projectile.png)\n\n![Local desktop Lv.1 impact review](${url}evidence/local-1440-lv1-impact.png)\n`;
const page=run(['knowledge','get',id]);
run(['knowledge','update',id,'--markdown',page.markdown.split('\n'+marker)[0]+'\n\n'+section]);
const treePage=run(['knowledge','get',tree]),treeMarker='## Flame Fan level player — Stage 4';
const treeSection=`${treeMarker}\n\n${iframe}\n\n[Flame Fan specification and verification gallery](/organizations/ORd5dd6f99b4308d6187031557/knowledge/${id}) · [Open player](${url}).\n\nShipped cast, fan/projectile travel and impact for Lv.1–5 with level selector, Play/Pause, Replay and Loop. Counts remain 3/4/5/5/5; rank damage/cooldown and cast scale follow existing progression. A small impact intensity increase is visual only. Solar Fan, ultimates, rank-3 forks and respec remain concepts. Desktop 1440×900 and mobile 390×844/320×560 controls and iframe playback pass locally and live with zero browser errors. See the linked skill page for English rank documentation, inline screenshots and reports.\n`;
run(['knowledge','update',tree,'--markdown',treePage.markdown.split('\n'+treeMarker)[0]+'\n\n'+treeSection]);
const verified=run(['knowledge','get',id]);if(!verified.markdown.includes(iframe))throw Error('Knowledge iframe readback failed');
await fs.writeFile('docs/flame-fan/knowledge.md',section);
console.log(JSON.stringify({knowledge_id:id,tree_id:tree,iframe,inlineImages:(verified.markdown.match(/!\[/g)||[]).length}));
