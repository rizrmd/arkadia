import {GAMEPLAY_SNOW,gameplaySnowPattern} from '../stronghold/snow-material';
import {Container,Graphics,Text,Rectangle} from 'pixi.js';
import {ensurePixiRuntime,createCanvasSprite,type Progress} from '../app/loader';
import {create3dHeroRenderer,notifyHeroCast} from '../stronghold/hero-3d';
import {createCombatVfx,HERO_SKILLS,type SkillId} from '../stronghold/combat-vfx';
import {SkillTree,TREE_NODES,EMBER_TREE_NODES} from '../stronghold/skill-tree';
import {fresh,cards} from '../stronghold/progression';
import {tilePoint} from '../stronghold/terrain';
import {yawOfScreenAngle} from './space';
import type {HeroId} from '../stronghold/heroes';

export const DIRS=['N','NE','E','SE','S','SW','W','NW'] as const;
const ANGLES=[-90,-28,0,20,90,152,180,-152];
const SNOW=GAMEPLAY_SNOW;
export async function mount(root:HTMLElement,progress:Progress){
 const rt=await ensurePixiRuntime(root),{app,worldStage,uiStage}=rt;
 const q=new URLSearchParams(location.search);
 let hero:HeroId=q.get('hero')?.startsWith('rift')?'rift-runner':'ember-warden';
 let selected=q.get('skill')??q.get('play')??(hero==='ember-warden'?'flame-fan':'rift-bolt');
 let rank=Math.max(1,Math.min(5,Number(q.get('rank'))||1)),dir=Math.max(0,DIRS.indexOf((q.get('dir')??'SE') as typeof DIRS[number]));
 let moving=q.get('pose')==='run',loop=q.get('loop')!=='0',paused=false,night=q.get('bg')==='night',zoom=1;
 let time=0,nextCast=0,castUntil=0,scroll=0;
 let run=fresh(hero),view={x:0,y:0,scale:1};
 const nodes=()=>hero==='ember-warden'?EMBER_TREE_NODES:TREE_NODES;
 if(!nodes().some(n=>n.id===selected))selected=nodes()[0].id;
 const node=()=>nodes().find(n=>n.id===selected)!;
 const skill=()=>HERO_SKILLS[hero].find(s=>s.id===node().game);
 const ui=new Container(),tree=new Container(),mask=new Graphics();uiStage.addChild(ui,tree,mask);tree.mask=mask;
 worldStage.sortableChildren=true;
 const ground=document.createElement('canvas'),fig=document.createElement('canvas');
 const snowImage=new Image();snowImage.src=SNOW;await snowImage.decode();
 const groundView=createCanvasSprite(ground),figureView=createCanvasSprite(fig);
 groundView.sprite.zIndex=0;figureView.sprite.zIndex=30;worldStage.addChild(groundView.sprite,figureView.sprite);
 const back=new Container(),front=new Container();back.zIndex=25;front.zIndex=40;worldStage.addChild(back,front);
 const model=create3dHeroRenderer({diagnostic:true,heroId:hero});
 const combat=createCombatVfx({renderer:app.renderer,layer:worldStage,heroCanvas:fig,backLayer:back,frontLayer:front,getHero:()=>({u:20,v:20,heroId:hero,facing:Math.cos(ANGLES[dir]*Math.PI/180)>=0?1:-1,back:dir<2||dir===7,vertical:dir===0||dir===4}),getRun:()=>run,getFoes:()=>[],onKill:()=>{},random:Math.random});
 const fullTree=new SkillTree(uiStage,{run:()=>run,hero:()=>hero,region:()=>({rect:{x:12,y:12,width:app.screen.width-24,height:app.screen.height-24},vertical:app.screen.width<720}),equip:()=>"Select a skill in FX Lab to preview it."});
 const emptyCombat=combat.saveState();
 const snapshot=()=>({hero,skill:selected,rank,dir:DIRS[dir],pose:moving?'run':'idle',loop,paused,bg:night?'night':'day',modelReady:model.isHeroReady(hero),terrain:SNOW,nodes:nodes().map(n=>({id:n.id,kind:n.kind,implemented:!!n.game})),combat:combat.snapshot()});
 function syncUrl(){const p=new URLSearchParams({hero,skill:selected,rank:String(rank),dir:DIRS[dir],pose:moving?'run':'idle',loop:loop?'1':'0',bg:night?'night':'day'});history.replaceState(null,'','/fx-lab/?'+p);}
 function play(){if(!skill())return;paused=false;run=fresh(hero);run.skills[skill()!.id]=rank;combat.resetCooldowns();const yaw=yawOfScreenAngle(ANGLES[dir]*Math.PI/180);combat.castSkill(skill()!.id,{targetU:20+Math.cos(yaw)*3.2,targetV:20+Math.sin(yaw)*3.2});notifyHeroCast(1050);castUntil=time+1.05;nextCast=time+3.6;}
 function choose(id:string){if(!nodes().some(n=>n.id===id))return;combat.restoreState(emptyCombat);selected=id;syncUrl();drawUI();play();}
 function label(parent:Container,text:string,x:number,y:number,size=14,color=0xdce6eb){const t=new Text({text,style:{fontFamily:'Arial',fontSize:size,fill:color}});t.position.set(x,y);parent.addChild(t);return t;}
 function button(parent:Container,text:string,x:number,y:number,w:number,action:()=>void,active=false){const c=new Container();c.position.set(x,y);c.addChild(new Graphics().roundRect(0,0,w,34,6).fill(active?0x37546b:0x192b3a).stroke({color:active?0xecc18b:0x496276,width:1}));label(c,text,10,9,12,active?0xffd79e:0xe0e9f0);c.eventMode='static';c.cursor='pointer';c.hitArea=new Rectangle(0,0,w,34);c.on('pointertap',action);parent.addChild(c);}
 let panel={x:0,y:0,w:0,h:0};
 function drawUI(){ui.removeChildren().forEach(c=>c.destroy({children:true}));tree.removeChildren().forEach(c=>c.destroy({children:true}));const w=app.screen.width,h=app.screen.height,phone=w<720;
 panel=phone?{x:12,y:Math.round(h*.55),w:w-24,h:Math.round(h*.45)-12}:{x:w-354,y:16,w:338,h:h-32};
 ui.addChild(new Graphics().roundRect(panel.x,panel.y,panel.w,panel.h,10).fill({color:0x0c1925,alpha:.96}).stroke({color:0x6f8390,width:1}));
 const x=panel.x+14,y=panel.y+14,pw=panel.w-28;
 label(ui,'FX LAB / ASCENSION',x,y,18,0xffd79e);
 button(ui,'Ember Warden',x,y+32,pw/2-4,()=>switchHero('ember-warden'),hero==='ember-warden');button(ui,'Rift Runner',x+pw/2+4,y+32,pw/2-4,()=>switchHero('rift-runner'),hero==='rift-runner');
 label(ui,'All 15 nodes · scroll to inspect',x,y+78,12,0x96acba);
 const top=y+102,bottom=panel.y+panel.h-12;mask.clear().rect(x,top,pw,Math.max(10,bottom-top)).fill(0xffffff);
 const max=Math.max(0,nodes().length*52-(bottom-top));scroll=Math.max(0,Math.min(scroll,max));
 nodes().forEach((n,i)=>{const yy=top+i*52-scroll;if(yy+48<top||yy>bottom)return;const c=new Container();c.position.set(x,yy);c.addChild(new Graphics().roundRect(0,0,pw,46,5).fill(n.id===selected?0x30465a:0x152536).stroke({color:n.id===selected?0xecc18b:0x31485b,width:1}));label(c,n.name.replace('\n',' '),10,6,13,n.id===selected?0xffd79e:0xe0e9f0);label(c,n.kind==='passive'?'PASSIVE':n.game?'ACTIVE · PLAYABLE':'PLANNED · NO GAMEPLAY VFX',10,26,10,0x9fb4c3);c.eventMode='static';c.cursor='pointer';c.on('pointertap',()=>choose(n.id));tree.addChild(c);});
 // Stage controls remain separate from the scrollable tree on every viewport.
 const cw=phone?w-24:w-390,cx=12;
 ui.addChild(new Graphics().roundRect(cx,12,cw,phone?142:150,8).fill({color:0x0c1925,alpha:.93}));
 label(ui,node().name.replace('\n',' '),cx+12,24,18,0xffd79e);
 const description=node().game?(cards[node().game!]?.description??'Gameplay skill preview'):'Planned skill: gameplay and VFX are not implemented yet.';
 const info=label(ui,description,cx+12,49,12);info.style.wordWrap=true;info.style.wordWrapWidth=cw-24;
 const bwidth=Math.min(96,(cw-32)/3);
 button(ui,paused?'Resume':'Pause',cx+10,phone?96:105,bwidth,()=>{paused=!paused;drawUI();});button(ui,'Replay',cx+18+bwidth,phone?96:105,bwidth,play);button(ui,loop?'Loop: ON':'Loop: OFF',cx+26+2*bwidth,phone?96:105,bwidth,()=>{loop=!loop;syncUrl();drawUI();});
 const by=phone?Math.round(h*.55)-82:h-96;
 button(ui,`Rank ${rank} / 5`,12,by,96,()=>{rank=rank%5+1;syncUrl();drawUI();play();});button(ui,DIRS[dir],116,by,56,()=>{dir=(dir+1)%8;syncUrl();drawUI();});button(ui,moving?'Run':'Idle',180,by,64,()=>{moving=!moving;syncUrl();drawUI();});button(ui,night?'Night':'Day',252,by,64,()=>{night=!night;syncUrl();drawUI();paintSnow();});
 button(ui,'−',12,by+40,40,()=>{zoom=Math.max(.6,zoom-.2);layout();});button(ui,'+',60,by+40,40,()=>{zoom=Math.min(2.4,zoom+.2);layout();});button(ui,'Full skill tree',112,by+40,140,()=>{void fullTree.show(node().id);});
 }
 async function switchHero(id:HeroId){if(id===hero)return;fullTree.open(false);hero=id;selected=nodes()[0].id;scroll=0;combat.restoreState(emptyCombat);run=fresh(hero);syncUrl();drawUI();await waitModel();await combat.fx.prepare();play();}
 function paintSnow(){const g=ground.getContext('2d')!;g.setTransform(1,0,0,1,0,0);const p=gameplaySnowPattern(g,snowImage);g.translate(view.x,view.y);g.scale(view.scale,view.scale);g.fillStyle=p;g.fillRect(-view.x/view.scale,-view.y/view.scale,ground.width/view.scale,ground.height/view.scale);g.setTransform(1,0,0,1,0,0);if(night){g.fillStyle='rgba(16,30,65,.58)';g.fillRect(0,0,ground.width,ground.height);}groundView.sync();}
 function layout(){const w=app.screen.width,h=app.screen.height,phone=w<720,area=phone?w:w-370,ph=phone?h*.55:h;const k=Math.max(.65,Math.min(1.8,area/600))*zoom,p=tilePoint(20,20);view={x:area*.46-p.x*k,y:ph*.63-p.y*k,scale:k};for(const c of [ground,fig]){c.width=w;c.height=h;}combat.place(view.x,view.y,k);paintSnow();drawUI();}
 async function waitModel(){const end=performance.now()+60000;while(!model.isHeroReady(hero)){if(performance.now()>end)throw Error('3D hero could not load');await new Promise(r=>setTimeout(r,100));}}
 const onWheel=(e:WheelEvent)=>{if(e.clientX>=panel.x&&e.clientY>=panel.y){e.preventDefault();scroll+=e.deltaY;drawUI();}};app.canvas.addEventListener('wheel',onWheel,{passive:false});
 let touchY=0;app.canvas.addEventListener('pointerdown',e=>{touchY=e.clientY;});app.canvas.addEventListener('pointermove',e=>{if(e.buttons&&e.clientX>=panel.x&&e.clientY>panel.y+102){scroll+=touchY-e.clientY;touchY=e.clientY;drawUI();}});
 layout();window.addEventListener('resize',()=>{app.resize();layout();});
 progress(1,3,'Loading 3D heroes and gameplay effects');await Promise.all([waitModel(),combat.fx.loaded]);await combat.fx.prepare();
 app.ticker.add(t=>{const dt=paused||fullTree.isOpen()?0:Math.min(.05,t.deltaMS/1000);time+=dt;combat.step(dt*1000);combat.render();if(loop&&!paused&&!fullTree.isOpen()&&time>=nextCast)play();const f=fig.getContext('2d')!;f.clearRect(0,0,fig.width,fig.height);const yaw=yawOfScreenAngle(ANGLES[dir]*Math.PI/180),res=model.updateAndRender({heroId:hero,clip:time<castUntil?'cast':moving?'move':'idle',moving,yaw,dt,tint:night?'167,186,218':'255,255,255',night:night?1:0});
 if(res){const p=tilePoint(20,20),s=view.scale*1.3,top=res.spriteTop*103/(res.spriteH-res.spriteTop);f.save();f.translate(view.x+p.x*view.scale,view.y+p.y*view.scale);f.scale(s,s);if(res.shadow){const a=res.shadow;f.drawImage(a.canvas,a.sx,a.sy,a.sw,a.sh,-a.ox,-a.oy,a.sw,a.sh);}f.drawImage(res.sprite,0,0,res.spriteW,res.spriteH,-57,-101-top,114,103+top);f.restore();}figureView.sync();});
 (window as any).__FX_LAB__={state:snapshot,tree:()=>fullTree.show(node().id),closeTree:()=>fullTree.open(false),select:choose,setHero:switchHero,play,rank:(n:number)=>{rank=Math.max(1,Math.min(5,n));syncUrl();drawUI();play();},pause:(p=true)=>{paused=p;drawUI();},direction:(n:number)=>{dir=((n%8)+8)%8;syncUrl();drawUI();}};
 document.body.dataset.fxLab='ready';app.canvas.dataset.ready='true';app.canvas.setAttribute('aria-label','FX Lab: 3D Ember Warden and Rift Runner, gameplay snow, full ascension trees');play();progress(3,3,'FX Lab ready');
}
