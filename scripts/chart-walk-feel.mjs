import fs from 'node:fs/promises';import sharp from 'sharp';
// Renders docs/walk-feel/speed.png from the measure-walk-feel.mjs reports: full walking speed per direction, and
// speed against how far the thumb pushes the stick, before and after (solo reports; co-op walks the same rule).
const read=async n=>JSON.parse(await fs.readFile(`docs/walk-feel/${n}.json`,'utf8')),before=await read('before-solo'),after=await read('after-solo');
const by=(r,l)=>r.results.find(x=>x.label===l).speedPxPerS,W=1200,H=520,ink='#1f1f1d',muted='#6b6a63',grid='#e4e3dd',old='#a3a29a',now='#2a78d6';
const dirs=[['keys d','Right'],['keys a','Left'],['keys w+d','Up-right edge'],['keys s+a','Down-left edge'],['keys w','Up'],['keys s','Down']];
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Inter,Helvetica,Arial,sans-serif"><rect width="${W}" height="${H}" fill="#fcfcfb"/>`;
const text=(x,y,s,o='')=>svg+=`<text x="${x}" y="${y}" ${o.includes('fill=')?'':`fill="${ink}"`} ${o.includes('font-size=')?'':'font-size="14"'} ${o}>${s}</text>`;
text(40,40,'Full walking speed by direction (screen px/s)','font-size="18" font-weight="600"');text(660,40,'Speed vs. thumbstick push, walking right (px/s)','font-size="18" font-weight="600"');
for(const [i,[c,l]] of [[0,[old,'Before']],[1,[now,'After']]]){svg+=`<rect x="${40+i*110}" y="58" width="12" height="12" rx="2" fill="${c}"/>`;text(58+i*110,69,l,`fill="${muted}"`);}
// Left: grouped horizontal bars on one 0-140 axis.
const L={x:170,y:95,w:420,max:140},row=62,bar=20,sx=v=>L.x+v/L.max*L.w;
for(let v=0;v<=140;v+=20){svg+=`<line x1="${sx(v)}" x2="${sx(v)}" y1="${L.y-5}" y2="${L.y+dirs.length*row}" stroke="${grid}"/>`;text(sx(v),L.y+dirs.length*row+20,v,`text-anchor="middle" font-size="12" fill="${muted}"`);}
dirs.forEach(([k,l],i)=>{const y=L.y+i*row;text(L.x-10,y+bar+6,l,'text-anchor="end"');
 for(const [j,r,c] of [[0,before,old],[1,after,now]]){const v=by(r,k);svg+=`<rect x="${L.x}" y="${y+j*(bar+2)}" width="${sx(v)-L.x}" height="${bar}" rx="4" fill="${c}"/>`;text(sx(v)+6,y+j*(bar+2)+15,v.toFixed(0),`font-size="12" fill="${muted}"`);}});
// Right: speed against thumb travel (0-100 % of the 40 px stick reach), right-pointing stick.
const R={x:700,y:95,w:440,h:dirs.length*row,max:140},px=p=>R.x+p/100*R.w,py=v=>R.y+R.h-v/R.max*R.h;
for(let v=0;v<=140;v+=20){svg+=`<line x1="${R.x}" x2="${R.x+R.w}" y1="${py(v)}" y2="${py(v)}" stroke="${grid}"/>`;text(R.x-8,py(v)+4,v,`text-anchor="end" font-size="12" fill="${muted}"`);}
for(const p of [0,25,50,75,100])text(px(p),R.y+R.h+20,p+'%',`text-anchor="middle" font-size="12" fill="${muted}"`);text(R.x+R.w/2,R.y+R.h+42,'Thumb distance from the stick centre (% of reach)',`text-anchor="middle" font-size="13" fill="${muted}"`);
for(const [r,c,label] of [[before,old,'Before'],[after,now,'After']]){const pts=[[0,0],[18,0],...[16,26,40].map(d=>[d/40*100,by(r,`stick 0deg ${d}px`)])];
 svg+=`<polyline fill="none" stroke="${c}" stroke-width="2" points="${pts.map(([p,v])=>px(p)+','+py(v)).join(' ')}"/>`;for(const [p,v] of pts.slice(2))svg+=`<circle cx="${px(p)}" cy="${py(v)}" r="5" fill="${c}" stroke="#fcfcfb" stroke-width="2"/>`;
 const [p,v]=pts[3];text(px(p)+10,py(v)+(label==='After'?-10:18),`${label}: ${v.toFixed(0)} px/s at 65%`,`font-size="12" fill="${muted}"`);}
svg+='</svg>';await sharp(Buffer.from(svg)).png().toFile('docs/walk-feel/speed.png');console.log('docs/walk-feel/speed.png');
