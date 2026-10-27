import {FxEditor} from './editor';
import {visualVersion} from './visuals';
import {playCue,cueKeys} from './cues';
import {createFxRuntime} from './runtime';
import {GAMEPLAY_SNOW,gameplaySnowPattern} from '../stronghold/snow-material';
import {Container,Graphics,Text,Rectangle} from 'pixi.js';
import {createCanvasSprite,type Progress} from '../app/loader';
import {create3dHeroRenderer,notifyHeroCast} from '../stronghold/hero-3d';
import {createCombatVfx,HERO_SKILLS} from '../stronghold/combat-vfx';
import {SkillTree,TREE_NODES,EMBER_TREE_NODES} from '../stronghold/skill-tree';
import {fresh,cards} from '../stronghold/progression';
import {tilePoint} from '../stronghold/terrain';
import {yawOfScreenAngle} from './space';
import type {HeroId} from '../stronghold/heroes';

export const DIRS=['N','NE','E','SE','S','SW','W','NW'] as const;
const ANGLES=[-90,-45,0,45,90,135,180,-135];
const nextPaint=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
type Playback='loading'|'playing'|'ready'|'passive'|'planned'|'error';

export async function mount(root:HTMLElement,progress:Progress){
 const {app,worldStage,uiStage}=await createFxRuntime(root);
 const q=new URLSearchParams(location.search);
 let hero:HeroId=q.get('hero')?.startsWith('rift')?'rift-runner':'ember-warden';
 let selected=q.get('skill')??q.get('play')??(hero==='ember-warden'?'flame-fan':'rift-bolt');
 let rank=Math.max(1,Math.min(5,Number(q.get('rank'))||1));
 let dir=Math.max(0,DIRS.indexOf((q.get('dir')??'SE') as typeof DIRS[number]));
 let runningInPlace=q.get('pose')==='run',loop=q.get('loop')!=='0',paused=false,night=q.get('bg')==='night',zoom=1;
 let time=0,nextCast=Infinity,castUntil=0,request=0,playCount=0;
 let playback:Playback='loading',playbackMessage='Loading hero and effects…';
 let run=fresh(hero),view={x:0,y:0,scale:1};
 const position={u:20,v:20},camera={u:20,v:20},keys=new Set<string>();
 let walking=false,sidebarWidth=Math.min(360,innerWidth*.76),collapsed=innerWidth<600,heroDropdown=false,dropdown=false,optionScroll=0;
 let resizeStart:{x:number;width:number}|undefined;
 let gesture:{startY:number;lastY:number;moved:boolean;list:boolean}|undefined;
 const touches=new Map<number,{x:number;y:number}>();let pinchDistance=0,suppressTapUntil=0;
 const prepared=new Set<HeroId>(),preparing=new Map<HeroId,Promise<void>>();let preparation=Promise.resolve();
 const feedback=()=>cueKeys(hero).filter(k=>k.startsWith('hit.')||k.startsWith('combo.')||['heal','level-up','attack.swing'].includes(k)).map(k=>({id:'feedback/'+k,name:k==='attack.swing'?'Basic attack':k==='level-up'?'Level up':k==='heal'?'Healing':k.replace('.', ' · '),kind:'active' as const,game:k}));
 const choices=()=>[...nodes(),...feedback()];
 const treeFocus=()=>nodes().find(n=>n.id===selected)?.id??nodes()[0].id;
 const feedbackKey=()=>selected.startsWith('feedback/')?selected.slice(9):undefined;
 const nodes=()=>hero==='ember-warden'?EMBER_TREE_NODES:TREE_NODES;
 selected=choices().find(n=>n.id===selected||n.game===selected)?.id??nodes()[0].id;
 const node=()=>choices().find(n=>n.id===selected)!;
 const skill=()=>HERO_SKILLS[hero].find(s=>s.id===node().game);
 const ui=new Container(),overlay=new Container();uiStage.addChild(ui,overlay);overlay.eventMode='none';
 worldStage.sortableChildren=true;
 const ground=document.createElement('canvas'),fig=document.createElement('canvas'),heroCell=Object.assign(document.createElement('canvas'),{width:114,height:125});
 const snowImage=new Image();snowImage.src=GAMEPLAY_SNOW;await snowImage.decode();
 const groundView=createCanvasSprite(ground),figureView=createCanvasSprite(fig);
 groundView.sprite.zIndex=0;figureView.sprite.zIndex=30;worldStage.addChild(groundView.sprite,figureView.sprite);
 const back=new Container(),front=new Container();back.zIndex=25;front.zIndex=40;worldStage.addChild(back,front);
 const model=create3dHeroRenderer({diagnostic:true,heroId:hero});
 const combat=createCombatVfx({renderer:app.renderer,layer:worldStage,heroCanvas:heroCell,backLayer:back,frontLayer:front,
  getHero:()=>({...position,heroId:hero,facing:Math.cos(ANGLES[dir]*Math.PI/180)>=0?1:-1,back:dir<2||dir===7,vertical:dir===0||dir===4}),getRun:()=>run,getFoes:()=>[],onKill:()=>{},random:Math.random});
 const fullTree=new SkillTree(uiStage,{run:()=>run,hero:()=>hero,
  region:()=>({rect:{x:12,y:12,width:app.screen.width-24,height:app.screen.height-24},vertical:app.screen.width<720}),
  equip:()=> 'Select a skill in FX Lab to preview it.',onSelect:id=>{fullTree.open(false);void choose(id);}});
 const emptyCombat=combat.saveState();let previewAge=0,seekRequest=0;
 const editor=new FxEditor({hero:()=>hero,skill:()=>skill()?.id??feedbackKey(),rank:()=>rank,setRank:(value:number)=>{rank=value;syncUrl();drawUI();void play();},catalog:()=>combat.fx.catalog(),redraw:drawUI,replay:play,prepare:async()=>{prepared.delete(hero);combat.clearVisuals();combat.restoreState(emptyCombat);await combat.fx.prepare();prepared.add(hero);},paused:()=>paused,extras:(parent,button,x,y,w)=>{const third=(w-16)/3;
 button(parent,loop?'Loop: ON':'Loop: OFF',x,y,third,()=>{loop=!loop;syncUrl();drawUI();},loop,'loop');
 button(parent,night?'Night':'Day',x+third+8,y,third,()=>{night=!night;paintSnow();drawUI();},false,'background');
 button(parent,'Full tree',x+2*(third+8),y,third,()=>{void fullTree.show(treeFocus());},false,'full-tree');
 directionText=(button(parent,`Facing: ${DIRS[dir]}`,x,y+40,third,()=>{dir=(dir+1)%8;syncUrl();drawUI();},false,'direction') as Container).children.find(c=>c instanceof Text) as Text;
 button(parent,runningInPlace?'Run in place':'Idle',x+third+8,y+40,third,()=>{runningInPlace=!runningInPlace;syncUrl();drawUI();},false,'pose');
 button(parent,'Reset view',x+2*(third+8),y+40,third,()=>{position.u=position.v=camera.u=camera.v=20;zoom=1;layout();},false,'reset-view');
 },pause:()=>{paused=!paused;keys.clear();drawUI();},seek:async(target:number)=>{const ticket=++seekRequest;paused=true;combat.clearVisuals();combat.restoreState(emptyCombat);await play(true);if(ticket!==seekRequest)return;paused=true;let remaining=target;while(remaining>0){if(ticket!==seekRequest)return;const dt=Math.min(.025,remaining);combat.step(dt*1000);combat.render();remaining-=dt;if(Math.round(remaining*100)%50===0)await nextPaint();}previewAge=target;time=target;castUntil=1.05;nextCast=editor.duration;editor.tick(target);drawUI();}});
 const stageWidth=()=>app.screen.width-(collapsed?0:sidebarWidth);
 let statusText:Text|undefined,zoomText:Text|undefined,directionText:Text|undefined;
 // Gameplay hero.face uses atan2(screenX, screenY); VFX uses tile-space yaw instead.
 const heroYaw=()=>Math.atan2(Math.cos(ANGLES[dir]*Math.PI/180),Math.sin(ANGLES[dir]*Math.PI/180));
 let pressedButton:string|undefined;const buttons:{label:string;x:number;y:number;w:number;h:number;action:()=>void}[]=[];
 const status=()=>playback==='loading'?playbackMessage:playback==='playing'?(paused?'Paused':`Playing · Rank ${rank}`):playback==='passive'?'Passive · no cast animation':playback==='planned'?'Planned · no gameplay VFX':playback==='error'?playbackMessage:'Ready · click skill to replay';
 function setPlayback(state:Playback,message=''){playback=state;playbackMessage=message;if(statusText&&!statusText.destroyed)statusText.text=status();drawOverlay();}
 function syncUrl(){history.replaceState(null,'','/fx-lab/?'+new URLSearchParams({hero,skill:selected,rank:String(rank),dir:DIRS[dir],pose:runningInPlace?'run':'idle',loop:loop?'1':'0',bg:night?'night':'day'}));}
 async function waitModel(id:HeroId){const end=performance.now()+60000;while(!model.isHeroReady(id)){if(performance.now()>end)throw Error('3D hero could not load. Reload to retry.');await new Promise(r=>setTimeout(r,100));}}
 function prepareHero(id:HeroId){
  if(prepared.has(id))return Promise.resolve();
  if(preparing.has(id))return preparing.get(id)!;
  const job=preparation.catch(()=>{}).then(async()=>{if(id!==hero)return;await nextPaint();await Promise.all([waitModel(id),combat.fx.loaded]);if(id!==hero)return;await combat.fx.prepare();if(combat.fx.failed())throw Error('Effects could not load. Reload to retry.');if(id===hero)prepared.add(id);});
  preparation=job;preparing.set(id,job);void job.finally(()=>{if(preparing.get(id)===job)preparing.delete(id);}).catch(()=>{});return job;
 }
 async function play(fromSeek=false){
  if(!fromSeek)++seekRequest;
  const ticket=++request,id=hero,chosen=selected;nextCast=Infinity;
  if(!skill()&&!feedbackKey()){setPlayback(node().kind==='passive'?'passive':'planned');return;}
  if(combat.fx.visualRevision()!==visualVersion())prepared.delete(id);
  if(!prepared.has(id))setPlayback('loading','Loading hero and skill effects…');
  try{await prepareHero(id);if(ticket!==request||id!==hero||chosen!==selected)return;
   if(!prepared.has(id)){await prepareHero(id);if(ticket!==request)return;}
   paused=false;run=fresh(hero);if(skill())run.skills[skill()!.id]=rank;combat.resetCooldowns();
   const yaw=yawOfScreenAngle(ANGLES[dir]*Math.PI/180);
   if(skill())combat.castSkill(skill()!.id,{targetU:position.u+Math.cos(yaw)*3.2,targetV:position.v+Math.sin(yaw)*3.2});
   else playCue(combat.fx,hero,feedbackKey()!,{...position,yaw,follow:()=>({...position})});previewAge=0;editor.tick(0);
   notifyHeroCast(1050);castUntil=time+1.05;nextCast=time+editor.duration;playCount++;setPlayback('playing');drawUI();
  }catch(e){if(ticket===request){setPlayback('error',e instanceof Error?e.message:'Could not load skill. Reload to retry.');drawUI();}}
 }
 async function choose(id:string){const found=choices().find(n=>n.id===id||n.game===id);if(!found)return;
  ++request;combat.clearVisuals();combat.restoreState(emptyCombat);selected=found.id;dropdown=false;editor.select();syncUrl();
  setPlayback(skill()||feedbackKey()?(prepared.has(hero)?'ready':'loading'):node().kind==='passive'?'passive':'planned','Loading skill effects…');drawUI();await play();
 }
 async function switchHero(id:HeroId){if(id===hero)return;fullTree.open(false);++request;hero=id;selected=nodes()[0].id;dropdown=false;optionScroll=0;keys.clear();combat.clearVisuals();combat.restoreState(emptyCombat);run=fresh(hero);editor.select();syncUrl();setPlayback(prepared.has(hero)?'ready':'loading','Loading 3D hero and effects…');drawUI();await play();}
 function text(parent:Container,value:string,x:number,y:number,size=13,color=0xdce6eb){const t=new Text({text:value,style:{fontFamily:'Arial',fontSize:size,fill:color}});t.position.set(x,y);parent.addChild(t);return t;}
 function button(parent:Container,value:string,x:number,y:number,w:number,action:()=>void,active=false,label=value){
  const c=new Container();c.label=label;c.position.set(x,y);c.addChild(new Graphics().roundRect(0,0,w,34,6).fill(active?0x37546b:0x192b3a).stroke({color:active?0xecc18b:0x496276,width:1}));
  const caption=text(c,value,8,9,12,active?0xffd79e:0xe0e9f0);if(caption.width>w-16)caption.scale.set(Math.max(.55,(w-16)/caption.width));c.eventMode='static';c.cursor='pointer';c.hitArea=new Rectangle(0,0,w,34);
  buttons.push({label,x,y,w,h:34,action});parent.addChild(c);return c;
 }
 function drawOverlay(){overlay.removeChildren().forEach(c=>c.destroy({children:true}));if(playback!=='loading')return;
  const width=Math.min(280,Math.max(140,stageWidth()-24)),x=(stageWidth()-width)/2,y=app.screen.height/2-40;
  overlay.addChild(new Graphics().roundRect(x,y,width,80,10).fill({color:0x0c1925,alpha:.94}).stroke({color:0x7294ab,width:1}));
  text(overlay,'Preparing preview…',x+16,y+16,15,0xffd79e);const hint=text(overlay,'Loading 3D hero and skill effects',x+16,y+43,12);hint.style.wordWrap=true;hint.style.wordWrapWidth=width-32;
 }
 let listRect={x:0,y:0,w:0,h:0};
 function drawUI(){
  directionText=undefined;buttons.length=0;ui.removeChildren().forEach(c=>c.destroy({children:true}));const w=app.screen.width,h=app.screen.height;
  if(collapsed){button(ui,'FX LAB ‹',w-100,16,88,()=>{collapsed=false;layout();},false,'sidebar-open');drawOverlay();app.render();return;}
  const x=w-sidebarWidth,pad=16,cx=x+pad,cw=sidebarWidth-pad*2;
  ui.addChild(new Graphics().rect(x,0,sidebarWidth,h).fill({color:0x0c1925,alpha:.97}));
  const handle=new Graphics().rect(x-5,0,10,h).fill({color:0x658399,alpha:.6});handle.label='sidebar-resize';handle.eventMode='static';handle.cursor='ew-resize';ui.addChild(handle);
  button(ui,'›',x-28,12,24,()=>{collapsed=true;dropdown=false;layout();},false,'sidebar-close');
  const half=(cw-8)/2;
  text(ui,'Hero',cx,12,11,0x9fb4c3);text(ui,'Skill',cx+half+8,12,11,0x9fb4c3);
  button(ui,(hero==='ember-warden'?'Ember Warden':'Rift Runner')+' ▾',cx,32,half,()=>{heroDropdown=!heroDropdown;dropdown=false;drawUI();},false,'hero-dropdown');
  button(ui,node().name.replace('\n',' ')+' ▾',cx+half+8,32,half,()=>{dropdown=!dropdown;heroDropdown=false;optionScroll=Math.max(0,Math.min(choices().length-7,choices().findIndex(n=>n.id===selected)-2));drawUI();},true,'skill-dropdown');
  editor.open=true;
  editor.draw(ui,button,cx,82,cw,h);
  if(heroDropdown){const menu=new Container();menu.addChild(new Graphics().rect(cx-4,70,cw+8,88).fill(0x09131e));
   button(menu,'Ember Warden',cx,74,cw,()=>{heroDropdown=false;void switchHero('ember-warden');},hero==='ember-warden','hero-ember');
   button(menu,'Rift Runner',cx,114,cw,()=>{heroDropdown=false;void switchHero('rift-runner');},hero==='rift-runner','hero-rift');ui.addChild(menu);
  }
  if(!dropdown){drawOverlay();app.render();return;}
  if(dropdown){
   const count=Math.min(7,Math.max(3,Math.floor((h-202)/48))),first=Math.min(Math.max(0,optionScroll),choices().length-count);
   listRect={x:cx,y:74,w:cw,h:count*48};const menu=new Container();menu.label='skill-options';
   menu.addChild(new Graphics().roundRect(cx-4,70,cw+8,count*48+8,6).fill(0x09131e).stroke({color:0x8199aa,width:1}));
   choices().slice(first,first+count).forEach((n,i)=>{const c=button(menu,n.name.replace('\n',' '),cx,74+i*48,cw,()=>{void choose(n.id);},n.id===selected,'skill-'+n.id);text(c,n.kind==='passive'?'Passive':n.game?'Active · click to play':'Planned',10,28,9,0x9fb4c3);c.hitArea=new Rectangle(0,0,cw,46);buttons[buttons.length-1].h=46;});ui.addChild(menu);
  }else listRect={x:0,y:0,w:0,h:0};
  drawOverlay();app.render();
 }
 function paintSnow(){const g=ground.getContext('2d')!;g.setTransform(1,0,0,1,0,0);g.fillStyle=gameplaySnowPattern(g,snowImage);g.translate(view.x,view.y);g.scale(view.scale,view.scale);g.fillRect(-view.x/view.scale,-view.y/view.scale,ground.width/view.scale,ground.height/view.scale);g.setTransform(1,0,0,1,0,0);if(night){g.fillStyle='rgba(16,30,65,.58)';g.fillRect(0,0,ground.width,ground.height);}groundView.sync();}
 function placeCamera(){const p=tilePoint(camera.u,camera.v),k=Math.max(.65,Math.min(1.8,stageWidth()/600))*zoom;view={x:stageWidth()*.5-p.x*k,y:app.screen.height*.55-p.y*k,scale:k};combat.place(view.x,view.y,k);paintSnow();}
 function layout(){sidebarWidth=Math.max(260,Math.min(sidebarWidth,app.screen.width-80));for(const c of [ground,fig]){c.width=Math.max(1,app.screen.width);c.height=Math.max(1,app.screen.height);}placeCamera();drawUI();}
 function setZoom(value:number,x=stageWidth()/2,y=app.screen.height*.55){const old=view.scale,wx=(x-view.x)/old,wy=(y-view.y)/old;zoom=Math.max(.4,Math.min(3.2,value));placeCamera();const dx=(x-(view.x+wx*view.scale))/view.scale,dy=(y-(view.y+wy*view.scale))/view.scale;camera.u-=dx/128+dy/64;camera.v-=dy/64-dx/128;placeCamera();if(zoomText&&!zoomText.destroyed)zoomText.text=`Zoom ${Math.round(zoom*100)}%`;}
 const inList=(x:number,y:number)=>dropdown&&x>=listRect.x&&x<=listRect.x+listRect.w&&y>=listRect.y&&y<=listRect.y+listRect.h;
 const inStage=(x:number)=>collapsed||x<app.screen.width-sidebarWidth-6;
 app.canvas.style.touchAction='none';app.canvas.tabIndex=0;
 app.canvas.addEventListener('wheel',e=>{if(fullTree.isOpen())return;e.preventDefault();if(!dropdown&&editor.wheel(e.clientX,e.clientY,e.deltaY))return;if(inList(e.clientX,e.clientY)){optionScroll=Math.max(0,Math.min(choices().length-3,optionScroll+(e.deltaY>0?1:-1)));drawUI();return;}const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?app.screen.height:1);setZoom(zoom*Math.exp(-delta*.0015),Math.min(e.clientX,stageWidth()),e.clientY);},{passive:false});
 const clearInput=()=>{keys.clear();touches.clear();pinchDistance=0;resizeStart=undefined;gesture=undefined;walking=false;};
 window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInput();});
 window.addEventListener('keydown',e=>{if(editor.key(e))return;const key=e.key.toLowerCase();if(!['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(key)||e.ctrlKey||e.metaKey||e.altKey||fullTree.isOpen())return;e.preventDefault();keys.add(key);});
 window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
 const buttonAt=(x:number,y:number)=>[...buttons].reverse().find(b=>(!editor.editing||b.label.startsWith('input-')||(editor.importer.open&&b.label.startsWith('import-')))&&x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);
 app.canvas.addEventListener('pointerdown',e=>{pressedButton=undefined;if(fullTree.isOpen())return;
  if(!collapsed&&Math.abs(e.clientX-(app.screen.width-sidebarWidth))<7){resizeStart={x:e.clientX,width:sidebarWidth};suppressTapUntil=performance.now()+250;return;}
  pressedButton=buttonAt(e.clientX,e.clientY)?.label;
  if(e.pointerType==='touch'&&inStage(e.clientX)){touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size===2){const [a,b]=[...touches.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);suppressTapUntil=Infinity;}try{app.canvas.setPointerCapture(e.pointerId);}catch{}}
  if(editor.canScroll(e.clientX,e.clientY)&&!dropdown)gesture={startY:e.clientY,lastY:e.clientY,moved:false,list:false};
  if(inList(e.clientX,e.clientY))gesture={startY:e.clientY,lastY:e.clientY,moved:false,list:true};
 });
 window.addEventListener('pointermove',e=>{
  if(pressedButton==='editor-timeline'){const b=buttons.find(b=>b.label==='editor-timeline');if(b)editor.scrub((e.clientX-b.x)/b.w);return;}
  if(resizeStart){sidebarWidth=Math.max(260,Math.min(app.screen.width-80,resizeStart.width+resizeStart.x-e.clientX));suppressTapUntil=performance.now()+250;layout();return;}
  if(touches.has(e.pointerId)){touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size===2){const [a,b]=[...touches.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance>0)setZoom(zoom*distance/pinchDistance,(a.x+b.x)/2,(a.y+b.y)/2);pinchDistance=distance;return;}}
  if(gesture&&Math.abs(e.clientY-gesture.startY)>8)gesture.moved=true;
  if(gesture?.moved&&!gesture.list){const dy=gesture.lastY-e.clientY;gesture.lastY=e.clientY;suppressTapUntil=performance.now()+250;editor.wheel(e.clientX,e.clientY,dy);return;}
  if(gesture?.moved&&Math.abs(e.clientY-gesture.lastY)>24){optionScroll=Math.max(0,Math.min(choices().length-3,optionScroll+(gesture.lastY>e.clientY?1:-1)));gesture.lastY=e.clientY;suppressTapUntil=performance.now()+250;drawUI();}
 });
 const pointerEnd=(e:PointerEvent)=>{if(touches.delete(e.pointerId)&&touches.size<2){pinchDistance=0;suppressTapUntil=performance.now()+250;}if(resizeStart)resizeStart=undefined;if(gesture?.moved)suppressTapUntil=performance.now()+250;gesture=undefined;const b=buttonAt(e.clientX,e.clientY);if(e.type==='pointerup'&&b&&b.label===pressedButton&&performance.now()>=suppressTapUntil){const action=b.action;pressedButton=undefined;if(b.label==='editor-timeline')editor.scrub((e.clientX-b.x)/b.w);else action();}else pressedButton=undefined;};
 window.addEventListener('pointerup',pointerEnd);window.addEventListener('pointercancel',pointerEnd);
 layout();window.addEventListener('resize',()=>{app.resize();layout();});
 progress(1,3,'Loading 3D heroes and gameplay effects');await prepareHero(hero);await editor.load();await combat.fx.prepare();prepared.add(hero);
 app.ticker.add(t=>{
  const movementDt=paused||fullTree.isOpen()||playback==='loading'||editor.editing||editor.seeking||editor.busy?0:Math.min(.05,t.deltaMS/1000),dt=movementDt*editor.speed;time+=dt;previewAge+=dt;editor.tick(previewAge);
  let sx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
  let sy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
  walking=!!movementDt&&!!(sx||sy);
  if(walking){const angle=Math.atan2(sy,sx),yaw=yawOfScreenAngle(angle);position.u+=Math.cos(yaw)*3.2*movementDt;position.v+=Math.sin(yaw)*3.2*movementDt;
   const previousDir=dir;let best=Infinity;ANGLES.forEach((a,i)=>{const d=Math.abs(Math.atan2(Math.sin(angle-a*Math.PI/180),Math.cos(angle-a*Math.PI/180)));if(d<best){best=d;dir=i;}});if(dir!==previousDir){syncUrl();if(directionText&&!directionText.destroyed)directionText.text=`Facing: ${DIRS[dir]}`;}
   const p=tilePoint(position.u,position.v),px=view.x+p.x*view.scale,py=view.y+p.y*view.scale,dx=px-stageWidth()*.5,dy=py-app.screen.height*.55;
   if(Math.abs(dx)>stageWidth()*.26||Math.abs(dy)>app.screen.height*.27){camera.u+=Math.cos(yaw)*3.2*movementDt;camera.v+=Math.sin(yaw)*3.2*movementDt;placeCamera();}
  }
  combat.step(dt*1000);combat.render();
  if(loop&&!paused&&!fullTree.isOpen()&&playback!=='loading'&&time>=nextCast)void play();
  if(playback==='playing'&&time>=nextCast-.1&&!loop)setPlayback('ready');
  const f=fig.getContext('2d')!;f.clearRect(0,0,fig.width,fig.height);
  const moving=walking||runningInPlace,yaw=heroYaw();
  const res=model.updateAndRender({heroId:hero,clip:time<castUntil?'cast':moving?'move':'idle',moving,yaw,dt,tint:night?'167,186,218':'255,255,255',night:night?1:0});
  if(res){const cell=heroCell.getContext('2d')!;cell.clearRect(0,0,114,125);cell.drawImage(res.sprite,0,0,res.spriteW,res.spriteH,0,0,114,125);const p=tilePoint(position.u,position.v),s=view.scale*1.3,top=res.spriteTop*103/(res.spriteH-res.spriteTop);f.save();f.translate(view.x+p.x*view.scale,view.y+p.y*view.scale);f.scale(s,s);if(res.shadow){const a=res.shadow;f.drawImage(a.canvas,a.sx,a.sy,a.sw,a.sh,-a.ox,-a.oy,a.sw,a.sh);}f.drawImage(res.sprite,0,0,res.spriteW,res.spriteH,-57,-101-top,114,103+top);f.restore();}figureView.sync();
 });
 const snapshot=()=>({hero,skill:selected,rank,dir:DIRS[dir],heroYaw:heroYaw(),facingLabel:directionText?.text??null,pose:walking||runningInPlace?'run':'idle',position:{...position},zoom,editor:editor.snapshot(),sidebar:{width:sidebarWidth,collapsed,dropdown},playback,message:status(),playCount,loop,paused,bg:night?'night':'day',modelReady:model.isHeroReady(hero),terrain:GAMEPLAY_SNOW,prepared:[...prepared],nodes:nodes().map(n=>({id:n.id,kind:n.kind,implemented:!!n.game})),combat:combat.snapshot()});
 (window as any).__FX_LAB__={state:snapshot,configuredEffect:(key:string)=>combat.fx.definition(key),controlBounds:(name:string)=>{const c=ui.getChildByLabel(name,true)??fullTree.panel.getChildByLabel(name,true);if(!c)return null;const b=c.getBounds(),p=c.getGlobalPosition();return {x:b.x,y:b.y,width:b.width,height:b.height,cx:name.startsWith('skill-node-')?p.x:b.x+b.width/2,cy:name.startsWith('skill-node-')?p.y:b.y+b.height/2};},tree:()=>fullTree.show(treeFocus()),closeTree:()=>fullTree.open(false),select:choose,setHero:switchHero,play,rank:(n:number)=>{rank=Math.max(1,Math.min(5,n));syncUrl();drawUI();return play();},pause:(p=true)=>{paused=p;keys.clear();drawUI();},direction:(n:number)=>{dir=((n%8)+8)%8;syncUrl();drawUI();}};
 document.body.dataset.fxLab='ready';app.canvas.dataset.ready='true';app.canvas.setAttribute('aria-label','FX Lab. WASD to walk, scroll or pinch to zoom. Resizable right sidebar with skill dropdown.');
 await play();progress(3,3,'FX Lab ready');
}
