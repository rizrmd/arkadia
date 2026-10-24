export const VERSION = 1, SIZE = 12, REGION = 24;
export type Point = { x: number; y: number };
export type Tile = Point & { elevation: number; moisture: number; biome: string; river: boolean; flow: Point | null; road: boolean; landmark: string | null; name: string; faction: string; risk: number; signs: string[] };
export type Chunk = { x: number; y: number; tiles: Tile[] };
export type Condition = { visited?: boolean; cleared?: boolean; corruption?: number; depleted?: boolean };
export type Job = { route: Point[]; goal: string; riskLimit: number; hours: number; started: number; claimed: boolean };
const key = (p: Point) => `${p.x},${p.y}`;
const validPoint = (p: Point) => p && Number.isSafeInteger(p.x) && Number.isSafeInteger(p.y) && Math.abs(p.x) < Number.MAX_SAFE_INTEGER - 1024 && Math.abs(p.y) < Number.MAX_SAFE_INTEGER - 1024;
export function hash(seed: string, x: number, y: number, salt = '') { let h = 2166136261; for (const c of `${seed}:${x}:${y}:${salt}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function noise(seed: string, x: number, y: number, scale: number, salt: string) { const a = Math.floor(x / scale), b = Math.floor(y / scale); const smooth = (v: number) => v * v * (3 - 2 * v); const u = smooth(x / scale - a), v = smooth(y / scale - b); return (hash(seed,a,b,salt)*(1-u)+hash(seed,a+1,b,salt)*u)*(1-v)+(hash(seed,a,b+1,salt)*(1-u)+hash(seed,a+1,b+1,salt)*u)*v; }
export class Generator {
  private sites = new Map<string, Point>(); private edges = new Map<string, Set<string>>();
  constructor(public seed: string) {}
  riverX(basin: number, y: number) { return basin * 32 + 8 + Math.round(3 * Math.sin(y / 13 + hash(this.seed,basin,0)*6)); }
  terrain(x: number, y: number) {
    const basin = Math.round((x - 8) / 32); const distance = Math.abs(x - this.riverX(basin,y)); const river = distance === 0;
    const ridge = noise(this.seed,x,y,32,'ridge');
    const elevation = river ? -y * .02 : -y * .02 + .08 + Math.min(distance,10)*.045 + Math.max(0,ridge-.53)*2;
    const moisture = Math.min(1,noise(this.seed,x,y,20,'rain')*.7 + Math.max(0,1-distance/7)*.5);
    const height = elevation + y*.02;
    const biome = river ? 'River' : height > .88 ? 'Mountains' : moisture > .68 ? 'Swamp' : moisture > .43 ? 'Relic Forest' : 'Ash Frontier';
    return { elevation, moisture, biome, river, flow: river ? {x:this.riverX(basin,y+1),y:y+1} : null };
  }
  site(rx: number, ry: number): Point {
    const id = `${rx},${ry}`; const cached = this.sites.get(id); if(cached) return cached;
    let best = {x:rx*REGION+12,y:ry*REGION+12}, score = Infinity;
    for(let dy=-5;dy<=5;dy++) for(let dx=-5;dx<=5;dx++) { const p={x:rx*REGION+12+dx,y:ry*REGION+12+dy}; const t=this.terrain(p.x,p.y); const s=(t.river?10:0)+Math.abs(t.moisture-.6)+Math.max(0,t.elevation+p.y*.02-.65)*5+hash(this.seed,p.x,p.y,'site')*.08; if(s<score){score=s;best=p;} }
    this.sites.set(id,best); return best;
  }
  edge(rx:number,ry:number,axis:'x'|'y') {
    const id=`${rx},${ry},${axis}`; const cached=this.edges.get(id); if(cached) return cached;
    const start=this.site(rx,ry), end=this.site(rx+(axis==='x'?1:0),ry+(axis==='y'?1:0));
    const open=[start], cost=new Map([[key(start),0]]), prev=new Map<string,Point>(); let found=false;
    while(open.length) { open.sort((a,b)=>(cost.get(key(a))!+Math.abs(a.x-end.x)+Math.abs(a.y-end.y))-(cost.get(key(b))!+Math.abs(b.x-end.x)+Math.abs(b.y-end.y)) || a.x-b.x || a.y-b.y); const p=open.shift()!; if(key(p)===key(end)){found=true;break;}
      for(const d of [{x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:0,y:-1}]) { const q={x:p.x+d.x,y:p.y+d.y}; if(q.x<Math.min(start.x,end.x)-4||q.x>Math.max(start.x,end.x)+4||q.y<Math.min(start.y,end.y)-4||q.y>Math.max(start.y,end.y)+4)continue; const t=this.terrain(q.x,q.y), a=this.terrain(p.x,p.y); const next=cost.get(key(p))!+1+(t.river?3:0)+Math.abs(t.elevation-a.elevation)*6+(t.biome==='Swamp'||t.biome==='Rawa'?2:0); if(next<(cost.get(key(q))??Infinity)){cost.set(key(q),next);prev.set(key(q),p);if(!open.some(v=>key(v)===key(q)))open.push(q);} }
    }
    if(!found)throw Error('Road disconnected'); const path=new Set<string>(); let p=end; path.add(key(p)); while(key(p)!==key(start)){p=prev.get(key(p))!;path.add(key(p));} this.edges.set(id,path); return path;
  }
  tile(x:number,y:number):Tile {
    const t=this.terrain(x,y), rx=Math.floor(x/REGION), ry=Math.floor(y/REGION); let road=false;
    for(let a=rx-1;a<=rx+1;a++)for(let b=ry-1;b<=ry+1;b++)for(const axis of ['x','y'] as const) if(this.edge(a,b,axis).has(`${x},${y}`))road=true;
    const site=this.site(rx,ry), atSite=site.x===x&&site.y===y;
    const source={x:rx*REGION+4+Math.floor(hash(this.seed,rx,ry,'nest-x')*16),y:ry*REGION+4+Math.floor(hash(this.seed,rx,ry,'nest-y')*16)};
    const distance=Math.hypot(x-source.x,y-source.y); const corruption=hash(this.seed,rx,ry,'corruption');
    const faction=corruption>.65?'Black Roots':corruption>.3?'Bone Legion':'Ash Raiders';
    const landmark=atSite?(hash(this.seed,rx,ry,'history')>.7?'Stronghold':'Settlement'):distance===0?'Lair':road&&hash(this.seed,x,y,'ruin')>.96?'Ruins':road&&hash(this.seed,x,y,'rest')>.94?'Rest stop':(t.biome==='Mountains'||t.biome==='Pegunungan')&&hash(this.seed,x,y,'peak')>.96?'Relic tower':null;
    const risk=atSite?0:Math.round(Math.max(0,1-distance/10)*(40+corruption*50)+(t.biome==='Mountains'||t.biome==='Pegunungan'?10:0));
    return {x,y,...t,road,landmark,name:`${landmark??t.biome} ${Math.floor(hash(this.seed,x,y,'name')*9999)}`,faction,risk,signs:risk>45?['Dense tracks', faction==='Black Roots'?'Plum roots split the stone':'Torn banners and fresh bones']:risk>15?['Tracks toward the lair']:['Quiet path']};
  }
  chunk(x:number,y:number):Chunk { const tiles:Tile[]=[];for(let j=0;j<SIZE;j++)for(let i=0;i<SIZE;i++)tiles.push(this.tile(x*SIZE+i,y*SIZE+j));return {x,y,tiles}; }
}
export class World {
  generator:Generator; chunks:Record<string,Chunk>={}; conditions:Record<string,Condition>={}; position:Point; jobs:Job[]=[]; materials=0; xp=0;
  constructor(public seed:string){this.generator=new Generator(seed);this.position={...this.generator.site(0,0)};}
  tile(p:Point) { if(!validPoint(p))throw Error('Invalid coordinates'); const cx=Math.floor(p.x/SIZE),cy=Math.floor(p.y/SIZE),id=`${cx},${cy}`;this.chunks[id]??=this.generator.chunk(cx,cy);return this.chunks[id].tiles[(p.y-cy*SIZE)*SIZE+p.x-cx*SIZE]; }
  condition(p:Point){return this.conditions[key(p)]??{};}
  risk(p:Point){return this.condition(p).cleared?0:Math.min(100,Math.max(0,this.tile(p).risk+(this.condition(p).corruption??0)));}
  visit(p:Point){this.tile(p);this.position={...p};this.conditions[key(p)]={...this.condition(p),visited:true};}
  clear(p:Point){if(!this.condition(p).visited)throw Error('Visit the location before actively clearing');this.conditions[key(p)]={...this.condition(p),cleared:true};}
  route(to:Point,limit:number,idle=false):Point[]{
    if(!Number.isFinite(limit)||limit<0||limit>100)throw Error('Risk limit 0–100');
    if(!validPoint(to))throw Error('Invalid destination coordinates');
    const start=this.position, queue=[start], prev=new Map<string,Point>(), seen=new Set([key(start)]); let found=false;
    while(queue.length&&seen.size<4096){const p=queue.shift()!;if(key(p)===key(to)){found=true;break;}for(const d of [{x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:0,y:-1}]){const q={x:p.x+d.x,y:p.y+d.y};if(Math.abs(q.x-start.x)>40||Math.abs(q.y-start.y)>40||seen.has(key(q)))continue;if(idle&&!this.condition(q).cleared)continue;const t=this.tile(q);if(this.risk(q)>limit||t.river&&!t.road)continue;seen.add(key(q));prev.set(key(q),p);queue.push(q);}}
    if(!found)throw Error('No route within 40 tiles, risk limit or cleared locations');const result=[to];while(key(result[0])!==key(start))result.unshift(prev.get(key(result[0]))!);return result;
  }
  dispatch(to:Point,limit:number,hours:number,now:number){if(![1,4,8].includes(hours))throw Error('Duration: 1/4/8 hours');if(!this.condition(this.position).cleared||!this.condition(to).cleared)throw Error('Idle requires an actively cleared route');const route=this.route(to,limit,true);const job={route,goal:this.tile(to).name,riskLimit:limit,hours,started:now,claimed:false};this.jobs.push(job);return job;}
  claim(index:number,now:number){const job=this.jobs[index];if(!job||job.claimed||now<job.started+job.hours*3600000)throw Error('Expedition unfinished or already claimed');job.claimed=true;this.materials+=job.hours*10;this.xp+=job.hours*20;return {materials:job.hours*10,xp:job.hours*20};}
  save(){return JSON.stringify({version:VERSION,seed:this.seed,chunks:this.chunks,conditions:this.conditions,position:this.position,jobs:this.jobs,materials:this.materials,xp:this.xp});}
  static load(raw:string){const s=JSON.parse(raw);if(s.version!==VERSION||typeof s.seed!=='string'||!s.chunks||!s.conditions||!Number.isSafeInteger(s.position?.x)||!Number.isSafeInteger(s.position?.y)||!Array.isArray(s.jobs))throw Error('Unsupported or corrupt save');for(const [id,c] of Object.entries(s.chunks) as [string,Chunk][]){if(!c||!Number.isSafeInteger(c.x)||!Number.isSafeInteger(c.y)||id!==key(c)||!Array.isArray(c.tiles)||c.tiles.length!==SIZE*SIZE||c.tiles.some((t,i)=>!validPoint(t)||t.x!==c.x*SIZE+i%SIZE||t.y!==c.y*SIZE+Math.floor(i/SIZE)||!Number.isFinite(t.elevation)||!Number.isFinite(t.moisture)||!Number.isFinite(t.risk)||typeof t.name!=='string'||!Array.isArray(t.signs)))throw Error('Corrupt chunk snapshot');}
    if(s.jobs.some((j:Job)=>!j||!Array.isArray(j.route)||!j.route.length||j.route.some(p=>!validPoint(p))||![1,4,8].includes(j.hours)||!Number.isFinite(j.started)||!Number.isFinite(j.riskLimit)||typeof j.claimed!=='boolean'))throw Error('Corrupt idle snapshot');
    const w=new World(s.seed);Object.assign(w,{chunks:s.chunks,conditions:s.conditions,position:s.position,jobs:s.jobs,materials:s.materials??0,xp:s.xp??0});return w;}
}
