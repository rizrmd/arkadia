import {Application,Assets,Container,Graphics,Rectangle,Sprite,Text,Texture} from 'pixi.js';
import {RiftDashVfx} from './rift-dash-vfx';
const app=new Application();await app.init({resizeTo:window,backgroundColor:0x080d19,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});document.body.appendChild(app.canvas);
const scene=app.stage.addChild(new Container()),ui=app.stage.addChild(new Container()),grid=scene.addChild(new Graphics()),aim=scene.addChild(new Graphics());
const base=import.meta.env.BASE_URL;
const art=await RiftDashVfx.load(base+"vfx/");scene.addChild(art.root);
const sheet=await Assets.load<Texture>(base+"actors/rift-runner-run.webp");
const actor=scene.addChild(new Sprite());actor.anchor.set(.5,360/384);
const frames=Array.from({length:5},(_,r)=>Array.from({length:8},(_,c)=>new Texture({source:sheet.source,frame:new Rectangle(c*384,r*384,384,384)})));
let playing=true,time=0,direction=1,speed=1,lastPose=-1;const labels:Record<string,Text>={};const faces:Record<string,Graphics>={};const dirs=['N','NE','E','SE','S','SW','W','NW'];
const buttons:Record<string,{x:number;y:number;w:number;h:number}>={};
function text(value:string,x:number,y:number,size=14,color=0xcdd9ed){const t=ui.addChild(new Text({text:value,style:{fontFamily:'Georgia',fontSize:size,fill:color}}));t.position.set(x,y);return t;}
function button(label:string,x:number,y:number,w:number,action:()=>void,selected=false){const c=ui.addChild(new Container()),g=c.addChild(new Graphics());g.roundRect(0,0,w,40,7).fill(selected?0x364054:0x141d2e).stroke({color:0xcaa652,width:selected?2:1});const t=c.addChild(new Text({text:label,style:{fontFamily:'Georgia',fontSize:14,fill:0xf6dfaa}}));labels[label]=t;faces[label]=g;t.anchor.set(.5);t.position.set(w/2,20);c.position.set(x,y);c.eventMode='static';c.cursor='pointer';c.hitArea=new Rectangle(0,0,w,40);c.on('pointerdown',action);buttons[label]={x,y,w,h:40};}
function layout(){for(const k of Object.keys(labels))delete labels[k];for(const k of Object.keys(faces))delete faces[k];for(const c of ui.removeChildren())c.destroy({children:true});for(const k of Object.keys(buttons))delete buttons[k];const w=innerWidth,h=innerHeight,p=16,compact=w<600;
 text('RIFT DASH',p,14,24,0xf1d391);text('Generated VFX · Pixi player',p,44,13);text(compact?'Drag stage to aim · release to dash':'Drag stage to aim · release to dash · Space to replay',p,65,12,0x94a4bc);
 const y=h-(compact?222:166),gap=8,bw=(w-2*p-gap*2)/3;
 button(playing?'Pause':'Play',p,y,bw,()=>{playing=!playing;});button('Replay',p+bw+gap,y,bw,()=>{time=0;playing=true;});button(speed===1?'Slow ×0.35':'Speed ×1',p+(bw+gap)*2,y,bw,()=>{speed=speed===1?.35:1;});
 const phases:[string,number][]=[['Departure',80],['Travel',220],['Arrival',420],['Dissipate',820]];phases.forEach(([name,ms],i)=>button(name,p+i*(w-2*p+6)/4,y+48,(w-2*p-18)/4,()=>{time=ms;playing=false;}));
 const cols=compact?4:8,dw=(w-2*p-(cols-1)*6)/cols;dirs.forEach((name,i)=>button(name,p+(i%cols)*(dw+6),y+96+Math.floor(i/cols)*46,dw,()=>{direction=i;lastPose=-1;},direction===i));
}
function geometry(){const w=innerWidth,h=innerHeight,ymax=h-(w<600?222:166),s=Math.max(.45,Math.min(1.5,w/650,(ymax-90)/250));const a=direction*Math.PI/4-Math.PI/2,dx=Math.cos(a)*160*s,dy=Math.sin(a)*105*s,c={x:w/2,y:90+(ymax-90)/2+30*s};return {from:{x:c.x-dx/2,y:c.y-dy/2},to:{x:c.x+dx/2,y:c.y+dy/2},s};}
function capture(){const r=direction<=4?direction:8-direction;actor.texture=frames[r][1];actor.scale.x=direction>4?-1:1;const canvas=document.createElement('canvas');canvas.width=384;canvas.height=384;const image=sheet.source.resource as HTMLImageElement;const ctx=canvas.getContext('2d')!;if(direction>4){ctx.translate(384,0);ctx.scale(-1,1);}ctx.drawImage(image,384,r*384,384,384,0,0,384,384);const {from,to,s}=geometry();art.cast(from,to,s,canvas);lastPose=direction;}
let aimPointer:number|null=null,aimStart={x:0,y:0};
function setAim(e:PointerEvent){const dx=e.clientX-aimStart.x,dy=e.clientY-aimStart.y;if(Math.hypot(dx,dy)<12)return;const angle=Math.atan2(dy/105,dx/160);direction=((Math.round((angle+Math.PI/2)/(Math.PI/4))%8)+8)%8;lastPose=-1;}
app.canvas.addEventListener('pointerdown',e=>{const bottom=innerHeight-(innerWidth<600?222:166);if(e.clientY<90||e.clientY>=bottom||aimPointer!==null)return;aimPointer=e.pointerId;aimStart={x:e.clientX,y:e.clientY};app.canvas.setPointerCapture(e.pointerId);playing=false;time=0;setAim(e);});
app.canvas.addEventListener('pointermove',e=>{if(aimPointer===e.pointerId)setAim(e);});
app.canvas.addEventListener('pointerup',e=>{if(aimPointer!==e.pointerId)return;setAim(e);aimPointer=null;time=0;playing=true;});
app.canvas.addEventListener('pointercancel',()=>{aimPointer=null;});
window.addEventListener('blur',()=>{aimPointer=null;});
window.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();time=0;playing=true;}});
layout();window.addEventListener('resize',()=>{aimPointer=null;lastPose=-1;layout();});
app.ticker.add(t=>{const play=labels.Pause??labels.Play;if(play)play.text=playing?'Pause':'Play';const slow=labels['Slow ×0.35']??labels['Speed ×1'];if(slow)slow.text=speed===1?'Slow ×0.35':'Speed ×1';for(const [i,d]of dirs.entries())if(faces[d])faces[d].tint=i===direction?0xffffff:0x8c9bae;if(playing)time=(time+t.deltaMS*speed)%1500;if(lastPose!==direction)capture();const {from,to,s}=geometry();grid.clear();const gy=innerHeight-(innerWidth<600?222:166);for(let x=-innerHeight;x<innerWidth+innerHeight;x+=60)grid.moveTo(x,90).lineTo(x+gy,gy).stroke({color:0x1d2c42,width:1});for(let x=0;x<innerWidth+innerHeight;x+=60)grid.moveTo(x,90).lineTo(x-gy,gy).stroke({color:0x1d2c42,width:1});
 aim.clear().ellipse(from.x,from.y,160*s,105*s).stroke({color:0x7661af,width:1,alpha:.35}).moveTo(from.x,from.y).lineTo(to.x,to.y).stroke({color:0x68e8ff,width:2,alpha:.5}).circle(to.x,to.y,5).fill(0xe4d599);
 const aa=Math.atan2(to.y-from.y,to.x-from.x);aim.moveTo(to.x-13*Math.cos(aa-.45),to.y-13*Math.sin(aa-.45)).lineTo(to.x,to.y).lineTo(to.x-13*Math.cos(aa+.45),to.y-13*Math.sin(aa+.45)).stroke({color:0x68e8ff,width:2});
 art.render(time,from,to,s);const progress=Math.min(1,Math.max(0,(time-60)/180));actor.position.set(from.x+(to.x-from.x)*progress,from.y+(to.y-from.y)*progress);actor.width=110*s;actor.height=110*s;if(direction>4)actor.scale.x=-Math.abs(actor.scale.x);actor.alpha=1;
});
(window as any).__RIFT_DASH_PLAYER__={snapshot:()=>({ready:true,aimDragging:aimPointer!==null,actorPosition:{x:actor.x,y:actor.y},time,playing,direction:dirs[direction],speed,buttons:{...buttons},art:art.snapshot(),pixi:true,geometry:geometry()})};
