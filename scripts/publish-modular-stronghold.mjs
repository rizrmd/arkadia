import fs from 'node:fs/promises';import {gzipSync} from 'node:zlib';import {execFileSync} from 'node:child_process';
const run=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',timeout:120000,maxBuffer:6e6}));
const dir='/home/dev/modular-stronghold-release';await fs.mkdir(dir,{recursive:true});const files={},html=await fs.readFile('dist/stronghold.html','utf8');files['/stronghold.html']=Buffer.from(html).toString('base64');
const seen=new Set();async function dependency(url){if(seen.has(url))return;seen.add(url);const bytes=await fs.readFile('dist'+url);files[url]=bytes.toString('base64');if(url.endsWith('.js'))for(const m of bytes.toString().matchAll(/(?:from|import)\s*["']\.\/([^"']+)["']/g))await dependency('/assets/'+m[1]);}
for(const m of html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g))await dependency(m[1]);
for(const n of await fs.readdir('public/modular-stronghold'))if(!(/^(runtime-|editor|contact-sheet).*\.png$/.test(n)))files['/modular-stronghold/'+n]=(await fs.readFile('public/modular-stronghold/'+n)).toString('base64');
const archive=gzipSync(JSON.stringify(files)),names=[];for(let start=0;start<archive.length;start+=2e6){const n=`modular-stronghold-v1-${names.length}.gzpart`;await fs.writeFile(dir+'/'+n,archive.subarray(start,start+2e6));names.push(n);}
console.log('Packaged',Object.keys(files).length,'resources,',names.length,'parts,',archive.length,'bytes');
for(const id of process.argv.slice(2)){
 for(const n of names)run(['organization','home-files','transfer','--from-member','US4f550b10dab65dc9756fa429','--from','modular-stronghold-release/'+n,'--to-custom-sandbox',id,'--to',n]);
 const live=run(['organization','home-files','file','--custom-sandbox',id,'--path','app.mjs']).content;
 const injection=`Object.assign(files,JSON.parse(gunzipSync(Buffer.concat(${JSON.stringify(names)}.map(n=>readFileSync(n))))));`;
 if(!live.includes('const types='))throw Error('Unrecognized release loader');const code=live.includes(injection)?live:live.replace('const types=',injection+'const types=');
 const loader=dir+'/'+id;await fs.mkdir(loader,{recursive:true});await fs.writeFile(loader+'/app.mjs',code);
 console.log(JSON.stringify(run(['sandboxes','serve','--name',id==='CS13a31c114a666008eb9cafa5'?'arkadia-stronghold':'arkadia','--dir',loader,'--cmd','node app.mjs','--port','3000','--project','PJ8758f22f61165f3d3215e454'])));
}
