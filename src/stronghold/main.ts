import './style.css';
import {createWorldView} from './world-view';
import {KEY,load,type Building} from './economy';
import {transact} from './store';
import {createClock} from './clock';
import {reloadOnNewBuild} from './fresh-build';
import {createControls} from './controls';
// World-only view: no panels or menus besides the time-of-day clock and, on touch screens, the walk thumbstick.
// Selecting a building just follows it with the camera.
const root=document.querySelector('#stronghold')!;
root.innerHTML=`<canvas id="world-canvas" aria-label="Stronghold world. Walk with the arrow keys or WASD; drag to pan, scroll or pinch to zoom." tabindex="0"></canvas>`;
const controls=createControls(root as HTMLElement);
let selected:Building|null=null;
let worldView:Awaited<ReturnType<typeof createWorldView>>;
function render(){try{worldView?.update(load(localStorage.getItem(KEY)),selected);}catch(e){console.error(e);}}
function selectBuilding(id:Building){selected=id;render();worldView?.focus(id);}
window.addEventListener('storage',render);
reloadOnNewBuild();
void (async()=>{try{worldView=await createWorldView(root.querySelector('#world-canvas') as HTMLCanvasElement,selectBuilding,controls.direction);createClock(root as HTMLElement,{setTime:worldView.setTime,preview:worldView.previewClock,subscribe:worldView.subscribeClock});await transact(()=>{}).catch(console.error);render();}catch(e){console.error('Unable to load the Stronghold artwork.',e);}})();
