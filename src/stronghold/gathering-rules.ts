import {DAY_MS} from './daylight';
export const CHOP_METERS=1.524,RESPAWN_METERS=20;
export const TREE_RULES={ 'dead-snag':{wood:10,ms:2000,days:1},'pine-tall':{wood:100,ms:10000,days:5},'pine-broad':{wood:100,ms:10000,days:5},'pine-sapling':{wood:100,ms:10000,days:5},'dead-tree':{wood:30,ms:3000,days:3}} as const;
export type TreeKind=keyof typeof TREE_RULES;
export const treeKind=(asset:string):TreeKind|null=>{const k=asset.replace(/^frontier:/,'');return k in TREE_RULES?k as TreeKind:null;};
export const WILDLIFE_RULES={deer:{food:100,days:1},crocodile:{food:500,days:3}} as const;
export type Species=keyof typeof WILDLIFE_RULES;
export type Point={u:number;v:number};
export type TreeRecord=Point&{cycle:number;readyDay:number;down:boolean};
export type AnimalRecord=Point&{cycle:number;readyDay:number;status:'alive'|'loot'|'waiting'};
export type Gathering={version:1;day:number;trees:Record<string,TreeRecord>;animals:Record<string,AnimalRecord>};
export type Resources={wood:number;food:number;storedWood:number;storedFood:number};
export const emptyResources=():Resources=>({wood:0,food:0,storedWood:0,storedFood:0});
const valid=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
export function readResources(raw:unknown):Resources{if(raw===undefined)return emptyResources();const r=raw as Resources;if(!r||['wood','food','storedWood','storedFood'].some(k=>!Number.isSafeInteger((r as any)[k])||(r as any)[k]<0))throw Error('Invalid resource save. Original retained.');return structuredClone(r);}
export function readGathering(raw:unknown,day=0):Gathering{
 if(raw===undefined)return {version:1,day,trees:{},animals:{}};
 const s=raw as Gathering;
 if(!s||s.version!==1||!valid(s.day)||!s.trees||!s.animals||Array.isArray(s.trees)||Array.isArray(s.animals))throw Error('Invalid gathering save. Original retained.');
 for(const [kind,records] of [['tree',s.trees],['animal',s.animals]] as const)for(const [id,r] of Object.entries(records)){
  if(['__proto__','prototype','constructor'].includes(id)||!r||!Number.isFinite(r.u)||!Number.isFinite(r.v)||!Number.isSafeInteger(r.cycle)||r.cycle<0||!valid(r.readyDay)||(kind==='tree'?typeof (r as TreeRecord).down!=='boolean':!['alive','loot','waiting'].includes((r as AnimalRecord).status)))throw Error('Invalid gathering record. Original retained.');
 }
 return structuredClone(s);
}
export function advanceClock(s:Gathering,dt:number){if(!valid(dt)||dt>120)throw Error('Invalid gathering time step.');s.day+=dt/DAY_MS;}
export function harvest(s:Gathering,r:Resources,id:string,kind:TreeKind){const t=s.trees[id];if(!t||t.down)return false;const rule=TREE_RULES[kind];if(!Number.isSafeInteger(r.wood+rule.wood))throw Error('Wood limit reached.');r.wood+=rule.wood;t.down=true;t.readyDay=s.day+rule.days;return true;}
export function hunt(s:Gathering,id:string,species:Species){const a=s.animals[id];if(!a||a.status!=='alive')return false;a.status='loot';a.readyDay=s.day+WILDLIFE_RULES[species].days;return true;}
export function collect(s:Gathering,r:Resources,id:string,species:Species){const a=s.animals[id];if(!a||a.status!=='loot')return false;const n=WILDLIFE_RULES[species].food;if(!Number.isSafeInteger(r.food+n))throw Error('Food limit reached.');r.food+=n;a.status='waiting';return true;}
export function respawnTree(s:Gathering,id:string,anchor:Point,metersPerTile:number,clear:(p:Point)=>boolean,random:()=>number){
 const t=s.trees[id];if(!t||!t.down||s.day<t.readyDay)return false;
 for(let n=0;n<60;n++){const angle=random()*Math.PI*2,r=Math.sqrt(random())*RESPAWN_METERS/metersPerTile,p={u:anchor.u+Math.cos(angle)*r,v:anchor.v+Math.sin(angle)*r};if(!clear(p))continue;Object.assign(t,p,{down:false,cycle:t.cycle+1});return true;}return false;
}
export function respawnAnimal(s:Gathering,id:string,point:Point){const a=s.animals[id];if(!a||a.status!=='waiting'||s.day<a.readyDay)return false;Object.assign(a,point,{status:'alive',cycle:a.cycle+1});return true;}
