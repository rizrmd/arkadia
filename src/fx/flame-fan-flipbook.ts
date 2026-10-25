import {Application,Assets,Container,Graphics,Rectangle,Sprite,Text,Texture} from 'pixi.js';
// Preview only. No combat modules, damage, or gameplay state are imported.
const app=new Application();
const base=new URL('.',document.baseURI);
const asset=(p:string)=>new URL(p,base).href;
const duration=2.8,release=.48;
let time=0,paused=false,loop=true,speed=1,day=false,cycles=0;
async function boot(){
 await app.init({resizeTo:window,background:'#101a22',antialias:true,resolution:Math.min(devicePixelRatio,2),autoDensity:true,preserveDrawingBuffer:true});
 document.body.appendChild(app.canvas);
 const root=new Container();app.stage.addChild(root);
 const bg=new Graphics(),ground=new Container(),body=new Container(),actors=new Container(),fire=new Container(),ui=new Container();root.addChild(bg,ground,body,actors,fire,ui);
 const manifest=await fetch(asset('actors/manifest.json')).then(r=>{if(!r.ok)throw Error('Actor manifest unavailable');return r.json();});
 const source=await Assets.load<Texture>(asset('hand-ignition-source.png'));
 const frames=Array.from({length:16},(_,i)=>new Texture({source:source.source,frame:new Rectangle(Math.round(i%4*source.width/4),Math.round(Math.floor(i/4)*source.height/4),Math.round((i%4+1)*source.width/4)-Math.round(i%4*source.width/4),Math.round((Math.floor(i/4)+1)*source.height/4)-Math.round(Math.floor(i/4)*source.height/4))}));
 const actorSprites:any[]=[];
 const points=[[205,320],[546,286],[610,351],[552,421]];
 for(const [i,id] of ['ember-warden','revenant','revenant','revenant'].entries()){
  const m=manifest.characters[id],atlas=await Assets.load<Texture>(asset('actors/'+m.image));
  const textures=m.frames.map((f:any)=>new Texture({source:atlas.source,frame:new Rectangle(f.x,f.y,f.w,f.h)}));
  const shadow=new Graphics().ellipse(0,0,31,11).fill({color:0x24303a,alpha:.25});shadow.position.set(...points[i] as [number,number]);ground.addChild(shadow);
  const s=new Sprite(textures[0]);s.anchor.set(m.cell.pivot.x/m.cell.w,m.cell.pivot.y/m.cell.h);s.position.set(...points[i] as [number,number]);s.width=m.cell.w*1.12;s.height=m.cell.h*1.12;if(i)s.scale.x*=-1;actors.addChild(s);actorSprites.push({s,m,textures});
 }
 const grid=new Graphics();ground.addChildAt(grid,0);const sheet=new Graphics();body.addChild(sheet);
 // Overlapping wide flame tongues form a single rooted fan. Source frames supply curled texture,
 // with normal alpha blending (never black-keyed or additive-only rectangles).
 const tongues=Array.from({length:21},(_,i)=>{const s=new Sprite(frames[4]);s.anchor.set(.5,.82);body.addChild(s);return s;});
 const hand=new Sprite(frames[0]);hand.anchor.set(.5,.82);hand.position.set(250,254);fire.addChild(hand);
 const contacts=points.slice(1).map(p=>{const s=new Sprite(frames[0]);s.anchor.set(.5,.8);s.position.set(p[0],p[1]-38);s.width=62;s.height=73;fire.addChild(s);return s;});
 function text(value:string,x:number,y:number,size=16,color=0xe9e3d0){const t=new Text({text:value,style:{fontFamily:'Georgia',fontSize:size,fill:color}});t.position.set(x,y);ui.addChild(t);return t;}
 text('EMBER WARDEN / SPELL STUDY',34,25,13,0xd7a968);text('Flame Fan',32,49,35);text('16-frame hand ignition · connected orange-red fire',34,96,15,0xbbcbd1);
 const phase=text('',34,139,17),clock=text('',653,139,15),label=text('Preview only · three Revenants · no combat changes',34,552,14,0xbbcbd1);
 const progress=new Graphics();ui.addChild(progress);
 const buttons:any[]=[];
 function button(name:string,x:number,y:number,w:number,action:()=>void){const c=new Container();c.position.set(x,y);c.eventMode='static';c.cursor='pointer';const g=new Graphics().roundRect(0,0,w,45,9).fill(0x283943).stroke({color:0xb68b51,width:1});const t=new Text({text:name,style:{fontFamily:'Arial',fontSize:16,fill:0xf3e6ce}});t.anchor.set(.5);t.position.set(w/2,22);c.addChild(g,t);c.on('pointertap',()=>{action();render();});ui.addChild(c);buttons.push({c,t,name});return t;}
 const play=button('Pause',34,590,120,()=>{paused=!paused;if(time>=duration)time=0;});
 button('Replay',166,590,120,()=>{time=0;paused=false;cycles++;});
 const looping=button('Loop: On',298,590,145,()=>loop=!loop);
 const rate=button('Speed: 1×',455,590,145,()=>speed=speed===1?.5:1);
 const backdrop=button('Night',612,590,154,()=>day=!day);
 const track=new Graphics().rect(34,502,732,32).fill({color:0xffffff,alpha:.001});track.eventMode='static';track.cursor='pointer';track.on('pointerdown',e=>{time=Math.max(0,Math.min(duration,(e.getLocalPosition(root).x-34)/732*duration));paused=true;render();});ui.addChild(track);
 function render(){
  bg.clear().rect(0,0,800,670).fill(day?0x9caeb5:0x15232d);
  grid.clear();grid.strokeStyle={color:day?0x758b91:0x29404b,width:1};for(let i=-6;i<15;i++){grid.moveTo(i*100,182).lineTo(i*100+650,490).stroke();grid.moveTo(i*100,490).lineTo(i*100+650,182).stroke();}
  // Isometric ground uses a 0.5 vertical projection. Feet remain registered during recoil.
  const opening=Math.max(0,Math.min(1,(time-release)/.22)),fade=Math.max(0,Math.min(1,(1.9-time)/.5)),heat=opening*fade;
  body.alpha=heat;
  sheet.clear();sheet.moveTo(250,266).bezierCurveTo(340,235,440,229,558,246).bezierCurveTo(610,282,659,369,578,433).bezierCurveTo(449,394,332,305,250,266).fill({color:0xd84512,alpha:.10});
  sheet.moveTo(250,266).bezierCurveTo(350,252,452,264,572,292).bezierCurveTo(607,325,596,367,560,391).bezierCurveTo(448,358,343,294,250,266).fill({color:0xff8a1c,alpha:.10});
  tongues.forEach((s,i)=>{const row=Math.floor(i/7),u=(i%7+1)/7;const width=52+u*110;const frame=4+(Math.floor(time*22)+i*3)%8;s.texture=frames[frame];s.position.set(248+u*337,266+u*((row-1)*73+39));s.width=width;s.height=width*(.66+row*.1);s.rotation=.6+row*.15;s.alpha=.82;});
  const handFrame=Math.min(15,Math.max(0,Math.floor(time/1.25*16)));hand.texture=frames[handFrame];hand.width=76;hand.height=90;hand.visible=time<1.25;hand.alpha=time<.95?1:(1.25-time)/.3;
  contacts.forEach((s,i)=>{s.visible=time>.72&&time<1.7;s.texture=frames[Math.min(15,Math.max(0,Math.floor((time-.72)*16)+i))];s.alpha=fade*.85;});
  actorSprites.forEach(({s,m,textures},i)=>{const hit=i&&time>.73&&time<1.45;const clip=m.clips[i?(hit?'hit':'idle'):(time<1.2?'attack-E':'idle-E')];const local=i?(hit?time-.73:time):time;const frame=!i&&time<1.2?(time<release?Math.min(3,Math.floor(time/release*4)):3):clip.loop?Math.floor(local*clip.fps)%clip.frames.length:Math.min(clip.frames.length-1,Math.floor(local*clip.fps));s.texture=textures[clip.frames[frame]];s.position.x=points[i][0]+(hit?Math.sin((time-.73)/.72*Math.PI)*8:0);});
  phase.text=time<release?'01 / Hand ignition':time<.74?'02 / Fan opens':time<1.7?'03 / Connected flame + three contacts':'04 / Ember falloff';clock.text=time.toFixed(2)+' / 2.80 s';
  progress.clear().roundRect(34,514,732,5,2).fill(0x42545b).roundRect(34,514,Math.max(2,732*time/duration),5,2).fill(0xffa33b);
  play.text=paused?'Play':'Pause';looping.text='Loop: '+(loop?'On':'Off');rate.text='Speed: '+speed+'×';backdrop.text=day?'Day':'Night';
 }
 function resize(){const mobile=app.screen.width<600;const height=mobile?820:670;const scale=Math.min(app.screen.width/800,app.screen.height/height);root.scale.set(scale);root.position.set((app.screen.width-800*scale)/2,(app.screen.height-height*scale)/2);buttons.forEach((b,i)=>{b.c.position.set(mobile?34+(i%3)*248:[34,166,298,455,612][i],mobile?590+Math.floor(i/3)*112:590);b.c.children[0].clear().roundRect(0,0,mobile?234:[120,120,145,145,154][i],mobile?94:45,9).fill(0x283943).stroke({color:0xb68b51,width:1});b.t.style.fontSize=mobile?28:16;b.t.position.set(mobile?117:[60,60,72.5,72.5,77][i],mobile?47:22);});}
 window.addEventListener('resize',resize);resize();render();
 app.ticker.maxFPS=30;app.ticker.add(t=>{if(!paused&&!document.hidden){time+=t.deltaMS/1000*speed;if(time>=duration){if(loop){time%=duration;cycles++;}else{time=duration;paused=true;}}}render();});
 (window as any).__FLIPBOOK_FAN__={seek:(t:number)=>{time=Math.max(0,Math.min(duration,t));paused=true;render();},state:()=>({time,paused,loop,speed,day,cycles,source:'DA14f9840922edc53aa33bf53f',sourceUrl:asset('hand-ignition-source.png'),frames:frames.length,handFrame:Math.min(15,Math.floor(time/1.25*16)),actors:actorSprites.length,targets:3,pixiUI:true,connected:time>=release&&time<1.9,controls:buttons.map(b=>({label:b.t.text,x:root.x+(b.c.x+b.t.x)*root.scale.x,y:root.y+(b.c.y+b.t.y)*root.scale.y})),canvas:[app.screen.width,app.screen.height]})};
}
boot().catch(e=>{console.error(e);const t=new Text({text:'Preview failed to load. Please reload.',style:{fill:0xffffff,fontSize:18}});app.stage.addChild(t);});
