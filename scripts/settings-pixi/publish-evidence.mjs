import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {publishLayer} from '../arkodia/publish-layer.mjs';
const dir='docs/settings-pixi',files={};
for(const name of await fs.readdir(dir))if(/^final-.*\.png$/.test(name)||/^live-(desktop|portrait|landscape)-shortcuts\.png$/.test(name)||['README.md','live-results.json','final-layout.json','release-verification.json','deployment.json'].includes(name))files['/'+name]=(await fs.readFile(dir+'/'+name)).toString('base64');
await publishLayer({name:'settings-evidence-'+execFileSync('git',['rev-parse','--short','HEAD'],{encoding:'utf8'}).trim(),files,prefix:'/settings-pixi/evidence'});
