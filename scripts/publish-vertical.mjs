import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
const run=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',timeout:120000,maxBuffer:4e6}));
const dir='publish-vertical';await fs.mkdir(dir+'/loader',{recursive:true});
const files={};
for(const n of await fs.readdir('dist/assets'))if(/\.(js|css)$/.test(n))files['/assets/'+n]=(await fs.readFile('dist/assets/'+n)).toString('base64');
files['/index.html']=(await fs.readFile('dist/index.html')).toString('base64');
for(const folder of ['assets/characters','vertical-facing'])for(const n of await fs.readdir('public/'+folder))files['/'+folder+'/'+n]=(await fs.readFile('public/'+folder+'/'+n)).toString('base64');
const archive='vertical-v3-'+Date.now()+'.gz';await fs.writeFile(dir+'/'+archive,gzipSync(JSON.stringify(files)));
if(!process.argv[2]){console.log('Packaged',Object.keys(files).length,'resources');process.exit();}
const id=process.argv[2];
run(['organization','home-files','transfer','--from-member','US4f550b10dab65dc9756fa429','--from','projects/arkadia/repos/arkadia/'+dir+'/'+archive,'--to-custom-sandbox',id,'--to',archive]);
const live=run(['organization','home-files','file','--custom-sandbox',id,'--path','app.mjs']).content;
if(!live.includes('const types='))throw Error('Unknown live loader');
const injection=`Object.assign(files,JSON.parse(gunzipSync(readFileSync('${archive}'))));`;
const code=live.includes(injection)?live:live.replace('const types=',injection+'const types=');
await fs.writeFile(dir+'/loader/app.mjs',code);
console.log(JSON.stringify(run(['sandboxes','serve','--name','arkadia','--dir',process.cwd()+'/'+dir+'/loader','--cmd','node app.mjs','--port','3000','--project','PJ8758f22f61165f3d3215e454'])));
