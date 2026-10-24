import {Container,Graphics,Rectangle} from 'pixi.js';
import type {FrameSet} from '../typography/frames';
import {MsdfText} from '../typography/text';
import {drawMapGeometry,minimapObstacles} from './minimap';
import {COURT} from './terrain';
import {MAP_CORNERS,type Route} from './auto-walk';
import {MAP,STRONGHOLD_ORIGIN as O} from '../world/map';
import {project,unproject} from '../isometric';
import type {Building} from './economy';

type Pt={x:number;y:number};
const HEADER=54,FOOTER=50,INSET=14,TAP=8,METERS_PER_PX=MAP.metersPerTile/Math.hypot(64,32);
// Units are the minimap's: (world px - COURT) / 64. z is screen px per unit.
const unit=(p:Pt)=>({x:(p.x-COURT.x)/64,y:(p.y-COURT.y)/64});

// The full map, opened by tapping the minimap (or M). Drag (or a second finger) pans, scroll or pinch zooms,
// and a tap walks the hero there (auto-walk.ts). The world keeps running behind it.
export class WorldMap extends Container {
 private shade=new Graphics();
 private panel=new Container();
 private art:Container|undefined;
 private view=new Container();
 private clip=new Graphics();
 private content=new Container();
 private ground=new Graphics();
 private geometry=new Graphics();
 private overlay=new Graphics();
 private title=new MsdfText('panel-title','World Map',{size:15});
 private readout=new MsdfText('panel-muted','',{size:13});
 private hint=new MsdfText('panel-muted','',{size:12.5});
 private courtLabel=new MsdfText('panel-label','Stronghold',{size:11});
 private buttons:{box:Container;w:number}[]=[];
 private obstacles=minimapObstacles();
 private w=0;private h=0;private vw=0;private vh=0;
 private cam:Pt={x:0,y:0};
 private z=8;private drawnZ=0;private drawnBuilt='';
 private follow=true;
 private pointers=new Map<number,Pt>();
 private press:{x:number;y:number;moved:boolean;id:number}|null=null;
 private pinch=0;
 private last:Pt={x:NaN,y:NaN};private heading=0;
 private notice='';private noticeUntil=0;
 private frame=0;
 constructor(private frames:FrameSet,private o:{hero:()=>Pt;built:()=>Building[];route:()=>Route|null;walk:(x:number,y:number)=>boolean}){
  super();
  this.zIndex=45;this.visible=false;this.eventMode='static';
  // The shade swallows every tap outside the panel, so the world below neither pans nor opens the stick; a tap on it closes.
  this.shade.eventMode='static';this.shade.on('pointertap',()=>this.open(false));
  this.panel.eventMode='static';
  this.view.eventMode='static';this.view.cursor='crosshair';
  this.content.addChild(this.ground,this.geometry);
  this.view.addChild(this.clip,this.content,this.overlay,this.courtLabel);this.content.mask=this.clip;
  this.addChild(this.shade,this.panel);
  this.panel.addChild(this.view,this.title,this.readout,this.hint);
  this.button(36,(g,w)=>{g.moveTo(w/2-6,10).lineTo(w/2+6,22).moveTo(w/2+6,10).lineTo(w/2-6,22).stroke({color:0xf2d590,width:2});},()=>this.open(false));
  this.button(36,(g,w)=>{g.moveTo(w/2-7,16).lineTo(w/2+7,16).stroke({color:0xf2d590,width:2});},()=>this.zoomAt(1/1.5));
  this.button(36,(g,w)=>{g.moveTo(w/2-7,16).lineTo(w/2+7,16).moveTo(w/2,9).lineTo(w/2,23).stroke({color:0xf2d590,width:2});},()=>this.zoomAt(1.5));
  this.button(36,(g,w)=>{g.circle(w/2,16,6).stroke({color:0xf2d590,width:1.6});g.circle(w/2,16,2).fill(0xf2d590);for(const [a,b,c,d] of [[0,4,0,8],[0,-4,0,-8],[4,0,8,0],[-4,0,-8,0]])g.moveTo(w/2+a,16+b).lineTo(w/2+c,16+d).stroke({color:0xf2d590,width:1.6});},()=>{this.follow=true;});
  this.view.on('pointerdown',e=>{
   const p={x:e.global.x,y:e.global.y};this.pointers.set(e.pointerId,p);
   if(this.pointers.size===1)this.press={...p,moved:false,id:e.pointerId};
   else{if(this.press)this.press.moved=true;this.pinch=this.spread();}
  });
  addEventListener('pointermove',e=>{
   const prev=this.pointers.get(e.pointerId);if(!prev||!this.visible)return;
   const p={x:e.clientX,y:e.clientY};this.pointers.set(e.pointerId,p);
   if(this.pointers.size>=2){
    const s=this.spread(),m=this.middle();if(this.pinch>0&&s>0)this.zoomAt(s/this.pinch,m);this.pinch=s;
    this.pan(p.x-prev.x,p.y-prev.y,.5);return;
   }
   if(this.press&&Math.hypot(p.x-this.press.x,p.y-this.press.y)>TAP)this.press.moved=true;
   if(this.press?.moved)this.pan(p.x-prev.x,p.y-prev.y);
  });
  const up=(e:PointerEvent)=>{
   if(!this.pointers.delete(e.pointerId))return;
   if(this.pointers.size<2)this.pinch=0;
   const press=this.press;if(press?.id!==e.pointerId)return;this.press=null;
   if(!press.moved&&this.visible&&this.inView(e.clientX,e.clientY))this.tap(e.clientX,e.clientY);
  };
  addEventListener('pointerup',up);
  addEventListener('pointercancel',e=>{this.pointers.delete(e.pointerId);this.press=null;this.pinch=0;});
  addEventListener('wheel',e=>{if(!this.visible||!this.inView(e.clientX,e.clientY))return;e.preventDefault();this.zoomAt(Math.exp(-e.deltaY*.0015),{x:e.clientX,y:e.clientY});},{passive:false});
  addEventListener('keydown',e=>{
   const t=e.target;if(t instanceof HTMLElement&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))||e.ctrlKey||e.metaKey||e.altKey)return;
   if(e.code==='KeyM'){e.preventDefault();this.open(!this.visible);}
   else if(e.key==='Escape'&&this.visible){e.preventDefault();this.open(false);}
  });
  addEventListener('resize',()=>{if(this.visible)this.layout();});
 }
 isOpen(){return this.visible;}
 open(v:boolean){
  if(v===this.visible)return;
  this.visible=v;this.pointers.clear();this.press=null;this.pinch=0;
  cancelAnimationFrame(this.frame);
  if(!v)return;
  this.follow=true;this.layout();this.z=this.defaultZoom();this.notice='';
  const tick=()=>{if(!this.visible)return;this.update();this.frame=requestAnimationFrame(tick);};tick();
 }
 toggle(){this.open(!this.visible);}
 private button(w:number,draw:(g:Graphics,w:number)=>void,tap:()=>void){
  const box=new Container();box.eventMode='static';box.cursor='pointer';box.hitArea=new Rectangle(0,0,w,32);
  box.addChild(this.frames.frame('button-bronze',w,32));draw(box.addChild(new Graphics()),w);
  box.on('pointertap',e=>{e.stopPropagation();tap();});
  this.panel.addChild(box);this.buttons.push({box,w});
 }
 private layout(){
  const W=innerWidth,H=innerHeight,m=W<1024?8:24;
  this.w=Math.min(W-m*2,1180);this.h=Math.min(H-m*2,820);
  this.shade.clear().rect(0,0,W,H).fill({color:0x05080a,alpha:.62});
  this.panel.position.set(Math.round((W-this.w)/2),Math.round((H-this.h)/2));
  this.panel.hitArea=new Rectangle(0,0,this.w,this.h);
  this.art?.destroy();this.art=this.panel.addChildAt(this.frames.frame('panel-bronze',this.w,this.h),0);
  this.vw=this.w-INSET*2;this.vh=this.h-HEADER-FOOTER;
  this.view.position.set(INSET,HEADER);this.view.hitArea=new Rectangle(0,0,this.vw,this.vh);
  this.clip.clear().roundRect(0,0,this.vw,this.vh,8).fill(0xffffff);
  this.title.place(22,35);
  const [close,...zoom]=this.buttons;
  close.box.position.set(this.w-INSET-close.w,12);
  let x=this.w-INSET;for(const b of [...zoom].reverse()){x-=b.w;b.box.position.set(x,this.h-FOOTER+9);x-=8;}
  this.hint.text=this.w<560?'Drag to pan · Tap to walk':'Drag to pan · Tap to walk there · Scroll or pinch to zoom';
  this.hint.place(22,this.h-FOOTER+30);
  this.z=Math.min(this.maxZoom(),Math.max(this.minZoom(),this.z));this.drawnZ=0;
 }
 private defaultZoom(){return Math.min(this.maxZoom(),Math.max(this.minZoom(),Math.max(this.vw,this.vh)/70));}
 // From the whole map in view, out of its corners, to about 12 units across.
 private minZoom(){return Math.min(this.vw/(MAP.sizeTiles*2),this.vh/MAP.sizeTiles)*.92;}
 private maxZoom(){return Math.max(this.vw,this.vh)/12;}
 private spread(){const [a,b]=[...this.pointers.values()];return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;}
 private middle(){const [a,b]=[...this.pointers.values()];return {x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
 private inView(x:number,y:number){const p=this.view.toLocal({x,y});return p.x>=0&&p.y>=0&&p.x<=this.vw&&p.y<=this.vh;}
 private toWorld(sx:number,sy:number):Pt{const p=this.view.toLocal({x:sx,y:sy});return {x:this.cam.x+(p.x-this.vw/2)*64/this.z,y:this.cam.y+(p.y-this.vh/2)*64/this.z};}
 private toView(w:Pt):Pt{return {x:this.vw/2+(w.x-this.cam.x)*this.z/64,y:this.vh/2+(w.y-this.cam.y)*this.z/64};}
 private pan(dx:number,dy:number,k=1){this.follow=false;this.cam={x:this.cam.x-dx*k*64/this.z,y:this.cam.y-dy*k*64/this.z};this.clampCam();}
 private zoomAt(f:number,at?:Pt){
  const before=at&&this.toWorld(at.x,at.y);
  this.z=Math.min(this.maxZoom(),Math.max(this.minZoom(),this.z*f));
  if(before&&at){const after=this.toWorld(at.x,at.y);this.cam={x:this.cam.x+before.x-after.x,y:this.cam.y+before.y-after.y};this.follow=false;}
  this.clampCam();
 }
 // The view centre stays on the map's ground square; once the whole map fits, it sits in the middle.
 private clampCam(){
  if(this.z<=this.minZoom()/.92+1e-9){const [a,,c]=MAP_CORNERS;this.cam={x:(a.x+c.x)/2,y:(a.y+c.y)/2};return;}
  const top=MAP_CORNERS[0],t=unproject(this.cam.x-top.x,this.cam.y-top.y),n=MAP.sizeTiles;
  const u=Math.max(0,Math.min(n,t.x)),v=Math.max(0,Math.min(n,t.y));
  if(u!==t.x||v!==t.y){const p=project(u,v);this.cam={x:top.x+p.x,y:top.y+p.y};}
 }
 private tap(sx:number,sy:number){
  const w=this.toWorld(sx,sy),ok=this.o.walk(w.x,w.y);
  this.notice=ok?'':'No path there';this.noticeUntil=performance.now()+1800;
 }
 private rebuild(built:Building[]){
  const z=this.z,g=this.ground,n=MAP.sizeTiles,o=O,chunk=MAP.chunkTiles;
  g.clear().poly(MAP_CORNERS.flatMap(p=>{const q=unit(p);return [q.x,q.y];})).fill(0x1d2a31);
  // Chunk lines (24 tiles) give the eye something to hold while dragging across open snow.
  for(let t=chunk;t<n;t+=chunk){
   const a=project(t-o.u,-o.v),b=project(t-o.u,n-o.v),c=project(-o.u,t-o.v),d=project(n-o.u,t-o.v);
   g.moveTo(a.x/64,a.y/64).lineTo(b.x/64,b.y/64).moveTo(c.x/64,c.y/64).lineTo(d.x/64,d.y/64);
  }
  g.stroke({color:0xd8b66b,width:1/z,alpha:.1});
  this.geometry.clear();drawMapGeometry(this.geometry,built,z,this.obstacles);
  this.drawnZ=z;
 }
 private update(){
  const hero=this.o.hero(),route=this.o.route(),built=this.o.built(),key=built.join();
  if(this.follow)this.cam={...hero};
  // Line widths follow the zoom; redraw once it has moved by a tenth.
  if(!this.drawnZ||Math.abs(this.z/this.drawnZ-1)>.1||key!==this.drawnBuilt){this.drawnBuilt=key;this.rebuild(built);}
  const z=this.z,c=unit(this.cam);
  this.content.scale.set(z);this.content.position.set(this.vw/2-c.x*z,this.vh/2-c.y*z);
  const g=this.overlay.clear();
  if(route){
   const pts=[hero,...route.points.slice(route.next)].map(p=>this.toView(p));
   g.poly(pts.flatMap(p=>[p.x,p.y]),false).stroke({color:0x50ecff,width:2.4,alpha:.9});
   const t=this.toView(route.target);
   g.moveTo(t.x,t.y).lineTo(t.x,t.y-18).stroke({color:0xf2d590,width:2});
   g.poly([t.x,t.y-18,t.x+11,t.y-14,t.x,t.y-10]).fill(0xf2d590).stroke({color:0x10282e,width:1});
   g.ellipse(t.x,t.y,5,2.5).stroke({color:0xf2d590,width:1.4});
  }
  const dx=hero.x-this.last.x,dy=hero.y-this.last.y;
  if(Number.isFinite(dx)&&Math.hypot(dx,dy)>.05)this.heading=Math.atan2(dy,dx)+Math.PI/2;this.last={...hero};
  const h=this.toView(hero),s=Math.sin(this.heading),k=Math.cos(this.heading),pt=(x:number,y:number)=>[h.x+x*k-y*s,h.y+x*s+y*k];
  g.circle(h.x,h.y,11).fill({color:0x50ecff,alpha:.16});
  g.poly([...pt(0,-9),...pt(7,7),...pt(0,3.5),...pt(-7,7)]).fill(0x50ecff).stroke({color:0x10282e,width:1.5});
  const mid=project(COURT.size/2,COURT.size/2),court=this.toView({x:COURT.x+mid.x,y:COURT.y+mid.y});
  // Above the court's north corner: the gateway, where routes leave the court, stays clear.
  this.courtLabel.place(court.x,court.y-z*COURT.size*.5-8,.5);
  const tile=unproject(hero.x-COURT.x,hero.y-COURT.y),u=tile.x+O.u,v=tile.y+O.v;
  const left=route?Math.hypot(route.target.x-hero.x,route.target.y-hero.y)*METERS_PER_PX:0;
  const notice=performance.now()<this.noticeUntil?this.notice:'';
  this.readout.text=notice||(route?`Walking · ${Math.round(left)} m to go`:`You · ${Math.floor(u)}, ${Math.floor(v)}`);
  this.readout.place(this.w-INSET-this.buttons[0].w-14,35,1);
 }
 snapshot(){return {open:this.visible,zoom:this.z,minZoom:this.minZoom(),maxZoom:this.maxZoom(),camera:{...this.cam},follow:this.follow,view:{x:this.panel.x+INSET,y:this.panel.y+HEADER,width:this.vw,height:this.vh}};}
 // For tests: the screen point (CSS px) of a world foot in the open map.
 screenOf(p:Pt){const v=this.toView(p);return {x:this.panel.x+INSET+v.x,y:this.panel.y+HEADER+v.y};}
}
