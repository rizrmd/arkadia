import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {sandboxId,publishRelease} from '../arkodia/publish-layer.mjs';
const run=args=>JSON.parse(execFileSync('fural-agent',args,{encoding:'utf8',maxBuffer:16e6}));
const id=sandboxId();
for(const peer of run(['sessions','list','--all','--live'])){
 if(peer.id===process.env.FURAL_TURN_ID)continue;
 const tree=JSON.stringify(run(['sessions','process-tree',peer.id]));
 assert(!/scripts\/(?:fural-deploy\.sh|arkodia\/publish-layer\.mjs|[^" ]*\/(?:ship[^" ]*\.sh|deploy\.(?:sh|mjs)))/.test(tree),`Peer deploying: ${peer.id}`);
}
const local=await fs.readFile('scripts/arkodia/gateway.mjs','utf8'),live=run(['organization','home-files','file','--custom-sandbox',id,'--path','gateway.mjs']).content;
assert.equal(live,local,'Live gateway changed: reconcile peer release before publishing');
const applied=JSON.parse(run(['organization','home-files','file','--custom-sandbox',id,'--path','applied.json']).content);
for(const layer of applied){const sha=layer.match(/-(?:game|gameplay-progress)-([a-f0-9]{7,40})-/)?.[1];if(sha)execFileSync('git',['merge-base','--is-ancestor',sha,'HEAD']);}
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
await publishRelease({name:'settings-pixi-'+commit.slice(0,8),tgz:process.env.SETTINGS_RELEASE_ARCHIVE});
await fs.writeFile('docs/settings-pixi/deployment.json',JSON.stringify({commit,url:'https://ark-whachat.fural.space',archive:process.env.SETTINGS_RELEASE_ARCHIVE,at:new Date().toISOString()},null,2));
