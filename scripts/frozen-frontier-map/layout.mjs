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
const rnd=(seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;})(20261024);

const placed=[],paths=[],solids=[],errors=[];
const CLEAR={u:17,v:17,r:4.6};
function box(a,u,v,s=1){const k=sprites[a],p=W(u,v),w=k.world[0]*s,h=k.world[1]*s;return {x0:p.x-w*k.pivot[0],x1:p.x+w*(1-k.pivot[0]),y0:p.y-h*k.pivot[1],y1:p.y+h*(1-k.pivot[1]),y:p.y,x:p.x};}
const overlap=(a,b,shrink=0)=>{const sx=(a.x1-a.x0)*shrink/2,sy=(a.y1-a.y0)*shrink/2;return a.x0+sx<b.x1&&a.x1-sx>b.x0&&a.y0+sy<b.y1&&a.y1-sy>b.y0;};
function rects(a,u,v,s=1){return data.kit[a].block.map(([u0,v0,u1,v1])=>[u+u0*s,v+v0*s,u+u1*s,v+v1*s]);}
const rectHit=(r,q,m=0)=>r[0]-m<q[2]&&r[2]+m>q[0]&&r[1]-m<q[3]&&r[3]+m>q[1];
const rectDist=(r,u,v)=>Math.hypot(Math.max(r[0]-u,0,u-r[2]),Math.max(r[1]-v,0,v-r[3]));
function problems(a,u,v,s=1,opts={}){
 const k=data.kit[a],b=box(a,u,v,s),out=[],rs=rects(a,u,v,s);
 if(nearRelief(u,v,k.layer==='ground'?1.3:.9)||rs.some(r=>nearRelief((r[0]+r[2])/2,(r[1]+r[3])/2,.6+Math.max(r[2]-r[0],r[3]-r[1])/2)))out.push('on raised terrain');
 for(const r of relief)if(overlap(b,{x0:r.x0,x1:r.x1,y0:r.y0,y1:r.y1},.2)&&(k.layer==='ground'||b.y<r.front(b.x)+6))out.push('behind/under '+r.id);
 for(const c of baked){if(c.ground)continue;if(overlap(b,c,k.layer==='ground'?0:.25)&&(k.layer==='ground'||b.y<c.y+4))out.push('over court '+c.id);}
 if(rs.length){
  if(Math.hypot(u-CLEAR.u,v-CLEAR.v)<CLEAR.r)out.push('in combat clearing');
  if(!opts.onPath)for(const p of paths)if(rs.some(r=>rectDist(r,p.u,p.v)<p.r))out.push('blocks path');
  for(const q of solids)if(rs.some(r=>rectHit(r,q,opts.tight?0:.12)))out.push('overlaps solid');
 }
 return [...new Set(out)];
}
function put(a,u,v,o={}){const s=o.s??1,bad=problems(a,u,v,s,o);if(bad.length){if(!o.scatter)errors.push(`${a} at (${u}, ${v}): ${bad.join(', ')}`);return false;}
 placed.push({a,u:+(u+OU).toFixed(2),v:+(v+OV).toFixed(2),...(s!==1?{s:+s.toFixed(3)}:{}),...(o.lift?{lift:o.lift}:{}),...(o.on?{on:o.on}:{}),zone:o.zone});
 solids.push(...rects(a,u,v,s));return true;}
// A path: worn flagstones (small paving slabs) stepping from point to point with a little wander, some missing,
// edged with loose stones and dry grass; it keeps a corridor free of solid props.
function path(zone,pts,step=.82){
 for(let i=0;i+1<pts.length;i++){const [u0,v0]=pts[i],[u1,v1]=pts[i+1],n=Math.max(1,Math.round(Math.hypot(u1-u0,v1-v0)/step)),l=Math.hypot(u1-u0,v1-v0)||1,nu=(v1-v0)/l,nv=-(u1-u0)/l;
  for(let j=i?1:0;j<=n;j++){const t=j/n,side=(rnd()-.5)*.3,u=u0+(u1-u0)*t+nu*side,v=v0+(v1-v0)*t+nv*side;paths.push({u,v,r:.58});
   if(rnd()>.08)put('paving',u,v,{s:.25+rnd()*.06,zone,scatter:true});
   if(rnd()<.22){const k=rnd()<.5?-1:1;put(rnd()<.55?'rock-scatter':'grass-patch',u+nu*k*.62,v+nv*k*.62,{s:.7+rnd()*.3,zone,scatter:true});}}}
}
// Snow caps sit on their wall's ledge: same ground pivot, drawn `lift` px higher, hidden and shown with the wall.
const capped=(wall,u,v,zone,lift=46)=>{put(wall,u,v,{zone});put(wall==='wall-ne'?'snow-cap-ne':'snow-cap-se',u,v,{lift,on:wall,zone,onPath:true});};

// ---- Paths: gate -> ruined gate -> ruins; branch east to the watchtower; branch west to the shrine.
path('Frontier road',[[17.4,17.6],[19.6,19.4],[20.8,22.2],[21.0,24.4],[21.0,27.2],[20.7,29.3]]);
path('Watch road',[[19.6,19.4],[22.4,18.6],[25.4,18.1],[28.0,17.4]]);
path('Shrine trail',[[17.4,17.6],[15.0,20.4],[12.0,21.4],[8.0,21.3],[4.0,21.4],[1.4,22.4],[0.8,25.0],[0.9,28.0]]);

// ---- Ruined gate: the frontier's entrance, straddling the road; the road passes between its piers.
// The piers stand either side of the road (TestFrontierCollision walks the passage); they may sit closer to the
// path corridor than other props.
put('ruined-gate',21.15,25.75,{zone:'Ruined gate',onPath:true});
put('rubble',22.9,25.1,{zone:'Ruined gate',s:.9});
put('pillar-broken',19.0,26.4,{zone:'Ruined gate'});
put('rock-boulders',23.6,23.4,{zone:'Ruined gate',s:.85});
put('dead-snag',17.7,23.1,{zone:'Ruined gate'});
put('grass-tussock',22.4,26.9,{zone:'Ruined gate'});
put('grass-tussock',19.6,27.2,{zone:'Ruined gate'});

// ---- Pillar courtyard: four foundation slabs ringed by pillars, beyond the ruined gate.
for(const [du,dv] of [[0,0],[2,0],[0,2],[2,2]])put('foundation',19.6+du,30.6+dv,{zone:'Pillar courtyard'});
put('pillar-intact',18.35,29.45,{zone:'Pillar courtyard'});
put('pillar-intact',22.85,29.45,{zone:'Pillar courtyard'});
put('pillar-broken',18.35,33.95,{zone:'Pillar courtyard'});
put('pillar-intact',22.85,33.95,{zone:'Pillar courtyard'});
put('pillar-intact',18.3,31.7,{zone:'Pillar courtyard'});
put('pillar-broken',22.95,31.75,{zone:'Pillar courtyard'});
put('rubble',21.6,34.7,{zone:'Pillar courtyard'});
put('stairs-nw',20.6,35.0,{zone:'Pillar courtyard'});
put('rubble',17.2,32.9,{zone:'Pillar courtyard',s:.85});

// ---- Settlement foundations: two ruined houses either side of the courtyard.
// West house (open to the north-west): front corner, two walls with snow caps, an arched doorway.
put('foundation',14.4,32.0,{zone:'Settlement'});
put('corner-n',15.15,32.85,{zone:'Settlement'});
capped('wall-se',13.25,33.15,'Settlement');
capped('wall-ne',15.45,30.95,'Settlement');
put('arch-se',13.0,30.0,{zone:'Settlement'});
put('rubble',12.1,32.1,{zone:'Settlement',s:.9});
put('stairs-ne',16.5,34.2,{zone:'Settlement'});
// East house: a broken front corner, a wall, an arch facing the road, rubble where the rest fell.
put('foundation',26.2,31.0,{zone:'Settlement'});
put('corner-s',27.0,31.9,{zone:'Settlement'});
capped('wall-ne',27.3,29.95,'Settlement');
put('arch-ne',24.7,32.4,{zone:'Settlement'});
put('rubble',25.3,29.3,{zone:'Settlement'});
put('pillar-broken',28.6,33.2,{zone:'Settlement'});
put('paving',24.0,34.6,{zone:'Settlement',s:.7});
put('paving',16.6,29.4,{zone:'Settlement',s:.65});

// ---- Broken watchtower by the east ridge, with the outpost's fallen walls.
put('broken-watchtower',30.4,15.4,{zone:'Watchtower'});
capped('wall-se',29.9,18.7,'Watchtower');
put('rubble',31.4,17.9,{zone:'Watchtower'});
put('stairs-ne',27.6,15.9,{zone:'Watchtower',s:.9});
put('pillar-broken',32.1,13.2,{zone:'Watchtower'});
put('rock-boulders',33.0,16.4,{zone:'Watchtower'});
put('dead-snag',26.6,20.6,{zone:'Watchtower'});
put('corner-s',33.6,19.4,{zone:'Watchtower'});

// ---- Snowy shrine: the exploration goal at the end of the western trail, framed by pillars and pines.
put('snowy-shrine',1.6,30.6,{zone:'Snowy shrine'});
put('paving',1.0,28.7,{zone:'Snowy shrine',s:.75});
put('pillar-intact',-0.2,28.0,{zone:'Snowy shrine'});
put('pillar-intact',2.3,27.6,{zone:'Snowy shrine'});
put('pillar-broken',3.3,30.6,{zone:'Snowy shrine'});
put('dead-tree',4.0,32.8,{zone:'Snowy shrine'});
put('shrub-juniper',-0.6,31.4,{zone:'Snowy shrine'});
put('shrub-juniper',3.0,29.0,{zone:'Snowy shrine',s:.85});
put('grass-tussock',2.2,32.6,{zone:'Snowy shrine'});
put('rock-scatter',0.4,29.6,{zone:'Snowy shrine'});

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
  if(put(a,u,v,{s:lo+rnd()*(hi-lo),zone:z.zone,scatter:true}))made++;}}

if(errors.length){console.error(errors.join('\n'));process.exit(1);}
data.placements=placed;
// One kit sprite and one placement per line keeps the file reviewable.
const line=o=>JSON.stringify(o).replace(/,"/g,', "').replace(/":/g,'": ').replace(/\],\[/g,'], [').replace(/,(-?\d)/g,', $1');
const json=['{',` "id": "${data.id}",`,` "version": ${data.version},`,` "map": "${data.map}",`,' "notes": ['+data.notes.map(n=>'\n  '+JSON.stringify(n)).join(',')+'\n ],',
 ' "kit": {',Object.entries(data.kit).map(([k,v])=>`  ${JSON.stringify(k)}: ${line(v)}`).join(',\n'),' },',' "placements": [',placed.map(p=>'  '+line(p)).join(',\n'),' ]','}'].join('\n');
await fs.writeFile(FILE,json+'\n');
const used=new Set(placed.map(p=>p.a)),missing=Object.keys(data.kit).filter(a=>!used.has(a));
console.log(placed.length,'placements;',used.size,'of',Object.keys(data.kit).length,'sprites used',missing.length?'· MISSING '+missing:'');
const byZone={};for(const p of placed)byZone[p.zone]=(byZone[p.zone]||0)+1;console.log(byZone);
