import fs from 'node:fs/promises';
import sharp from 'sharp';
const root='public/core-upgrade/kit-v2',rows=JSON.parse(await fs.readFile(root+'/transitions.json'));const parts=[];
for(const [i,row] of rows.entries()){
 const input=await sharp(root+'/transitions/'+row.file).resize(300,280,{fit:'contain',background:'#26313d'}).png().toBuffer();parts.push({input,left:i%5*300,top:Math.floor(i/5)*305});
 parts.push({input:Buffer.from(`<svg width="300" height="25"><text x="150" y="20" text-anchor="middle" fill="#e7cd95" font-family="sans-serif" font-size="15">Core ${row.level} → ${row.recipe.level}</text></svg>`),left:i%5*300,top:Math.floor(i/5)*305+280});
}
await sharp({create:{width:1500,height:1830,channels:4,background:'#26313d'}}).composite(parts).png().toFile(root+'/all-transitions.png');
const manifest=JSON.parse(await fs.readFile(root+'/manifest.json'));
manifest.layout={width:540,height:478,frameHeight:458,costRowCenters:[190,231],timeRowCenter:305.5,button:{x:123,y:338,width:294,height:54},captionY:460};
await fs.writeFile(root+'/manifest.json',JSON.stringify(manifest,null,2));
console.log('Packaged 29 corrected-layout captures and layout manifest.');
