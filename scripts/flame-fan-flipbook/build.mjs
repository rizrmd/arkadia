import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import sharp from 'sharp';import {createHash} from 'node:crypto';
execFileSync('npx',['vite','build','--config','vite.flame-fan-flipbook.config.ts'],{stdio:'inherit'});
const out='dist-flame-fan-flipbook';await fs.copyFile(out+'/flame-fan-flipbook.html',out+'/index.html');
for(const n of ['hand-ignition-source.png','approved-reference.png','rolling-fan-v2.png','eroded-core-v2.png','smoke-v2.png'])await fs.copyFile('public/flame-fan-flipbook/'+n,out+'/'+n);
await fs.mkdir(out+'/actors',{recursive:true});
// Read committed actors, not shared-clone WIP.
const manifest=JSON.parse(execFileSync('git',['show','HEAD:public/assets/characters/manifest.json']));
const selected={characters:Object.fromEntries(['ember-warden','revenant'].map(id=>[id,manifest.characters[id]]))};
await fs.writeFile(out+'/actors/manifest.json',JSON.stringify(selected));
for(const m of Object.values(selected.characters))await fs.writeFile(out+'/actors/'+m.image,execFileSync('git',['show','HEAD:public/assets/characters/'+m.image],{maxBuffer:8e6}));
const bytes=await fs.readFile(out+'/hand-ignition-source.png'),{data,info}=await sharp(bytes).raw().toBuffer({resolveWithObject:true});let transparent=0,opaqueBlack=0;
for(let i=0;i<data.length;i+=info.channels){if(data[i+3]===0)transparent++;if(data[i+3]>250&&data[i]+data[i+1]+data[i+2]<15)opaqueBlack++;}
const report={attachment:'DA14f9840922edc53aa33bf53f',sha256:createHash('sha256').update(bytes).digest('hex'),width:info.width,height:info.height,frames:16,transparentPixels:transparent,opaqueBlackPixels:opaqueBlack,cellBoundaries:'round(n * 1254 / 4); no dropped edge pixels',actorSource:'git HEAD committed manifest and atlases'};
if(transparent===0||opaqueBlack>10)throw Error('Source alpha validation failed');
await fs.writeFile('docs/flame-fan-flipbook/source-validation.json',JSON.stringify(report,null,2)+'\n');console.log(report);
