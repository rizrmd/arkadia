import {Application,Assets,Container,Graphics,Rectangle,Sprite,Text,Texture} from 'pixi.js';
const app=new Application();await app.init({resizeTo:window,background:0x121722,antialias:true,resolution:Math.min(devicePixelRatio,2),autoDensity:true});document.body.appendChild(app.canvas);
const base=import.meta.env.BASE_URL,manifest=await fetch(base+'artifacts/manifest.json').then(r=>r.json());
let level=1,playing=true,time=0,loading=false,speed=1,scaleMode=false,token=0,frames:Texture[]=[],images:string[]=[],size={w:320,h:180},variant='mobile';
const root=new Container(),controls=new Container(),sprite=new Sprite(),floor=new Graphics(),pivot=new Graphics();app.stage.addChild(root);root.addChild(floor,sprite,pivot);app.stage.addChild(controls);
const label=(text:string,size=16,color=0xe3e9f4)=>new Text({text,style:{fontFamily:'Arial',fontSize:size,fill:color,wordWrap:true,wordWrapWidth:Math.max(280,innerWidth-32)}});
const title=label('Houdini Flame Fan · Lv1–Lv5',22),note=label('APPRENTICE · NONCOMMERCIAL EXPERIMENT',13,0xffbf6b),status=label('',14),detail=label('',13,0xa9bad3),help=label('Fixed east view · pivot + range guides · raw watermark retained\nVisual quality and physical-device performance are not approved.',12,0xa9bad3);
app.stage.addChild(title,note,status,detail,help);
const buttons:{name:string,x:number,y:number,w:number,h:number}[]=[];
function button(name:string,x:number,y:number,w:number,fn:()=>void){const c=new Container(),g=new Graphics().roundRect(0,0,w,34,7).fill(0x2c3b52),t=label(name,14);t.position.set(9,8);c.addChild(g,t);c.position.set(x,y);c.eventMode='static';c.cursor='pointer';c.on('pointertap',fn);controls.addChild(c);buttons.push({name,x,y,w,h:34});}
async function load(){const id=++token;loading=true;status.text='Loading experimental atlas…';const v=manifest.levels[level-1].variants[variant];
 try{const sheets=await Promise.all(v.pages.map((p:{json:string})=>fetch(base+'artifacts/'+p.json).then(r=>r.json()))),urls=sheets.map(s=>base+'artifacts/'+s.meta.image),textures=await Promise.all(urls.map(u=>Assets.load<Texture>(u)));
 if(id!==token)return;const oldFrames=frames,oldImages=images;frames=[];images=urls;
 sheets.forEach((s,idx)=>Object.values(s.frames).forEach((f:any)=>{frames.push(new Texture({source:textures[idx].source,frame:new Rectangle(f.frame.x,f.frame.y,f.frame.w,f.frame.h)}));size={w:f.frame.w,h:f.frame.h};}));
 oldFrames.forEach(t=>t.destroy(false));await Promise.all(oldImages.filter(u=>!urls.includes(u)).map(u=>Assets.unload(u)));sprite.texture=frames[0];time=0;loading=false;layout();
 }catch(e){loading=false;status.text='Atlas failed: '+String(e);}}
function layout(){const w=app.screen.width,h=app.screen.height;title.style.fontSize=w<420?18:22;note.style.fontSize=w<420?11:13;title.position.set(16,14);note.position.set(16,45);controls.removeChildren().forEach(c=>c.destroy({children:true}));buttons.length=0;
 for(let i=1;i<=5;i++)button('Lv'+i,16+(i-1)*58,72,52,()=>{level=i;void load();});
 button(playing?'Pause':'Play',16,114,72,()=>{playing=!playing;layout();});button('Replay',94,114,72,()=>{time=0;});button(speed===1?'0.5×':'1×',172,114,64,()=>{speed=speed===1?.5:1;layout();});button(scaleMode?'Fit':'1× pixels',242,114,70,()=>{scaleMode=!scaleMode;layout();});
 button(variant==='mobile'?'Mobile':'Desktop',16,156,88,()=>{variant=variant==='mobile'?'desktop':'mobile';void load();});
 const timeline=new Graphics().roundRect(116,156,Math.max(140,w-132),34,7).fill(0x263348);timeline.eventMode='static';timeline.cursor='pointer';timeline.on('pointerdown',e=>{time=Math.min(1.499,Math.max(0,(e.global.x-116)/(w-132)*1.5));});controls.addChild(timeline);const tl=label('Seek 0 → 1.5 seconds',12);tl.position.set(126,166);controls.addChild(tl);
 status.position.set(16,202);detail.position.set(16,224);help.position.set(16,h-52);help.style.wordWrapWidth=w-32;
 const displayW=scaleMode?size.w:Math.min(w-24,(h-320)*16/9),displayH=displayW*9/16;root.position.set((w-displayW)/2,Math.max(255,260+(h-320-displayH)/2));sprite.width=displayW;sprite.height=displayH;
 // Sprite remains the complete raw frame: watermark and transparent registration padding included.
 const px=displayW*.2,py=displayH*.35,unit=displayW/16,r=manifest.levels[level-1].rangeGameUnits*unit;
 floor.clear().rect(0,0,displayW,displayH).fill(0x1c2637).stroke({color:0x3a4b65,width:1});
 for(let x=0;x<displayW;x+=unit)floor.moveTo(x,0).lineTo(x,displayH);floor.stroke({color:0x344258,width:1,alpha:.35});
 floor.moveTo(px,py);for(let n=0;n<=40;n++){const a=(-54+n*108/40)*Math.PI/180;floor.lineTo(px+Math.cos(a)*r,py+Math.sin(a)*r*.5);}floor.closePath().stroke({color:0x5b8dc5,width:1,alpha:.8});
 pivot.clear().moveTo(px-6,py).lineTo(px+6,py).moveTo(px,py-6).lineTo(px,py+6).stroke({color:0x72f1cf,width:2});
}
app.ticker.add(t=>{if(playing&&!loading)time=(time+t.deltaMS*.001*speed)%1.5;if(!loading&&frames.length){const n=Math.min(frames.length-1,Math.floor(time*24));sprite.texture=frames[n];const l=manifest.levels[level-1];status.text=`Lv${level} · frame ${n+1}/${frames.length} · ${time.toFixed(2)}s · ${variant}`;detail.text=`1280×720 master · effect ${l.masterEffectBounds.w}×${l.masterEffectBounds.h}px\nAtlas GPU: ${(l.variants[variant].decodedBytes/1048576).toFixed(1)} MiB · pivot 0.20, 0.35`;}});
window.addEventListener('resize',layout);
Object.assign(window,{__houdiniFlameFan:{get state(){return {level,playing,time,loading,variant,frames:frames.length,buttons,canvasOnly:!document.querySelector('button,input,select'),commercialEligible:false};},select:(n:number)=>{level=Math.max(1,Math.min(5,n));return load();},seek:(t:number)=>{playing=false;time=Math.max(0,Math.min(1.499,t));layout();}}});
layout();await load();
