import fs from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const base='https://arkodia.online',probe='/dev-route-health/probe.txt';
if(process.argv.includes('--publish-probe')){
 const {publishLayer}=await import('./publish-layer.mjs');
 await publishLayer({name:'dev-menu-availability-probe',prefix:'/dev-route-health',files:{'/probe.txt':Buffer.from('Developer menu availability probe').toString('base64')},check:probe});
}else{
 const marker=()=>JSON.parse(JSON.parse(execFileSync('fural-agent',['organization','home-files','file','--custom-sandbox','CS3d5f22197da69327e209c1c5','--path','.gateway-live.json'],{encoding:'utf8'})).content);
 const before=marker();let done=false,logs='';
 const child=spawn(process.execPath,[fileURLToPath(import.meta.url),'--publish-probe'],{stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);const finished=new Promise(resolve=>child.once('exit',code=>{done=true;resolve(code);}));
 const during=[];
 while(!done){for(const path of ['/dev','/rift-dash/player/']){try{const r=await fetch(base+path,{signal:AbortSignal.timeout(15000)});const body=await r.text();during.push({path,status:r.status,bytes:body.length});}catch(error){during.push({path,error:error.message});}}if(!done)await new Promise(r=>setTimeout(r,300));}
 const code=await finished;const after=marker();
 const source=await fs.readFile('src/app/dev.ts','utf8'),paths=['/dev',...Array.from(source.matchAll(/path:'([^']+)'/g),m=>m[1])],routes=[];
 for(const path of paths){const r=await fetch(base+path,{signal:AbortSignal.timeout(20000)});const html=await r.text(),scripts=[];for(const match of html.matchAll(/<script[^>]+src=["']([^"']+)/g)){const url=new URL(match[1],base+path).href;const script=await fetch(url,{signal:AbortSignal.timeout(20000)});await script.arrayBuffer();scripts.push({url,status:script.status});}routes.push({path,status:r.status,title:html.match(/<title>([^<]+)/)?.[1],scripts});}
 const proof=await fetch(base+probe);const probeText=await proof.text();
 const pass=code===0&&before.pid===after.pid&&during.length>0&&during.every(r=>r.status===200)&&routes.every(r=>r.status===200&&r.scripts.every(s=>s.status===200))&&probeText==='Developer menu availability probe';
 const report={pass,time:new Date().toISOString(),before,after,publisherExitCode:code,publisherLogs:logs,duringPublish:during,routes,probe:{status:proof.status,text:probeText}};
 await fs.mkdir('docs/dev-menu-availability',{recursive:true});await fs.writeFile('docs/dev-menu-availability/live-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass,requestsDuringPublish:during.length,gatewayPidUnchanged:before.pid===after.pid,routes:routes.map(({path,status,scripts})=>({path,status,scripts:scripts.length})),publisherLogTail:logs.slice(-350)}));if(!pass)process.exitCode=1;
}
