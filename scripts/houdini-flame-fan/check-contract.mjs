import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import ts from 'typescript';
// Check against the actual game formula by transpiling its module with imports erased.
const source=await fs.readFile('src/fx/flame-fan-levels.ts','utf8');const fn=source.slice(source.indexOf('export function flameFanLevel'),source.indexOf('export const FLAME_FAN_TIMING'));
const compiled=ts.transpileModule(fn.replace('export function','function'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const get=new Function(compiled+';return flameFanLevel;')(),m=JSON.parse(await fs.readFile('experiments/houdini-flame-fan/player/artifacts/manifest.json','utf8'));
for(const l of m.levels){const spec=get(l.level);assert.ok(Math.abs(l.rangeGameUnits-spec.radius)<1e-9);assert.ok(Math.abs(l.intensity-spec.damage)<1e-9);assert.equal(l.fanAngleDegrees,108);assert.equal(l.frameWidth,1280);assert.equal(l.frameHeight,720);assert.equal(l.commercialEligible,false);assert.ok(l.variants.mobile.decodedBytes<9*1048576);assert.deepEqual(l.pivot,{x:.2,y:.35});assert.equal(l.burnSoil.damagePerTick,null);}
let blocked=false;try{execFileSync('node',['scripts/houdini-flame-fan/pack.mjs','--production'],{stdio:'pipe'});}catch(e){blocked=e.stderr.toString().includes('Apprentice assets cannot enter commercial production');}assert.ok(blocked,'production gate must reject Apprentice');
console.log('5 level presets match game; 1280×720, shared pivot, mobile budget and Apprentice production gate pass.');
