import {Assets,Container,Rectangle,Sprite,Texture} from 'pixi.js';
import {tilePoint} from '../stronghold/terrain';
import type {View} from './space';
export const FLAME_FAN_EMBER_ASSET='/flame-fan-ember-candidate/v1/ember-v2.png';
// The approved sheet contains nine static silhouettes, not sequential animation frames.
const cuts=[0,240,500,665,910,1240,1435,1670,1855,2172];
export function createFlameFanEmbers(parent:Container,trace?:(x0:number,y0:number,x1:number,y1:number)=>{hit:boolean;t:number},occlusionAt?:(px:number,py:number,wx:number,wy:number,rad:number,flat:boolean,includeHero:boolean,anchorY:number)=>number){
 let textures:Texture[]=[],preparing:Promise<void>|undefined;
 type Cast={u:number;v:number;yaw:number;radius:number;rank:number;age:number;sprites:Sprite[]};
 const casts:Cast[]=[],pool:Sprite[][]=[];
 const prepare=()=>preparing??=Assets.load<Texture>(FLAME_FAN_EMBER_ASSET).then(t=>{t.source.autoGarbageCollect=false;textures=cuts.slice(0,-1).map((x,i)=>new Texture({source:t.source,frame:new Rectangle(x,0,cuts[i+1]-x,724)}));});
 function recycle(c:Cast){for(const s of c.sprites)s.visible=false;pool.push(c.sprites);}
 function spawn(u:number,v:number,yaw:number,radius:number,rank:number,age=0){
  if(!textures.length)return;
  if(casts.length>=3)recycle(casts.shift()!);
  const sprites=pool.pop()??Array.from({length:24},(_,i)=>{const s=new Sprite(textures[i%9]);s.anchor.set(.5,.74);parent.addChild(s);return s;});
  for(const s of sprites){s.visible=false;parent.addChild(s);}
  casts.push({u,v,yaw,radius,rank,age,sprites});
 }
 function frame(dt:number,view:View){for(let k=casts.length-1;k>=0;k--){const c=casts[k];c.age+=dt;const lifetime=c.rank>=3?1:.85;if(c.age>=lifetime){recycle(c);casts.splice(k,1);continue;}
  const count=8+c.rank*3,origin=tilePoint(c.u,c.v);
  for(let i=0;i<c.sprites.length;i++){const s=c.sprites[i];if(i>=count){s.visible=false;continue;}
   const angle=c.yaw+((i*.61803398875)%1-.5)*1.72,reach=.18+((i*.381966)%1)*.73,advance=Math.min(1,c.age*7),r=c.radius*reach*advance;
   const p=tilePoint(c.u+Math.cos(angle)*r,c.v+Math.sin(angle)*r),wall=trace?.(origin.x,origin.y,p.x,p.y);
   const alpha=(occlusionAt?.(p.x,p.y,p.x,p.y,0,true,false,p.y)??1)*Math.min(1,c.age*18)*Math.min(1,(lifetime-c.age)*4)*(.64+.12*Math.sin(c.age*23+i));
   s.visible=!wall?.hit&&alpha>.01;s.alpha=alpha;s.position.set(view.x+p.x*view.scale,view.y+p.y*view.scale-Math.sin(c.age*11+i)*2*view.scale);
   const h=(22+c.rank*2+i%4*3)*view.scale*(.9+.1*Math.sin(c.age*19+i));s.height=h/ .55;s.width=s.height*s.texture.width/724;s.rotation=Math.sin(i*2.4+c.age*5)*.12;
  }
 }}
 return {prepare,spawn,frame,clear(){for(const c of casts)recycle(c);casts.length=0;},snapshot:()=>casts.map(c=>({asset:FLAME_FAN_EMBER_ASSET,rank:c.rank,age:c.age,count:8+c.rank*3,visible:c.sprites.filter(s=>s.visible).length}))};
}
