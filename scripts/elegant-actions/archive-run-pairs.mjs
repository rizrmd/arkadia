import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='public/elegant-actions/v2',out='docs/elegant-actions/v2',room='DRb4787514f3224844f3c207ab';
const run=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',timeout:60000,maxBuffer:8e6}));
let cache=JSON.parse(await fs.readFile(out+'/uploads.json'));
async function upload(file){const sha=createHash('sha256').update(await fs.readFile(file)).digest('hex');const key=file.startsWith(root+'/')?file.slice(root.length+1):file;if(cache[key]?.sha!==sha){cache[key]={...run(['messages','upload','--room',room,'--file',file,'--kind','photo']),sha};await fs.writeFile(out+'/uploads.json',JSON.stringify(cache,null,2)+'\n');}return cache[key].url;}
for(const [hero,id]of [['ember','NKBDf18fa50ee1a4cc98cc5d2106'],['rift','NKBD7b2d30906c8a963483c32888']]){
 const files=[];for(const f of await fs.readdir(root))if(f.startsWith(hero+'-run')&&f.endsWith('.png'))files.push(root+'/'+f);for(const dir of ['sources','reference','run-proof']){for(const f of await fs.readdir(root+'/'+dir).catch(()=>[]))if(f.endsWith('.png')&&(f.startsWith(hero+'-run-')||(hero==='ember'&&f.startsWith('run-'))))files.push(root+'/'+dir+'/'+f);}
 for(const f of await fs.readdir(out))if(f.startsWith(hero+'-run-')&&f.endsWith('.png'))files.push(out+'/'+f);
 let md='**Run correction in progress — not accepted.** Hurt and Death corrections are published. Both full 3072-square Run candidates now exist, but visual acceptance FAILED: repeated leg overlap, wrong-arm devices and body-scale jumps. 384 cells across all six exports pass structural checks; all 384 player selections and timed Death hold/Run continuation pass. These functional results do not accept the Run artwork. No live gameplay sprite has been replaced.\n\n## Source review\n\nPairs map to frames 1/5, 2/6, 3/7, 4/8. Structural checks verify two complete figures and clear source edges; they do not establish correct anatomy or smooth gait. Southwest repeated leg silhouettes and northwest near-left-arm weapon errors have been identified and require correction. Diagnostic guides are pose references only.\n\n<iframe src="https://ark-whachat.fural.space/rift-runner/elegant-actions/v2/?hero='+hero+'&action=run" title="Rejected Run candidate inspection" height="900" width="100%"></iframe>\n\n[Published six-clip review player](https://ark-whachat.fural.space/rift-runner/elegant-actions/v2/)\n\n## Generated source and diagnostic archive\n';
 for(const file of files.sort()){md+='\n### '+file.split('/').pop()+'\n\n!['+file.split('/').pop()+']('+await upload(file)+')\n';}
 const old=await fs.readFile('docs/elegant-actions/'+hero+'-run.md','utf8');md+='\n## Previous rejected candidate\n\n'+old;
 run(['knowledge','update',id,'--markdown',md]);await fs.writeFile(out+'/'+hero+'-run-checkpoint.md',md);console.log(hero,files.length,'inline archived images');
}
