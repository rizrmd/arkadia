import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const run=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',maxBuffer:8e6}));
const url='https://ark-whachat.fural.space/ember-warden-review/flame-fan-levels/';
const iframe=`<iframe src="${url}" title="Flame Fan Level 1–5 AoE Animation Player" height="560"></iframe>`;
const id='NKBDbd185330904c8926506f945e',tree='NKBDd961f11ef4da28d4544d39f2';
const game=JSON.parse(await fs.readFile('docs/flame-fan/game-live.json'));
const player=JSON.parse(await fs.readFile('docs/flame-fan/verification-live.json'));
if(!game.passed||!player.passed)throw Error('Live verification must pass before publishing');
let body=`${iframe}\n\n[Open AoE player](${url}) · [Live game checks](${url}evidence/game-live.json) · [Live player checks](${url}evidence/verification-live.json).\n\n${await fs.readFile('docs/flame-fan/README.md','utf8')}\n\n## Live delivery\n\nActual game desktop and touch/mobile tests pass for every rank, including three forward targets damaged at Lv.1, rear-target exclusion and zero projectiles. Player tests pass on desktop, portrait mobile and compact mobile with all controls and iframe playback. Zero page errors. The release includes the latest committed inventory and Settings integration.\n`;
for(const width of [1440,390]){
 body+=`\n### ${width===1440?'Desktop':'Mobile'} evidence\n`;
 for(const rank of [1,2,3,4,5])body+=`\n![Live ${width}px Flame Fan Lv.${rank} flame area](${url}evidence/live-${width}-lv${rank}-flame.png)\n`;
 for(const rank of [1,5])body+=`\n![Live actual game ${width}px Flame Fan Lv.${rank}](${url}evidence/live-game-${width}-lv${rank}.png)\n`;
}
body+=`\n## Local visual review\n\n![Local desktop corrected flame sector](${url}evidence/local-1440-lv1-flame.png)\n\n![Local mobile actual-game multi-target check](${url}evidence/local-game-390-lv1.png)\n`;
run(['knowledge','update',id,'--markdown',body]);
const old=run(['knowledge','get',tree]);
let text=old.markdown;
if(text.startsWith('## AoE correction — implementation pending release'))text=text.slice(text.indexOf('\n## ',4)+1);
const marker='## Flame Fan level player — Stage 4';
text=text.split(marker)[0];
text=text.replace(/Deliver cast, projectile travel and impact for Lv\. 1–5[^\n]*/g,'Deliver Flame Fan as a forward flame sector at every rank, with zero fireball projectiles. The corrected player below supersedes the historical projectile contract.');
text=text.replace(/Shipped cast, fan\/projectile travel[^\n]*/g,'Flame Fan is a forward flame area from Lv.1 through Lv.5, with no fireball projectiles.');
const section=`## Flame Fan AoE correction — delivered\n\nFlame Fan is a 108° forward flame sector at every rank, including Lv.1. It damages every target inside the fan, respects walls, and emits **zero fireball projectiles**. Base radius is 4.4 tiles with +18% per rank; damage gains +25% per rank and cooldown is reduced by 8% per rank. Existing 0/4/8 card tier gates and Lv.20 capstone remain unchanged. This confirmed correction supersedes historical fireball counts and projectile-travel descriptions.\n\n${iframe}\n\n[Full Flame Fan mechanics and inline evidence](/organizations/ORd5dd6f99b4308d6187031557/knowledge/${id}) · [Open corrected player](${url}).\n\nLive desktop/mobile actual-game tests pass across all ranks: three forward targets damaged, rear target excluded, zero projectiles. Desktop/portrait/compact player controls and iframe pass. Go, progression and Ember/Rift gate regressions pass.\n\n![Live Lv.1 desktop flame area](${url}evidence/live-1440-lv1-flame.png)\n\n![Live Lv.1 mobile game](${url}evidence/live-game-390-lv1.png)\n\n`;
run(['knowledge','update',tree,'--markdown',section+text]);
await fs.writeFile('docs/flame-fan/knowledge.md',body);
console.log(JSON.stringify({updated:[id,tree],inlineImages:(body.match(/!\[/g)||[]).length}));
