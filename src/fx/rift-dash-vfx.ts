import {renderSpriteVisual,visualPatch} from './visuals';
import {Assets,Container,Rectangle,Sprite,Texture} from 'pixi.js';
type Point={x:number;y:number};
/** Generated-art renderer shared by gameplay and the Pixi inspection player. */
export class RiftDashVfx{
 readonly root=new Container();private departure:Sprite;private arrival:Sprite;private trail:Sprite;private sparks:Sprite[]=[];private ghosts:Sprite[]=[];private ghostTexture?:Texture;
 private sheets:Record<string,Texture[]>={};private from:Point={x:0,y:0};private to:Point={x:0,y:0};private scale=1;private started=-Infinity;
 private constructor(textures:Texture[]){
  this.root.eventMode='none';
  for(const [j,name] of ['departure','arrival','particles'].entries())this.sheets[name]=Array.from({length:16},(_,i)=>new Texture({source:textures[j].source,frame:new Rectangle(i%4*256,Math.floor(i/4)*256,256,256)}));
  this.trail=this.root.addChild(new Sprite(textures[3]));this.trail.anchor.set(0,.5);
  this.departure=this.root.addChild(new Sprite(this.sheets.departure[0]));this.departure.anchor.set(.5);
  for(let i=0;i<20;i++){const s=this.root.addChild(new Sprite());s.anchor.set(.5,1);s.tint=i%2?0x8e71ff:0x60ddff;this.ghosts.push(s);}
  this.arrival=this.root.addChild(new Sprite(this.sheets.arrival[0]));this.arrival.anchor.set(.5);
  for(let i=0;i<48;i++){const s=this.root.addChild(new Sprite(this.sheets.particles[i%16]));s.anchor.set(.5);this.sparks.push(s);}
  this.root.visible=false;
 }
 static async load(base="/rift-dash/v2/"){return new RiftDashVfx(await Promise.all(['departure','arrival','particles','trail'].map(n=>Assets.load<Texture>(`${base}${n}.webp`))));}
 warmGpu(renderer?:{texture?:{initSource?:(source:any)=>void}}){
  const sources=new Set([this.trail.texture.source,...Object.values(this.sheets).map(frames=>frames[0].source)]);
  for(const source of sources){source.autoGarbageCollect=false;renderer?.texture?.initSource?.(source);}
 }
 cast(from:Point,to:Point,scale:number,canvas?:HTMLCanvasElement,now=performance.now()){
  this.from=from;this.to=to;this.scale=scale;this.started=now;
  this.ghostTexture?.destroy(true);this.ghostTexture=undefined;
  if(canvas&&canvas.width&&canvas.height){const copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;copy.getContext('2d')!.drawImage(canvas,0,0);this.ghostTexture=Texture.from(copy);for(const s of this.ghosts)s.texture=this.ghostTexture;}
 }
 update(now:number,from=this.from,to=this.to,scale=this.scale){this.render(now-this.started,from,to,scale);}
 render(ms:number,from:Point,to:Point,scale=1){
  const age=ms/1000,local=(layer:string)=>(ms-(visualPatch('runtime/rift-dash',layer).delay??0)*1000)/(visualPatch('runtime/rift-dash',layer).lifetime??1);
  const end=Math.max(...['departure','arrival','trail','ghosts','particles'].map(id=>(visualPatch('runtime/rift-dash',id).delay??0)*1000+1100*(visualPatch('runtime/rift-dash',id).lifetime??1)));
  this.root.visible=ms>=0&&ms<end;if(!this.root.visible)return;
  const dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx),fade=(t:number)=>Math.max(0,1-t/1100),d=local('departure'),a=local('arrival'),tr=local('trail'),g=local('ghosts'),p=local('particles');
  this.departure.visible=d>=0&&d<480;this.departure.texture=this.sheets.departure[Math.max(0,Math.min(15,Math.floor(d/30)))];this.departure.position.set(from.x,from.y-16*scale);this.departure.width=118*scale;this.departure.height=100*scale;this.departure.alpha=fade(d);
  this.arrival.visible=a>=260&&a<1100;this.arrival.texture=this.sheets.arrival[Math.max(0,Math.min(15,Math.floor((a-260)/45)))];this.arrival.position.set(to.x,to.y-18*scale);this.arrival.width=130*scale;this.arrival.height=112*scale;this.arrival.alpha=fade(a);
  this.trail.visible=tr>=0&&tr<1100;this.trail.position.set(from.x,from.y-28*scale);this.trail.rotation=angle;this.trail.width=len*Math.min(1,Math.max(0,tr)/260)+20*scale;this.trail.height=68*scale;this.trail.alpha=Math.min(1,Math.max(0,tr)/90)*fade(tr);
  const ghostCount=Math.min(20,Math.ceil(5*(visualPatch('runtime/rift-dash','ghosts').count??1))),particleCount=Math.min(48,Math.ceil(12*(visualPatch('runtime/rift-dash','particles').count??1)));
  this.ghosts.forEach((s,i)=>{const t=(i+1)/(ghostCount+1);s.visible=i<ghostCount&&!!this.ghostTexture&&g>t*260&&g<1100;s.position.set(from.x+dx*t,from.y+dy*t);s.height=100*scale;s.width=s.texture.width/Math.max(1,s.texture.height)*s.height;s.alpha=fade(g)*(.12+i/Math.max(1,ghostCount)*.225);renderSpriteVisual('runtime/rift-dash','ghosts',s,age,scale);});
  this.sparks.forEach((s,i)=>{const t=i/Math.max(1,particleCount);s.visible=i<particleCount&&p>=t*260&&p<1100;const travel=p*.025*scale*(visualPatch('runtime/rift-dash','particles').speed??1),side=i%2?1:-1;s.position.set(from.x+dx*t-Math.sin(angle)*side*travel,from.y+dy*t-22*scale+Math.cos(angle)*side*travel);s.width=s.height=(14+i%3*5)*scale;s.rotation=angle+p*.001;s.alpha=fade(p)*.8;renderSpriteVisual('runtime/rift-dash','particles',s,age,scale);});
  renderSpriteVisual('runtime/rift-dash','departure',this.departure,age,scale);renderSpriteVisual('runtime/rift-dash','arrival',this.arrival,age,scale);renderSpriteVisual('runtime/rift-dash','trail',this.trail,age,scale);
 }

 snapshot(){return {generated:true,arrivalVisible:this.root.visible&&this.arrival.visible,trailRotation:this.trail.rotation,active:this.root.visible,ghosts:this.ghosts.filter(s=>s.visible).length,particles:this.sparks.filter(s=>s.visible).length};}
}
