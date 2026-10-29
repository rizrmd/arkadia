import fs from 'node:fs/promises';import assert from 'node:assert/strict';import vm from 'node:vm';import ts from 'typescript';
const controls=await fs.readFile('src/stronghold/controls.ts','utf8'),hero=await fs.readFile('src/stronghold/hero.ts','utf8'),encounters=await fs.readFile('src/stronghold/encounters.ts','utf8'),artSource=await fs.readFile('src/fx/rift-dash-vfx.ts','utf8');
class Container{children=[];position={set(){}};addChild(c){this.children.push(c);return c}}
class Sprite{constructor(texture={width:256,height:256}){this.texture=texture}anchor={set(){}};position={set(x,y){this.x=x;this.y=y}};visible=true}
class Texture{constructor(o){Object.assign(this,o);this.width=256;this.height=256}static from(){return new Texture({})}}
class Rectangle{constructor(...v){this.values=v}}
const Assets={load:async()=>new Texture({source:{}})};
let now=1;const listeners={};class HTMLElement{}class HTMLCanvasElement extends HTMLElement{}
const window={addEventListener:(k,f)=>{(listeners[k]??=[]).push(f)}};const document={addEventListener(){},hidden:false};const sandbox={Container,Sprite,Texture,Rectangle,Assets,window,document,HTMLElement,HTMLCanvasElement,innerWidth:390,innerHeight:844,performance:{now:()=>now},Math,console,Set,Map};
const context=vm.createContext(sandbox);const js=s=>ts.transpileModule(s.replace(/^import .*;\n/gm,'').replace(/export /g,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText.replace(/export /g,'');
vm.runInContext(js(controls)+'\nglobalThis.makeControls=createControls;',context);
vm.runInContext(js(artSource)+'\nglobalThis.makeArt=RiftDashVfx;',context);const art=await context.makeArt.load();
const face=hero.slice(hero.indexOf(' function face(sx:'),hero.indexOf('\n let jumped=',hero.indexOf(' function face(sx:')));
const cast=encounters.slice(encounters.indexOf(' function controlDash()'),encounters.indexOf(" let offerKey=",encounters.indexOf(' function controlDash()')));
const travel=encounters.slice(encounters.indexOf('  if(travel){\n   travel.age='),encounters.indexOf('\n  vfx.step(dt);',encounters.indexOf('  if(travel){\n   travel.age=')));
const report={passed:false,implementation:'Production controls.direction, hero.face, controlDash, travel step and RiftDashVfx.render executed directly with navigation/Pixi test doubles.',durationMs:260,cases:[]};
for(const mode of ['keyboard','touch'])for(const [name,keys,sx,sy]of [['N',['KeyW'],0,-1],['NE',['KeyW','KeyD'],2,-1],['E',['KeyD'],1,0],['SE',['KeyS','KeyD'],2,1],['S',['KeyS'],0,1],['SW',['KeyS','KeyA'],-2,1],['W',['KeyA'],-1,0],['NW',['KeyW','KeyA'],-2,-1]]){
 for(const k of Object.keys(listeners))delete listeners[k];
 const c=context.makeControls(new Container(),{frame:()=>new Container()},()=>true);
 const emit=(type,e)=>{for(const f of listeners[type]??[])f({preventDefault(){},stopImmediatePropagation(){},...e})};
 const target=new HTMLCanvasElement();let d;
 if(mode==='keyboard')for(const code of keys)emit('keydown',{code,target});
 else{emit('pointerdown',{isTrusted:true,pointerType:'touch',pointerId:1,clientX:70,clientY:600,target});const l=Math.hypot(sx,sy);emit('pointermove',{pointerId:1,clientX:70+sx/l*45,clientY:600+sy/l*45,target});}
 c.direction();now+=200;d=c.direction();
 if(mode==='keyboard')for(const code of keys)emit('keyup',{code,target});else emit('pointerup',{pointerId:1,target});
 now+=500;c.direction();now+=500;const neutral=c.direction();assert(Math.hypot(neutral.x,neutral.y)<.03);
 const f=vm.runInContext(js(`let yaw3d=0,vertical=false,horizontal=false,back=false,facing=1;${face}\nface(${d.x},${d.y});({x:Math.sin(yaw3d),y:Math.cos(yaw3d)})`).replaceAll('let yaw3d','var yaw3d').replaceAll('vertical=false','vertical=false'),vm.createContext({Math}));
 let pos={x:0,y:0},tile={u:0,v:0},distanceLimit=1.5,castOpts;const h={x:0,y:0,immune:0,play(){}};
 const unproject=(x,y)=>({x:(x/64+y/32)/2,y:(y/32-x/64)/2}),tilePoint=(u,v)=>({x:(u-v)*64,y:(u+v)*32});
 const scope=vm.createContext({Math,h,unproject,tilePoint,toTile:(x,y)=>{const p=unproject(x,y);return {u:p.x,v:p.y}},o:{hero:{facingDirection:()=>f,position:()=>pos,face(){},teleport:(x,y)=>{pos={x,y};return true}},cancelRoute(){}},dashReady:()=>true,online:false,walkable:p=>Math.hypot(p.u,p.v)<=distanceLimit+.001,cliffTile:()=>false,turn(){},vfx:{castSkill:(id,opts)=>{castOpts=opts}},performance:{now:()=>now},syncSkillBar(){}});
 vm.runInContext(js(`let travel=null,lastDash=null,trailUntil=0;${cast}\nglobalThis.cast=controlDash;globalThis.advance=(dt)=>{${travel}};globalThis.state=()=>({travel,lastDash});`),scope);
 assert(scope.cast(),mode+' '+name+' cast');assert.deepEqual(pos,{x:0,y:0},'no instant teleport');const endpoint=scope.state().lastDash.to,x=(endpoint.u-endpoint.v)*64,y=(endpoint.u+endpoint.v)*32;assert((x*sx+y*sy)/(Math.hypot(x,y)*Math.hypot(sx,sy))>.999);
 const frames=[];art.cast({x:0,y:0},tilePoint(endpoint.u,endpoint.v),1,undefined,0);
 for(let ms=20;ms<=260;ms+=20){scope.advance(20);art.update(ms);const a=art.snapshot(),p=unproject(pos.x,pos.y);frames.push({ms,u:p.x,v:p.y,arrival:a.arrivalVisible});const fraction=ms/260;assert(Math.abs(p.x-endpoint.u*fraction)<1e-8&&Math.abs(p.y-endpoint.v*fraction)<1e-8);assert.equal(a.arrivalVisible,ms>=260)}
 assert.equal(scope.state().travel,null);assert.equal(castOpts.dashDistance,scope.state().lastDash.distance);
 // Same production sweep must shorten travel at an obstacle and retain duration.
 pos={x:0,y:0};h.x=h.y=0;distanceLimit=.7;assert(scope.cast());assert(scope.state().lastDash.distance<=.701);for(let n=0;n<13;n++)scope.advance(20);assert(Math.hypot(...Object.values(unproject(pos.x,pos.y)))<=.701);
 report.cases.push({mode,heading:name,neutral:true,cursorIndependent:true,frames,collisionClamped:true});
}
report.passed=true;await fs.writeFile('docs/rift-dash-motion/input-frame-verification.json',JSON.stringify(report,null,2));console.log('PASS: 16 keyboard/touch neutral-facing cases, 208 intermediate frames, arrival at 260 ms, 16 collision clamps.');
