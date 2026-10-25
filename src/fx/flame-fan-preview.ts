import {Application,Texture} from 'pixi.js';
import {PixiVfxRenderer} from 'nixie-fx/pixi';
import {normalizeParticleEffect} from 'nixie-fx';
import {flameFanLevel} from './flame-fan-levels';
import './flame-fan-preview.css';
const root=document.getElementById('player')!;
root.innerHTML=`<header><p>EMBER WARDEN · VFX REVIEW</p><h1>Flame Fan</h1><span>Connected flame sheet · NixieFX</span></header><section id="stage"><div id="status">Loading NixieFX…</div></section><section class="controls"><div class="row"><label>Skill level <select id="level">${[1,2,3,4,5].map(x=>`<option value="${x}">Lv. ${x}</option>`).join('')}</select></label><button id="play">Pause</button><button id="replay">Replay</button><button id="loop" aria-pressed="true">Loop</button><label>Backdrop <select id="backdrop"><option value="night">Night</option><option value="day">Day</option></select></label></div><input id="timeline" type="range" min="0" max="2.6" step="0.01" value="0" aria-label="Animation timeline"><div class="row info"><span id="phase"></span><output id="time"></output></div><p>108° forward fan · No fireballs · Preview only</p></section>`;
const $=(id:string)=>document.getElementById(id)!;
const stage=$('stage'),surface=document.createElement('canvas');surface.width=768;surface.height=512;
let time=0,level=1,paused=false,loop=true,cycles=0,night=true;
const duration=2.6;
// Procedural flame material; the resulting texture is rendered by a single stationary
// NixieFX sheet. Polar flow preserves a filled 108-degree sector, including at Lv.1.
const gl=surface.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true})!;
if(!gl)throw Error('WebGL is required for the flame material');
const vert=`attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const frag=`precision highp float;
uniform float t;uniform float rank;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<5;i++){n+=a*noise(p);p=p*2.03+vec2(7.1,3.7);a*=.5;}return n;}
void main(){
 vec2 p=vec2(gl_FragCoord.x-384.,gl_FragCoord.y-42.);
 float age=t-.24,growth=smoothstep(0.,.36,age);
 float radius=410.*(.72+.07*(rank-1.))*max(.001,growth);
 float r=length(p)/radius,a=atan(p.x,p.y);
 float flow=fbm(vec2(a*7.,r*4.-t*1.8));
 float warp=fbm(vec2(a*12.+flow*4.,r*5.-t*2.4));
 float fine=fbm(vec2(a*28.+warp*4.,r*9.-t*3.));
 float rim=.91+.15*fbm(vec2(a*24.,t*2.))+.06*sin(a*34.+flow*9.);
 float side=1.-smoothstep(.918,.95,abs(a));
 float edge=1.-smoothstep(rim-.05,rim+.02,r);
 float heat=clamp(.10+flow*.45+warp*.4+fine*.2+(1.-r)*.22,0.,1.);
 heat-=smoothstep(.76,1.15,r)*.26;
 vec3 col=mix(vec3(.65,.045,.002),vec3(1.,.24,.003),smoothstep(.25,.53,heat));
 col=mix(col,vec3(1.,.68,.035),smoothstep(.50,.77,heat));
 col=mix(col,vec3(1.,.97,.58),smoothstep(.76,1.,heat));
 float alpha=side*edge*smoothstep(0.,.04,r)*smoothstep(0.,.09,age)*(1.-smoothstep(1.95,2.6,t));
 // A soft halo follows the same fan silhouette, never replacing the filled body.
 float halo=side*(1.-smoothstep(rim,rim+.10,r))*.17;
 gl_FragColor=vec4(col,clamp(max(alpha,halo*smoothstep(0.,.15,age))*(1.-smoothstep(2.,2.6,t)),0.,1.));
}`;
function compile(type:number,source:string){const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'Flame shader failed');return s;}
const program=gl.createProgram()!;gl.attachShader(program,compile(gl.VERTEX_SHADER,vert));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,frag));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'Flame material failed');gl.useProgram(program);
const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
function paint(){gl.uniform1f(gl.getUniformLocation(program,'t'),time);gl.uniform1f(gl.getUniformLocation(program,'rank'),level);gl.viewport(0,0,768,512);gl.drawArrays(gl.TRIANGLES,0,6);}
async function boot(){
 const app=new Application();await app.init({backgroundAlpha:0,antialias:true,autoStart:false,preference:'webgl',resolution:Math.min(devicePixelRatio,2)});stage.append(app.canvas);
 const texture=Texture.from(surface);texture.source.autoGarbageCollect=false;
 const renderer=new PixiVfxRenderer({parent:app.stage,textureProvider:{getTexture:()=>texture}});
 const constant=(value:number)=>({mode:'constant',value,min:value,max:value});
 const effect=normalizeParticleEffect({app:'vfx-editor',kind:'particle-effect',version:1,targetProfile:'pixi-ui-2d',id:'flame-fan-preview.connected-sheet',name:'Flame Fan — connected flame sheet',timeline:{duration:duration,frameRate:60},emitters:[{id:'connected-sheet',name:'Stationary 108 degree flame sheet',mode:'billboard',maxParticles:1,duration:.01,loop:false,modules:{velocity:false,color:false,size:false,textureSheetAnimation:false},spawn:{rate:0,bursts:[{time:0,count:1,cycles:1,probability:1}],radius:0,position:[0,0,0]},initializeParticle:{lifetime:constant(10),size:constant(1),startSizeSeparateAxes:true,size3D:{x:constant(1),y:constant(512/768),z:constant(1)},rotation:constant(0),velocity:{speed:constant(0)}},forces:{gravity:0,drag:0},render:{texture:'procedural/flame-fan',blend:'alpha',opacitySource:'textureAlpha'},billboard:{shape:'quad',sizeStart:1,sizeEnd:1,sizeValue:constant(1),softness:0}}]});
 let w=0,h=0,unit=1;
 const projection={project:(_p:unknown,out?:any)=>Object.assign(out||{},{x:w/2,y:h*.51,visible:true}),pixelsPerWorldUnit:()=>unit,depth:()=>0};
 const instance=renderer.createEffect(effect,{projection,autoStart:false});instance.spawn({position:[0,0,0],seed:17,timeSeconds:0});instance.update(.01,.01);
 function resize(){w=stage.clientWidth;h=stage.clientHeight;unit=Math.min(w*.97,h*1.35);app.renderer.resize(w,h);instance.setProjection(projection);render();}
 function render(){paint();texture.source.update();instance.update(0,time);app.render();$('time').textContent=`${time.toFixed(2)} / 2.60 s`;$('phase').textContent=time<.24?'Ignition':time<.60?'Opening fan':time<1.95?'Flame sheet':'Dissipating';($('timeline') as HTMLInputElement).value=String(time);$('play').textContent=paused?'Play':'Pause';}
 new ResizeObserver(resize).observe(stage);
 $('play').onclick=()=>{paused=!paused;render();};$('replay').onclick=()=>{time=0;paused=false;cycles++;render();};$('loop').onclick=()=>{loop=!loop;$('loop').setAttribute('aria-pressed',String(loop));};
 $('level').onchange=e=>{level=Number((e.target as HTMLSelectElement).value);time=0;paused=false;render();};
 $('backdrop').onchange=e=>{night=(e.target as HTMLSelectElement).value==='night';stage.classList.toggle('day',!night);};
 $('timeline').oninput=e=>{time=Number((e.target as HTMLInputElement).value);paused=true;render();};
 let previous=0;function frame(now:number){const dt=previous?Math.min(.05,(now-previous)/1000):0;previous=now;if(!paused&&!document.hidden){time+=dt;if(time>=duration){if(loop){time=0;cycles++;}else{time=duration;paused=true;}}render();}requestAnimationFrame(frame);}resize();$('status').remove();requestAnimationFrame(frame);
 (window as any).__FAN_PREVIEW__={seek:(t:number)=>{time=t;paused=true;render();},state:()=>({time,level,paused,loop,cycles,night,nixie:true,emitterCount:effect.emitters.length,projectiles:0,spec:flameFanLevel(level)})};
}
boot().catch(e=>{$('status').textContent=String(e);console.error(e);});
