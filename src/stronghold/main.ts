import './style.css';
import {createWorldView} from './world-view';
import {KEY,load,type Building} from './economy';
import {transact} from './store';
import {createClock} from './clock';
import {reloadOnNewBuild} from './fresh-build';
import {createControls} from './controls';
import type {Progress} from '../app/loader';
// World-only view: no panels or menus besides the time-of-day clock and, on touch screens, the walk thumbstick.
// Selecting a building just follows it with the camera.
export async function mount(app:HTMLElement,progress:Progress){
 const root=document.createElement('div');root.id='stronghold';app.append(root);
 root.innerHTML=`<canvas id="world-canvas" aria-label="Stronghold world. Walk with the arrow keys or WASD; drag to pan, scroll or pinch to zoom." tabindex="0"></canvas>`;
 const canvas=root.querySelector('#world-canvas') as HTMLCanvasElement,controls=createControls(root);
 let selected:Building|null=null;
 function render(){try{worldView.update(load(localStorage.getItem(KEY)),selected);}catch(e){console.error(e);}}
 function selectBuilding(id:Building){selected=id;render();worldView.focus(id);}
 reloadOnNewBuild();
 const worldView=await createWorldView(canvas,selectBuilding,controls.direction,progress);
 window.addEventListener('storage',render);
 createClock(root,{setTime:worldView.setTime,preview:worldView.previewClock,subscribe:worldView.subscribeClock});await transact(()=>{}).catch(console.error);render();
 // Keep the loading screen up until the first frame of the world has been painted.
 await new Promise<void>(done=>{const check=()=>canvas.dataset.ready==='true'?done():requestAnimationFrame(check);check();});
}
