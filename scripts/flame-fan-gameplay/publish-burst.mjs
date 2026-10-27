import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {sandboxId,publishRelease} from '../arkodia/publish-layer.mjs';
const run=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',maxBuffer:16e6})),id=sandboxId();
for(const peer of run(['sessions','list','--all','--live'])){
 if(peer.id===process.env.FURAL_TURN_ID)continue;
 const tree=JSON.stringify(run(['sessions','process-tree',peer.id]));
 assert(!/scripts\/(?:fural-deploy\.sh|arkodia\/publish-layer\.mjs|[^" ]*\/(?:ship[^" ]*\.sh|deploy\.(?:sh|mjs)))/.test(tree),`Peer deploying: ${peer.id}`);
}
assert.equal(run(['organization','home-files','file','--custom-sandbox',id,'--path','gateway.mjs']).content,await fs.readFile('scripts/arkodia/gateway.mjs','utf8'),'Live gateway changed; merge before publishing');
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
// Use the existing game name so the shared publisher's anti-rollback guard tracks this release.
await publishRelease({name:'game-'+commit.slice(0,8),tgz:process.env.FLAME_FAN_STAGE+'.tgz'});
await fs.writeFile('docs/flame-fan-gameplay/soil-v2/deployment.json',JSON.stringify({commit,archive:process.env.FLAME_FAN_STAGE+'.tgz',url:'https://arkodia.online',at:new Date().toISOString(),scope:'Cumulative compiled client/server plus approved burst asset and evidence. Existing art and players preserved.'},null,2));
