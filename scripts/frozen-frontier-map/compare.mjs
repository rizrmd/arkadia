import sharp from 'sharp';
// Before/after pairs for the ruin rework: each desktop shot side by side, labelled, as ruins-compare-<area>.webp.
//   node scripts/frozen-frontier-map/compare.mjs
const DIR='docs/frozen-frontier-map',AREAS=['pillar-courtyard','settlement','settlement-east','frontier-road','ruined-gate','watchtower','snowy-shrine','shrine-trail'];
const label=(t,w)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="56"><rect width="100%" height="100%" fill="#0f1c2b"/><text x="20" y="38" font-family="sans-serif" font-size="30" font-weight="700" fill="#f2e6c9">${t}</text></svg>`);
for(const a of AREAS){const w=960,h=600,pics=await Promise.all(['before','after'].map(k=>sharp(`${DIR}/ruins-${k}-desktop-${a}.webp`).resize(w,h).toBuffer()));
 await sharp({create:{width:w*2+12,height:h+56,channels:3,background:'#0f1c2b'}}).composite([{input:label('Before',w),left:0,top:0},{input:label('After',w),left:w+12,top:0},{input:pics[0],left:0,top:56},{input:pics[1],left:w+12,top:56}])
  .webp({quality:80}).toFile(`${DIR}/ruins-compare-${a}.webp`);console.log('wrote',`${DIR}/ruins-compare-${a}.webp`);}
