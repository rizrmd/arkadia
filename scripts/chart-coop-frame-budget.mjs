import fs from 'node:fs/promises';import sharp from 'sharp';
// Renders docs/coop/frame-budget.webp for the Knowledge page from the coop-frame-budget.mjs runs (a co-op room of four
// on desktop and on a throttled phone, and the solo game on the phone for reference; upstream against this fix):
// main-thread busy share, canvas drawImage share, frame rate and the 90th-percentile frame time.
const read=async n=>JSON.parse(await fs.readFile(`docs/coop/frame-budget-${n}.json`,'utf8'));
const rows=[['desktop','Co-op of four, desktop'],['phone','Co-op of four, phone (CPU ÷4)'],['phone-solo','Solo, phone (CPU ÷4)']];
const runs=Object.fromEntries(await Promise.all(rows.flatMap(([d])=>['upstream','fixed'].map(async t=>[d+t,await read(`${d}-${t}`)]))));
const W=1200,H=490,ink='#1f1f1d',muted='#6b6a63',old='#a3a29a',now='#2a78d6';
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Inter,Helvetica,Arial,sans-serif"><rect width="${W}" height="${H}" fill="#fcfcfb"/>`;
const text=(x,y,s,o='')=>svg+=`<text x="${x}" y="${y}" ${o.includes('fill=')?'':`fill="${ink}"`} ${o.includes('font-size=')?'':'font-size="14"'} ${o}>${s}</text>`;
text(40,40,'Frame budget before and after: co-op room of four heroes, and solo for reference','font-size="18" font-weight="600"');
for(const [i,[c,l]] of [[0,[old,'Before (upstream)']],[1,[now,'After (this fix)']]]){svg+=`<rect x="${40+i*170}" y="58" width="12" height="12" rx="2" fill="${c}"/>`;text(58+i*170,69,l,`fill="${muted}"`);}
const panels=[['Main thread busy','%',r=>+(100-r.idlePct).toFixed(1),100],['Canvas drawImage','%',r=>r.drawImagePct,100],['Frame rate','fps',r=>r.fps,60],['Frame time, 90th percentile','ms',r=>r.frameMs.p90,Math.max(...Object.values(runs).map(r=>r.frameMs.p90))]];
const pw=270,bar=22;
panels.forEach(([title,unit,get,max],i)=>{const x=40+i*(pw+20);let y=110;text(x,y,title,'font-weight="600"');y+=18;
 for(const [d,label] of rows){text(x,y+14,label,`font-size="12" fill="${muted}"`);y+=22;
  for(const [j,t,c] of [[0,'upstream',old],[1,'fixed',now]]){const v=get(runs[d+t]),w=Math.max(2,v/max*(pw-70));svg+=`<rect x="${x}" y="${y+j*(bar+4)}" width="${w}" height="${bar}" rx="4" fill="${c}"/>`;text(x+w+6,y+j*(bar+4)+16,v+(unit?' '+unit:''),`font-size="12" fill="${muted}"`);}
  y+=2*(bar+4)+28;}});
text(40,H-24,'Headless Chromium without a GPU on a shared CPU (scripts/coop-frame-budget.mjs). Compare the runs with each other, not with a real device.',`font-size="12" fill="${muted}"`);
svg+='</svg>';await sharp(Buffer.from(svg)).webp({quality:90}).toFile('docs/coop/frame-budget.webp');console.log('docs/coop/frame-budget.webp');
