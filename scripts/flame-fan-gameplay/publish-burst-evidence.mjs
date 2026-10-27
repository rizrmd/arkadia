import {execFileSync} from 'node:child_process';
import {readDir,publishLayer} from '../arkodia/publish-layer.mjs';
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),prefix='/ember-warden-review/flame-fan-gameplay/burst-v1';
await publishLayer({name:'flame-fan-burst-evidence-'+commit.slice(0,8),files:await readDir('docs/flame-fan-gameplay/burst-v1'),prefix,check:prefix+'/README.md'});
console.log(JSON.stringify({evidenceCommit:commit,prefix}));
