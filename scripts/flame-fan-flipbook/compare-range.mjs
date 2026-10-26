import sharp from 'sharp';import fs from 'node:fs/promises';
const dir='docs/flame-fan-flipbook',state=JSON.parse(await fs.readFile(`${dir}/range-after-1440.json`)).state;
const measurements=state.geometry.layers.map((l,i)=>({layer:l.name,oldForwardReach:l.oldForwardEdge-171,newForwardReach:l.currentForwardEdge-171,ratio:i?2/3:1,method:i===1||i>=6?'actual rendered Nixie quad corners':'Pixi sprite/graphics bounds'}));
await fs.writeFile(`${dir}/range-measurements-v3.json`,JSON.stringify({phaseMilliseconds:320,axis:'scene forward x, from hand x=171',cameraUnchanged:true,verticalSpreadUnchanged:true,targets:state.geometry.targets,measurements},null,2));
for(const width of [1440,390]){
 const desktop=width===1440,w=desktop?1000:390,h=desktop?820:844,header=72;
 const panels=[];
 for(const [i,name]of ['before','after'].entries()){
  const image=sharp(`${dir}/range-${name}-${width}.png`);panels.push({input:await (desktop?image.extract({left:220,top:0,width:w,height:h}):image).png().toBuffer(),left:i*w,top:header});
 }
 const svg=Buffer.from(`<svg width="${w*2}" height="${header}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#14222b"/><g fill="#ffce8d" font-family="Arial" font-size="${desktop?22:16}"><text x="16" y="27">BEFORE: 100% forward reach</text><text x="${w+16}" y="27">LIVE: 66.67% forward reach</text></g><g fill="white" font-family="Arial" font-size="${desktop?18:12}"><text x="16" y="54">Actual public capture · 320 ms · hand fixed</text><text x="${w+16}" y="54">Same viewport / camera · targets closer</text></g></svg>`);
 panels.push({input:svg,left:0,top:0});
 await sharp({create:{width:w*2,height:h+header,channels:4,background:'#14222b'}}).composite(panels).png().toFile(`${dir}/range-comparison-${width}-v3.png`);
}
