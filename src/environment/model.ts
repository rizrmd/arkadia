import catalog from './catalog.json';
export type Asset={id:string;label:string;file:string;width:number;height:number;pivot:number[];frame?:number[];blocks:number[][];layer:string;footprint:number;columns?:{x:number;w:number;back:number;front:number}[];components?:{file:string;width:number;foot:number;dx:number;dy:number;shear:number;vertical:number}[]};
export const OCCUPIED=catalog.occupied;
export const ASSETS=catalog.assets as Asset[];
export const asset=(id:string)=>ASSETS.find(a=>a.id===id)!;
export type ObjectPlacement={id:string;asset:string;u:number;v:number;count?:number;radius?:number;interval?:number};
export type EnvironmentMap={schema:1;revision:number;name:string;objects:ObjectPlacement[]};
export const EMPTY:EnvironmentMap={schema:1,revision:0,name:'Arkodia environment',objects:[]};
export const ORIGIN={u:460.5,v:460.5},COURT={x:577,y:-160};
export function world(p:{u:number;v:number}){const u=p.u-ORIGIN.u,v=p.v-ORIGIN.v;return {x:COURT.x+(u-v)*64,y:COURT.y+(u+v)*32};}
export function mapPoint(x:number,y:number){return {u:ORIGIN.u+(x-COURT.x)/128+(y-COURT.y)/64,v:ORIGIN.v+(y-COURT.y)/64-(x-COURT.x)/128};}
export function columns(o:ObjectPlacement){const a=asset(o.asset),p=world(o);if(a.columns)return a.columns.map(c=>({...c,x:c.x+p.x,back:c.back+p.y,front:c.front+p.y}));return a.blocks.flatMap(r=>{const corners=[[r[0],r[1]],[r[2],r[1]],[r[2],r[3]],[r[0],r[3]]].map(([u,v])=>world({u:o.u+u,v:o.v+v}));const x0=Math.min(...corners.map(p=>p.x)),x1=Math.max(...corners.map(p=>p.x)),n=Math.max(1,Math.ceil((x1-x0)/4)),w=(x1-x0)/n;return Array.from({length:n},(_,i)=>{const x=x0+(i+.5)*w,ys:number[]=[];for(let j=0;j<4;j++){const p=corners[j],q=corners[(j+1)%4];if(p.x!==q.x&&x>=Math.min(p.x,q.x)&&x<=Math.max(p.x,q.x))ys.push(p.y+(q.y-p.y)*(x-p.x)/(q.x-p.x));}return {x,w,back:Math.min(...ys),front:Math.max(...ys)};});});}
export function overlaps(a:ObjectPlacement,b:ObjectPlacement){const ra=asset(a.asset).footprint/2,rb=asset(b.asset).footprint/2;return Math.abs(a.u-b.u)<ra+rb+.2&&Math.abs(a.v-b.v)<ra+rb+.2;}
const listeners=new Set<()=>Promise<void>>();
export const watchEnvironment=(f:()=>Promise<void>)=>{listeners.add(f);return ()=>listeners.delete(f);};
let collision:ReturnType<typeof columns>=[];
let active:EnvironmentMap=structuredClone(EMPTY);
export const environment=()=>active;
export async function loadEnvironment(revision?:number){const r=await fetch('/api/environment/published'+(revision===undefined?'':'?revision='+revision),{cache:'no-store'});if(!r.ok)throw Error('Published map unavailable');active=await r.json();collision=active.objects.flatMap(columns);await Promise.all([...listeners].map(f=>f()));return active;}
export function environmentBlocked(x:number,y:number){return collision.some(c=>Math.abs(x-c.x)<c.w/2+9&&y>c.back-4.5&&y<c.front+4.5);}
export function sampleSpawn(o:ObjectPlacement,random:()=>number,walkable:(p:{u:number;v:number})=>boolean){for(let i=0;i<60;i++){const angle=random()*Math.PI*2,r=Math.sqrt(random())*(o.radius??3)/3,p={u:o.u-ORIGIN.u+Math.cos(angle)*r,v:o.v-ORIGIN.v+Math.sin(angle)*r};if(walkable(p))return p;}return null;}
