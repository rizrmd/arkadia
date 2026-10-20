export const SNOW_KEY='arkadia-snow-expedition-v1';
export const CAMP={x:1.6,y:7.6};
export const CACHES=[{id:'outpost',name:'Lost outpost',x:3,y:6},{id:'ridge',name:'Frozen ridge',x:6.5,y:2},{id:'trail',name:'Eastern trail',x:8,y:7.5}];
export const PATROL=[{x:4,y:4},{x:5,y:4},{x:7,y:2},{x:8,y:3},{x:7,y:7},{x:8,y:7}];
export type SnowProgress={version:1;collected:string[];defeated:number[];hero:{x:number;y:number;hp:number};status:'active'|'complete'|'failed'};
export function freshSnow(hp=100):SnowProgress{return {version:1,collected:[],defeated:[],hero:{...CAMP,hp},status:'active'};}
export function loadSnow(raw:string|null,hp=100):SnowProgress{if(!raw)return freshSnow(hp);const s=JSON.parse(raw) as SnowProgress;if(s.version!==1||!['active','complete','failed'].includes(s.status)||!Array.isArray(s.collected)||s.collected.some(id=>!CACHES.some(c=>c.id===id))||new Set(s.collected).size!==s.collected.length||!Array.isArray(s.defeated)||s.defeated.some(i=>!Number.isInteger(i)||i<0||i>=PATROL.length)||new Set(s.defeated).size!==s.defeated.length||!s.hero||![s.hero.x,s.hero.y,s.hero.hp].every(Number.isFinite)||s.hero.x<.9||s.hero.x>9.1||s.hero.y<.9||s.hero.y>9.1||s.hero.hp<0||s.hero.hp>1000)throw Error('Invalid Frostpass checkpoint. Restart the expedition to reset it.');return s;}
export function canExtract(s:SnowProgress){return s.status==='active'&&s.collected.length===CACHES.length&&s.defeated.length===PATROL.length&&s.hero.hp>0;}
