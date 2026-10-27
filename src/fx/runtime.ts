import '../app/chunked-texture-upload';
import '../app/render-settings';
import {Application,Container} from 'pixi.js';
import {renderQuality} from '../app/render-quality';
import {installTickerCadence} from '../app/frame-cadence';
import {installMsdfFx,loadFonts} from '../typography/msdf';
/** FX Lab owns its scene: no HUD atlas, world/map, enemies, network or player checkpoints. */
export async function createFxRuntime(host:HTMLElement){
 const app=new Application(),quality=renderQuality.get();
 await app.init({preference:['webgl','canvas'],resizeTo:window,backgroundColor:0x0b0e12,antialias:quality.tier==='high',autoDensity:true,resolution:Math.min(devicePixelRatio||1,quality.resolution),gcActive:false});
 installTickerCadence(app.ticker,()=>renderQuality.get().targetFps);installMsdfFx(app.renderer);
 app.canvas.id='world-canvas';host.replaceChildren(app.canvas);
 await loadFonts('/typography/v2/fonts/');
 const worldStage=new Container(),uiStage=new Container();app.stage.addChild(worldStage,uiStage);return {app,worldStage,uiStage};
}
