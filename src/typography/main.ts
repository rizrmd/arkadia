import {Application,Assets,type Container,type Texture} from 'pixi.js';
import {installMsdfFx,loadFonts} from './msdf';
import {liveTexts,refreshAllText,setGlow} from './text';
import {FrameSet,pickFrameScale} from './frames';
import {Hud} from './hud';
import {HeroSelect,type HeroId} from './hero-select';

// Typography rendering sample: ?screen=hud|hero  &hero=ember-warden|rift-runner  &glow=1  &ref=0..1 (reference overlay)
// &capture=1 (no toolbar)  &fix=0 (Pixi's stock MSDF edge width, for comparison).
const q=new URLSearchParams(location.search);
const BASE=import.meta.env.BASE_URL,V2=BASE+'v2/',KIT=BASE+'kit/';
const screen=q.get('screen')==='hero'?'hero':'hud';
const app=new Application();
await app.init({preference:'webgl',resizeTo:window,resolution:devicePixelRatio,autoDensity:true,antialias:true,background:0x0b0d12});
document.body.appendChild(app.canvas);
installMsdfFx(app.renderer,{fixResolution:q.get('fix')!=='0'});
await loadFonts(V2+'fonts/');
setGlow(q.get('glow')==='1');

let scene:Container&{layout(w:number,h:number):number;referenceAlpha:number};
let frameScale=0,sceneScale=1,hud:Hud|undefined,hero:HeroSelect|undefined;
const size=()=>[app.screen.width,app.screen.height] as const;
async function buildHud(){
 const [w,h]=size(),pick=pickFrameScale(devicePixelRatio,Hud.sceneScale(w,h));
 if(pick===frameScale&&hud)return hud;
 frameScale=pick;
 const [frames,backdrop,reference]=await Promise.all([FrameSet.load(V2+'hud/',pick),Assets.load<Texture>(V2+'backdrops/hud-clean.jpg'),Assets.load<Texture>(BASE+'reference.png')]);
 hud?.destroy({children:true});
 hud=new Hud(frames,undefined,{backdrop,reference});
 return hud;
}
async function show(){
 if(screen==='hud'){scene=await buildHud();}
 else{hero??=await HeroSelect.load(KIT,V2+'hero/logo@3x.png',{'ember-warden-desktop':V2+'references/choose-your-hero-desktop.png','rift-runner-desktop':V2+'references/rift-runner-desktop.png','ember-warden-mobile':V2+'references/ember-warden-mobile.png','rift-runner-mobile':V2+'references/rift-runner-mobile.png'},(q.get('hero') as HeroId)||'ember-warden');scene=hero;}
 if(scene.parent!==app.stage){app.stage.removeChildren();app.stage.addChild(scene);}
 sceneScale=scene.layout(...size());
 scene.referenceAlpha=+(q.get('ref')??0);
 refreshAllText();
}
await show();
let pending=0;
app.renderer.on('resize',()=>{cancelAnimationFrame(pending);pending=requestAnimationFrame(()=>void show());});

// Hooks for scripts/typography/capture.mjs and the toolbar.
const api={ready:true,screen,get frameScale(){return screen==='hud'?frameScale:0;},get sceneScale(){return sceneScale;},resolution:app.renderer.resolution,
 setReference(a:number){scene.referenceAlpha=a;},setGlow(on:boolean){setGlow(on);},select(id:HeroId){hero?.select(id);refreshAllText();},setHp(v:number){hud?.setHp(v);},
 // Visible texts with CSS-pixel bounds, for crispness crops.
 texts(){return liveTexts().filter(t=>!t.destroyed&&t.parent).map(t=>{const b=t.getBounds();return {text:t.text,x:b.x,y:b.y,width:b.width,height:b.height};});}};
Object.assign(window,{typography:api});

if(q.get('capture')!=='1'){
 const bar=document.createElement('nav');bar.className='bar';
 const link=(label:string,params:Record<string,string>,on:boolean)=>{const a=document.createElement('a');a.textContent=label;const u=new URLSearchParams(q);for(const [k,v] of Object.entries(params))u.set(k,v);a.href='?'+u;if(on)a.className='on';bar.append(a);};
 link('HUD',{screen:'hud'},screen==='hud');link('Choose Your Hero',{screen:'hero'},screen==='hero');
 if(screen==='hero'){link('Ember Warden',{hero:'ember-warden'},(q.get('hero')||'ember-warden')==='ember-warden');link('Rift Runner',{hero:'rift-runner'},q.get('hero')==='rift-runner');}
 const glow=document.createElement('label');glow.innerHTML=`<input type="checkbox" ${q.get('glow')==='1'?'checked':''}> Glow`;glow.querySelector('input')!.onchange=e=>api.setGlow((e.target as HTMLInputElement).checked);bar.append(glow);
 const ref=document.createElement('label');ref.innerHTML=`Reference <input type="range" min="0" max="1" step="0.05" value="${q.get('ref')??0}">`;ref.querySelector('input')!.oninput=e=>api.setReference(+(e.target as HTMLInputElement).value);bar.append(ref);
 const info=document.createElement('span');info.textContent=`DPR ${devicePixelRatio} · ${screen==='hud'?`frames @${frameScale}x · `:''}MSDF EB Garamond / Cinzel`;bar.append(info);
 document.body.append(bar);
}
