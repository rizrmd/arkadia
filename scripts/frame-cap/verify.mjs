import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const source=ts.transpile(readFileSync('src/app/frame-scheduler.ts','utf8'),{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022});
let queued=new Map(),id=0;
globalThis.window={requestAnimationFrame(fn){queued.set(++id,fn);return id;},cancelAnimationFrame(id){queued.delete(id);}};
globalThis.reportError=error=>{throw error;};
const {requestGameFrame,cancelGameFrame}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
function advance(now){const batch=[...queued.values()];queued.clear();for(const fn of batch)fn(now);}
for(const hz of [30,60,90,120,144,165,240]){
 let frames=0,elapsed=0,last=0,handle;
 const loop=now=>{frames++;elapsed+=last?now-last:0;last=now;handle=requestGameFrame(loop);};
 handle=requestGameFrame(loop);
 for(let i=0;i<hz*10;i++)advance(i*1000/hz);
 cancelGameFrame(handle);
 assert.ok(frames<=601,`${hz} Hz exceeded cap: ${frames}`);
 assert.ok(frames>=Math.min(hz,60)*10-1,`${hz} Hz unnecessarily slowed: ${frames}`);
 assert.ok(elapsed>9900,'Movement must retain elapsed time');
 assert.equal(queued.size,0);
 console.log(`${hz} Hz display: ${frames/10} FPS`);
}
let called=false;const canceled=requestGameFrame(()=>{called=true;});cancelGameFrame(canceled);advance(0);assert.equal(called,false);
let times=[];requestGameFrame(t=>times.push(t));requestGameFrame(t=>times.push(t));advance(1000);assert.deepEqual(times,[1000,1000]);
console.log('Cancellation and synchronized callbacks passed.');
