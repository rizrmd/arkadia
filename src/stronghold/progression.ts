export type Progression={level:number;xp:number;gold:number;pending:number;offers:string[];skills:Record<string,number>;stars:number};
export const fresh=():Progression=>({level:1,xp:0,gold:0,pending:0,offers:[],skills:{},stars:0});
export const threshold=(p:Progression)=>20+(p.level-1)*10;
export const cards:Record<string,{name:string;description:string}>={
 might:{name:'Titan Strike',description:'+0.5 attack damage per rank.'},
 nova:{name:'Arc Nova',description:'Unlock a wider attack. Each rank adds 20% reach.'},
 leech:{name:'Soul Feast',description:'Restore 2 health per rank on each kill.'},
 star:{name:'Ascendant Star',description:'+0.25 damage and +10 maximum health.'},
 vitality:{name:'Vitality',description:'+20 maximum health and restore 20 health.'},
 heal:{name:'Second Wind',description:'Restore 35% of maximum health.'}};
export function roll(p:Progression,random:()=>number){const pool=Object.keys(cards);p.offers=[];while(p.offers.length<3)p.offers.push(pool.splice(Math.floor(random()*pool.length),1)[0]);}
export function reward(p:Progression,random:()=>number){p.gold+=5;p.xp+=10;while(p.xp>=threshold(p)){p.xp-=threshold(p);p.level++;p.pending++;}if(p.pending&&!p.offers.length)roll(p,random);}
export function choose(p:Progression,id:string,random:()=>number){if(!p.pending||!p.offers.includes(id))return false;if(id==='star')p.stars++;else if(id!=='heal')p.skills[id]=(p.skills[id]??0)+1;p.pending--;p.offers=[];if(p.pending)roll(p,random);return true;}
export const damage=(p:Progression)=>1+(p.skills.might??0)*.5+p.stars*.25;
export const reach=(p:Progression)=>1+(p.skills.nova??0)*.2;
export const health=(p:Progression)=>(p.skills.vitality??0)*20+p.stars*10;
