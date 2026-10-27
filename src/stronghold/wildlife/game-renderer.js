import * as T from './runtime/three.module.min.js';
import {deer,crocodile,pose} from './models.js';
// Approved #XXFOP meshes and all four articulated clips, shared by every game animal.
// One small offscreen GPU scene; Pixi owns every visible world sprite and UI element.
export function createWildlifeAtlas(){
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(256,256);renderer.setPixelRatio(1);renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const c=canvas.getContext('2d');
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xe2efff,0x514636,2.5));const light=new T.DirectionalLight(0xffefd4,3);light.position.set(-3,8,5);scene.add(light);
 const models=[deer(),crocodile()];models.forEach(m=>scene.add(m.root));const camera=new T.OrthographicCamera(-3.8,3.8,3.8,-3.8,.1,60);camera.position.set(7,6,9);camera.lookAt(0,1.5,0);
 let last=-1;return {canvas,render(ms,clips=['deer-walk','crocodile-crawl'],headings=[0,0],force=false){const frame=Math.floor(ms/83);if(!force&&frame===last)return false;last=frame;c.clearRect(0,0,512,256);models.forEach((m,i)=>{models.forEach((n,j)=>n.root.visible=j===i);m.root.rotation.y=headings[i];const id=clips[i],duration=id==='deer-walk'?1600:id==='deer-run'?800:id==='crocodile-swim'?2000:2400;pose(m,id,(ms%duration)/duration);camera.lookAt(i===0?0:-.6,i===0?2.1:.7,0);renderer.render(scene,camera);c.drawImage(renderer.domElement,i*256,0);});return true;},dispose(){renderer.dispose();scene.traverse(o=>{o.geometry?.dispose();});}};
}
