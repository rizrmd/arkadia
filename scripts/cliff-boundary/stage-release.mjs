import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const stage=process.argv[2];if(!stage)throw Error('Release staging directory required');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),site=path.join(stage,'site'),out=path.join(site,'cliff-boundary');await fs.mkdir(out,{recursive:true});
for(const dir of ['verified','verified-rift'])await fs.cp(`docs/cliff-boundary/${dir}`,path.join(out,dir),{recursive:true});
const files={};for(const f of ['index.html',...(await fs.readdir(path.join(site,'assets'))).filter(f=>/\.(js|css)$/.test(f)).map(f=>'assets/'+f)])files['/'+f]=hash(await fs.readFile(path.join(site,f)));
const manifest={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),movementBoundary:'hill-foot-contour-v1',binarySha256:hash(await fs.readFile(path.join(stage,'arkodia'))),files};await fs.writeFile(path.join(out,'release.json'),JSON.stringify(manifest,null,2)+'\n');console.log('Cliff boundary release manifest:',manifest.commit,Object.keys(files).length,'client files');
