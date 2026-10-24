import {createWorldView} from './world-view';
import {KEY,load,heroBonus,type Building} from './economy';
import {transact} from './store';
import {createClock} from './clock';
import {reloadOnNewBuild} from './fresh-build';
import {createControls} from './controls';
import {ensurePixiRuntime,type Progress} from '../app/loader';
import {createNet} from './net/client';
import {createLobby} from './net/lobby';
import {savedHero,saveHero,type HeroId} from './heroes';
import {createHeroPicker} from './hero-picker';
import {startFpsTracelog} from './tracelog';

export async function mount(app:HTMLElement,progress:Progress){
 const rt=await ensurePixiRuntime(app);
 const canvas=rt.app.canvas;
 canvas.setAttribute('aria-label','Stronghold world. Walk with the arrow keys or WASD, or on a touch screen drag from the bottom half; drag in the top half, or with a second finger while walking, to pan. The hero attacks nearby revenants automatically.');
 canvas.tabIndex=0;

 const canInteractWorld=(clientX:number,clientY:number,active=false)=>{
  if(picker?.isOpen()||clock?.isOpen()||lobby?.isOpen()||worldView?.encounters.isModalOpen())return false;
  // The full map holds the screen: its own drag pans the map, not the world, and no stick opens under it.
  if(worldView?.worldMap.isOpen())return false;
  if(active)return true;
  const events=rt.app.renderer.events;
  events.rootBoundary.rootTarget??=rt.app.stage;
  const pt={x:clientX,y:clientY};
  events.mapPositionToPoint(pt,clientX,clientY);
  const hit=events.rootBoundary.hitTest(pt.x,pt.y);
  return !hit;
 };

 const controls=createControls(rt.uiStage,rt.frames,canInteractWorld);
 let selected:Building|null=null;
 let clock:ReturnType<typeof createClock>|undefined;

 const maxHp=()=>{try{return 100+heroBonus(load(localStorage.getItem(KEY)));}catch{return 100;}};
 let hero:HeroId=savedHero();
 // Co-op is temporarily disabled: the game plays solo and offline, with no co-op UI. `?coop` opts back in for netcode testing.
 const coop=new URLSearchParams(location.search).has('coop');
 // Co-op sends the world's walk input once it exists: keys and the stick, or a route from the full map.
 let walk=controls.direction;
 const net=coop?createNet({direction:()=>walk(),maxHp,hero:()=>hero}):undefined;
 const lobby=net?createLobby(rt.uiStage,rt.frames,net):null,invited=lobby?.start()??'';
 // The first visit chooses a hero once, before gameplay: the world loads behind the screen with the hero and the
 // revenants held until the pick (hero-picker.ts).
 const picker=createHeroPicker(rt.uiStage,{
  current:()=>hero,
  renderer:rt.app.renderer,
  choose(id){
   hero=id;
   saveHero(id);
   void worldView.setHero(id);
   net?.setHero(id);
  },
 });

 // Gameplay waits for the loading screen too: on a return visit the pick is already made, and the hero and revenant
 // loops would otherwise render frame after frame behind the screen, starving the last load steps of the main thread.
 let loaded=()=>{};const mounted=new Promise<void>(r=>{loaded=r;});
 const worldView=await createWorldView(
  rt,
  selectBuilding,
  controls.direction,
  progress,
  net,
  hero,
  {
   onClockClick:()=>{lobby?.open(false);clock?.toggle();},
   onCoopClick:()=>{clock?.open(false);lobby?.toggle();},
  },
  canInteractWorld,
  Promise.all([picker.picked,mounted]).then(()=>{}),
 );
 walk=worldView.direction;
 // Apply the saved layout before the first frame, so the world is painted once (not once as the default layout and
 // again for the saved one).
 render();

 function render(){try{worldView.update(load(localStorage.getItem(KEY)),selected);}catch(e){console.error(e);}}
 function selectBuilding(id:Building){selected=id;render();worldView.focus(id);}
 reloadOnNewBuild();

 lobby?.bindHud(worldView.hud);
 net?.onStatus(render);
 window.addEventListener('storage',render);
 clock=createClock(rt.uiStage,rt.frames,worldView.hud,{
  setTime:worldView.setTime,
  preview:worldView.previewClock,
  subscribe:worldView.subscribeClock,
 });
 // Saving the welcome-home state waits for a Web Lock, which the browser grants only between the first frames' long
 // paint and upload tasks; the screen does not need it, so it lands in the background.
 void transact(()=>{}).then(render,console.error);

 await new Promise<void>(done=>{const check=()=>canvas.dataset.ready==='true'?done():requestAnimationFrame(check);check();});
 startFpsTracelog({rt,getCombatSnapshot:()=>worldView.encounters.snapshot(),getLiveCounts:()=>worldView.encounters.liveCounts(),net,getHeroId:()=>hero});
 await picker.start();
 loaded();
 void picker.picked.then(()=>{if(invited)lobby!.prompt(invited);});

 (window as any).__COOP__=net&&{net,stats:()=>({status:net.status(),room:net.room(),you:net.you(),...net.stats,...net.timeline,rtt:net.rtt()})};
 (window as any).__PIXI_UI__={app:rt.app,hud:worldView.hud,clock,lobby,picker,stick:controls.stick};
}
