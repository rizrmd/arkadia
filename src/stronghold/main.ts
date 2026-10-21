import './style.css';
import {createWorldView} from './world-view';
import {KEY,load,heroBonus,type Building} from './economy';
import {transact} from './store';
import {createClock} from './clock';
import {reloadOnNewBuild} from './fresh-build';
import {createControls} from './controls';
import type {Progress} from '../app/loader';
import {createNet} from './net/client';
import {createLobby} from './net/lobby';
// World-only view: no menus; the HUD is the hero's health panel (encounters.ts), the time-of-day clock, the co-op room
// chip (net/lobby.ts) and, while a thumb walks the hero, the touch thumbstick. ?offline=1 skips the co-op server.
// Selecting a building just follows it with the camera.
export async function mount(app:HTMLElement,progress:Progress){
 const root=document.createElement('div');root.id='stronghold';app.append(root);
 root.innerHTML=`<canvas id="world-canvas" aria-label="Stronghold world. Walk with the arrow keys or WASD, or on a touch screen drag from the bottom third; drag elsewhere to pan, scroll or pinch to zoom. The hero attacks nearby revenants automatically; they roam only beyond 100 metres of the tent." tabindex="0"></canvas>`;
 const canvas=root.querySelector('#world-canvas') as HTMLCanvasElement,controls=createControls(root);
 let selected:Building|null=null;
 function render(){try{worldView.update(load(localStorage.getItem(KEY)),selected);}catch(e){console.error(e);}}
 function selectBuilding(id:Building){selected=id;render();worldView.focus(id);}
 reloadOnNewBuild();
 // Co-op starts connecting while the artwork loads; the local save still sets the hero's hit points.
 const maxHp=()=>{try{return 100+heroBonus(load(localStorage.getItem(KEY)));}catch{return 100;}};
 const net=new URLSearchParams(location.search).has('offline')?undefined:createNet({direction:controls.direction,maxHp});
 const lobby=net?createLobby(root,net):null,invited=lobby?.start()??'';
 const worldView=await createWorldView(canvas,selectBuilding,controls.direction,progress,net);
 net?.onStatus(render);
 window.addEventListener('storage',render);
 createClock(root,{setTime:worldView.setTime,preview:worldView.previewClock,subscribe:worldView.subscribeClock});await transact(()=>{}).catch(console.error);render();
 // Keep the loading screen up until the first frame of the world has been painted.
 await new Promise<void>(done=>{const check=()=>canvas.dataset.ready==='true'?done():requestAnimationFrame(check);check();});
 if(invited)lobby!.prompt(invited);
 // Testing hook for scripts/coop-browser.mjs.
 (window as any).__COOP__=net&&{net,stats:()=>({status:net.status(),room:net.room(),you:net.you(),...net.stats,...net.timeline,rtt:net.rtt()})};
}
