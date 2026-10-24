import fs from 'node:fs/promises';
// Server-side Frozen Frontier collision over the real co-op wire protocol (no browser: headless rendering would pace
// the inputs). One client joins a room, walks out of the gate, then steers straight at the broken watchtower and keeps
// pushing; the server must stop it against a Frozen Frontier prop (the tower or the outpost in front of it), outside
// every solid footprint (src/world/maps/frozen-frontier.json), and hold it there.
//   COOP_URL=wss://ark-whachat.fural.space/ws node scripts/frozen-frontier-map/coop-wire.mjs [out.json]
const url=process.env.COOP_URL||'wss://ark-whachat.fural.space/ws',out=process.argv[2]||'docs/frozen-frontier-map/coop-wire.json';
const data=JSON.parse(await fs.readFile('src/world/maps/frozen-frontier.json','utf8'));
const prefab=JSON.parse(await fs.readFile('src/stronghold/prefabs/stronghold.json','utf8'));
const map=JSON.parse(await fs.readFile('src/world/maps/arkodia-01.json','utf8'));
const OU=map.prefabs[0].at.u-prefab.anchor.u,OV=map.prefabs[0].at.v-prefab.anchor.v,O=prefab.court.origin;
const tile=(x,y)=>({u:((x-O.x)/64+(y-O.y)/32)/2,v:((y-O.y)/32-(x-O.x)/64)/2}),world=(u,v)=>({x:O.x+(u-v)*64,y:O.y+(u+v)*32});
const tower=data.placements.find(p=>p.a==='broken-watchtower'),tu=tower.u-OU,tv=tower.v-OV;
const rects=data.kit['broken-watchtower'].block.map(([a,b,c,d])=>[tu+a,tv+b,tu+c,tv+d]);
const core={u:(rects[0][0]+rects[0][2])/2,v:(rects[0][1]+rects[0][3])/2},target=world(core.u,core.v);
const ws=new WebSocket(url);let you='',me=null,snaps=0;
await new Promise((ok,no)=>{ws.onopen=()=>ws.send(JSON.stringify({t:'hello',v:1,name:'Frontier probe',room:'',maxHp:1e6,hero:'ember-warden'}));
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.t==='welcome'){you=m.you;ok();}else if(m.t==='s'){const p=m.players.find(q=>q.id===you);if(p){me=p;snaps++;}}};ws.onerror=no;setTimeout(()=>no(Error('no welcome')),15000);});
let dir={x:0,y:0},seq=0;const tick=setInterval(()=>ws.send(JSON.stringify({t:'in',seq:++seq,x:dir.x,y:dir.y})),50);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
while(!me)await wait(50);const start={x:me.x,y:me.y};
dir={x:0,y:1};await wait(7000);const outside={x:me.x,y:me.y};
// Steer at the tower's centre for 25 s; the last seconds push against its wall.
const track=[];let last=null,still=0;for(let i=0;i<250;i++){const dx=target.x-me.x,dy=target.y-me.y,l=Math.hypot(dx,dy)||1;dir={x:dx/l,y:dy/l};await wait(100);if(i%25===0)track.push({x:+me.x.toFixed(1),y:+me.y.toFixed(1)});still=last&&Math.hypot(me.x-last.x,me.y-last.y)<.5?still+1:0;last={x:me.x,y:me.y};}
dir={x:0,y:0};await wait(300);clearInterval(tick);ws.close();
const end={x:me.x,y:me.y},t=tile(end.x,end.y);
// Every solid footprint rectangle, in court tiles, with its sprite (mirrored placements swap u and v).
const solids=data.placements.flatMap(p=>data.kit[p.a].layer==='cap'?[]:data.kit[p.a].block.map(r=>p.f?[r[1],r[0],r[3],r[2]]:r).map(([a,b,c,d])=>{const s=p.s??1,u=p.u-OU,v=p.v-OV;return {a:p.a,r:[u+a*s,v+b*s,u+c*s,v+d*s]};}));
const dist=r=>Math.hypot(Math.max(r[0]-t.u,0,t.u-r[2]),Math.max(r[1]-t.v,0,t.v-r[3]));
const inside=solids.some(q=>t.u>q.r[0]&&t.u<q.r[2]&&t.v>q.r[1]&&t.v<q.r[3]),near=solids.map(q=>({a:q.a,d:dist(q.r)})).sort((x,y)=>x.d-y.d)[0];
const fromCore=Math.hypot(t.u-core.u,t.v-core.v);
const report={url,start,outsideGate:outside,end:{...end,u:+t.u.toFixed(2),v:+t.v.toFixed(2)},towerCore:{u:+core.u.toFixed(2),v:+core.v.toFixed(2)},tilesFromCore:+fromCore.toFixed(2),stoppedBy:near.a,tilesFromItsFootprint:+near.d.toFixed(3),heldStillFor:still/10+' s',insideFootprint:inside,snapshots:snaps,track};
report.ok=!inside&&near.d<.35&&still>=20&&outside.y>start.y+100;
await fs.writeFile(out,JSON.stringify(report,null,1)+'\n');console.log(JSON.stringify(report));
if(!report.ok)process.exit(1);
