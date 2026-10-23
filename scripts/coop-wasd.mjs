// Co-op WASD responsiveness beside revenants over the real wire protocol. One client walks out of the court (S),
// then 30 times stands still for 0.3-1 s (the server's auto attack swings) and holds A or D for 1.2 s. Inputs go out
// every 50 ms like the browser client; with BURST=1 they are delivered in 150-400 ms bursts (a phone network).
// Measured from the server's snapshots: how long after the key press the hero starts walking, and how much of the
// key-held time it spends locked in a swing. Writes docs/coop/wasd-<label>.json.
//   node scripts/coop-wasd.mjs [label]                   builds and starts server/
//   ARKODIA_BIN=path BURST=1 node scripts/coop-wasd.mjs  an already built server, bursty delivery
import {spawn,execFileSync} from 'node:child_process';import fs from 'node:fs/promises';
const label=process.argv[2]||(process.env.BURST==='1'?'burst':'steady');
const bin=process.env.ARKODIA_BIN||'server/bin/arkodia';if(!process.env.ARKODIA_BIN)execFileSync(process.env.GO||'go',['build','-o','bin/arkodia','./cmd/arkodia'],{cwd:'server',stdio:'inherit',env:{...process.env,CGO_ENABLED:'0'}});
const burst=process.env.BURST==='1',port=String(18800+Math.floor(Math.random()*90)),seed=Number(process.env.SEED||1);
let r=seed;const rand=()=>((r=(r*1103515245+12345)%2147483648)/2147483648);
const server=spawn(bin,[],{env:{...process.env,PORT:port,SITE_DIR:'/nonexistent'},stdio:['ignore','pipe','inherit']});
await new Promise((ok,no)=>{server.stdout.on('data',d=>{if(String(d).includes('listening'))ok();});server.on('exit',c=>no(Error('exit '+c)));});
const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`);let you='',snaps=[];
await new Promise((ok,no)=>{ws.onopen=()=>ws.send(JSON.stringify({t:'hello',v:1,name:'Probe',room:'',maxHp:100,hero:'ember-warden'}));
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.t==='welcome'){you=m.you;ok();}else if(m.t==='s'){const me=m.players.find(p=>p.id===you);if(me)snaps.push({t:performance.now(),ack:m.ack,x:me.x,y:me.y,st:me.st,k:me.k});}};ws.onerror=no;});
let dir={x:0,y:0},seq=0,done=false;const queue=[];
const tick=setInterval(()=>{const m=JSON.stringify({t:'in',seq:++seq,x:dir.x,y:dir.y});if(burst)queue.push(m);else ws.send(m);},50);
const flush=()=>{for(const m of queue.splice(0))ws.send(m);if(burst&&!done)setTimeout(flush,150+rand()*250);};if(burst)flush();
const wait=ms=>new Promise(r=>setTimeout(r,ms));
dir={x:0,y:1};await wait(6500);dir={x:0,y:0};
const phases=[];
const PRESSES=Number(process.env.PRESSES||30);
for(let i=0;i<PRESSES;i++){await wait(300+rand()*700);const t0=performance.now(),first=seq+1;dir={x:i%2?-1:1,y:0};await wait(1200);dir={x:0,y:0};phases.push([t0,performance.now(),first]);}
await wait(300);done=true;clearInterval(tick);ws.close();server.kill();
let held=0,swing=0;const response=[];
for(const [t0,t1,first] of phases){
 const before=snaps.filter(s=>s.t<t0).at(-1),w=snaps.filter(s=>s.t>=t0&&s.t<=t1);
 held+=w.length;swing+=w.filter(s=>s.st==='attack').length;
 const moved=w.find(s=>Math.hypot(s.x-before.x,s.y-before.y)>2);
 // After the server applied the first walking input: snapshots until the hero moves (0: on that very tick).
 const got=w.findIndex(s=>s.ack>=first),walked=w.findIndex(s=>Math.hypot(s.x-before.x,s.y-before.y)>2);
 response.push({swingAtPress:before.st==='attack',ms:moved?Math.round(moved.t-t0):null,heldTicksAfterInput:got<0?null:walked<0?w.length-got:Math.max(0,walked-got)});
}
const ms=response.map(x=>x.ms??1200).sort((a,b)=>a-b),during=response.filter(x=>x.swingAtPress);
const result={label,burst,kills:snaps.at(-1).k,pressesDuringSwing:during.length,
 msToMoveWhenPressedMidSwing:during.map(x=>x.ms),serverHeldTicksAfterInputMidSwing:during.map(x=>x.heldTicksAfterInput),medianMsToMove:ms[ms.length>>1],worstMsToMove:ms.at(-1),swingShareOfKeyHeldTime:+(swing/held).toFixed(3)};
console.log(JSON.stringify(result));await fs.writeFile(`docs/coop/wasd-${label}.json`,JSON.stringify(result,null,1)+'\n');
