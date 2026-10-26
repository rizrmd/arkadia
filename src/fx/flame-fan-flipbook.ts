import {Application,Assets,Container,Graphics,Rectangle,Sprite,Text,Texture} from 'pixi.js';
import {normalizeParticleEffect} from 'nixie-fx';
import {PixiVfxRenderer} from 'nixie-fx/pixi';
// Isolated review: no gameplay state or combat modules.
const app=new Application(),base=new URL('.',document.baseURI),asset=(p:string)=>new URL(p,base).href;
const duration=1.25,release=.08;
// Contract world-space forward reach about the casting hand; retain the broad
// vertical curls, timing, camera and original compact ignition.
const reachScale=2/3,handX=171,forwardX=(x:number)=>handX+(x-handX)*reachScale;
let time=.32,paused=false,loop=true,speed=1,day=true,cycles=0,solo=-1,compare=window.innerWidth>=650;
const names=['Ignition','Flame sheet','Curling tongues','Hot interior','Ground heat','Hit contacts','Embers','Smoke'];
async function boot(){
 await app.init({resizeTo:window,background:'#101a22',antialias:true,resolution:Math.min(devicePixelRatio,2),autoDensity:true,preserveDrawingBuffer:true,preference:'webgl'});document.body.appendChild(app.canvas);
 const root=new Container();app.stage.addChild(root);
 const bg=new Graphics(),scene=new Container(),ui=new Container();root.addChild(bg,scene,ui);
 const ground=new Graphics();scene.addChild(ground);
 const layers=names.map(()=>new Container());scene.addChild(layers[4],layers[7],layers[1],layers[2],layers[3]);
 const actors=new Container();scene.addChild(actors,layers[0],layers[5],layers[6]);
 layers.forEach((layer,i)=>{if(i!==0){layer.scale.x=reachScale;layer.x=handX*(1-reachScale);}});
 const source=await Assets.load<Texture>(asset('hand-ignition-source.png')),fan=await Assets.load<Texture>(asset('rolling-fan-v2.png')),reference=await Assets.load<Texture>(asset('approved-reference.png'));
 function split(t:Texture){return Array.from({length:16},(_,i)=>{const x=Math.round(i%4*t.width/4),y=Math.round(Math.floor(i/4)*t.height/4);return new Texture({source:t.source,frame:new Rectangle(x,y,Math.round((i%4+1)*t.width/4)-x,Math.round((Math.floor(i/4)+1)*t.height/4)-y)});});}
 const frames=split(source),fans=split(fan);
 const cores=split(await Assets.load<Texture>(asset('eroded-core-v2.png'))),smokeTexture=await Assets.load<Texture>(asset('smoke-v2.png'));
 const manifest=await fetch(asset('actors/manifest.json')).then(r=>r.json());const actorSprites:any[]=[],points=[[134,262],[487,245],[417,335],[536,402]];
 for(const [i,id]of ['ember-warden','revenant','revenant','revenant'].entries()){
  const m=manifest.characters[id],atlas=await Assets.load<Texture>(asset('actors/'+m.image));const textures=m.frames.map((f:any)=>new Texture({source:atlas.source,frame:new Rectangle(f.x,f.y,f.w,f.h)}));
  const s=new Sprite(textures[0]);s.anchor.set(m.cell.pivot.x/m.cell.w,m.cell.pivot.y/m.cell.h);s.width=m.cell.w*.98;s.height=m.cell.h*.98;if(i)s.scale.x*=-1;s.position.set(i?forwardX(points[i][0]):points[i][0],points[i][1]);actors.addChild(s);actorSprites.push({s,m,textures});
 }
 function sprite(layer:number,texture:Texture,anchor=[.04,.5]){const s=new Sprite(texture);s.anchor.set(anchor[0],anchor[1]);layers[layer].addChild(s);return s;}
 const sheetRoot=new Container();sheetRoot.position.set(171,184);sheetRoot.rotation=.30;layers[1].addChild(sheetRoot);
 const curls=Array.from({length:7},()=>sprite(2,frames[5],[.5,.8]));
 const core=sprite(3,cores[0]);core.blendMode='add';
 const hand=sprite(0,frames[0],[.5,.8]);hand.blendMode='add';hand.position.set(171,188);
 const contacts=points.slice(1).map(p=>{const s=sprite(5,frames[4],[.5,.8]);s.position.set(p[0],p[1]-35);return s;});
 const heat=new Graphics();layers[4].addChild(heat);
 // Nixie owns the actual deterministic particle motion, curl noise, life curves and pooling.
 const constant=(value:number)=>({mode:'constant',value,min:value,max:value});
 function particle(layer:number,smoke:boolean){
  const renderer=new PixiVfxRenderer({parent:layers[layer],textureProvider:{getTexture:()=>smoke?smokeTexture:Texture.WHITE}});
  const tint=smoke?[.22,.20,.20]:[1,.58,.08];
  const effect=normalizeParticleEffect({app:'vfx-editor',kind:'particle-effect',version:1,targetProfile:'pixi-ui-2d',id:smoke?'fan.smoke':'fan.embers',name:names[layer],timeline:{duration:1.25,frameRate:30},emitters:[{id:names[layer],mode:'billboard',duration:.45,loop:false,maxParticles:smoke?22:24,modules:{velocity:true,color:true,size:true,noise:true,rotation:false},spawn:{rate:0,bursts:[{time:smoke?.24:.18,count:smoke?18:22,cycles:1,probability:1}],shape:'box',box:[4.4,.8,0],position:[6.1,smoke?3.6:4.5,0]},initializeParticle:{lifetime:constant(smoke?.64:.5),size:constant(smoke?1.1:.033),rotation:constant(.2),velocity:{mode:'vector',min:smoke?[.12,-1.0,0]:[.5,-1.4,0],max:smoke?[.35,-.6,0]:[1.5,-.4,0]}},forces:{gravity:0,drag:.2},advanced:{noise:{mode:'curl',strength:constant(smoke?.16:.1),frequency:1.5,speed:1,scroll:[0,-.3,0],octaves:2,damping:.1}},color:{start:[...tint,0],end:[...tint,0],gradient:{mode:'blend',colorStops:[{position:0,color:tint},{position:1,color:smoke?[.12,.12,.14]:[1,.18,.02]}],alphaStops:[{position:0,alpha:0},{position:.15,alpha:smoke?.48:1},{position:.7,alpha:smoke?.3:.65},{position:1,alpha:0}]}},render:{texture:smoke?'smoke':'spark',blend:smoke?'alpha':'additive',opacitySource:'textureAlpha'},billboard:{shape:'quad',sizeStart:1,sizeEnd:smoke?1.9:.1,sizeValue:{mode:'curve',value:1,curve:[{x:0,y:smoke?.6:1},{x:1,y:smoke?1.9:.1}]},softness:0}}]});
  const instance=renderer.createEffect(effect,{autoStart:false,projection:{project:(p:any,out?:any)=>Object.assign(out||{},{x:p[0]*64,y:p[1]*64,visible:true}),pixelsPerWorldUnit:()=>64,depth:()=>0}});
  let last=-1;return {effect,instance,update(t:number){if(t<last||last<0){instance.reset({position:[0,0,0],seed:smoke?19:31,timeSeconds:0});last=0;}while(last+.016<t){instance.update(.016,last+.016);last+=.016;}instance.update(Math.max(0,t-last),t);last=t;}};
 }
 const embers=particle(6,false),smoke=particle(7,true);
 // Actual Nixie Sub-UV quad emitters, not a procedural triangle or a labeled proxy.
 const sheetEffect=normalizeParticleEffect({app:'vfx-editor',kind:'particle-effect',version:1,targetProfile:'pixi-ui-2d',id:'fan.rolling-sheet',name:'Three overlapping rolling flame quads',timeline:{duration,frameRate:30},emitters:[0,1,2].map(i=>({id:'sheet-'+i,name:'Rolling fold '+i,mode:'billboard',duration:.01,loop:false,maxParticles:1,modules:{velocity:false,color:true,size:false,rotation:false,textureSheetAnimation:true},spawn:{rate:0,bursts:[{time:0,count:1,cycles:1,probability:1}],radius:0,position:[(178+i*8)/64,(i*7)/64,0]},initializeParticle:{lifetime:constant(.75),size:constant(1),startSizeSeparateAxes:true,size3D:{x:constant((386+i*13)/64),y:constant((240+i*14)/64),z:constant(1)},rotation:constant(-(i-1)*.07),velocity:{mode:'vector',min:[0,0,0],max:[0,0,0]}},forces:{gravity:0,drag:0},advanced:{textureSheetAnimation:{tiles:[4,4],startFrame:0,endFrame:15,cycles:2,randomStartFrame:i>0,frameOverTime:{mode:'curve',value:1,curve:[{x:0,y:0},{x:1,y:1}]}}},color:{start:[1,1,1,i===0?1:.40],end:[1,1,1,i===0?1:.40]},render:{texture:'rolling-fan-v2',blend:'alpha',opacitySource:'textureAlpha'},billboard:{shape:'quad',sizeStart:1,sizeEnd:1,sizeValue:constant(1),softness:0}}))});
 const sheetRenderer=new PixiVfxRenderer({parent:sheetRoot,textureProvider:{getTexture:()=>fan}});
 const sheetInstance=sheetRenderer.createEffect(sheetEffect,{autoStart:false,projection:{project:(p:any,out?:any)=>Object.assign(out||{},{x:p[0]*64,y:p[1]*64,visible:true}),pixelsPerWorldUnit:()=>64,depth:()=>0}});
 let sheetLast=-1;function updateSheet(t:number){if(t<sheetLast||sheetLast<0){sheetInstance.reset({position:[0,0,0],seed:7,timeSeconds:0});sheetLast=0;}while(sheetLast+.016<t){sheetInstance.update(.016,sheetLast+.016);sheetLast+=.016;}sheetInstance.update(Math.max(0,t-sheetLast),t);sheetLast=t;}

 // Nixie particle containers use deliberately huge culling bounds. Measure their
 // actual rendered debug quads instead, including rotation and sheet opening.
 function measuredBounds(i:number){
  const quads=i===1?sheetInstance.getParticleDebugQuads():i===6?embers.instance.getParticleDebugQuads():i===7?smoke.instance.getParticleDebugQuads():null;
  if(!quads)return layers[i].getLocalBounds();
  const corners=quads.flatMap(q=>[0,1].flatMap(x=>[0,1].map(y=>{
   const dx=(x-q.anchorX)*q.width,dy=(y-q.anchorY)*q.height;
   let px=q.x+dx*Math.cos(q.rotation)-dy*Math.sin(q.rotation),py=q.y+dx*Math.sin(q.rotation)+dy*Math.cos(q.rotation);
   if(i===1){const sx=px*sheetRoot.scale.x,sy=py*sheetRoot.scale.y;px=sheetRoot.x+sx*Math.cos(sheetRoot.rotation)-sy*Math.sin(sheetRoot.rotation);py=sheetRoot.y+sx*Math.sin(sheetRoot.rotation)+sy*Math.cos(sheetRoot.rotation);}
   return {x:px,y:py};
  })));
  if(!corners.length)return {x:handX,y:188,width:0,height:0};
  const x=Math.min(...corners.map(p=>p.x)),y=Math.min(...corners.map(p=>p.y));return {x,y,width:Math.max(...corners.map(p=>p.x))-x,height:Math.max(...corners.map(p=>p.y))-y};
 }
 const refTexture=new Texture({source:reference.source,frame:new Rectangle(Math.round(reference.width*.20),Math.round(reference.height*.36),Math.round(reference.width*.79),Math.round(reference.height*.31))});
 const ref=new Sprite(refTexture);ui.addChild(ref);
 function text(v:string,x:number,y:number,size=16,color=0xe9e3d0){const t=new Text({text:v,style:{fontFamily:'Arial',fontSize:size,fill:color}});t.position.set(x,y);ui.addChild(t);return t;}
 text('EMBER WARDEN / FLAME FAN',24,18,22,0xffce8d);const phase=text('',24,49,14),refLabel=text('APPROVED REFERENCE',650,76,13),sceneLabel=text('ACTUAL PIXI RENDER',24,76,13);
 const details=text('',24,538,14,0xb8cbd0);const progress=new Graphics();ui.addChild(progress);
 const buttons:any[]=[];function button(name:string,action:()=>void){const c=new Container(),g=new Graphics(),t=new Text({text:name,style:{fontFamily:'Arial',fontSize:15,fill:0xffe4b9}});c.addChild(g,t);ui.addChild(c);c.eventMode='static';c.cursor='pointer';c.on('pointertap',()=>{action();render();});buttons.push({c,g,t,name});return t;}
 const play=button('Pause',()=>paused=!paused);button('Replay',()=>{time=0;paused=false;cycles++;});const looping=button('Loop: On',()=>loop=!loop),rate=button('Speed: 1×',()=>speed=speed===1?.5:1),backdrop=button('Day',()=>day=!day),comparison=button('Reference: On',()=>{compare=!compare;resize();});
 const all=button('All layers',()=>solo=-1);names.forEach((n,i)=>button(`${i+1} ${n}`,()=>solo=solo===i?-1:i));
 const track=new Graphics();ui.addChild(track);track.eventMode='static';track.cursor='pointer';track.on('pointerdown',e=>{time=Math.max(0,Math.min(duration,(e.getLocalPosition(root).x-24)/752*duration));paused=true;render();});
 const phaseButtons=[.04,.15,.32,.60];phaseButtons.forEach((t,i)=>button(['Ignite 40ms','Open 150ms','Roll 320ms','Fade 600ms'][i],()=>{time=t;paused=true;}));
 let layoutHeight=900;
 function render(){
  bg.clear().rect(0,0,1000,layoutHeight).fill(0x14222b);
  ground.clear().roundRect(0,0,610,440,12).fill(day?0x9baeb4:0x29353e);for(let y=0;y<440;y+=38){for(let x=0;x<610;x+=45){ground.ellipse(x+(y%76?18:0),y,10,2).fill({color:day?0xc5d3d7:0x39444b,alpha:.10});}}
  points.forEach((p,i)=>ground.ellipse(i?forwardX(p[0]):p[0],p[1],24,8).fill({color:0x111b21,alpha:.25}));
  const open=Math.max(0,Math.min(1,(time-.08)/.14)),fade=Math.max(0,Math.min(1,(.75-time)/.3)),heatAmount=open*fade;
  layers.forEach((l,i)=>l.visible=solo<0||solo===i);
  updateSheet(Math.max(0,time-.08));sheetRoot.scale.set(open,.7+.3*open);sheetRoot.alpha=heatAmount;
  curls.forEach((s,i)=>{const u=(i+1)/8;s.texture=frames[4+(Math.floor(time*30)+i*3)%8];s.position.set(196+u*330,216+u*112+(i%2?24:-12));s.width=80+u*45;s.height=90+u*48;s.rotation=.75+i*.12;s.alpha=heatAmount*.55;});
  core.texture=cores[Math.floor(time*40)%16];core.position.set(171,189);core.width=396*open;core.height=240;core.rotation=.30;core.alpha=heatAmount*.28;
  hand.texture=frames[Math.min(15,Math.floor(time/.48*16))];hand.width=52;hand.height=65;hand.alpha=Math.max(0,Math.min(1,(.48-time)/.18));
  contacts.forEach((s,i)=>{const a=time-.22-i*.018;s.texture=frames[Math.min(15,Math.max(0,Math.floor(a/.34*16)))];s.width=48;s.height=58;s.alpha=a>0?Math.max(0,1-a/.40):0;});
  heat.clear();for(let i=3;i>=0;i--)heat.ellipse(370,330,160+i*12,36+i*5).fill({color:0xf56616,alpha:heatAmount*.025});
  embers.update(time);smoke.update(time);
  actorSprites.forEach(({s,m,textures},i)=>{const hit=i&&time>.22&&time<.65,clip=m.clips[i?(hit?'hit':'idle'):(time<.6?'attack-E':'idle-E')];const frame=!i&&time<.6?(time<.08?Math.min(3,Math.floor(time/.08*4)):3):Math.min(clip.frames.length-1,Math.floor((hit?time-.22:time)*clip.fps)%clip.frames.length);s.texture=textures[clip.frames[frame]];s.x=(i?forwardX(points[i][0]):points[i][0])+(hit?Math.sin((time-.22)/.43*Math.PI)*5:0);});
  phase.text=(time<.08?'Hand ignition':time<.22?'Opening':time<.45?'Full rolling flame':time<.75?'Erosion / rising smoke':'Recovery')+'  ·  '+Math.round(time*1000)+' / 1250 ms';
  details.text=solo<0?'Eight layers combined · alpha body / smoke · additive ignition / core / embers':`${solo+1} / ${names[solo]} isolated · actors retained for scale`;
  progress.clear().roundRect(24,578,752,5,2).fill(0x48616c).roundRect(24,578,Math.max(2,752*time/duration),5,2).fill(0xffa33b);
  play.text=paused?'Play':'Pause';looping.text='Loop: '+(loop?'On':'Off');rate.text='Speed: '+speed+'×';backdrop.text=day?'Day':'Night';comparison.text='Reference: '+(compare?'On':'Off');all.text=solo<0?'All layers ✓':'All layers';
  buttons.forEach((b,i)=>b.g.tint=i===6&&solo<0||i>=7&&i<=14&&solo===i-7?0xffaa55:0xffffff);
 }
 function resize(){const mobile=app.screen.width<650;const W=mobile?800:1000;layoutHeight=mobile?1300:900;const scale=Math.min(app.screen.width/W,app.screen.height/layoutHeight);root.scale.set(scale);root.position.set((app.screen.width-W*scale)/2,(app.screen.height-layoutHeight*scale)/2);
  scene.position.set(24,100);scene.scale.set(mobile?1.23:1);ref.visible=compare;refLabel.visible=compare;
  if(mobile){ref.position.set(530,160);ref.width=236;ref.height=200;ref.alpha=.95;scene.scale.set(compare?.8:1.23);scene.position.y=compare?150:100;refLabel.position.set(530,110);sceneLabel.position.set(24,110);}else{ref.position.set(650,100);ref.width=300;ref.height=255;ref.alpha=1;}
  details.position.set(24,mobile?690:548);details.style.fontSize=mobile?22:14;details.style.wordWrap=true;details.style.wordWrapWidth=752;progress.y=mobile?160:0;track.clear().rect(24,mobile?722:560,752,40).fill({color:0xffffff,alpha:.001});
  // Match timeline to responsive track.
  track.removeAllListeners('pointerdown');track.on('pointerdown',e=>{time=Math.max(0,Math.min(duration,(e.getLocalPosition(root).x-24)/752*duration));paused=true;render();});
  buttons.forEach((b,i)=>{const cols=mobile?3:6,w=mobile?242:146,h=mobile?62:42;const j=i<6?i:i-6;const row=i<6?Math.floor(i/cols):Math.ceil(6/cols)+Math.floor(j/cols);const col=i<6?i%cols:j%cols;b.c.position.set(24+col*(w+10),(mobile?775:606)+row*(h+10));b.g.clear().roundRect(0,0,w,h,7).fill(0x2b414e).stroke({color:0x8d714b,width:1});b.t.style.fontSize=mobile?24:14;b.t.anchor.set(.5);b.t.position.set(w/2,h/2);});
 }
 window.addEventListener('resize',resize);resize();render();app.ticker.maxFPS=30;app.ticker.add(t=>{if(!paused&&!document.hidden){time+=Math.min(.05,t.deltaMS/1000)*speed;if(time>=duration){if(loop){time%=duration;cycles++;}else{time=duration;paused=true;}}}render();});
 (window as any).__FLIPBOOK_FAN__={seek:(t:number)=>{time=Math.max(0,Math.min(duration,t));paused=true;render();},isolate:(i:number)=>{solo=i;render();},state:()=>({time,paused,loop,speed,day,cycles,solo,compare,source:'DA14f9840922edc53aa33bf53f',sourceUrl:asset('hand-ignition-source.png'),frames:16,handFrame:Math.min(15,Math.floor(time/.48*16)),actors:4,targets:3,pixiUI:true,connected:time>=release&&time<.75,nixieEmitters:5,particleQuads:[embers.instance.getParticleDebugQuads().length,smoke.instance.getParticleDebugQuads().length],particleDetails:{sheet:sheetInstance.getParticleDebugQuads(),embers:embers.instance.getParticleDebugQuads(),smoke:smoke.instance.getParticleDebugQuads()},particleDefinitions:[embers.effect,smoke.effect,sheetEffect],layers:names.map((name,i)=>({name,visible:layers[i].visible,children:layers[i].children.length})),controls:buttons.map(b=>({label:b.t.text,x:root.x+(b.c.x+b.t.x)*root.scale.x,y:root.y+(b.c.y+b.t.y)*root.scale.y})),geometry:{reachScale,hand:[handX,188],cameraScale:scene.scale.x,targets:points.slice(1).map(p=>({old:[p[0],p[1]],current:[forwardX(p[0]),p[1]]})),layers:layers.map((l,i)=>{const b=measuredBounds(i);return {name:names[i],scaleX:l.scale.x,offsetX:l.x,localBounds:{x:b.x,y:b.y,width:b.width,height:b.height},oldForwardEdge:b.x+b.width,currentForwardEdge:l.x+(b.x+b.width)*l.scale.x};})},canvas:[app.screen.width,app.screen.height]})};
}
boot().catch(e=>{console.error(e);app.stage.addChild(new Text({text:'Preview failed to load. Please reload.',style:{fill:0xffffff,fontSize:18}}));});
