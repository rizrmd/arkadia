import {createHero,type Column,type Placed} from './hero';
import type {Sun} from './daylight';
import type {Net} from './net/client';
import type {PlayerState} from './net/protocol';
// The other heroes in a co-op room. Each is a full hero sprite (same atlas, lighting, sun shadow and occlusion
// behind buildings as the own hero, hero.ts) driven by the server snapshots 100 ms behind, with its name and own
// health bar over its head. A hero standing further up the screen than the own hero draws behind it.
export function createParty<P extends Placed>(o:{layer:HTMLElement;lightmap:HTMLCanvasElement;surface:HTMLElement;footprint:(p:P)=>Column[];sun:()=>Sun;net:Net;own:()=>{x:number;y:number}}){
 type Ally={hero:Awaited<ReturnType<typeof createHero<P>>>|null;tag:HTMLElement;fill:HTMLElement;state:PlayerState;plays:number;clipAt:number;behind:boolean|null;gone:boolean};
 const allies=new Map<string,Ally>(),tags=document.createElement('div');tags.id='party-tags';tags.setAttribute('aria-hidden','true');o.layer.append(tags);
 let scene:P[]=[],origin={x:0,y:0,scale:1};
 function add(p:PlayerState){
  const tag=document.createElement('div');tag.className='party-tag';tag.dataset.id=p.id;tag.innerHTML='<div class="party-card"><span class="party-name"></span><span class="party-hp"><i></i></span></div>';
  tag.querySelector('.party-name')!.textContent=p.name;tags.append(tag);
  const a:Ally={hero:null,tag,fill:tag.querySelector('i')!,state:p,plays:p.n,clipAt:performance.now(),behind:null,gone:false};allies.set(p.id,a);
  // Swings, hit stun and death play from the moment the server started them; facing is the server's.
  void createHero<P>({layer:o.layer,lightmap:o.lightmap,surface:o.surface,footprint:o.footprint,sun:o.sun,direction:()=>({x:0,y:0}),follow:()=>{},id:'world-ally-'+p.id,
   drive:()=>{const s=a.state;return {x:s.x,y:s.y,pose:s.st==='idle'?null:{clip:s.st,t:performance.now()-a.clipAt},look:{facing:s.fc,back:s.bk,vertical:s.vt}};}})
   .then(h=>{if(a.gone){h.remove();return;}a.hero=h;h.setScene(scene);h.place(origin.x,origin.y,origin.scale);h.start();}).catch(console.error);
 }
 // Sampled at the frame's timestamp, so uneven callback timing never shows as uneven motion.
 function update(now:number){
  const list=o.net.active()?o.net.remotes(now):[],seen=new Set<string>(),own=document.querySelector<HTMLElement>('#world-hero'),me=o.own();
  for(const p of list){
   seen.add(p.id);const a=allies.get(p.id);if(!a){add(p);continue;}
   if(p.n!==a.plays){a.plays=p.n;a.clipAt=performance.now();}a.state=p;
   const canvas=document.getElementById('world-ally-'+p.id),behind=p.y<me.y;
   if(canvas&&own&&behind!==a.behind){a.behind=behind;if(behind)own.before(canvas);else own.after(canvas);}
  }
  for(const [id,a] of allies)if(!seen.has(id)){a.gone=true;a.hero?.remove();a.tag.remove();allies.delete(id);}
  place();requestAnimationFrame(update);
 }
 function place(){
  const k=origin.scale;
  for(const a of allies.values()){const s=a.state,ratio=Math.max(0,s.hp)/s.max;
   a.tag.style.transform=`translate3d(${origin.x+s.x*k}px,${origin.y+(s.y-64)*k}px,0)`;a.fill.style.transform=`scaleX(${ratio})`;
   a.tag.dataset.low=String(ratio<.3);a.tag.dataset.down=String(s.st==='die');}
 }
 requestAnimationFrame(update);
 return {
  setScene(list:P[]){scene=list;for(const a of allies.values())a.hero?.setScene(list);},
  place(x:number,y:number,scale:number){origin={x,y,scale};for(const a of allies.values())a.hero?.place(x,y,scale);place();},
  count:()=>allies.size
 };
}
