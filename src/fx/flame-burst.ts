import {SpriteSheetPlayback,validateConfig} from '../sprite-sheet/playback';
import {Application,Assets,Container,Graphics,Text,Texture} from 'pixi.js';
const app=new Application();
let heading=0,background=0;
const colors=[0x252d39,0x111827,0xf0f2f5];
async function boot(){
 await app.init({resizeTo:window,background:0x10151e,antialias:true,resolution:Math.min(devicePixelRatio,2),autoDensity:true,preference:'webgl'});
 document.body.appendChild(app.canvas);
 const manifestUrl=new URL(new URLSearchParams(location.search).get('clip')||'clip.json',document.baseURI);
 const response=await fetch(manifestUrl);if(!response.ok)throw Error('Could not load sprite sheet metadata');
 const config=validateConfig(await response.json());
 const sheet=await Assets.load<Texture>(new URL(config.source,manifestUrl).href);
 const playback=new SpriteSheetPlayback(sheet,config),frames=playback.frames;
 const floor=new Graphics(),flames=new Container(),ui=new Container();app.stage.addChild(floor,flames,ui);
 const sprites=Array.from({length:3},()=>{const s=playback.createSprite();flames.addChild(s);return s;});
 const labels:Text[]=[];let textIndex=0;const buttons:Record<string,Container>={};
 const text=(value:string,x:number,y:number,size=15,color=0xe8edf5)=>{const t=labels[textIndex]||new Text({text:value,style:{fontFamily:'Arial',fontSize:size,fill:color}});t.text=value;t.position.set(x,y);if(!labels[textIndex]){ui.addChild(t);labels.push(t);}textIndex++;return t;};
 let controls:Record<string,{x:number,y:number,w:number,h:number}>={};
 function button(id:string,value:string,x:number,y:number,w:number,action:()=>void){if(buttons[id]){buttons[id].position.set(x,y);(buttons[id].children[1] as Text).text=value;controls[id]={x,y,w,h:44};return;}const b=new Container(),g=new Graphics().roundRect(0,0,w,44,9).fill(0x27354b).stroke({color:0x526581,width:1});b.addChild(g);const t=new Text({text:value,style:{fontFamily:'Arial',fontSize:15,fill:0xffffff}});t.anchor.set(.5);t.position.set(w/2,22);b.addChild(t);b.position.set(x,y);b.eventMode='static';b.cursor='pointer';b.on('pointertap',action);ui.addChild(b);buttons[id]=b;controls[id]={x,y,w,h:44};}
 function layout(){
  textIndex=0;controls={};
  const w=app.screen.width,h=app.screen.height,p=16,areaTop=104,areaBottom=Math.max(areaTop+40,h-190),areaHeight=areaBottom-areaTop;
  floor.clear().rect(0,areaTop,w,areaHeight).fill(colors[background]);
  if(background===0)for(let y=areaTop;y<areaBottom;y+=24)for(let x=0;x<w;x+=24)if(((x/24+Math.floor((y-areaTop)/24))%2)===0)floor.rect(x,y,Math.min(24,w-x),Math.min(24,areaBottom-y)).fill(0x354050);
  text(config.title.toUpperCase(),p,16,24);text(`${config.columns} × ${config.rows} • ${frames.length} frames • upright billboards`,p,52,w<360?12:14,0xaabbd0);
  text('Tap heading to move spawn positions',p,76,13,0xaabbd0);
  const a=heading*Math.PI/180,spacing=Math.min(w*.31,310),size=Math.min(w*.30,areaHeight*.91,300),baseY=areaTop+areaHeight*.94;
  sprites.forEach((s,i)=>{const offset=i-1;s.position.set(w/2+Math.cos(a)*offset*spacing,baseY+Math.sin(a)*offset*Math.min(22,areaHeight*.06));s.rotation=0;s.width=size;s.height=size*frames[0].height/frames[0].width;});
  const y=h-174;
  button('play',playback.playing?'Pause':'Play',p,y,86,()=>{playback.playing=!playback.playing;layout();});
  button('minus','− FPS',112,y,78,()=>{playback.fps=Math.max(1,playback.fps-1);layout();});
  button('plus','+ FPS',200,y,78,()=>{playback.fps=Math.min(60,playback.fps+1);layout();});
  text(`${playback.fps} FPS`,p,y+56,16);text(`Frame ${playback.frame+1} / ${frames.length}`,122,y+56,16);
  button('heading',`Heading ${heading}°`,p,y+86,140,()=>{heading=(heading+45)%360;layout();});
  button('background',['Checker','Dark','Light'][background],166,y+86,112,()=>{background=(background+1)%3;layout();});
  text('Space: play / pause • ← →: step • ↑ ↓: FPS',p,h-27,w<360?11:13,0xaabbd0);
 }
 function render(){const t=labels.find(t=>t.text.startsWith('Frame '));if(t)t.text=`Frame ${playback.frame+1} / ${frames.length}`;}
 app.ticker.add(t=>{const wasPlaying=playback.playing;playback.update(t.deltaMS);render();if(wasPlaying!==playback.playing)layout();});
 window.addEventListener('resize',()=>{app.resize();layout();});
 window.addEventListener('keydown',e=>{if(!['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))return;e.preventDefault();if(e.code==='Space')playback.playing=!playback.playing;if(e.code==='ArrowLeft'||e.code==='ArrowRight'){playback.step(e.code==='ArrowRight'?1:-1);}if(e.code==='ArrowUp')playback.fps=Math.min(60,playback.fps+1);if(e.code==='ArrowDown')playback.fps=Math.max(1,playback.fps-1);layout();render();});
 document.addEventListener('visibilitychange',()=>{playback.resetClock();});
 layout();render();
 Object.assign(window,{flameBurst:{state:()=>({playing:playback.playing,fps:playback.fps,frame:playback.frame,config,heading,background,controls,width:app.screen.width,height:app.screen.height,rotations:sprites.map(s=>s.rotation),positions:sprites.map(s=>({x:s.x,y:s.y})),frames:frames.map(t=>({x:t.frame.x,y:t.frame.y,w:t.frame.width,h:t.frame.height})),baseAnchor:sprites[0].anchor.y})}});
}
void boot().catch(error=>{console.error(error);const t=new Text({text:'Player could not load. Check sprite sheet metadata and image URL.',style:{fontFamily:'Arial',fontSize:16,fill:0xffffff,wordWrap:true,wordWrapWidth:Math.max(220,innerWidth-32)}});t.position.set(16,20);app.stage.addChild(t);});
