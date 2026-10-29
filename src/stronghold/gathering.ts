import {resourceLabel} from './resource-mode';
import {Fighter} from '../characters/combat';
import {characters} from './heroes';
import {moveWildlife,wildlifeReach,type Roam} from './wildlife-motion';
import {Assets,Container,Graphics,Rectangle,Sprite,Text,Texture} from 'pixi.js';
import {environment,asset,manageHarvestableTreeCollision,ORIGIN} from '../environment/model';
import {FRONTIER_PROPS,FRONTIER_ATLAS} from '../world/frontier';
import {rectColumns} from '../world/frontier';
import {tilePoint,COURT} from './terrain';
import {unproject} from '../isometric';
import {METERS_PER_TILE,GATE,inSafeZone} from './safe-zone';
import {cliffTile,liftAtTile} from '../world/relief';
import {KEY,load} from './economy';
import {prepareInventoryGameplay,setGatheringCapture,setGatheringResourceCommit} from './gameplay-save';
import {readInventory} from './items';
import {eat,advanceClock,CHOP_METERS,TREE_RULES,WILDLIFE_RULES,treeKind,readGathering,readResources,harvest,hunt,collect,respawnTree,respawnAnimal,type Gathering,type Resources,type Point,type TreeKind,type Species} from './gathering-rules';
export type GatherStep={alive:boolean;steering:boolean;busy:boolean};
type Options={worldStage:Container;uiStage:Container;day:number;hero:()=>{x:number;y:number};blocked:(x:number,y:number)=>boolean;changed:()=>void;hudBottom:()=>number;resourceTop?:()=>number;ledger:()=>{goldLabel:string;timeLabel:string};onClockClick?:()=>void;onResources?:(wood:number,food:number)=>void;onPrepare?:(done:number,total:number)=>Promise<void>};
type Tree={id:string;kind:TreeKind;anchor:Point;width:number;height:number;pivot:[number,number];texture:Texture;image:HTMLImageElement;sprite:Sprite};
const distance=(a:Point,b:Point)=>Math.hypot(a.u-b.u,a.v-b.v)*METERS_PER_TILE;
export async function createGathering(o:Options){
 const treeTotal=FRONTIER_PROPS.filter(p=>treeKind(p.asset)).length+environment().objects.filter(p=>treeKind(p.asset)).length;
 const preparationTotal=treeTotal+2;let prepared=0;
 await o.onPrepare?.(prepared,preparationTotal);
 manageHarvestableTreeCollision();
 const initial=load(localStorage.getItem(KEY));let state=readGathering(initial.gathering,o.day),resources=readResources(initial.resources),error='';
 const trees:Tree[]=[],layer=new Container({label:'Harvestable trees'}),animalsLayer=new Container({label:'Huntable wildlife'});layer.sortableChildren=true;layer.zIndex=10.67;animalsLayer.zIndex=19;animalsLayer.sortableChildren=true;o.worldStage.addChild(layer,animalsLayer);
 const hud=new Container({label:'Gold, game time, Wood and Food'});hud.zIndex=12;o.uiStage.addChild(hud);
 const status=new Text({text:'',style:{fontFamily:'Georgia',fontSize:13,fill:0xffe3a0,wordWrap:true,wordWrapWidth:270}});status.position.set(12,75);
 const bg=new Graphics().roundRect(0,0,252,64,8).fill({color:0x171e21,alpha:.94}).stroke({color:0xb59a61,width:1});
 const wood=new Text({text:'',style:{fontFamily:'Georgia',fontSize:15,fill:0xf1dfb4}}),food=new Text({text:'',style:{fontFamily:'Georgia',fontSize:15,fill:0xf1dfb4}});wood.position.set(36,36);food.position.set(161,36);
 const icons=new Graphics().roundRect(9,44,22,9,3).fill(0x94613e).ellipse(12,48,4,5).fill(0xc89b62).stroke({color:0x61422b,width:1}).ellipse(12,48,2,3).stroke({color:0x765335,width:1});
 // One painted texture is shared by the resource counter and both wildlife drops.
 const meatTexture=await Assets.load<Texture>('/food-drop/raw-meat-v1.png');
 function meatSprite(width:number){const icon=new Sprite({texture:meatTexture,label:'Raw meat'});icon.eventMode='none';icon.width=width;icon.height=width*meatTexture.height/meatTexture.width;return icon;}
 const foodIcon=meatSprite(25);foodIcon.position.set(130,35);
 const gold=new Text({text:'',style:{fontFamily:'Georgia',fontSize:15,fill:0xf1dfb4}}),clock=new Text({text:'',style:{fontFamily:'Georgia',fontSize:15,fill:0xf1dfb4}});gold.position.set(36,7);clock.position.set(161,7);
 const ledgerIcons=new Graphics().circle(19,18,9).fill(0xcda44c).stroke({color:0xf1dfb4,width:1}).circle(143,18,9).stroke({color:0xf1dfb4,width:1.5}).moveTo(143,12).lineTo(143,18).lineTo(148,20).stroke({color:0xf1dfb4,width:1.5});
 hud.addChild(bg,icons,foodIcon,gold,clock,ledgerIcons,wood,food,status);
 const clockButton=new Container({label:'Game time settings'});clockButton.eventMode='static';clockButton.cursor='pointer';clockButton.hitArea=new Rectangle(125,0,127,32);hud.addChild(clockButton);clockButton.on('pointerdown',e=>e.stopPropagation());clockButton.on('pointertap',e=>{e.stopPropagation();o.onClockClick?.();});
 const hungerHud=new Container({label:'Hunger'}),hungerBar=new Graphics(),hungerText=new Text({text:'',style:{fontFamily:'Georgia',fontSize:12,fill:0xffe1ae}});hungerHud.addChild(hungerBar,hungerText);hungerText.position.set(7,4);o.uiStage.addChild(hungerHud);hungerHud.zIndex=12;hungerHud.visible=false;
 const eatButton=new Container({label:'Eat meat'});eatButton.eventMode='static';eatButton.cursor='pointer';eatButton.hitArea=new Rectangle(125,32,127,32);hud.addChild(eatButton);let feedback='',feedbackMs=0;
 eatButton.on('pointerdown',e=>e.stopPropagation());eatButton.on('pointertap',e=>{e.stopPropagation();consume();});
 const progress=new Graphics();progress.y=67;hud.addChild(progress);
 let active:string|null=null,chopMs=0,retry=0,animationMs=0,lastUi='',sceneVersion=0,axeOwned=readInventory(initial.inventory).axe>0;
 const heroTile=()=>{const p=o.hero(),t=unproject(p.x-COURT.x,p.y-COURT.y);return {u:t.x,v:t.y};};
 let previousHero=heroTile();
 function persist(){
  const root=load(localStorage.getItem(KEY));root.resources=structuredClone(resources);root.gathering=structuredClone(state);
  const acknowledge=prepareInventoryGameplay(root);root.revision++;localStorage.setItem(KEY,JSON.stringify(root));acknowledge();
 }
 function consume(){if(error)return false;const reason=state.hunger>=100?'Hunger Full':resources.food<1?'Not Enough Food':'';const ok=!reason&&commit(()=>eat(state,resources));feedback=reason||(ok?'Ate meat • +20 Hunger':'');feedbackMs=2500;updateUi();return !!ok;}
 function commit(change:()=>boolean){const old=structuredClone(state),oldR=structuredClone(resources);try{if(!change())return false;persist();return true;}catch(e){state=old;resources=oldR;error=(e as Error).message;active=null;chopMs=0;return false;}}
 setGatheringResourceCommit(root=>{const next=readResources(root.resources);return ()=>{resources=next;updateUi();};});
 setGatheringCapture(root=>{if(error)throw Error('Gathering save failed: '+error);root.gathering=structuredClone(state);root.resources=structuredClone(resources);});
 async function addTree(id:string,kind:TreeKind,anchor:Point,texture:Texture,width:number,height:number,pivot:[number,number],flip=false){
  const canvas=document.createElement('canvas');canvas.width=texture.frame.width;canvas.height=texture.frame.height;const c=canvas.getContext('2d')!;c.drawImage(texture.source.resource as CanvasImageSource,texture.frame.x,texture.frame.y,texture.frame.width,texture.frame.height,0,0,canvas.width,canvas.height);
  const image=new Image();image.src=canvas.toDataURL();await image.decode();
  const sprite=new Sprite(texture);sprite.anchor.set(...pivot);sprite.width=width;sprite.height=height;if(flip)sprite.scale.x*=-1;layer.addChild(sprite);
  trees.push({id,kind,anchor,texture,width,height,pivot,image,sprite});state.trees[id]??={...anchor,cycle:0,readyDay:state.day,down:false};
  await o.onPrepare?.(++prepared,preparationTotal);
 }
 {const atlas=await Assets.load<Texture>(FRONTIER_ATLAS);for(const p of FRONTIER_PROPS){const kind=treeKind(p.asset);if(kind)await addTree(p.key,kind,{u:p.u,v:p.v},new Texture({source:atlas.source,frame:new Rectangle(...p.frame)}),p.width,p.height,p.pivot,p.flip);}}
 for(const p of environment().objects){const kind=treeKind(p.asset);if(!kind)continue;const a=asset(p.asset),base=await Assets.load<Texture>(a.file),tex=a.frame?new Texture({source:base.source,frame:new Rectangle(...a.frame as [number,number,number,number])}):base;await addTree('map:'+environment().revision+':'+p.id,kind,{u:p.u-ORIGIN.u,v:p.v-ORIGIN.v},tex,a.width,a.height,a.pivot as [number,number]);}
 // Wildlife slots are stable per map. At most one pending animal/loot per slot;
 // missed days do not accumulate an exploitable backlog.
 const prefix='wild:'+environment().revision+':';
 const specs=Object.entries(WILDLIFE_RULES).map(([species])=>({id:prefix+species,species:species as Species}));
 function clear(p:Point){const w=tilePoint(p.u,p.v);return !inSafeZone(p)&&!o.blocked(w.x,w.y)&&liftAtTile(p.u,p.v)===0;}
 function animalPoint(species:Species):Point|null{
  const pond=environment().objects.find(p=>p.asset.startsWith('pond-'));
  const anchor=species==='crocodile'&&pond?{u:pond.u-ORIGIN.u,v:pond.v-ORIGIN.v}:{u:GATE.u+(species==='deer'?4:-3),v:GATE.v+5};
  for(let n=0;n<80;n++){const a=n*.7,r=1+n*.12,p={u:anchor.u+Math.cos(a)*r,v:anchor.v+Math.sin(a)*r};if(clear(p)&&trees.every(t=>state.trees[t.id].down||distance(p,state.trees[t.id])>2))return p;}return null;
 }
 for(const spec of specs)if(!state.animals[spec.id]){const p=animalPoint(spec.species);if(p)state.animals[spec.id]={...p,cycle:0,readyDay:state.day,status:'alive'};}
 // Use stable combat adapters so existing projectile/cone/circle collision rules also hit prey.
 const preyClips=(await characters()).hero.clips;
 const prey=new Map<Fighter,string>();
 class WildlifeFighter extends Fighter{
  constructor(readonly id:string,readonly species:Species){const a=state.animals[id];super('revenant',preyClips,a?.u??0,a?.v??0);prey.set(this,id);}
  override get alive(){return state.animals[this.id]?.status==='alive';}
  override damage(amount:number){return amount>0&&this.alive&&commit(()=>hunt(state,this.id,this.species));}
 }
 const fighters=specs.map(s=>new WildlifeFighter(s.id,s.species));
 function combatTargets(){for(const f of fighters){const a=state.animals[f.id];if(a){f.x=a.u;f.y=a.v;}}return fighters;}
 const roaming=new Map<string,Roam>();
 for(const spec of specs){const a=state.animals[spec.id];if(a)roaming.set(spec.id,{home:{u:a.u,v:a.v},goal:null,wait:Math.random()*700,moving:false,facing:4});}
 const atlasTex=await Assets.load<Texture>('/wildlife/eight-directions-atlas.png');
 const frames=Array.from({length:16},(_,row)=>Array.from({length:4},(_,i)=>new Texture({source:atlasTex.source,frame:new Rectangle(i*256,row*256,256,256)})));
 const animalViews=specs.map((spec,i)=>{const sprite=new Sprite(frames[(spec.species==='deer'?0:8)+4][0]),loot=new Container({label:spec.species+' Food drop'}),icon=meatSprite(38);icon.anchor.set(.5,1);icon.position.set(0,9);loot.addChild(icon);const label=new Text({text:`${WILDLIFE_RULES[spec.species].food} Food`,style:{fontFamily:'Georgia',fontSize:12,fill:0xffdfad,stroke:{color:0x151c21,width:3}}});label.anchor.set(.5);label.y=-27;loot.addChild(label);sprite.anchor.set(.5,.82);animalsLayer.addChild(sprite,loot);return {...spec,sprite,loot};});
 await o.onPrepare?.(++prepared,preparationTotal);
 let scene:any[]=[];
 function refreshScene(){
  scene=trees.filter(t=>!state.trees[t.id].down).map(t=>{const p=state.trees[t.id],w=tilePoint(p.u,p.v);return {layer:'world',id:'gather:'+t.id,x:w.x+t.width*(.5-t.pivot[0]),y:w.y,width:t.width,height:t.height,foot:t.pivot[1],shear:0,vertical:1,depth:w.y,opacity:1,file:'gather:'+t.id,selected:false,occluder:undefined,image:t.image,gatherColumns:rectColumns(p.u,p.v,1,[-.12,-.12,.12,.12]).map(c=>({...c,height:t.height*.8}))};});sceneVersion++;
  o.changed();
 }
 function updateUi(){
  o.onResources?.(resources.wood,resources.food);
  const counts=JSON.stringify([resources.wood,resources.food,active,error]);if(counts!==lastUi){lastUi=counts;const format=(n:number)=>n<10000?n.toLocaleString('en-US'):new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(n);wood.text=resourceLabel(resources.wood,'wood');food.text=resourceLabel(resources.food,'food');}
  const ledger=o.ledger();gold.text=ledger.goldLabel;clock.text=ledger.timeLabel;
  for(const text of [gold,clock,wood,food])text.scale.set(Math.min(1,89/Math.max(1,text.getLocalBounds().width)));
  status.text=error?'Save failed. Reload after freeing storage.':feedbackMs>0?feedback:active?`Chopping • ${(chopMs/1000).toFixed(1)} / ${TREE_RULES[trees.find(t=>t.id===active)!.kind].ms/1000}s`:'';
  progress.clear();if(active){const rule=TREE_RULES[trees.find(t=>t.id===active)!.kind];progress.roundRect(0,0,252,4,2).fill(0x3b3e39).roundRect(0,0,252*Math.min(1,chopMs/rule.ms),4,2).fill(0xd8bd7d);}
  const scale=Math.min(1,(innerWidth-16)/252,innerWidth<500?(innerWidth-132)/252:1);hud.scale.set(scale);hud.position.set(innerWidth-8-252*scale,(o.resourceTop?.()??o.hudBottom())+(innerWidth<=600?81:62));
  hungerHud.position.set(8,o.hudBottom()+34);hungerHud.scale.set(scale);hungerBar.clear().roundRect(0,0,180,24,5).fill(0x171e21).stroke({color:0xb59a61,width:1});if(state.hunger>0)hungerBar.roundRect(2,2,176*state.hunger/100,20,3).fill({color:state.hunger<20?0x9b543d:0x796a37,alpha:.9});hungerText.text=`Hunger ${state.hunger===0?0:Math.ceil(state.hunger)}%`;
  food.alpha=state.hunger>=100||resources.food<1||error.length>0?0.65:1;
 }
 function target(reachTiles:number){const p=heroTile();return specs.map(s=>({...s,a:state.animals[s.id]})).filter(s=>s.a?.status==='alive'&&distance(p,s.a)<=wildlifeReach(reachTiles,METERS_PER_TILE)&&!cliffTile(p.u,p.v,s.a.u,s.a.v)).sort((a,b)=>distance(p,a.a)-distance(p,b.a))[0]??null;}
 function impact(reachTiles:number){const t=target(reachTiles);if(t&&commit(()=>hunt(state,t.id,t.species)))return true;return false;}
 function step(dt:number,context:GatherStep){
  if(error)return;advanceClock(state,dt);feedbackMs=Math.max(0,feedbackMs-dt);animationMs+=dt;retry+=dt;const p=heroTile();
  // A held stick/key against a trunk is stationary, not continued travel.
  const moving=context.steering&&distance(p,previousHero)>0.001;previousHero=p;
  if(retry>=1000){retry=0;axeOwned=readInventory(load(localStorage.getItem(KEY)).inventory).axe>0;let changed=false;commit(()=>{
   for(const t of trees)changed=respawnTree(state,t.id,t.anchor,METERS_PER_TILE,q=>{if(!clear(q))return false;return trees.every(other=>other.id===t.id||state.trees[other.id].down||distance(q,state.trees[other.id])>2);},Math.random)||changed;
   for(const spec of specs){const a=state.animals[spec.id];if(a?.status==='waiting'&&state.day>=a.readyDay){const q=animalPoint(spec.species);if(q)changed=respawnAnimal(state,spec.id,q)||changed;}}
   return changed;
  });if(changed)refreshScene();}
  for(const spec of specs){const a=state.animals[spec.id];if(!a)continue;let roam=roaming.get(spec.id);if(!roam){roam={home:{u:a.u,v:a.v},goal:null,wait:0,moving:false,facing:4};roaming.set(spec.id,roam);}
   moveWildlife(a,spec.species,roam,dt,METERS_PER_TILE,p,q=>clear(q)&&trees.every(t=>state.trees[t.id].down||distance(q,state.trees[t.id])>1.2),(a,b)=>!cliffTile(a.u,a.v,b.u,b.v),Math.random);
  }
  if(context.alive){for(const s of specs){const a=state.animals[s.id];if(a?.status==='loot'&&distance(p,a)<=CHOP_METERS&&!cliffTile(p.u,p.v,a.u,a.v))commit(()=>collect(state,resources,s.id,s.species));}}
  const axe=readInventory(JSON.parse(localStorage.getItem(KEY)||'{}').inventory).axe>0;axeOwned=axe;
  const near=context.alive&&!moving&&!context.busy&&axe?trees.filter(t=>!state.trees[t.id].down&&distance(p,state.trees[t.id])<=CHOP_METERS&&!cliffTile(p.u,p.v,state.trees[t.id].u,state.trees[t.id].v)).sort((a,b)=>distance(p,state.trees[a.id])-distance(p,state.trees[b.id]))[0]:undefined;
  if(near?.id!==active){active=near?.id??null;chopMs=0;}
  if(near){chopMs+=dt;if(chopMs>=TREE_RULES[near.kind].ms){if(commit(()=>harvest(state,resources,near.id,near.kind)))refreshScene();active=null;chopMs=0;}}
  updateUi();
 }
 let origin={x:0,y:0,scale:1};
 function setAmbient(rgb:number){layer.tint=rgb;animalsLayer.tint=rgb;}
 function place(x:number,y:number,scale:number){origin={x,y,scale};render();}
 function render(){
  const {x,y,scale}=origin;
  for(const t of trees){const a=state.trees[t.id],p=tilePoint(a.u,a.v);t.sprite.visible=!a.down&&x+(p.x+t.width)*scale>0&&x+(p.x-t.width)*scale<innerWidth&&y+p.y*scale>0&&y+(p.y-t.height)*scale<innerHeight;t.sprite.position.set(x+p.x*scale,y+p.y*scale);t.sprite.width=t.width*scale;t.sprite.height=t.height*scale;t.sprite.zIndex=p.y;}
  for(const v of animalViews){const a=state.animals[v.id],roam=roaming.get(v.id);const row=(v.species==='deer'?0:8)+(roam?.facing??4);const duration=v.species==='deer'?1600:2400;v.sprite.texture=frames[row][roam?.moving?Math.floor(animationMs/duration*4)%4:0];v.sprite.visible=a?.status==='alive';v.loot.visible=a?.status==='loot';if(!a)continue;const p=tilePoint(a.u,a.v);v.sprite.position.set(x+p.x*scale,y+p.y*scale);v.sprite.width=v.sprite.height=(v.species==='deer'?125:155)*scale;v.loot.position.copyFrom(v.sprite.position);v.loot.scale.set(scale);v.sprite.zIndex=p.y;}
 }
 const api={combatTargets,ownsFighter:(f:Fighter)=>prey.has(f),eat:consume,step,target,impact,place,render,setAmbient,day:()=>state.day,scene:()=>scene,version:()=>sceneVersion,chopping:()=>!!active,snapshot:()=>({ambient:layer.tint,animalsAmbient:animalsLayer.tint,resources:structuredClone(resources),state:structuredClone(state),active,chopMs,error,trees:trees.map(t=>({id:t.id,kind:t.kind,anchor:t.anchor,...state.trees[t.id],tint:t.sprite.tint,groupColor:t.sprite.groupColor})),animals:specs.map(s=>({...s,...state.animals[s.id],facing:roaming.get(s.id)?.facing??4,moving:roaming.get(s.id)?.moving??false})),ui:{x:hud.x,y:hud.y,width:252*hud.scale.x,height:90*hud.scale.y,hunger:{x:hungerHud.x,y:hungerHud.y,width:180*hungerHud.scale.x,height:24*hungerHud.scale.y},eat:{x:hud.x+125*hud.scale.x,y:hud.y,width:127*hud.scale.x,height:55*hud.scale.y}}})};
 refreshScene();updateUi();await o.onPrepare?.(++prepared,preparationTotal);(window as any).__GATHERING__=api;return api;
}
export type GatheringController=Awaited<ReturnType<typeof createGathering>>;
