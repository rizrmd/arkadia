import {spawn,execFileSync} from 'node:child_process';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
// Headless two-client smoke test of the co-op server (protocol only, no browser). Two guests join one room, walk
// out through the gate and let the server's auto attack fight the revenants. Every tick both clients saw must
// carry identical revenant ids, hit points and states, and identical heroes; kills and damage come only from
// the server. A third connection tries to cheat (oversized walk vectors, forged messages) and must stay
// at hero speed and change nothing.
//   node scripts/coop-smoke.mjs                 builds and starts server/ on a free port
//   COOP_URL=wss://host/ws node scripts/coop-smoke.mjs   tests a deployed server
const SECONDS=Number(process.env.SECONDS||40),TICK=50,STEP=120*TICK/1000;
let server=null,url=process.env.COOP_URL;
if(!url){
 const bin=process.env.ARKODIA_BIN||'server/bin/arkodia';if(!process.env.ARKODIA_BIN)execFileSync(process.env.GO||'go',['build','-o','bin/arkodia','./cmd/arkodia'],{cwd:'server',stdio:'inherit',env:{...process.env,CGO_ENABLED:'0'}});
 const port=process.env.PORT||String(18600+(process.pid%1000));
 server=spawn(bin,[],{env:{...process.env,PORT:port,SITE_DIR:process.env.SITE_DIR||'dist'},stdio:['ignore','pipe','inherit']});
 await new Promise((ok,no)=>{server.stdout.on('data',d=>{if(String(d).includes('listening'))ok();});server.on('exit',c=>no(Error('server exited '+c)));});
 url=`ws://127.0.0.1:${port}/ws`;
}
function client(name,room){
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket(url),c={ws,name,ticks:new Map(),welcome:null,errors:[],seq:0};
  ws.onopen=()=>ws.send(JSON.stringify({t:'hello',v:1,name,room,maxHp:100}));
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.t==='welcome'){c.welcome=m;resolve(c);}else if(m.t==='s')c.ticks.set(m.tick,m);else if(m.t==='error'){c.errors.push(m);reject(Object.assign(Error(m.message),{code:m.code}));}};
  ws.onerror=()=>reject(Error('socket error'));
  c.send=m=>ws.readyState===1&&ws.send(JSON.stringify(m));
  c.walk=(x,y)=>c.send({t:'in',seq:++c.seq,x,y});
 });
}
const results={url,seconds:SECONDS};
try{
 const a=await client('Ayu',''),room=a.welcome.room,b=await client('Bima',room);
 results.room=room;assert.equal(b.welcome.room,room);assert.notEqual(a.welcome.you,b.welcome.you);
 await assert.rejects(client('Nobody','ZZZZZ'),e=>e.code==='room_not_found');
 // Script: 6 s straight down the screen from the tent, through the arch and into the snow, then stand and fight;
 // after 20 s walk back up into the safe zone to heal. The cheat walks 50x too far and forges messages.
 const cheat=await client('Cheat',room);
 const t0=Date.now();let n=0;
 await new Promise(done=>{const timer=setInterval(()=>{
  const s=(Date.now()-t0)/1000;n++;
  // Walk out for 6 s, or longer (up to 16 s) until both heroes are well into the snow: on a throttled machine this
  // timer fires late, fewer inputs arrive, and 6 s alone can leave the heroes standing in the arch.
  const out=a.ticks.size?[...a.ticks.values()].at(-1).players.filter(p=>p.name==='Ayu'||p.name==='Bima'):[];
  const outbound=s<6||(s<16&&out.some(p=>p.y<1000));
  const y=outbound?1:s>20&&s<26?-1:0;
  a.walk(0,y);b.walk(s<6?.05:0,y);
  cheat.walk(50,50);cheat.walk(50,50);
  if(n%20===0){cheat.send({t:'damage',target:1,amount:99});cheat.send({t:'s',tick:1,enemies:[]});cheat.send({t:'kill',id:2});cheat.send({t:'in',seq:-5,x:1e9,y:NaN});}
  if(s>=SECONDS){clearInterval(timer);done();}
 },TICK);});
 await new Promise(r=>setTimeout(r,300));
 // Identical server world on both clients, tick by tick.
 const common=[...a.ticks.keys()].filter(t=>b.ticks.has(t));
 // The server catches up on ticks it was late for and then sends only the newest, so a loaded machine skips some.
 const span=Math.max(...common)-Math.min(...common);
 assert(span>SECONDS*20*.85,`world advanced only ${span} ticks in ${SECONDS} s`);assert(common.length>span*.6,`only ${common.length} of ${span} ticks seen by both`);
 let enemyTicks=0;
 for(const t of common){const x=a.ticks.get(t),y=b.ticks.get(t);
  assert.deepEqual(x.souls,y.souls,`souls differ at tick ${t}`);assert.deepEqual(x.enemies,y.enemies,`enemies differ at tick ${t}`);assert.deepEqual(x.players,y.players,`players differ at tick ${t}`);assert.deepEqual(x.gate,y.gate);assert.equal(x.clock,y.clock);
  if(x.enemies.length)enemyTicks++;}
 const last=a.ticks.get(Math.max(...common)),ids=last.enemies.map(e=>e.id);
 assert.equal(new Set(ids).size,ids.length,'enemy ids are unique');
 for(const s of a.ticks.values())for(const e of s.enemies){const maxHp=e.max??(2+Math.max(0,(e.level??1)-1));assert(e.hp>=0&&e.hp<=maxHp,`revenant hp ${e.hp} outside 0..${maxHp}`);assert((e.level??1)>=1,`revenant level ${e.level} < 1`);}
 const kills=last.players.reduce((k,p)=>k+p.k,0),hurt=[...a.ticks.values()].some(s=>s.players.some(p=>p.hp<p.max)),killed=[...a.ticks.values()].some(s=>s.enemies.some(e=>e.st==='die'));
 assert(kills>0&&killed,'the heroes killed revenants');
 // Gold remains a kill reward. XP is awarded only for collected souls; outstanding souls carry the rest.
 for(const p of last.players){const r=p.run;assert(r,'snapshot carries run progression');let xp=r.xp;for(let l=1;l<r.level;l++)xp+=10*l*(10+(l-1)*4);assert.equal(r.gold,5*p.k,p.name+' gold matches kills');const outstanding=(last.souls??[]).filter(s=>s.owner===p.id).reduce((n,s)=>n+10+Math.max(0,s.level-1)*4,0);assert(xp+outstanding>=10*p.k,p.name+' XP plus uncollected souls matches kills');}
 // The cheat never outruns two hero steps per tick (the server's catch-up after a stall) and its forged messages
 // changed nothing: it stays connected, every revenant hp is a server value and both honest views agree.
 const id=cheat.welcome.you;let maxStep=0;const seq=[...a.ticks.keys()].sort((p,q)=>p-q);
 for(let i=1;i<seq.length;i++){const p=a.ticks.get(seq[i-1]).players.find(x=>x.id===id),q=a.ticks.get(seq[i]).players.find(x=>x.id===id);if(p&&q&&p.st!=='die'&&q.st!=='die')maxStep=Math.max(maxStep,Math.hypot(q.x-p.x,q.y-p.y)/(seq[i]-seq[i-1]));}
 assert(maxStep<=2*STEP+.01,`cheat moved ${maxStep.toFixed(2)} px in one tick`);assert.equal(cheat.ws.readyState,1,'cheat connection still open');
 Object.assign(results,{commonTicks:common.length,tickSpan:span,ticksWithEnemies:enemyTicks,enemyIds:ids,lastTick:last.tick,kills:Object.fromEntries(last.players.map(p=>[p.name,p.k])),runs:Object.fromEntries(last.players.map(p=>[p.name,p.run])),heroesHurt:hurt,cheatMaxStepPx:+maxStep.toFixed(2),heroStepPx:STEP,
  snapshotBytes:Math.round(JSON.stringify(last).length),ackA:last.ack,inputsA:a.seq});
 // Everyone leaves: the room pauses (its tick stops) but stays joinable.
 for(const c of [a,b,cheat])c.ws.close();await new Promise(r=>setTimeout(r,400));
 if(!process.env.COOP_URL){const http=url.replace(/^ws/,'http').replace(/\/ws$/,'');const i1=await (await fetch(`${http}/api/rooms/${room}`)).json();await new Promise(r=>setTimeout(r,500));const i2=await (await fetch(`${http}/api/rooms/${room}`)).json();
  assert.equal(i1.players,0);assert.equal(i1.tick,i2.tick,'empty room paused');results.pausedAtTick=i2.tick;}
 results.ok=true;console.log(JSON.stringify(results,null,1));
 await fs.mkdir('docs/coop',{recursive:true});await fs.writeFile(`docs/coop/smoke${process.env.COOP_URL?'-live':''}.json`,JSON.stringify(results,null,1)+'\n');
}finally{server?.kill();}
process.exit(0);
