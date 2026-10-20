import './style.css';
import {createWorldView} from './world-view';
import {KEY,load,type Building} from './economy';
import {transact} from './store';
// World-only view: no HUD, panels or menus. Selecting a building just follows it with the camera.
const root=document.querySelector('#stronghold')!;
root.innerHTML=`<canvas id="world-canvas" aria-label="Stronghold world. Drag to pan, scroll or pinch to zoom." tabindex="0"></canvas>`;
let selected:Building|null=null;
let worldView:Awaited<ReturnType<typeof createWorldView>>;
function render(){try{worldView?.update(load(localStorage.getItem(KEY)),selected);}catch(e){console.error(e);}}
function selectBuilding(id:Building){selected=id;render();worldView?.focus(id);}
window.addEventListener('storage',render);
void (async()=>{try{worldView=await createWorldView(root.querySelector('#world-canvas') as HTMLCanvasElement,selectBuilding);await transact(()=>{}).catch(console.error);render();}catch(e){console.error('Unable to load the Stronghold artwork.',e);}})();
