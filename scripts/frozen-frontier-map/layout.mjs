import sharp from 'sharp';import fs from 'node:fs/promises';
// Lay out the Frozen Frontier on the snow around the Stronghold and write the placements into
// src/world/maps/frozen-frontier.json. Landmarks, ruins and paths are placed by hand below; plants and rocks are
// scattered from a fixed seed. Every placement is checked against the rules that keep the map readable and the
// renderer honest:
//  - no prop on or behind raised terrain (east ridge, west terrace), whose sprites draw over the scenery layer;
//  - no prop that would draw over a court sprite standing in front of it (the court is baked into one surface);
//  - no ground decal over any court upright;
//  - no solid footprint in the combat clearing before the gate, on a path, or overlapping another solid footprint.
// Hand placements that break a rule fail the run; scattered ones are skipped.
//   node scripts/frozen-frontier-map/layout.mjs
const FILE='src/world/maps/frozen-frontier.json';
const data=JSON.parse(await fs.readFile(FILE,'utf8'));
const sprites=JSON.parse(await fs.readFile('src/world/maps/frozen-frontier-sprites.json','utf8')).assets;
const map=JSON.parse(await fs.readFile('src/world/maps/arkodia-01.json','utf8'));
const prefab=JSON.parse(await fs.readFile('src/stronghold/prefabs/stronghold.json','utf8'));
const O=prefab.court.origin,at=map.prefabs.find(p=>p.prefab==='stronghold').at,OU=at.u-prefab.anchor.u,OV=at.v-prefab.anchor.v;
const W=(u,v)=>({x:O.x+(u-v)*64,y:O.y+(u+v)*32});
// Court-local tiles throughout; written out in map tiles.
const relief=map.terrain.features.map(f=>({id:f.id,top:f.topM??f.heightM,outline:(f.outline??[[f.u0,f.v0],[f.u1,f.v0],[f.u1,f.v1],[f.u0,f.v1]]).map(([u,v])=>[u-OU,v-OV])}));
const inPoly=(poly,u,v)=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [x,y]=poly[i],[a,b]=poly[j];if((y>v)!==(b>v)&&u<(a-x)*(v-y)/(b-y)+x)hit=!hit;}return hit;};
const nearRelief=(u,v,m)=>relief.some(r=>[[0,0],[m,0],[-m,0],[0,m],[0,-m],[m,m],[-m,-m],[m,-m],[-m,m]].some(([du,dv])=>inPoly(r.outline,u+du,v+dv)));
for(const r of relief){const pts=r.outline.map(([u,v])=>W(u,v));r.x0=Math.min(...pts.map(p=>p.x));r.x1=Math.max(...pts.map(p=>p.x));r.y0=Math.min(...pts.map(p=>p.y))-r.top*24;r.y1=Math.max(...pts.map(p=>p.y));r.front=x=>Math.max(...pts.filter(p=>Math.abs(p.x-x)<40).map(p=>p.y),-Infinity);}
// The court's sprites (baked into the world surface) as screen boxes.
const baked=[];
for(const e of prefab.props){if(e.layout==='legacy')continue;const file=`public/modular-stronghold/${e.assetSet==='v1'?'':'v2/'}${e.id}.png`,m=await sharp(file).metadata(),h=m.height*e.width/m.width,foot=e.foot??.97,p=W(e.u,e.v);
 baked.push({id:e.id,ground:['snowdrift-edge','weeds-edge','paving-worn'].includes(e.id),x0:p.x-e.width/2,x1:p.x+e.width/2,y0:p.y-h*foot,y1:p.y+h*(1-foot),y:p.y});}
{const g=prefab.buildings.gate;baked.push({id:'gate',ground:false,x0:g.x-g.width/2,x1:g.x+g.width/2,y0:g.y-320,y1:g.y+10,y:g.y});}
const stream=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
let rnd=stream(20261024);

// Kit entries for the grounded v3 decals (scripts/frozen-frontier-map/ground-kit.mjs), and draw bands: trampled snow
// lies under the floors and flagstones, loose stones and plant patches on top of them. Drifts are uprights without a
// footprint, so one standing in front of a prop banks snow over its base.
Object.assign(data.kit,{
 'floor-sunk':{layer:'ground',block:[]},
 'flagstones-a':{layer:'ground',block:[]},'flagstones-b':{layer:'ground',block:[]},'flagstones-c':{layer:'ground',block:[]},'flagstones-d':{layer:'ground',block:[]},
 'stone-chips-a':{layer:'ground',block:[],band:'over'},'stone-chips-b':{layer:'ground',block:[],band:'over'},
 'ground-scuff-a':{layer:'ground',block:[],band:'under'},'ground-scuff-b':{layer:'ground',block:[],band:'under'},
 'drift-ne':{layer:'upright',block:[]},'drift-se':{layer:'upright',block:[]},'drift-mound':{layer:'upright',block:[]},
});
data.kit['grass-patch'].band=data.kit['rock-scatter'].band='over';
// The 2:1 isometric pillars, stairs and fallen columns (ground-kit.mjs ISO): footprints are the modelled blocks.
// stairs-nw climbs toward -u (approached from +u), stairs-ne toward -v (approached from +v); the pivot is the middle
// of the flight on the ground, so its top edge is at -run/2 on the climbing axis.
const STAIRS={'stairs-nw':{axis:'u',run:.6,w:1.2,rise:25.3},'stairs-ne':{axis:'v',run:.84,w:.56,rise:46}};
Object.assign(data.kit,{
 'pillar-intact':{layer:'upright',block:[[-.15,-.15,.15,.15]]},'pillar-broken':{layer:'upright',block:[[-.15,-.15,.15,.15]]},
 'stairs-nw':{layer:'upright',block:[[-.3,-.6,.3,.6]]},'stairs-ne':{layer:'upright',block:[[-.28,-.42,.28,.42]]},
 'column-fallen':{layer:'upright',block:[[-.42,-.11,.47,.12]]},'column-fallen-v':{layer:'upright',block:[[-.11,-.42,.12,.47]]},
});
// A flight's pivot for a top edge at `edge` on its climbing axis, centred on `mid` along the other.
const flightAt=(a,edge,mid)=>{const f=STAIRS[a],c=edge+f.run/2;return f.axis==='u'?[c,mid]:[mid,c];};

const placed=[],paths=[],solids=[],errors=[],reserved=[];
const CLEAR={u:17,v:17,r:4.6};
const j=a=>(rnd()-.5)*2*a,pick=l=>l[Math.floor(rnd()*l.length)];
function box(a,u,v,s=1){const k=sprites[a],p=W(u,v),w=k.world[0]*s,h=k.world[1]*s;return {x0:p.x-w*k.pivot[0],x1:p.x+w*(1-k.pivot[0]),y0:p.y-h*k.pivot[1],y1:p.y+h*(1-k.pivot[1]),y:p.y,x:p.x};}
const overlap=(a,b,shrink=0)=>{const sx=(a.x1-a.x0)*shrink/2,sy=(a.y1-a.y0)*shrink/2;return a.x0+sx<b.x1&&a.x1-sx>b.x0&&a.y0+sy<b.y1&&a.y1-sy>b.y0;};
// A mirrored sprite swaps its footprint's u and v offsets (frontier.ts footprint).
function rects(a,u,v,s=1,f=false){return data.kit[a].block.map(r=>f?[r[1],r[0],r[3],r[2]]:r).map(([u0,v0,u1,v1])=>[u+u0*s,v+v0*s,u+u1*s,v+v1*s]);}
const rectHit=(r,q,m=0)=>r[0]-m<q[2]&&r[2]+m>q[0]&&r[1]-m<q[3]&&r[3]+m>q[1];
const rectDist=(r,u,v)=>Math.hypot(Math.max(r[0]-u,0,u-r[2]),Math.max(r[1]-v,0,v-r[3]));
function problems(a,u,v,s=1,opts={}){
 const k=data.kit[a],b=box(a,u,v,s),out=[],rs=rects(a,u,v,s,!!opts.f);
 if(nearRelief(u,v,k.layer==='ground'?1.3:.9)||rs.some(r=>nearRelief((r[0]+r[2])/2,(r[1]+r[3])/2,.6+Math.max(r[2]-r[0],r[3]-r[1])/2)))out.push('on raised terrain');
 for(const r of relief)if(overlap(b,{x0:r.x0,x1:r.x1,y0:r.y0,y1:r.y1},.2)&&(k.layer==='ground'||b.y<r.front(b.x)+6))out.push('behind/under '+r.id);
 for(const c of baked){if(c.ground)continue;if(overlap(b,c,k.layer==='ground'?0:.25)&&(k.layer==='ground'||b.y<c.y+4))out.push('over court '+c.id);}
 if(rs.length){
  if(Math.hypot(u-CLEAR.u,v-CLEAR.v)<CLEAR.r)out.push('in combat clearing');
  if(!opts.onPath)for(const p of paths)if(rs.some(r=>rectDist(r,p.u,p.v)<p.r))out.push('blocks path');
  // Joined modules (a wall meeting its corner, a wall against a gate pier) may share their join.
  if(!opts.join)for(const q of solids)if(rs.some(r=>rectHit(r,q,opts.tight?0:.12)))out.push('overlaps solid');
 }
 if(opts.scatter&&reserved.some(r=>u>r[0]&&u<r[2]&&v>r[1]&&v<r[3]))out.push('in a ruin');
 return [...new Set(out)];
}
// o: s size, f mirror, r ground-plane turn (deg, ground decals), lift (px above the ground pivot), on (a cap's wall).
const scattered=new Set();
function put(a,u,v,o={}){const s=o.s??1,bad=problems(a,u,v,s,o);if(bad.length){if(!o.scatter)errors.push(`${a} at (${u.toFixed(2)}, ${v.toFixed(2)}): ${bad.join(', ')}`);return false;}
 if(o.scatter)scattered.add(placed.length);
 placed.push({a,u:+(u+OU).toFixed(2),v:+(v+OV).toFixed(2),...(s!==1?{s:+s.toFixed(3)}:{}),...(o.lift?{lift:o.lift}:{}),...(o.on?{on:o.on}:{}),...(o.f?{f:1}:{}),...(o.r?{r:Math.round(o.r)}:{}),zone:o.zone});
 solids.push(...rects(a,u,v,s,!!o.f));return true;}
// Keep scattered plants and rocks out of a ruin's footprint (court-local tile rectangle).
const reserve=(u0,v0,u1,v1)=>reserved.push([u0,v0,u1,v1]);
// Every grounded wall module carries the same baked snow cap, so the separate v1 cap strips are retired.
delete data.kit['snow-cap-ne'];delete data.kit['snow-cap-se'];
// What collects at a ruin's foot: fallen blocks, loose stones, snow banked against it, dry grass and shrubs growing
// out of the joints. Each entry is [sprite, du, dv, size]; plants and stones get a random mirror.
function foot(zone,u,v,items){for(const [a,du,dv,s=1] of items)put(a,u+du,v+dv,{zone,s:s*(.9+rnd()*.2),f:!/^(rubble|stairs|wall|arch|corner|pillar)/.test(a)&&rnd()<.5,r:data.kit[a].layer==='ground'?rnd()*360:0,scatter:true});}

// A trail: trampled snow along its whole length, overlapping worn flagstone clusters on a gentle wander (turned,
// mirrored and sized at random, the odd one missing), and broken stones, dry grass and rocks along the edges. It keeps
// a corridor free of solid props.
const FLAGS=['flagstones-a','flagstones-b','flagstones-c','flagstones-d'];
function trail(zone,pts,o={}){
 const segs=[];let total=0;for(let i=0;i+1<pts.length;i++){const [u0,v0]=pts[i],[u1,v1]=pts[i+1],l=Math.hypot(u1-u0,v1-v0);segs.push({u0,v0,u1,v1,l,at:total});total+=l;}
 const at=d=>{const s=segs.find(q=>d<=q.at+q.l)??segs[segs.length-1],t=Math.min(1,(d-s.at)/s.l),nu=(s.v1-s.v0)/s.l,nv=-(s.u1-s.u0)/s.l;return [s.u0+(s.u1-s.u0)*t,s.v0+(s.v1-s.v0)*t,nu,nv];};
 const ph=rnd()*6.28,wander=d=>Math.sin(d*1.1+ph)*.13+Math.sin(d*2.7+ph*2)*.05;
 for(let d=0;d<=total;d+=.4){const [u,v]=at(d);paths.push({u,v,r:.58});}
 for(let d=.2;d<total;d+=.6+rnd()*.25){const [u,v,nu,nv]=at(d),k=wander(d)+j(.08);put(rnd()<.6?'ground-scuff-b':'ground-scuff-a',u+nu*k,v+nv*k,{s:.6+rnd()*.25,r:rnd()*360,f:rnd()<.5,zone,scatter:true});}
 for(let d=o.from??0;d<=total-(o.to??0);d+=.3+rnd()*.08){if(rnd()<.05)continue;const [u,v,nu,nv]=at(d),k=wander(d)+j(.07);
  put(pick(FLAGS),u+nu*k,v+nv*k,{s:.95+rnd()*.3,r:rnd()*360,f:rnd()<.5,zone,scatter:true});}
 for(let d=.4;d<total;d+=.75+rnd()*.7){const [u,v,nu,nv]=at(d),side=rnd()<.5?-1:1,off=.5+rnd()*.22,x=u+nu*side*off,y=v+nv*side*off,q=rnd();
  if(q<.4)put(rnd()<.5?'stone-chips-a':'stone-chips-b',x,y,{s:.8+rnd()*.4,r:rnd()*360,f:rnd()<.5,zone,scatter:true});
  else if(q<.62)put('grass-patch',x+nu*side*.1,y+nv*side*.1,{s:.6+rnd()*.35,f:rnd()<.5,zone,scatter:true});
  else if(q<.8)put('rock-scatter',x+nu*side*.12,y+nv*side*.12,{s:.65+rnd()*.3,f:rnd()<.5,zone,scatter:true});
  else put('grass-tussock',x+nu*side*.2,y+nv*side*.2,{s:.75+rnd()*.35,f:rnd()<.5,zone,scatter:true});}
}

// ---- Paths: gate -> ruined gate -> the old village; branch east to the watchtower; branch west to the shrine.
trail('Frontier road',[[17.4,17.6],[19.6,19.4],[20.8,22.2],[21.0,24.4],[21.0,27.2],[21.1,29.2],[20.9,31.0],[20.6,32.4]]);
trail('Watch road',[[19.6,19.4],[22.4,18.6],[25.4,18.1],[27.6,17.4],[29.3,16.95]]);
// The shrine trail ends at the front of the shrine's forecourt, which lies before its steps (they face +v). It was
// re-routed there on 2026-10-24; its route draws from its own stream, and the main stream skips the 998 draws the old
// route took, so every placement scattered after it stays where it was.
{const main=rnd;rnd=stream(20261025);
trail('Shrine trail',[[17.4,17.6],[15.0,20.4],[12.0,21.4],[8.0,21.3],[4.0,21.4],[1.4,22.4],[0.8,25.0],[2.6,26.9],[5.0,28.6],[5.3,30.4],[4.5,32.8],[3.0,34.3],[1.58,34.4],[1.58,32.6]]);
rnd=main;for(let i=0;i<998;i++)rnd();}

// ---- Ruined gate: the frontier's entrance, straddling the road between its piers. Its curtain wall still joins the
// east pier and trails off into rubble; to the west it has fallen, leaving a broken stub bridged by rubble.
put('ruined-gate',21.15,25.75,{zone:'Ruined gate',onPath:true});
put('wall-se',23.33,25.55,{zone:'Ruined gate',join:true});
foot('Ruined gate',0,0,[['rubble',24.75,25.25],['stone-chips-a',25.2,25.75],['drift-se',23.5,25.92,.9],['grass-tussock',22.7,26.05,.8],['shrub-twigs',25.3,24.6,.8]]);
put('wall-se',18.5,25.95,{zone:'Ruined gate'});
foot('Ruined gate',0,0,[['rubble',19.75,25.85,.85],['stone-chips-b',19.6,26.35],['drift-mound',18.2,26.25,.9],['grass-patch',17.6,26.1],['drift-mound',21.95,26.2,.7]]);
put('rock-boulders',23.6,23.4,{zone:'Ruined gate',s:.85});
put('dead-snag',17.7,23.1,{zone:'Ruined gate'});
reserve(17.3,24.9,25.4,26.6);

// ---- Temple (pillar courtyard): a raised podium half buried in snow, entered by stairs on its +u side, where the
// road arrives, with a colonnade along both long edges standing on the podium; fallen columns lie where pillars are
// missing. The podium is two foundations, 2 x 2 tiles each (top face: the v1 diamond's half width 376 px at 1/3 world
// px per px = 0.979 tiles, lifted 25.3 px); the stairs climb -u, flush onto its +u edge, as high as its lift.
const POD={u:18.4,v0:31.0,h:25,half:.979};
put('ground-scuff-a',18.5,32.0,{zone:'Temple',s:1.15,r:20});
put('foundation',POD.u,POD.v0,{zone:'Temple'});put('foundation',POD.u,POD.v0+2,{zone:'Temple',f:true});
put('stairs-nw',...flightAt('stairs-nw',POD.u+POD.half,POD.v0+1),{zone:'Temple',onPath:true});
// Both rows leave a wider bay at the middle, the entrance the stairs climb to.
for(const [a,du,v] of [['pillar-intact',-.78,30.2],['pillar-intact',-.78,31.1],['pillar-broken',-.78,32.9],['pillar-intact',-.78,33.8],
 ['pillar-intact',.78,30.2],['pillar-broken',.78,31.05],['pillar-intact',.78,32.95],['pillar-intact',.78,33.8]])put(a,POD.u+du,v,{zone:'Temple',lift:POD.h,s:a==='pillar-intact'?1.06:1});
// One shaft fell from the broken pillar of the -u row across the podium; another lies in the snow below the +u row.
put('column-fallen',18.35,33.3,{zone:'Temple',lift:POD.h});
put('column-fallen-v',19.95,30.15,{zone:'Temple'});
foot('Temple',0,0,[['rubble',17.0,32.5,.9],['rubble',19.75,30.0,.75],['stone-chips-a',20.3,31.0],['stone-chips-b',19.6,34.6],['drift-ne',19.95,33.3,.85],
 ['drift-mound',17.3,34.6],['grass-tussock',16.95,31.1],['shrub-juniper',17.1,34.9,.8],['grass-patch',20.3,33.4],['grass-tussock',19.9,34.75,.8]]);
reserve(16.6,29.3,20.4,35.2);

// ---- Settlement: two ruined houses on sunk floors. Each keeps its back corner (the walls' clean ends meet), its
// front walls have fallen into rubble, and a doorway arch stands joined to what is left.
// West house, interior u 13.0-15.5, v 30.6-33.3: back walls, a front corner and an arched door facing the temple.
put('ground-scuff-a',14.2,32.1,{zone:'Settlement',s:1.0,r:-15});
put('floor-sunk',14.25,31.95,{zone:'Settlement',s:1.38});
put('wall-ne',13.0,31.44,{zone:'Settlement'});
put('wall-se',13.9,30.6,{zone:'Settlement',join:true});
put('arch-ne',15.62,31.5,{zone:'Settlement',join:true});
put('corner-n',15.5,33.3,{zone:'Settlement',join:true});
foot('Settlement',0,0,[['rubble',15.25,30.45,.8],['rubble',13.6,33.55,.95],['stone-chips-a',12.9,33.0],['stone-chips-b',14.4,33.85],['drift-ne',13.25,32.55,.8],
 ['drift-se',14.6,30.85,.75],['drift-mound',15.95,32.9,.7],['grass-tussock',12.6,30.3],['shrub-twigs',12.3,32.6,.85],['grass-patch',14.9,32.4,.8],['grass-tussock',16.0,30.75,.7]]);
reserve(12.0,29.8,16.4,34.2);
// East house, interior u 24.9-27.75, v 29.7-32.5: back corner, an arched door in the front wall, a corner beside it.
put('ground-scuff-a',26.3,31.1,{zone:'Settlement',s:1.0,r:35,f:true});
put('floor-sunk',26.35,31.1,{zone:'Settlement',s:1.35,f:true});
put('wall-ne',24.9,30.54,{zone:'Settlement'});
put('wall-se',25.8,29.7,{zone:'Settlement',join:true});
put('arch-se',26.0,32.45,{zone:'Settlement'});
put('corner-s',27.75,32.5,{zone:'Settlement',join:true});
foot('Settlement',0,0,[['rubble',27.25,29.65,.9],['rubble',28.1,30.8,.8],['rubble',24.75,31.85,.75],['stone-chips-a',28.4,31.6],['stone-chips-b',25.3,33.0],
 ['drift-ne',25.15,31.5,.75],['drift-se',26.8,29.95,.8],['pillar-broken',28.5,29.4],['grass-tussock',28.75,32.6],['shrub-juniper',24.3,29.6,.8],['grass-patch',26.9,31.5,.8],['grass-tussock',24.4,32.8,.75]]);
reserve(23.8,28.9,29.2,33.5);

// ---- Broken watchtower by the east ridge: stairs climb to its door, and its yard wall runs south from the tower to the
// yard's front corner, breached once (rubble fills the gap), its front wall fallen.
// The tower's door (v2 art) is 26.7 px left of its pivot with its sill 42 px above it; the ground under the door, at
// the wall, is (30.25, 15.67), 46 px below the sill. The stairs climb -v (the road arrives from +v) flush to that
// wall, as high as the sill, their +u cheek against the yard wall.
const DOOR={u:30.2,v:15.67};
put('broken-watchtower',30.4,15.4,{zone:'Watchtower'});
put('stairs-ne',...flightAt('stairs-ne',DOOR.v,DOOR.u),{zone:'Watchtower',join:true,onPath:true});
put('wall-ne',30.75,15.85,{zone:'Watchtower',join:true});
put('wall-ne',31.0,18.35,{zone:'Watchtower',join:true});
put('corner-n',31.3,20.35,{zone:'Watchtower',join:true});
foot('Watchtower',0,0,[['rubble',30.8,17.05,.8],['stone-chips-a',31.45,17.2],['rubble',30.0,20.45,.85],['stone-chips-b',29.4,20.6],['drift-ne',31.2,19.0,.8],['drift-mound',29.0,16.85,.7],
 ['rock-boulders',33.0,16.4],['grass-tussock',31.9,18.6],['shrub-twigs',32.2,15.0,.8],['grass-patch',30.3,18.9],['grass-tussock',31.75,20.8,.8]]);
put('dead-snag',26.6,20.6,{zone:'Watchtower'});
reserve(28.2,13.0,33.6,21.2);

// ---- Snowy shrine: the exploration goal at the end of the western trail. Its steps face +v: their bottom edge (v2
// art: 164 px left of and 70 px below its pivot, at 0.119 world px per px) lies along u at v 30.88, centred on u 1.58.
// The trail ends in a square flagstone forecourt laid on the grid, its back edge tucked under that bottom step, lined
// by two pairs of columns, one fallen.
const STEP={u:1.58,v:30.88};
put('snowy-shrine',1.6,30.6,{zone:'Snowy shrine'});
put('ground-scuff-a',STEP.u+.2,STEP.v+.95,{zone:'Snowy shrine',s:.9,r:45});
put('paving',STEP.u,STEP.v+.78,{zone:'Snowy shrine',s:.95});
// The columns stand out along the approach (+v), clear of the shrine's screen column, so none hides its steps.
for(const [a,u,v] of [['pillar-intact',STEP.u-.8,STEP.v+1.4],['pillar-intact',STEP.u+.8,STEP.v+1.4],['pillar-intact',STEP.u-.8,STEP.v+2.2],['pillar-broken',STEP.u+.8,STEP.v+2.2]])put(a,u,v,{zone:'Snowy shrine'});
put('column-fallen-v',STEP.u-1.5,STEP.v+1.9,{zone:'Snowy shrine'});
foot('Snowy shrine',0,0,[['rubble',4.55,31.75,.75],['stone-chips-b',4.6,29.4],['drift-mound',-0.1,32.2,.8],['shrub-juniper',-0.6,31.4],['shrub-juniper',4.6,28.4,.85],
 ['grass-tussock',0.4,32.9],['dead-tree',5.3,33.9],['grass-patch',3.4,30.9,.8],['rock-scatter',0.6,29.3]]);
reserve(-1.0,27.8,5.2,33.4);

// ---- Southern cemetery: 48 x 48 metres beyond the village ruins. The approach joins
// the east side of the old village; two broad axes divide six burial gardens.
Object.assign(data.kit,{
 'grave-headstone':{layer:'upright',block:[[-.18,-.28,.18,.28]]},
 'grave-cross':{layer:'upright',block:[[-.18,-.28,.18,.28]]},
 'grave-sarcophagus':{layer:'upright',block:[[-.25,-.43,.25,.43]]},
 'grave-memorial':{layer:'upright',block:[[-.5,-.5,.5,.5]]},
});
const sceneryRandom=rnd;rnd=stream(20261025);
trail('Cemetery approach',[[24.0,34.5],[27.0,36.5],[31.0,37.0],[34.0,39.0],[34.0,46.5]]);
trail('Cemetery avenue',[[34.0,46.5],[34.0,54.5]]);
trail('Cemetery crosswalk',[[26.5,46.5],[41.5,46.5]]);
const cemetery='Southern cemetery';
for(const v of [41,43,45,49,51,53])for(const u of [28,30,32,36,38,40]){
 const a=(u+v)%4===1?'grave-cross':'grave-headstone';
 put(a,u,v,{zone:cemetery});
 put('ground-scuff-b',u,v+.35,{zone:cemetery,s:.42});
 if((u+v)%4===3)put('grass-tussock',u+.4,v+.25,{zone:cemetery,s:.55});
}
for(const u of [29,31,37,39])put('grave-sarcophagus',u,55.5,{zone:cemetery});
put('grave-memorial',34,56,{zone:cemetery});
put('paving',34,56,{zone:cemetery,s:.7});
// Gate piers and interrupted perimeter markers leave generous entrances and exits.
for(const [u,v] of [[32,40],[36,40],[26,39],[42,39],[26,48],[42,48],[26,56],[42,56]])put('pillar-broken',u,v,{zone:cemetery,s:1.15});
for(const [u,v] of [[26,42],[26,51],[42,42],[42,51],[28,57],[40,57]]){
 put('dead-snag',u,v,{zone:cemetery,s:.9});
 put('drift-mound',u+.5,v+.3,{zone:cemetery,s:.8});
}
reserve(25,38,43,58);
rnd=sceneryRandom;

// ---- Plants and rocks: dense groves behind the Stronghold, thinner woods to the sides, sparse open snow in front.
const zones=[
 {zone:'North-west grove',u:[-15,-6],v:[-2,15],n:30,mix:{'pine-tall':5,'pine-broad':3,'pine-sapling':3,'shrub-juniper':2,'rock-boulders':1,'grass-tussock':1}},
 {zone:'North-east grove',u:[-2,15],v:[-15,-6],n:30,mix:{'pine-tall':5,'pine-broad':3,'pine-sapling':3,'shrub-juniper':2,'rock-boulders':1,'grass-tussock':1}},
 {zone:'East woods',u:[30,40],v:[0,12],n:16,mix:{'pine-tall':3,'pine-broad':2,'pine-sapling':2,'dead-snag':1,'rock-boulders':1,'shrub-twigs':1}},
 {zone:'Shrine woods',u:[-8,0],v:[22,38],n:16,mix:{'pine-tall':3,'pine-broad':2,'pine-sapling':3,'shrub-juniper':2,'dead-snag':1}},
 {zone:'Frozen steppe',u:[24,38],v:[22,38],n:18,mix:{'dead-tree':2,'dead-snag':2,'shrub-twigs':3,'grass-tussock':4,'grass-patch':3,'rock-boulders':2,'rock-scatter':2}},
 {zone:'Southern snowfield',u:[6,18],v:[23,38],n:16,mix:{'shrub-twigs':3,'grass-tussock':4,'grass-patch':3,'rock-scatter':2,'pine-sapling':2,'dead-snag':1}},
 {zone:'Gate meadow',u:[15,28],v:[15,28],n:12,mix:{'grass-patch':4,'rock-scatter':3,'grass-tussock':2}},
];
const scale={'pine-tall':[.85,1.1],'pine-broad':[.8,1.05],'pine-sapling':[.9,1.3],'dead-tree':[.85,1.05],'dead-snag':[.9,1.15]};
for(const z of zones){const pool=Object.entries(z.mix).flatMap(([a,w])=>Array(w).fill(a));let made=0;
 for(let tries=0;made<z.n&&tries<z.n*40;tries++){const a=pool[Math.floor(rnd()*pool.length)],u=z.u[0]+rnd()*(z.u[1]-z.u[0]),v=z.v[0]+rnd()*(z.v[1]-z.v[0]),[lo,hi]=scale[a]??[.85,1.15];
  if(u>-5.5&&u<21.5&&v>-5.5&&v<21.5&&z.zone!=='Gate meadow')continue;
  if(placed.some(p=>Math.hypot(p.u-OU-u,p.v-OV-v)<(data.kit[a].block.length?1.1:.6)))continue;
  if(put(a,u,v,{s:lo+rnd()*(hi-lo),f:rnd()<.5,zone:z.zone,scatter:true}))made++;}}

if(errors.length){console.error(errors.join('\n'));process.exit(1);}
// Trails are scattered before the ruins stand, so a plant or drift may have landed inside a flight of stairs or a
// fallen column (they have no footprint of their own); those are dropped.
const ruinRects=placed.filter(p=>/^(stairs|column-fallen)/.test(p.a)).flatMap(p=>rects(p.a,p.u-OU,p.v-OV,p.s??1,!!p.f));
const inRuin=(p,i)=>scattered.has(i)&&data.kit[p.a].layer!=='ground'&&!data.kit[p.a].block.length&&ruinRects.some(r=>p.u-OU>r[0]&&p.u-OU<r[2]&&p.v-OV>r[1]&&p.v-OV<r[3]);
const dropped=placed.filter(inRuin);if(dropped.length)console.log('dropped inside stairs/columns:',dropped.map(p=>`${p.a} (${p.u}, ${p.v})`).join('; '));
data.placements=placed.filter((p,i)=>!inRuin(p,i));
// One kit sprite and one placement per line keeps the file reviewable.
const line=o=>JSON.stringify(o).replace(/,"/g,', "').replace(/":/g,'": ').replace(/\],\[/g,'], [').replace(/,(-?\d)/g,', $1');
const json=['{',` "id": "${data.id}",`,` "version": ${data.version},`,` "map": "${data.map}",`,' "notes": ['+data.notes.map(n=>'\n  '+JSON.stringify(n)).join(',')+'\n ],',
 ' "kit": {',Object.entries(data.kit).map(([k,v])=>`  ${JSON.stringify(k)}: ${line(v)}`).join(',\n'),' },',' "placements": [',data.placements.map(p=>'  '+line(p)).join(',\n'),' ]','}'].join('\n');
await fs.writeFile(FILE,json+'\n');
const used=new Set(data.placements.map(p=>p.a)),missing=Object.keys(data.kit).filter(a=>!used.has(a));
console.log(data.placements.length,'placements;',used.size,'of',Object.keys(data.kit).length,'sprites used',missing.length?'· MISSING '+missing:'');
const byZone={};for(const p of data.placements)byZone[p.zone]=(byZone[p.zone]||0)+1;console.log(byZone);
