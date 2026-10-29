import {desktopNavigationLayout} from '../typography/desktop-layout';
import {Assets,Container,Graphics,Rectangle,Sprite} from 'pixi.js';
import {mobileHudLayout} from '../typography/mobile-layout';
import {project,unproject} from '../isometric';
import {MAP,STRONGHOLD_ORIGIN} from '../world/map';
import {RELIEF} from '../world/relief';
import {FRONTIER_PROPS} from '../world/frontier';
import {STRONGHOLD} from './prefabs/stronghold';
import {COURT,environmentSprites,LEGACY_LAYOUT} from './terrain';
import {slots} from './scene';
import type {Building} from './economy';
import type {Route} from './auto-walk';

// Use exactly the rendered environment set, including legacy props only when that layout is active.
// Ground dressing (weeds, paving and snow drifts) is not an obstacle.
export const minimapObstacles=()=>environmentSprites()
 .filter(p=>p.layer!=='ground'&&p.opacity>=1&&!/^(rampart-|bastion$)/.test(p.id))
 .map(p=>{const t=unproject(p.x-COURT.x,p.y-COURT.y);return {id:p.id,u:t.x,v:t.y,width:p.width,kind:/fir|spruce|tree/.test(p.id)?'tree' as const:'obstacle' as const};})
 // The Frozen Frontier's solid props (world/frontier.ts): its ruins, landmarks, trees and boulders.
 .concat(FRONTIER_PROPS.filter(p=>p.blocks.length).map(p=>({id:'ff:'+p.asset,u:p.u,v:p.v,width:p.width,kind:/pine|tree|snag/.test(p.asset)?'tree' as const:'obstacle' as const})));

// The map's symbols in court units ((world px - COURT) / 64, the ground plane as the game draws it), with line widths
// for z screen px per unit. Shared by the minimap and the full map (world-map.ts). Returns the shapes drawn.
export function drawMapGeometry(g:Graphics,built:Building[],z:number,obstacles:ReturnType<typeof minimapObstacles>){
 let count=0;
 const line=(points:number[][],closed=true,alpha=.85)=>{
  const p=points.flatMap(([u,v])=>{const q=project(u,v);return [q.x/64,q.y/64];});
  g.poly(p,closed).stroke({color:0xd8b66b,width:1/z,alpha});count++;
 };
 const rect=(u:number,v:number,w:number,h:number,alpha=.85)=>line([[u,v],[u+w,v],[u+w,v+h],[u,v+h]],true,alpha);
 const o=STRONGHOLD_ORIGIN,n=MAP.sizeTiles;
 rect(-o.u,-o.v,n,n,1);
 rect(0,0,COURT.size,COURT.size);
 // Real prefab wall locations, omitting decorative ground props.
 for(const p of STRONGHOLD.props){
  if(p.layout==='legacy'&&!LEGACY_LAYOUT)continue;
  if(p.id==='rampart-se')rect(p.u-2.5,p.v-.2,5,.4);
  else if(p.id==='rampart-ne')rect(p.u-.2,p.v-2.5,.4,5);
 }
 for(const p of obstacles){
  const q=project(p.u,p.v),x=q.x/64,y=q.y/64;
  // Symbols stay readable at narrow portrait sizes; their anchors remain exact world positions.
  const r=Math.max(1.4/z,Math.min(1.1,p.width/256));
  if(p.kind==='tree'){
   g.poly([x,y-r,x+r*.75,y+r*.45,x-r*.75,y+r*.45])
    .fill({color:0x719681,alpha:.55}).stroke({color:0xc5c595,width:.8/z,alpha:.95});
   g.moveTo(x,y+r*.45).lineTo(x,y+r*.95).stroke({color:0xd8b66b,width:1/z});
  }else{
   g.poly([x-r,y,x-r*.4,y-r*.5,x+r*.6,y-r*.4,x+r,y+r*.25,x+r*.2,y+r*.55])
    .closePath().fill({color:0x9c957b,alpha:.22}).stroke({color:0xd8b66b,width:.85/z,alpha:.85});
  }
  count++;
 }
 for(const id of built){
  const b=slots[id];if(!b)continue;
  const t=unproject(b.x-COURT.x,b.y-COURT.y);
  // Building symbols use their real slot and scaled width, rather than a decorative atlas.
  const r=Math.max(.35,Math.min(2.2,b.width/256));rect(t.x-r,t.y-r,r*2,r*2);
 }
 for(const f of RELIEF)line(f.outline??[[f.u0,f.v0],[f.u1,f.v0],[f.u1,f.v1],[f.u0,f.v1]],true,f.type==='ramp'?.45:.75);
 return count;
}

// Desktop only: the player's own minimap size and place, kept as the gap to the right edge and the top edge.
type Custom={size:number;right:number;top:number};
const LAYOUT_KEY='arkodia.minimap.layout.v1',MIN_SIZE=120,CORNER=16;
const loadCustom=():Custom|null=>{
 try{const v=JSON.parse(localStorage.getItem(LAYOUT_KEY)??'null');return v&&[v.size,v.right,v.top].every(Number.isFinite)?{size:v.size,right:v.right,top:v.top}:null;}catch{return null;}
};

// Geometry stays on the GPU. Only its translation and the live marker change per frame.
// Court-local ground tiles are shared with collision; actor elevation must not move the map marker.
export class Minimap extends Container {
 private geometry=new Graphics();
 private viewport=new Container();
 private clip=new Graphics();
 private frame=new Graphics();
 private marker=new Graphics();
 private mobileFrame:Sprite | undefined;
 private mobile=false;
 private mobileArrow:Sprite | undefined;
 private size=0;
 private pxPerTile=1;
 private last={x:NaN,y:NaN};
 private tile={u:0,v:0};
 private built='';
 private count=0;
 private obstacles=minimapObstacles();
 private route=new Graphics();
 private walk:Route|null=null;
 private drawnRoute='';
 // Desktop resize/move: four corner grips resize around the opposite corner, dragging the map moves it, and holding
 // Shift while resizing moves it instead, so one drag can do both.
 private grips=new Container();
 private custom:Custom|null=loadCustom();
 private screen={width:0,height:0};
 private suppressTap=false;
 // Tapping the minimap opens the full map (world-map.ts).
 onOpen?:()=>void;
 constructor(){
  super();this.eventMode='static';this.interactiveChildren=true;this.cursor='pointer';this.zIndex=9;
  this.on('pointertap',()=>{if(!this.suppressTap)this.onOpen?.();});
  this.on('pointerdown',e=>{this.suppressTap=false;if(!this.mobile)this.drag(e.clientX,e.clientY,0,0);});
  this.viewport.addChild(this.geometry,this.route);this.addChild(this.viewport,this.clip,this.frame,this.marker);this.viewport.mask=this.clip;
  this.marker.poly([0,-6,4.5,5,0,2.5,-4.5,5]).fill(0x50ecff).stroke({color:0x10282e,width:1.3});
  this.addChild(this.grips);
  for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
   const grip=new Graphics();grip.eventMode='static';grip.cursor=sx*sy>0?'nwse-resize':'nesw-resize';
   let lastTap=0;
   grip.on('pointerdown',e=>{e.stopPropagation();this.drag(e.clientX,e.clientY,sx,sy);});
   // Double-click a grip to return to the default size and place.
   grip.on('pointertap',e=>{e.stopPropagation();const now=performance.now();if(now-lastTap<400)this.resetLayout();lastTap=now;});
   (grip as Graphics&{sign:number[]}).sign=[sx,sy];this.grips.addChild(grip);
  }
 }
 // Left edge, top edge and size of the player's layout, clamped to the screen.
 private place(width:number,height:number,c:Custom){
  const size=Math.round(Math.max(MIN_SIZE,Math.min(c.size,width*.6,height*.85)));
  const left=Math.max(0,Math.min(width-size,width-size-c.right)),top=Math.max(0,Math.min(height-size,c.top));
  return {size,left,top};
 }
 resetLayout(){this.custom=null;try{localStorage.removeItem(LAYOUT_KEY);}catch{}}
 // One pointer drag from (x0,y0): sx,sy are the grip's corner (-1/+1), or 0,0 to move the whole map.
 private drag(x0:number,y0:number,sx:number,sy:number){
  // Keep a completed drag suppressed until the next press, regardless of Pixi's pointertap/up order.
  this.suppressTap=false;
  const {width,height}=this.screen;if(this.mobile||!width)return;
  const resize=sx!==0;let shift=false;
  const snap=(x:number,y:number)=>({...this.place(width,height,this.custom??{size:this.size,right:width-this.x-this.size,top:this.y}),x,y});
  let base=snap(x0,y0),moved=false;
  const last={x:x0,y:y0};
  const apply=(shiftKey:boolean)=>{
   if(shiftKey!==shift){shift=shiftKey;base=snap(last.x,last.y);}
   const dx=last.x-base.x,dy=last.y-base.y;
   if(Math.hypot(last.x-x0,last.y-y0)>4){moved=true;this.suppressTap=true;}
   if(!moved)return;
   let size=base.size,left=base.left,top=base.top;
   if(resize&&!shift){
    size=Math.round(Math.max(MIN_SIZE,Math.min(base.size+(sx*dx+sy*dy)/2,width*.6,height*.85)));
    // The opposite corner stays where it was, so the map drifts toward the grip as it grows.
    left=sx>0?base.left:base.left+base.size-size;top=sy>0?base.top:base.top+base.size-size;
   }else{left=base.left+dx;top=base.top+dy;}
   left=Math.max(0,Math.min(width-size,left));top=Math.max(0,Math.min(height-size,top));
   this.custom={size,right:width-left-size,top};
  };
  const track=(e:PointerEvent)=>{last.x=e.clientX;last.y=e.clientY;apply(e.shiftKey);};
  const key=(e:KeyboardEvent)=>{if(e.key==='Shift')apply(e.type==='keydown');};
  const end=()=>{
   removeEventListener('pointermove',track);removeEventListener('pointerup',end);removeEventListener('pointercancel',end);
   removeEventListener('keydown',key);removeEventListener('keyup',key);
   if(moved&&this.custom)try{localStorage.setItem(LAYOUT_KEY,JSON.stringify(this.custom));}catch{}
  };
  addEventListener('pointermove',track);addEventListener('pointerup',end);addEventListener('pointercancel',end);
  addEventListener('keydown',key);addEventListener('keyup',key);
 }
 private rebuild(built:Building[]){this.geometry.clear();this.count=drawMapGeometry(this.geometry,built,this.pxPerTile,this.obstacles);}
 updateMap(world:{x:number;y:number},width:number,height:number,telemetryBottom:number,built:Building[]){
  const mobile=width<1024,safe=mobileHudLayout(width);
  const desktop=desktopNavigationLayout(width,height);this.screen={width,height};
  const mine=!mobile&&this.custom?this.place(width,height,this.custom):null;
  const size=mine?mine.size:mobile?safe.mapSize:desktop.width;
  const top=mine?mine.top:mobile?safe.mapY:Math.ceil(telemetryBottom+desktop.gap),right=mine?width-mine.left-size:mobile?safe.right+8:desktop.right;
  if(!this.mobileFrame){const texture=Assets.get('/mobile-hud/v1/map-frame.png');if(texture){this.mobileFrame=this.addChild(new Sprite(texture));this.setChildIndex(this.mobileFrame,this.children.length-2);}}
  if(this.mobileFrame){this.mobileFrame.visible=mobile;this.mobileFrame.width=size+4;this.mobileFrame.height=size+4;this.mobileFrame.position.set(-2,-2);}
  this.frame.alpha=mobile?.42:1;
  if(!this.mobileArrow){const texture=Assets.get('/mobile-hud/v1/arrow.png');if(texture){this.mobileArrow=this.addChild(new Sprite(texture));this.mobileArrow.anchor.set(.5);this.mobileArrow.width=12;this.mobileArrow.height=15;}}
  if(this.mobileArrow)this.mobileArrow.visible=mobile;
  this.marker.visible=!mobile||!this.mobileArrow;
  this.visible=mine?true:top+size<height*.65;
  this.grips.visible=!mobile;
  if(size!==this.size||mobile!==this.mobile){
   this.mobile=mobile;
   this.size=size;this.pxPerTile=(size-14)/32;this.built='';
   this.clip.clear().roundRect(2,2,size-4,size-4,8).fill(0xffffff);
   this.frame.clear().roundRect(0,0,size,size,9).fill({color:0x172127,alpha:mobile?.045:.16}).stroke({color:0xd8b66b,width:1,alpha:.95});
   this.frame.roundRect(3,3,size-6,size-6,7).stroke({color:0xd8b66b,width:.5,alpha:.45});
   // North points up in the same ground-plane orientation as the game.
   this.frame.moveTo(size/2-3,10).lineTo(size/2,5).lineTo(size/2+3,10).stroke({color:0xf2d590,width:1});
   this.geometry.scale.set(this.pxPerTile);this.route.scale.set(this.pxPerTile);
   this.hitArea=new Rectangle(0,0,size,size);this.drawnRoute='';
   for(const g of this.grips.children as (Graphics&{sign:number[]})[]){
    const [sx,sy]=g.sign,cx=sx<0?0:size,cy=sy<0?0:size;
    g.clear().rect(cx-(sx<0?0:CORNER),cy-(sy<0?0:CORNER),CORNER,CORNER).fill({color:0xffffff,alpha:.001});
    // A small notch tucked into the corner shows where to grab.
    const ax=cx-sx*4,ay=cy-sy*4;
    g.moveTo(ax-sx*7,ay).lineTo(ax,ay).lineTo(ax,ay-sy*7).stroke({color:0xf2d590,width:1.2,alpha:.8});
   }
  }
  this.position.set(width-size-right,top);
  const key=built.join(',');if(key!==this.built){this.built=key;this.rebuild(built);}
  const t=unproject(world.x-COURT.x,world.y-COURT.y);this.tile={u:t.x,v:t.y};
  const p=project(t.x,t.y),k=this.pxPerTile/64;
  this.geometry.position.set(size/2-p.x*k,size/2-p.y*k);this.route.position.copyFrom(this.geometry.position);
  this.drawRoute(world);
  this.marker.position.set(size/2,size/2);
  const dx=world.x-this.last.x,dy=world.y-this.last.y;
  if(Number.isFinite(dx)&&Math.hypot(dx,dy)>.05)this.marker.rotation=Math.atan2(dy,dx)+Math.PI/2;
  if(this.mobileArrow){this.mobileArrow.position.copyFrom(this.marker.position);this.mobileArrow.rotation=this.marker.rotation;}
  this.last={...world};
 }
 setRoute(r:Route|null){this.walk=r;this.drawnRoute='';}
 // The tap-to-walk route still ahead of the hero, and its end flag.
 private drawRoute(world:{x:number;y:number}){
  const r=this.walk,key=r?`${Math.round(world.x/4)},${Math.round(world.y/4)},${r.next},${r.points.length}`:'';
  if(key===this.drawnRoute)return;this.drawnRoute=key;
  const g=this.route;g.clear();if(!r)return;
  const z=this.pxPerTile,u=(x:number,y:number)=>[(x-COURT.x)/64,(y-COURT.y)/64];
  g.poly([...u(world.x,world.y),...r.points.slice(r.next).flatMap(p=>u(p.x,p.y))],false).stroke({color:0x50ecff,width:1.6/z,alpha:.85});
  const [tx,ty]=u(r.target.x,r.target.y);g.circle(tx,ty,3.2/z).fill(0xf2d590).stroke({color:0x10282e,width:1/z});
 }
 snapshot(){return {route:this.walk&&{target:this.walk.target,points:this.walk.points.length,next:this.walk.next},visible:this.visible,bounds:{x:this.x,y:this.y,width:this.size,height:this.size},tile:this.tile,mapTile:{u:this.tile.u+STRONGHOLD_ORIGIN.u,v:this.tile.v+STRONGHOLD_ORIGIN.v},geometryCount:this.count,obstacles:this.obstacles,pxPerTile:this.pxPerTile,marker:{x:this.size/2,y:this.size/2,rotation:this.marker.rotation}};}
}
