import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {publishLayer,readDir} from '../arkodia/publish-layer.mjs';
// Restore unchanged historical evidence under its original prefix, then activate
// the new art acceptance evidence in a distinct prefix with one final restart.
const old={};for(const name of await fs.readdir('docs/settings-pixi'))if(name.startsWith('local-'))old['/'+name]=(await fs.readFile('docs/settings-pixi/'+name)).toString('base64');
await publishLayer({name:'settings-history-'+execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).trim(),files:old,prefix:'/settings-pixi',deferRestart:true});
const files=await readDir('docs/settings-restyle');for(const name of ['panel','button'])files['/generated-'+name+'.png']=(await fs.readFile('assets-src/ui/settings/v2/'+name+'.png')).toString('base64');
await publishLayer({name:'settings-art-evidence-'+execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).trim(),files,prefix:'/settings-restyle/evidence'});
