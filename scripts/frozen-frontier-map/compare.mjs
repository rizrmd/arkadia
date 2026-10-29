import sharp from 'sharp';
// Before/after pairs side by side, labelled: <prefix>-compare-<view>-<area>.webp from <prefix>-{before,after}-<view>-<area>.webp
// (the ruin rework's desktop pairs keep their old name, ruins-compare-<area>.webp).
//   node scripts/frozen-frontier-map/compare.mjs                     ruin rework: desktop, eight areas
//   PREFIX=angles VIEWS=desktop,portrait,landscape,closeup AREAS=pillar-courtyard,watchtower,snowy-shrine node …/compare.mjs
const DIR='docs/frozen-frontier-map',PREFIX=process.env.PREFIX||'ruins';
const AREAS=(process.env.AREAS||'pillar-courtyard,settlement,settlement-east,frontier-road,ruined-gate,watchtower,snowy-shrine,shrine-trail').split(',');
const VIEWS=(process.env.VIEWS||'desktop').split(',');
const label=(t,w)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="56"><rect width="100%" height="100%" fill="#0f1c2b"/><text x="20" y="38" font-family="sans-serif" font-size="30" font-weight="700" fill="#f2e6c9">${t}</text></svg>`);
for(const view of VIEWS)for(const a of AREAS){
 const src=k=>`${DIR}/${PREFIX}-${k}-${view}-${a}.webp`;
 // Each pane keeps its shot's aspect: 960 wide for landscape shots, 480 for portrait ones.
 const meta=await sharp(src('before')).metadata(),w=meta.width>=meta.height?960:480,h=Math.round(w*meta.height/meta.width);
 const pics=await Promise.all(['before','after'].map(k=>sharp(src(k)).resize(w,h).toBuffer()));
 const out=PREFIX==='ruins'&&view==='desktop'?`${DIR}/ruins-compare-${a}.webp`:`${DIR}/${PREFIX}-compare-${view}-${a}.webp`;
 await sharp({create:{width:w*2+12,height:h+56,channels:3,background:'#0f1c2b'}}).composite([{input:label('Before',w),left:0,top:0},{input:label('After',w),left:w+12,top:0},{input:pics[0],left:0,top:56},{input:pics[1],left:w+12,top:56}])
  .webp({quality:80}).toFile(out);console.log('wrote',out);
}
