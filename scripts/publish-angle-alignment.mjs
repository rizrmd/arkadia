// Public releases use the single retained Arkadia sandbox.
for (const id of process.argv.slice(2)) if (id !== 'CS13a31c114a666008eb9cafa5') throw Error('Use the canonical arkadia-stronghold sandbox: CS13a31c114a666008eb9cafa5');
// Overlay only this task's Stronghold entry and evidence onto the current release.
// Read the live loader first so unrelated arena releases are preserved.
import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';
const run=(args)=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',timeout:120000,maxBuffer:4e6}));
const dir='publish-angle-alignment';await fs.mkdir(dir,{recursive:true});
const files={},html=await fs.readFile('dist/stronghold.html','utf8');files['/stronghold.html']=Buffer.from(html).toString('base64');
for(const match of html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g))files[match[1]]=(await fs.readFile('dist'+match[1])).toString('base64');
for(const name of ['desktop','mobile','barracks','barracks-guides'])await sharp('public/angle-alignment/'+name+'.png').webp({quality:95}).toFile('public/angle-alignment/'+name+'.webp');
for(const name of await fs.readdir('public/angle-alignment'))if(name.endsWith('.webp')||name.startsWith('report'))files['/angle-alignment/'+name]=(await fs.readFile('public/angle-alignment/'+name)).toString('base64');
const archive='angle-alignment-v1.gz';await fs.writeFile(dir+'/'+archive,gzipSync(JSON.stringify(files)));
const targets=process.argv.slice(2);if(!targets.length){console.log('Packaged',Object.keys(files).length,'files; pass sandbox IDs to publish');process.exit();}
const member='US4f550b10dab65dc9756fa429',project='PJ8758f22f61165f3d3215e454';
for(const id of targets){
 run(['organization','home-files','transfer','--from-member',member,'--from','projects/arkadia/repos/arkadia/'+dir+'/'+archive,'--to-custom-sandbox',id,'--to',archive]);
 const live=run(['organization','home-files','file','--custom-sandbox',id,'--path','app.mjs']).content;
 const injection=`Object.assign(files,JSON.parse(gunzipSync(readFileSync('${archive}'))));`;
 if(!live.includes('const types='))throw Error('Unrecognized release loader');
 const code=live.includes(injection)?live:live.replace('const types=',injection+'const types=');
 await fs.writeFile(dir+'/app.mjs',code);
 const name='arkadia-stronghold';
 const stage=dir+'/loader';await fs.mkdir(stage,{recursive:true});await fs.writeFile(stage+'/app.mjs',code);
 console.log(JSON.stringify(run(['sandboxes','serve','--name',name,'--dir',process.cwd()+'/'+stage,'--cmd','node app.mjs','--port','3000','--project',project])));
}
