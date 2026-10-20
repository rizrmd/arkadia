// Publish only character atlases and this task's evidence, retaining the current game release.
import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const sandbox='CS13a31c114a666008eb9cafa5',dir='/home/dev/idle-proportions-release';
const run=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',timeout:55000,maxBuffer:6e6}));
const files={};
for(const n of ['hero.png','revenant.png','manifest.json'])files['/assets/characters/'+n]=(await fs.readFile('public/assets/characters/'+n)).toString('base64');
async function collect(dir, url) {
 for (const entry of await fs.readdir(dir,{withFileTypes:true})) {
  if (entry.isDirectory()) await collect(dir+'/'+entry.name,url+'/'+entry.name);
  else files[url+'/'+entry.name]=(await fs.readFile(dir+'/'+entry.name)).toString('base64');
 }
}
await collect('public/idle-proportions','/idle-proportions');
const archive=gzipSync(JSON.stringify(files)),revision=createHash('sha256').update(archive).digest('hex').slice(0,12),names=[];
await fs.mkdir(dir,{recursive:true});
for(let i=0;i<archive.length;i+=2e6){const name=`idle-${revision}-${names.length}.gzpart`;await fs.writeFile(dir+'/'+name,archive.subarray(i,i+2e6));names.push(name);}
console.log('Packaged',Object.keys(files).length,'files into',names.length,'bounded parts');
if(!process.argv.includes('--deploy'))process.exit();
for(const name of names){run(['organization','home-files','transfer','--from-member','US4f550b10dab65dc9756fa429','--from','idle-proportions-release/'+name,'--to-custom-sandbox',sandbox,'--to',name]);console.log('Staged',name);}
// Re-read after staging: a peer may have published unrelated Stronghold work meanwhile.
const live=run(['organization','home-files','file','--custom-sandbox',sandbox,'--path','app.mjs']).content;
if(!live.includes('const types='))throw Error('Unknown release loader');
const injection=`Object.assign(files,JSON.parse(gunzipSync(Buffer.concat(${JSON.stringify(names)}.map(n=>readFileSync(n))))));`;
const loader=dir+'/loader';await fs.mkdir(loader,{recursive:true});
await fs.writeFile(loader+'/app.mjs',live.includes(injection)?live:live.replace('const types=',injection+'const types='));
console.log(JSON.stringify(run(['sandboxes','serve','--name','arkadia-stronghold','--dir',loader,'--cmd','node app.mjs','--port','3000','--project','PJ8758f22f61165f3d3215e454'])));
