import fs from 'node:fs/promises';import sharp from 'sharp';
// Renders docs/coop/phone-smoothness.webp for the Knowledge page: left, the own hero's drawn speed every frame of
// the two-tab walk down through the gateway on the mobile network (coop-smoothness.mjs, upstream build against
// this fix); right, the phone walk into the wilds with the touch thumbstick (coop-phone-feel.mjs): prediction
// corrections and frames where the hero jumped, upstream against this fix.
const read=async n=>JSON.parse(await fs.readFile(`docs/coop/${n}.json`,'utf8'));
const [sb,sa]=await Promise.all(['smoothness-mobile-upstream','smoothness-mobile-fixed'].map(read));
const nets=['cell','jitter'],phone=Object.fromEntries(await Promise.all(nets.flatMap(n=>['upstream','fixed'].map(async t=>[n+t,await read(`phone-feel-${n}-${t}`)]))));
const W=1200,H=520,ink='#1f1f1d',muted='#6b6a63',grid='#e4e3dd',old='#a3a29a',now='#2a78d6';
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Inter,Helvetica,Arial,sans-serif"><rect width="${W}" height="${H}" fill="#fcfcfb"/>`;
const text=(x,y,s,o='')=>svg+=`<text x="${x}" y="${y}" ${o.includes('fill=')?'':`fill="${ink}"`} ${o.includes('font-size=')?'':'font-size="14"'} ${o}>${s}</text>`;
text(40,40,'Own hero speed per frame, walking through the gateway (px/s)','font-size="18" font-weight="600"');text(720,40,'Phone thumbstick walk into the wilds','font-size="18" font-weight="600"');
for(const [i,[c,l]] of [[0,[old,'Before (upstream)']],[1,[now,'After (this fix)']]]){svg+=`<rect x="${40+i*170}" y="58" width="12" height="12" rx="2" fill="${c}"/>`;text(58+i*170,69,l,`fill="${muted}"`);}
// Left: per-frame speed traces on one time axis, clipped at 400 px/s.
const L={x:80,y:95,w:560,h:330,max:400},end=Math.max(sb.ownTrace.at(-1)[0],sa.ownTrace.at(-1)[0]),tx=t=>L.x+t/end*L.w,ty=v=>L.y+L.h-Math.min(v,L.max)/L.max*L.h;
for(let v=0;v<=L.max;v+=100){svg+=`<line x1="${L.x}" x2="${L.x+L.w}" y1="${ty(v)}" y2="${ty(v)}" stroke="${grid}"/>`;text(L.x-8,ty(v)+4,v,`text-anchor="end" font-size="12" fill="${muted}"`);}
for(let s=0;s*1000<=end;s+=2)text(tx(s*1000),L.y+L.h+20,s+' s',`text-anchor="middle" font-size="12" fill="${muted}"`);
for(const [r,c,w] of [[sb,old,1.5],[sa,now,2]])svg+=`<polyline fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" points="${r.ownTrace.map(([t,v])=>tx(t).toFixed(1)+','+ty(v).toFixed(1)).join(' ')}"/>`;
text(L.x,L.y+L.h+46,`Speed CV ${sb.own.cv} → ${sa.own.cv} · stalls ${sb.own.stalls} → ${sa.own.stalls} · jumps ${sb.own.jumps} → ${sa.own.jumps} · largest correction ${sb.stats.a.maxCorrection.toFixed(0)} → ${sa.stats.a.maxCorrection.toFixed(0)} px`,`font-size="13" fill="${muted}"`);
// Right: grouped bars per network for corrections and server trail (p95 px).
const R={x:760,y:95,w:380},bar=18;let y=R.y;
const group=(title,unit,get,max)=>{text(R.x-20,y+4,title,'font-size="14" font-weight="600"');y+=16;
 for(const n of nets){text(R.x+60,y+bar+4,n==='cell'?'Cellular stalls':'Jitter + spikes','text-anchor="end" font-size="12"');
  for(const [j,t,c] of [[0,'upstream',old],[1,'fixed',now]]){const v=get(phone[n+t]),w=Math.max(2,v/max*(R.w-120));svg+=`<rect x="${R.x+70}" y="${y+j*(bar+2)}" width="${w}" height="${bar}" rx="4" fill="${c}"/>`;text(R.x+76+w,y+j*(bar+2)+14,v+unit,`font-size="12" fill="${muted}"`);}
  y+=2*bar+14;}y+=14;};
const maxOf=f=>Math.max(...Object.values(phone).map(f));
group('Prediction corrections','',r=>r.coop.net.corrections,maxOf(r=>r.coop.net.corrections));
group('Largest correction','px',r=>Math.round(r.coop.net.maxCorrection),maxOf(r=>r.coop.net.maxCorrection));
group('Jumps (frames over 1.75× walking speed)','',r=>r.coop.world.jumps,maxOf(r=>r.coop.world.jumps));
svg+='</svg>';await sharp(Buffer.from(svg)).webp({quality:90}).toFile('docs/coop/phone-smoothness.webp');console.log('docs/coop/phone-smoothness.webp');
