import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Ticker} from 'pixi.js';
import {createFrameCadence,installTickerCadence} from '../../src/app/frame-cadence.ts';

const results=[];
for(const target of [30,60])for(const hz of [60,90,120,144,240]){
 const run=(fixed)=>{
  const ticker=new Ticker();ticker.maxFPS=target;
  if(fixed)installTickerCadence(ticker,()=>target);
  let now=0,last=0,count=0;const gaps=[];
  ticker.add(()=>{count++;if(last)gaps.push(now-last);last=now;});
  ticker.lastTime=0;ticker._lastFrame=0;
  for(let i=1;i<=hz*10;i++){now=i*1000/hz;ticker.update(now);}
  ticker.destroy();return {count,maxGap:Math.max(...gaps)};
 };
 const before=run(false),after=run(true);
 assert.ok(Math.abs(after.count-target*10)<=1,`${target} at ${hz} Hz loses valid refreshes: ${after.count}`);
 assert.ok(after.maxGap<=Math.ceil(hz/target)*1000/hz+.02,'no avoidable extra refresh gap');
 results.push({target,hz,before,after});
}
for(const hz of [60,120]){
 const cadence=createFrameCadence();let count=0,last=0,maxGap=0;
 for(let i=1;i<=hz*10;i++){
  const now=i*1000/hz+Math.sin(i*1.7)*.04;
  if(cadence.take(now,60)){count++;if(last)maxGap=Math.max(maxGap,now-last);last=now;}
 }
 assert.equal(count,600,`fractional vsync jitter at ${hz} Hz must not discard frames`);
 assert.ok(maxGap<17,'no doubled interval under small timestamp jitter');
 results.push({target:60,hz,jitterMs:.04,after:{count,maxGap}});
}
const gate=createFrameCadence();assert.equal(gate.take(0,60),true);
assert.equal(gate.take(4,60),false);assert.equal(gate.take(16.667,60),true);
assert.equal(gate.take(500,60),true);assert.equal(gate.take(500,60),false,'no catch-up render burst');
gate.reset();assert.equal(gate.take(600,30),true);
assert.equal(gate.take(616.667,60),true,'quality change takes effect immediately');
assert.equal(gate.take(0,60),true,'new clock origin resets the gate');
assert.equal(gate.take(NaN,60),false);
let target=60,count=0;const ticker=new Ticker();installTickerCadence(ticker,()=>target);ticker.add(()=>count++);
ticker.lastTime=0;ticker.update(17);target=30;ticker.update(34);ticker.update(40);
assert.equal(count,2,'ticker observes a changed FPS preference');ticker.destroy();
await fs.writeFile('docs/android-stutter/cadence-verification.json',JSON.stringify({results,checks:['30/60 FPS at five refresh rates','fractional precision','no catch-up bursts','quality changes','clock reset','invalid time']},null,2)+'\n');
console.log(JSON.stringify(results));
