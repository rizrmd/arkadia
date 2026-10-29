import {createServer} from 'vite';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const vite=await createServer({logLevel:'error',server:{watch:null}});
try {
 const {coreVisual,CAMPFIRE_FILE}=await vite.ssrLoadModule('/src/stronghold/starting-campfire.ts');
 const {fresh,load}=await vite.ssrLoadModule('/src/stronghold/economy.ts');
 const prior=JSON.parse(execFileSync('git',['show','befbabb5:src/stronghold/core-art.json'],{encoding:'utf8'}));
 const manifest=JSON.parse(await fs.readFile('public/buildings/stronghold-core/painted/manifest.json'));
 assert.equal(coreVisual(1).file,CAMPFIRE_FILE);assert.equal(coreVisual(1).slot.y,320);
 assert.equal(coreVisual(1).slot.pivot,545/887);
 for(let level=2;level<=30;level++){
  assert.deepEqual(coreVisual(level).composition,prior.levels[level-1]);
  assert.deepEqual(manifest.levels[level-1],prior.levels[level-1]);
 }
 for(const level of [undefined,1,2,4,12,30]){
  const state=fresh();state.careerDefenses={};state.gold=9876;state.levels.expedition=3;state.rewarded=['retained'];
  if(level)state.strongholdCore={completedLevel:level};
  assert.deepEqual(load(JSON.stringify(state),state.at),state);
 }
 const world=await fs.readFile('src/stronghold/world-view.ts','utf8');assert(world.includes("const s=id==='expedition'?coreSlot:slots[id],c=calibration(id),file=spriteFile"));
 console.log('PASS: shared Core registration, level 2–30 parity, fresh/legacy save round trips');
} finally {await vite.close();}
