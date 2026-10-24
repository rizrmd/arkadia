import '../storage-rename';
import {Application,Container,Sprite,Graphics,Assets,TilingSprite,Rectangle,type Texture} from 'pixi.js';
import {FrameSet,pickFrameScale} from '../typography/frames';
import {installMsdfFx,loadFonts} from '../typography/msdf';
import {MsdfText} from '../typography/text';
import {loadCharacters} from '../characters/sprites';
import {Arena} from '../characters/arena';
import {project,unproject} from '../isometric';
import {KEY,load,rewardSnowExpedition} from '../stronghold/economy';
import {transact} from '../stronghold/store';
import {SNOW_KEY,CAMP,CACHES,PATROL,freshSnow,loadSnow,canExtract,type SnowProgress} from './snow-progress';

const holder=document.querySelector<HTMLElement>('#snow-expedition')??document.querySelector<HTMLElement>('#app')??document.body;
const app=new Application(),world=new Container(),ground=new Container(),depth=new Container(),markers=new Container(),uiStage=new Container();
depth.sortableChildren=true;

let arena:Arena,progress:SnowProgress,started=false,completing=false,storageProblem='',target:{x:number;y:number}|null=null;
let maxHP=100,lastSave=0,scale=1,paused=true,restarting=false;
const cacheViews=new Map<string,Container>();

async function start(){
 try{
  const s=load(localStorage.getItem(KEY));
  maxHP+=(s.hero?20:0)+s.training*10+s.skill*5+(s.weapon?s.weapon*10+s.affix*5:0);
  progress=loadSnow(localStorage.getItem(SNOW_KEY),maxHP);
 }catch(e){
  storageProblem=String(e);
  progress=freshSnow(maxHP);
 }

 await app.init({resizeTo:window,background:0xb3c9d7,antialias:true,resolution:window.devicePixelRatio||1,autoDensity:true});
 holder.appendChild(app.canvas);
 installMsdfFx(app.renderer);
 const [,frames]=await Promise.all([loadFonts('/typography/v2/fonts/'),FrameSet.load('/typography/v2/hud/',pickFrameScale(window.devicePixelRatio||1))]);

 world.addChild(ground,depth,markers);
 const flakes=new Graphics();
 app.stage.addChild(world,flakes,uiStage);

 // Mission HUD in Pixi
 const hudBox=uiStage.addChild(new Container());
 hudBox.position.set(16,16);
 hudBox.addChild(frames.frame('panel-bronze',320,174));
 hudBox.addChild(new MsdfText('panel-label','EXPEDITION I · FROSTPASS')).place(20,32);
 const hpText=hudBox.addChild(new MsdfText('panel-body','Health 100 / 100'));
 hpText.place(20,58);
 const cacheText=hudBox.addChild(new MsdfText('panel-muted','Recover supplies · 0 / 3'));
 cacheText.place(20,86);
 const enemyText=hudBox.addChild(new MsdfText('panel-muted','Defeat revenants · 0 / 6'));
 enemyText.place(20,110);
 const statusText=hudBox.addChild(new MsdfText('panel-muted','Return to the campfire after securing the pass.',{wrapWidth:280,lineHeight:17}));
 statusText.place(20,136);

 const miniMap=uiStage.addChild(new Graphics());
 miniMap.position.set(16,202);

 // Briefing modal in Pixi
 const modalBox=uiStage.addChild(new Container());
 modalBox.position.set(Math.max(16,(innerWidth-420)/2),Math.max(24,(innerHeight-280)/2));
 modalBox.addChild(frames.frame('panel-bronze',420,280));
 modalBox.addChild(new MsdfText('label-wide','ARKODIA · SNOW FRONTIER',{size:13})).place(210,38,0.5);
 const modalTitle=modalBox.addChild(new MsdfText('display-title','Frostpass',{size:32}));
 modalTitle.place(210,76,0.5);
 const modalBody=modalBox.addChild(new MsdfText('panel-muted','Recover three supply caches, defeat six revenants, then return to camp.',{wrapWidth:364,lineHeight:20,align:'center'}));
 modalBody.place(210,118,0.5);

 const beginBtn=modalBox.addChild(new Container());
 beginBtn.position.set(110,206);
 beginBtn.eventMode='static';beginBtn.cursor='pointer';beginBtn.hitArea=new Rectangle(0,0,200,44);
 beginBtn.addChild(frames.frame('button-bronze',200,44));
 const beginLabel=beginBtn.addChild(new MsdfText('panel-title','Begin Expedition',{size:14}));
 beginLabel.place(100,27,0.5);

 function showModal(title:string,text:string,button:string){
  paused=true;arena?.keys.clear();target=null;
  modalBox.visible=true;
  modalTitle.text=title;modalTitle.place(210,76,0.5);
  modalBody.text=text;modalBody.place(210,118,0.5);
  beginLabel.text=button;beginLabel.place(100,27,0.5);
 }
 function restart(){restarting=true;localStorage.removeItem(SNOW_KEY);location.reload();}
 beginBtn.on('pointertap',()=>{
  if(storageProblem&&!started){restart();return;}
  if(progress.status==='complete'){location.href='/';return;}
  if(progress.status==='failed'){restart();return;}
  started=true;paused=false;modalBox.visible=false;
 });

 const checkpoint=()=>{
  if(!arena||restarting)return;
  progress.hero={x:arena.hero.x,y:arena.hero.y,hp:arena.hero.hp};
  try{localStorage.setItem(SNOW_KEY,JSON.stringify(progress));}catch{storageProblem='Progress could not be saved.';}
 };

 async function extract(){
  if(!canExtract(progress)||Math.hypot(arena.hero.x-CAMP.x,arena.hero.y-CAMP.y)>1.2)return;
  completing=true;paused=true;arena.keys.clear();
  try{
   let gained=false;
   await transact(s=>{gained=rewardSnowExpedition(s);});
   progress.status='complete';checkpoint();
   showModal('Frostpass Secured',gained?'The pass is clear. 150 Gold, 30 Mana and 5 Souls added.':'The pass is clear again.','Return to Stronghold');
  }finally{completing=false;}
 }

 function interact(){
  if(paused||!arena.hero.alive||completing)return;
  const cache=CACHES.find(c=>!progress.collected.includes(c.id)&&Math.hypot(arena.hero.x-c.x,arena.hero.y-c.y)<1.2);
  if(cache){
   progress.collected.push(cache.id);
   cacheViews.get(cache.id)!.visible=false;
   checkpoint();refresh();return;
  }
  if(canExtract(progress)&&Math.hypot(arena.hero.x-CAMP.x,arena.hero.y-CAMP.y)<1.2){void extract();}
 }

 function refresh(){
  hpText.text=`Health ${Math.ceil(arena.hero.hp)} / ${maxHP}`;hpText.place(20,58);
  cacheText.text=`Recover supplies · ${progress.collected.length} / 3`;cacheText.place(20,86);
  enemyText.text=`Defeat revenants · ${progress.defeated.length} / 6`;enemyText.place(20,110);
  statusText.text=canExtract(progress)?'Pass secured. Return to camp marker and press E.':'Return to the campfire after securing the pass.';
  statusText.place(20,136);

  miniMap.clear().rect(0,0,128,128).fill({color:0x132632,alpha:0.92}).rect(8,8,112,112).stroke({color:0x91b6c0,alpha:0.4,width:1});
  const dot=(x:number,y:number,color:number,r:number)=>{miniMap.circle(8+x/10*112,8+y/10*112,r).fill(color);};
  dot(CAMP.x,CAMP.y,0x7fd8ff,5);
  for(const c of CACHES)if(!progress.collected.includes(c.id))dot(c.x,c.y,0xffd276,4);
  for(const e of arena.enemies)if(e.alive)dot(e.x,e.y,0xe98785,2);
  dot(arena.hero.x,arena.hero.y,0xfff7df,4);
 }

 const ids=['snow-soft-texture','spruce-mature','fir-young','cliff-snow','boulders-snow','snowdrift-edge','paving-worn','supply-cart','brazier'],textures:Record<string,Texture>={};
 await Promise.all(ids.map(async id=>textures[id]=await Assets.load(`/modular-stronghold/v2/${id}.png`)));
 textures.crate=await Assets.load('/modular-stronghold/crate.png');
 const snow=new TilingSprite({texture:textures['snow-soft-texture'],width:4096,height:4096});snow.position.set(-2048,-2048);snow.tileScale.set(.6);ground.addChild(snow);
 const point=(x:number,y:number)=>project(x-4.5,y-4.5);
 function prop(id:string,x:number,y:number,width:number,layer=depth){const sprite=new Sprite(textures[id]);sprite.anchor.set(.5,.97);sprite.width=width;sprite.scale.y=Math.abs(sprite.scale.x);const p=point(x,y);sprite.position.set(p.x,p.y);sprite.zIndex=p.y;layer.addChild(sprite);return sprite;}
 for(let n=-1;n<=10;n+=1.35){prop(Math.floor(n*10)%2?'spruce-mature':'fir-young',n,-.6,145+(n%2)*20);prop('spruce-mature',10.1,n,160);prop('fir-young',-.6,n,150);prop('spruce-mature',n,10.1,160);}
 for(const [x,y] of [[-1,3],[4,-1],[10.5,4],[4,10.5]])prop('cliff-snow',x,y,310);
 for(const [x,y] of [[1,1],[9.4,5],[5,9.4],[3,-.5]])prop('boulders-snow',x,y,115);
 for(const [x,y] of [[2,7],[3,5.5],[4.5,4.5],[6,3],[7,3],[7.5,6.5]])prop('paving-worn',x,y,155,ground);
 for(const [x,y] of [[2.5,1],[6,1],[9,4],[4,8.8]])prop('snowdrift-edge',x,y,195,ground);
 prop('brazier',CAMP.x-.45,CAMP.y,42);prop('supply-cart',CAMP.x+.6,CAMP.y+.3,90);
 const campRing=new Graphics().ellipse(0,0,52,26).stroke({color:0x88dfff,width:3});campRing.position.copyFrom(point(CAMP.x,CAMP.y));ground.addChild(campRing);
 for(const cache of CACHES){const group=new Container(),p=point(cache.x,cache.y);group.position.set(p.x,p.y);group.zIndex=p.y;const ring=new Graphics().ellipse(0,0,30,15).stroke({color:0xffd276,width:2});const chest=new Sprite(textures.crate);chest.anchor.set(.5,.97);chest.width=43;chest.scale.y=chest.scale.x;group.addChild(ring,chest);group.visible=!progress.collected.includes(cache.id);group.eventMode='static';group.cursor='pointer';group.on('pointertap',()=>{target={x:cache.x,y:cache.y};});depth.addChild(group);cacheViews.set(cache.id,group);}

 const chars=await loadCharacters();let seed=117;
 arena=new Arena(chars.sets,project,()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;});
 arena.auto=false;arena.respawnEnemies=false;arena.spawn(6);
 Object.assign(arena.hero,progress.hero);arena.kills=progress.defeated.length;
 arena.enemies.forEach((e,i)=>{Object.assign(e,PATROL[i]);if(progress.defeated.includes(i)){e.hp=0;e.play('die');e.deadFor=5000;e.view.alpha=0;}});
 arena.attach(depth);

 const fit=()=>{scale=Math.max(.7,Math.min(1.25,innerHeight/800));world.scale.set(scale);modalBox.position.set(Math.max(16,(innerWidth-420)/2),Math.max(24,(innerHeight-280)/2));};
 window.addEventListener('resize',fit);fit();

 let time=0;const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 app.ticker.add(t=>{
  if(!paused){
   if(target){
    const p=point(target.x,target.y),h=point(arena.hero.x,arena.hero.y),dx=p.x-h.x,dy=p.y-h.y;
    arena.keys.clear();
    if(Math.hypot(dx,dy)<15){target=null;interact();}
    else{if(dx>9)arena.keys.add('d');if(dx<-9)arena.keys.add('a');if(dy>9)arena.keys.add('s');if(dy<-9)arena.keys.add('w');}
   }
   arena.update(t.deltaMS);
   let changed=false;
   arena.enemies.forEach((e,i)=>{if(!e.alive&&!progress.defeated.includes(i)){progress.defeated.push(i);changed=true;}});
   progress.hero={x:arena.hero.x,y:arena.hero.y,hp:arena.hero.hp};
   if(!arena.hero.alive){progress.status='failed';checkpoint();showModal('Expedition Lost','The revenants overran the pass.','Try Again');}
   if(changed||performance.now()-lastSave>1200){checkpoint();lastSave=performance.now();}
   refresh();
  }
  const p=point(arena.hero.x,arena.hero.y);
  world.position.set(innerWidth/2-p.x*scale,innerHeight*.55-p.y*scale);
  flakes.clear();
  if(!reduced){
   time+=t.deltaMS/1000;
   for(let i=0;i<38;i++){
    const x=((i*173+Math.sin(time*.2+i)*25)%innerWidth+innerWidth)%innerWidth;
    const y=(i*97+time*(14+i%5*4))%innerHeight;
    flakes.circle(x,y,1+i%3*.4).fill({color:0xf5fbff,alpha:.4});
   }
  }
 });

 app.canvas.addEventListener('pointerup',e=>{
  if(paused)return;
  const r=app.canvas.getBoundingClientRect(),p=world.toLocal({x:e.clientX-r.left,y:e.clientY-r.top}),grid=unproject(p.x,p.y);
  target={x:Math.max(.9,Math.min(9.1,grid.x+4.5)),y:Math.max(.9,Math.min(9.1,grid.y+4.5))};
 });
 const key=(e:KeyboardEvent)=>({ArrowUp:'w',ArrowDown:'s',ArrowLeft:'a',ArrowRight:'d'}[e.key]||e.key.toLowerCase());
 window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){showModal('Expedition Paused','Your checkpoint is saved.','Resume Expedition');checkpoint();return;}
  if(paused)return;
  const k=key(e);
  if(k==='e'){e.preventDefault();interact();}
  if(['w','a','s','d',' '].includes(k)){e.preventDefault();target=null;arena.keys.add(k);}
 });
 window.addEventListener('keyup',e=>arena.keys.delete(key(e)));

 (window as any).__SNOW_EXPEDITION__={arena,progress,interact,snapshot:()=>({progress,arena:arena.snapshot(),paused,maxHP})};
 refresh();
 if(progress.status==='complete')showModal('Frostpass Secured','This expedition was completed.','Return to Stronghold');
 else if(progress.status==='failed')showModal('Expedition Lost','Restart from camp to try again.','Try Again');
 else if(storageProblem)showModal('Checkpoint Unavailable',storageProblem,'Restart Expedition');
}
void start();
