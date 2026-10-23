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
 canvas.setAttribute('aria-label','Stronghold world. Walk with the arrow keys or WASD, or on a touch screen drag from the bottom third; drag elsewhere to pan. The hero attacks nearby revenants automatically.');
 canvas.tabIndex=0;

 const canInteractWorld=(clientX:number,clientY:number)=>{
  if(picker?.isOpen()||clock?.isOpen()||lobby?.isOpen()||worldView?.encounters.isModalOpen())return false;
  const hit=rt.app.renderer.events.rootBoundary.hitTest(clientX,clientY);
  return !hit;
 };

 const controls=createControls(rt.uiStage,rt.frames,canInteractWorld);
 let selected:Building|null=null;
 let clock:ReturnType<typeof createClock>|undefined;
 let picker:ReturnType<typeof createHeroPicker>|undefined;

 const maxHp=()=>{try{return 100+heroBonus(load(localStorage.getItem(KEY)));}catch{return 100;}};
 let hero:HeroId=savedHero();
 const net=new URLSearchParams(location.search).has('offline')?undefined:createNet({direction:controls.direction,maxHp,hero:()=>hero});
 const lobby=net?createLobby(rt.uiStage,rt.frames,net):null,invited=lobby?.start()??'';

 const worldView=await createWorldView(
  rt,
  selectBuilding,
  controls.direction,
  progress,
  net,
  hero,
  {
   onHeroClick:()=>{clock?.open(false);lobby?.open(false);void picker?.open();},
   onMenuClick:()=>{clock?.open(false);lobby?.open(false);void picker?.open();},
   onClockClick:()=>{lobby?.open(false);clock?.toggle();},
   onCoopClick:()=>{clock?.open(false);lobby?.toggle();},
  },
  canInteractWorld,
 );

 function render(){try{worldView.update(load(localStorage.getItem(KEY)),selected);}catch(e){console.error(e);}}
 function selectBuilding(id:Building){selected=id;render();worldView.focus(id);}
 reloadOnNewBuild();

 lobby?.bindHud(worldView.hud);
 picker=createHeroPicker(rt.uiStage,{
  current:()=>hero,
  renderer:rt.app.renderer,
  stage:rt.app.stage,
  choose(id){
   hero=id;
   saveHero(id);
   void worldView.setHero(id);
   net?.setHero(id);
  },
 });
 net?.onStatus(render);
 window.addEventListener('storage',render);
 clock=createClock(rt.uiStage,rt.frames,worldView.hud,{
  setTime:worldView.setTime,
  preview:worldView.previewClock,
  subscribe:worldView.subscribeClock,
 });
 await transact(()=>{}).catch(console.error);
 render();

 await new Promise<void>(done=>{const check=()=>canvas.dataset.ready==='true'?done():requestAnimationFrame(check);check();});
 startFpsTracelog({rt,getCombatSnapshot:()=>worldView.encounters.snapshot(),net,getHeroId:()=>hero});
 void picker.start().then(()=>{if(invited)lobby!.prompt(invited);});

 (window as any).__COOP__=net&&{net,stats:()=>({status:net.status(),room:net.room(),you:net.you(),...net.stats,...net.timeline,rtt:net.rtt()})};
 (window as any).__PIXI_UI__={app:rt.app,hud:worldView.hud,clock,lobby,picker};
}
