import {Application,Texture} from 'pixi.js';
import {PixiVfxRenderer} from 'nixie-fx/pixi';
import {normalizeParticleEffect} from 'nixie-fx';
import {flameFanLevel,FLAME_FAN_TIMING} from './flame-fan-levels';
import './flame-fan-preview.css';

// All scenes use these same world-to-screen constants, including the selected rank.
const W=600,H=400,PX=49,OX=130,OY=210,SQUASH=.6;
const looks=[
 {name:'Ember',layers:1,detail:'Lean orange sheet · small contact flare'},
 {name:'Kindled',layers:2,detail:'Twin flame folds · gold contact flares'},
 {name:'Blazing',layers:3,detail:'Three tongue layers · bright gold core'},
 {name:'Furnace',layers:4,detail:'Dense rolling folds · white-hot seams'},
 {name:'Incandescent',layers:5,detail:'Five layered tongues · broad ivory core'}
];
const root=document.getElementById('player')!;
root.innerHTML=`<header><p>EMBER WARDEN · VFX REVIEW</p><h1>Flame Fan</h1><span>Combat preview · NixieFX</span></header>
<div class="selected-title"><strong id="rank-name"></strong><span id="rank-detail"></span></div>
<section id="stage" aria-label="Selected rank combat preview"><canvas id="selected" width="600" height="400"></canvas><div id="status" role="status">Loading Ember and enemies…</div></section>
<section class="controls" aria-label="Playback controls"><div class="row"><label>Skill level <select id="level">${looks.map((_,i)=>`<option value="${i+1}">Lv. ${i+1}</option>`).join('')}</select></label><button id="play" disabled>Pause</button><button id="replay" disabled>Replay</button><button id="loop" aria-pressed="true">Loop</button><label>Backdrop <select id="backdrop"><option value="night">Night</option><option value="day">Day</option></select></label></div><input id="timeline" type="range" min="0" max="2.6" step="0.01" value="0" aria-label="Animation timeline"><div class="row info"><span id="phase"></span><output id="time"></output></div><p id="spec"></p></section>
<section class="comparison-section" aria-label="Synchronized rank comparison"><h2>Lv.1–5 · synchronized comparison</h2><p>Same camera, scale, targets and clock. Swipe horizontally on mobile. Select a card for the large view.</p><div id="comparison" tabindex="0" aria-label="Scroll all five ranks">${looks.map((l,i)=>`<button class="rank-card" data-rank="${i+1}" aria-label="View level ${i+1}"><div><strong>Lv. ${i+1}</strong><span>${l.name}</span></div><canvas width="600" height="400" aria-label="Level ${i+1} combat"></canvas><p>${l.layers} flame ${l.layers===1?'layer':'layers'} · ${flameFanLevel(i+1).radius.toFixed(2)} tiles</p></button>`).join('')}</div></section>
<footer>108° connected AoE from Lv.1 · Zero fireballs · Preview only<br>Actual Ember Warden and Revenant game sprites. Hit reactions are illustrative; gameplay values are unchanged.</footer>`;
const $=(id:string)=>document.getElementById(id)!;
const selected=$('selected') as HTMLCanvasElement;
const cards=[...document.querySelectorAll<HTMLButtonElement>('.rank-card')];
const surfaces=looks.map(()=>Object.assign(document.createElement('canvas'),{width:W,height:H}));
let time=0,level=1,paused=false,loop=true,cycles=0,night=true;
const duration=FLAME_FAN_TIMING.duration,release=FLAME_FAN_TIMING.release;
const surface=Object.assign(document.createElement('canvas'),{width:W/2,height:H/2});
const gl=surface.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
if(!gl)throw Error('WebGL is required for the flame material');
const vert=`attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const frag=`precision highp float;
uniform float t;uniform float rank;uniform float radius;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=a*noise(p);p=p*2.03+vec2(7.1,3.7);a*=.5;}return n;}
void main(){
 vec2 p=vec2((gl_FragCoord.y*2.-190.)/.6,gl_FragCoord.x*2.-130.);
 float age=t-.42,growth=smoothstep(0.,.30,age);
 float r=length(p)/(radius*max(.001,growth)),a=atan(p.x,p.y);
 float flow=fbm(vec2(a*(5.+rank),r*5.-t*1.8));
 float warp=fbm(vec2(a*(10.+rank*2.)+flow*4.,r*7.-t*2.4));
 // Additional curled tongue strata are rank dependent, while the lower body stays connected.
 float folds=0.;
 for(int i=0;i<5;i++){float layer=float(i);float active=step(layer+.5,rank);
  float curl=sin(a*(8.+layer*3.)+r*(13.+layer*2.)-t*(5.+layer*.7)+warp*8.);
  float band=1.-smoothstep(.02,.105,abs(r-(.3+layer*.135+curl*.055)));
  folds+=active*band*(.16+.035*layer);}
 float rim=.94+.035*sin(a*(13.+rank*4.)+flow*8.)+.025*warp;
 float side=1.-smoothstep(.922,.94248,abs(a));
 float edge=1.-smoothstep(rim-.035,rim,r);
 float heat=clamp(.06+flow*.53+warp*.32+folds*.60+(1.-r)*(.09+rank*.024)+(rank-1.)*.034,0.,1.);
 vec3 col=mix(vec3(.7,.035,.001),vec3(1.,.22,.002),smoothstep(.18,.5,heat));
 col=mix(col,vec3(1.,.64,.025),smoothstep(.48,.73,heat));
 col=mix(col,vec3(1.,.98,.72),smoothstep(.84,1.14,heat));
 float fade=1.-smoothstep(1.95,2.6,t);
 float density=.60+rank*.075;
 float alpha=side*edge*density*smoothstep(0.,.06,age)*fade;
 gl_FragColor=vec4(col,alpha);
}`;
function compile(type:number,source:string){const s=gl!.createShader(type)!;gl!.shaderSource(s,source);gl!.compileShader(s);if(!gl!.getShaderParameter(s,gl!.COMPILE_STATUS))throw Error(gl!.getShaderInfoLog(s)||'Flame shader failed');return s;}
const program=gl.createProgram()!;gl.attachShader(program,compile(gl.VERTEX_SHADER,vert));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,frag));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'Flame material failed');gl.useProgram(program);
gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
const uniforms={time:gl.getUniformLocation(program,'t'),rank:gl.getUniformLocation(program,'rank'),radius:gl.getUniformLocation(program,'radius')};
type Character={image:string;cell:{w:number;h:number;pivot:{x:number;y:number}};frames:{x:number;y:number;w:number;h:number}[];clips:Record<string,{frames:number[];fps:number;loop?:boolean}>};
let manifest:Record<string,Character>={},images=new Map<string,HTMLImageElement>();
const targets=[-.52,0,.52].map(a=>({x:OX+Math.cos(a)*3.4*PX,y:OY+Math.sin(a)*3.4*PX*SQUASH+18}));
function actor(g:CanvasRenderingContext2D,id:string,x:number,y:number,hero:boolean,rank:number){
 const m=manifest[id],img=images.get(id)!;
 const hit=!hero&&time>=release+.32&&time<1.18,casting=hero&&time<.90;
 const clip=m.clips[hero?(casting?'attack-E':'idle-E'):(hit?'hit':'idle')];
 const local=hit?time-release-.32:hero&&casting?time*(3/release)/clip.fps:time;
 const index=clip.loop?Math.floor(local*clip.fps)%clip.frames.length:Math.min(clip.frames.length-1,Math.floor(local*clip.fps));
 const fr=m.frames[clip.frames[Math.max(0,index)]];
 const scale=hero?1.05:.85;
 const recoil=hit?Math.sin(Math.min(1,(time-release-.32)/.5)*Math.PI)*12:0;
 g.save();g.translate(x+recoil,y);g.fillStyle='#0007';g.beginPath();g.ellipse(0,0,21,7,0,0,Math.PI*2);g.fill();
 g.save();g.rotate(hit?.09*Math.sin((time-release)*9):0);g.scale(hero?scale:-scale,scale);
 // Packed Ember frames have a higher atlas resolution than the logical pivot cell.
 g.drawImage(img,fr.x,fr.y,fr.w,fr.h,-m.cell.pivot.x,-m.cell.pivot.y,m.cell.w,m.cell.h);g.restore();
 if(hit){
  const pulse=Math.max(0,1-(time-release-.32)/.65),size=8+rank*4;
  const grad=g.createRadialGradient(0,-25,1,0,-25,size*1.8);grad.addColorStop(0,`rgba(255,250,190,${pulse})`);grad.addColorStop(.35,`rgba(255,140,12,${pulse*.8})`);grad.addColorStop(1,'#ff600000');g.fillStyle=grad;g.fillRect(-size*2,-25-size*2,size*4,size*4);
  g.strokeStyle=`rgba(255,${150+rank*16},70,${pulse})`;g.lineWidth=1+rank*.6;
  for(let i=0;i<rank;i++){g.beginPath();g.ellipse(0,-12-i*8,size*(1+i*.12),5+i*2,-.15,0,Math.PI*2);g.stroke();}
 }
 g.restore();
}
function background(g:CanvasRenderingContext2D,rank:number){
 const bg=g.createRadialGradient(290,245,10,290,245,440);bg.addColorStop(0,night?'#36312d':'#aca99b');bg.addColorStop(1,night?'#11171b':'#6d797b');g.fillStyle=bg;g.fillRect(0,0,W,H);
 g.strokeStyle=night?'#b9b1a00e':'#30382d18';g.lineWidth=1;
 for(let x=-400;x<900;x+=55){g.beginPath();g.moveTo(x,0);g.lineTo(x+600,H);g.stroke();g.beginPath();g.moveTo(x,0);g.lineTo(x-600,H);g.stroke();}
 // Shared neutral range guide: angle and world projection are identical at every rank.
 g.save();g.translate(OX,OY);g.scale(1,SQUASH);g.beginPath();g.moveTo(0,0);g.arc(0,0,flameFanLevel(rank).radius*PX,-Math.PI*.3,Math.PI*.3);g.closePath();g.strokeStyle=night?'#e3b26c30':'#48321f55';g.setLineDash([4,6]);g.stroke();g.restore();
}
async function boot(){
 const response=await fetch(new URL('actors/manifest.json',import.meta.url));if(!response.ok)throw Error('Game character manifest missing');manifest=(await response.json()).characters;
 await Promise.all(['ember-warden','revenant'].map(id=>new Promise<void>((resolve,reject)=>{const img=new Image();img.onload=()=>{images.set(id,img);resolve();};img.onerror=()=>reject(Error('Game sprite failed: '+id));img.src=new URL('actors/'+manifest[id].image,import.meta.url).href;})));
 const app=new Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,autoStart:false,preference:'webgl',resolution:1,preserveDrawingBuffer:true});
 const texture=Texture.from(surface);texture.source.autoGarbageCollect=false;
 const renderer=new PixiVfxRenderer({parent:app.stage,textureProvider:{getTexture:()=>texture}});
 const constant=(value:number)=>({mode:'constant',value,min:value,max:value});
 const effect=normalizeParticleEffect({app:'vfx-editor',kind:'particle-effect',version:1,targetProfile:'pixi-ui-2d',id:'flame-fan-preview.connected-sheet',name:'Flame Fan — connected flame sheet',timeline:{duration,frameRate:30},emitters:[{id:'connected-sheet',name:'Stationary 108 degree flame sheet',mode:'billboard',maxParticles:1,duration:.01,loop:false,modules:{velocity:false,color:false,size:false,textureSheetAnimation:false},spawn:{rate:0,bursts:[{time:0,count:1,cycles:1,probability:1}],radius:0,position:[0,0,0]},initializeParticle:{lifetime:constant(10),size:constant(1),startSizeSeparateAxes:true,size3D:{x:constant(1),y:constant(H/W),z:constant(1)},rotation:constant(0),velocity:{speed:constant(0)}},forces:{gravity:0,drag:0},render:{texture:'procedural/flame-fan',blend:'alpha',opacitySource:'textureAlpha'},billboard:{shape:'quad',sizeStart:1,sizeEnd:1,sizeValue:constant(1),softness:0}}]});
 const projection={project:(_p:unknown,out?:any)=>Object.assign(out||{},{x:W/2,y:H/2,visible:true}),pixelsPerWorldUnit:()=>W,depth:()=>0};
 const instance=renderer.createEffect(effect,{projection,autoStart:false});instance.spawn({position:[0,0,0],seed:17,timeSeconds:0});instance.update(.01,.01);
 function render(){
  for(let rank=1;rank<=5;rank++){
   gl!.uniform1f(uniforms.time,time);gl!.uniform1f(uniforms.rank,rank);gl!.uniform1f(uniforms.radius,flameFanLevel(rank).radius*PX);gl!.viewport(0,0,surface.width,surface.height);gl!.drawArrays(gl!.TRIANGLES,0,6);texture.source.update();instance.update(0,time);app.render();
   const g=surfaces[rank-1].getContext('2d')!;background(g,rank);g.drawImage(app.canvas,0,0);
   targets.forEach(p=>actor(g,'revenant',p.x,p.y,false,rank));actor(g,'ember-warden',OX-18,OY+50,true,rank);
   g.font='12px system-ui';g.fillStyle=night?'#e3d8bc':'#30291f';g.textAlign='center';g.fillText('EMBER WARDEN',OX-18,OY+75);g.fillText(time>=release+.32&&time<1.18?'HIT × 3':'REVENANTS',294,105);
   cards[rank-1].querySelector('canvas')!.getContext('2d')!.drawImage(surfaces[rank-1],0,0);
   cards[rank-1].setAttribute('aria-pressed',String(rank===level));
  }
  selected.getContext('2d')!.drawImage(surfaces[level-1],0,0);
  const spec=flameFanLevel(level);$('rank-name').textContent=`Lv. ${level} / ${looks[level-1].name}`;$('rank-detail').textContent=looks[level-1].detail;
  $('spec').textContent=`108° AoE · ${spec.radius.toFixed(3)} tile radius · ${spec.damage.toFixed(2)}× damage · ${spec.cooldownMs} ms cooldown · No fireballs`;
  $('time').textContent=`${time.toFixed(2)} / 2.60 s`;$('phase').textContent=time<release?'Casting':time<.74?'Opening fan':time<1.18?'Flame sheet + impact':time<1.95?'Layered flame sheet':'Dissipating';($('timeline') as HTMLInputElement).value=String(time);$('play').textContent=paused?'Play':'Pause';
 }
 function choose(rank:number){level=rank;($('level') as HTMLSelectElement).value=String(level);render();}
 $('play').onclick=()=>{if(time>=duration){time=0;paused=false;}else paused=!paused;render();};$('replay').onclick=()=>{time=0;paused=false;cycles++;render();};$('loop').onclick=()=>{loop=!loop;$('loop').setAttribute('aria-pressed',String(loop));};
 $('level').onchange=e=>choose(Number((e.target as HTMLSelectElement).value));cards.forEach(c=>c.onclick=()=>choose(Number(c.dataset.rank)));
 $('backdrop').onchange=e=>{night=(e.target as HTMLSelectElement).value==='night';render();};$('timeline').oninput=e=>{time=Number((e.target as HTMLInputElement).value);paused=true;render();};
 let previous=0;function frame(now:number){if(now-previous>=1000/30){const dt=previous?Math.min(.1,(now-previous)/1000):0;previous=now;if(!paused&&!document.hidden){time+=dt;if(time>=duration){if(loop){time=0;cycles++;}else{time=duration;paused=true;}}render();}}requestAnimationFrame(frame);}
 $('status').remove();($('play') as HTMLButtonElement).disabled=false;($('replay') as HTMLButtonElement).disabled=false;render();requestAnimationFrame(frame);
 (window as any).__FAN_PREVIEW__={seek:(t:number)=>{time=Math.max(0,Math.min(duration,t));paused=true;render();},state:()=>({time,level,paused,loop,cycles,night,nixie:true,emitterCount:effect.emitters.length,projectiles:0,spec:flameFanLevel(level),targetCount:targets.length,actorsLoaded:images.size,casting:time<.8,hitting:time>=release+.32&&time<1.18,comparison:looks.map((l,i)=>({level:i+1,time,scale:PX,camera:[OX,OY,SQUASH],layers:l.layers,spec:flameFanLevel(i+1)}))})};
}
boot().catch(e=>{$('status').textContent=String(e);console.error(e);});
