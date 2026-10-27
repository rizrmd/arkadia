import {Application,Container,Graphics,Text} from 'pixi.js';
import type {Progress} from './loading-progress';

type Entry={label:string;path:string;kind:string;status:string};
const entries:Entry[]=[
 {label:'Rift Dash Player',path:'/rift-dash/player/',kind:'VFX',status:'Dedicated Pixi player'},
 {label:'Skill Player',path:'/skill-player/',kind:'VFX',status:'Interactive skill catalog'},
 {label:'FX Lab',path:'/fx-lab/',kind:'VFX',status:'Full controls'},
 {label:'Flame Burst Player',path:'/flame-burst/',kind:'VFX',status:'Pixi player'},
 {label:'Flame Fan Levels',path:'/ember-warden-review/flame-fan-levels/',kind:'Spritesheet',status:'Animation levels'},
 {label:'Flame Fan Preview',path:'/ember-warden-review/flame-fan-preview/',kind:'VFX',status:'NixieFX preview'},
 {label:'Flame Fan Flipbook',path:'/ember-warden-review/flame-fan-flipbook/',kind:'Spritesheet',status:'Flipbook'},
 {label:'Rift Bolt Levels',path:'/rift-runner/rift-bolt-levels/',kind:'VFX',status:'Animation levels'},
 {label:'Sprite Player',path:'/sprite-player/',kind:'Spritesheet',status:'Hero pose player'},
 {label:'3D Hero Lab',path:'/3d-hero-lab/',kind:'3D',status:'Hero and animation lab'},
 {label:'Run Cadence',path:'/run-cadence/',kind:'Spritesheet',status:'Eight-direction review'},
 {label:'Modular Stronghold',path:'/modular-stronghold/',kind:'3D / World',status:'Modular scene preview'},
];
const colors:Record<string,number>={VFX:0x4fd1c5,Spritesheet:0xe7b86b,'3D':0xc792ea,'3D / World':0xc792ea};
export async function mount(root:HTMLElement,progress:Progress){
 progress(1,1,'Loading developer player catalog');
 const app=new Application();await app.init({resizeTo:window,backgroundColor:0x0d141c,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});root.replaceChildren(app.canvas);
 const stage=app.stage,ui=new Container();stage.addChild(ui);
 const title=ui.addChild(new Text({text:'ARKADIA / DEV',style:{fontFamily:'Georgia',fontSize:28,fill:0xf4d9a0,fontWeight:'bold'}}));title.position.set(28,22);
 const subtitle=ui.addChild(new Text({text:'Player catalog · 3D, VFX and spritesheet previews',style:{fontFamily:'Arial',fontSize:14,fill:0x9aabbc}}));subtitle.position.set(30,60);
 function draw(){for(const c of ui.children.slice(2))c.destroy();const cols=innerWidth<720?1:2,gap=16,pad=28,top=96,w=(innerWidth-pad*2-gap*(cols-1))/cols,h=84;entries.forEach((entry,i)=>{const x=pad+(i%cols)*(w+gap),y=top+Math.floor(i/cols)*(h+gap),card=new Container();const bg=card.addChild(new Graphics());bg.roundRect(0,0,w,h,10).fill(0x172431).stroke({color:colors[entry.kind]??0x8090a0,width:1,alpha:.7});const name=card.addChild(new Text({text:entry.label,style:{fontFamily:'Arial',fontSize:17,fill:0xf2f5f7,fontWeight:'bold'}}));name.position.set(16,12);const meta=card.addChild(new Text({text:`${entry.kind}  ·  ${entry.status}`,style:{fontFamily:'Arial',fontSize:12,fill:0xb8c5d0}}));meta.position.set(16,38);const url=card.addChild(new Text({text:location.origin+entry.path,style:{fontFamily:'monospace',fontSize:11,fill:colors[entry.kind]??0x9ed0e2}}));url.position.set(16,60);card.position.set(x,y);card.eventMode='static';card.cursor='pointer';card.on('pointertap',()=>{location.href=entry.path;});ui.addChild(card);});}
 draw();window.addEventListener('resize',draw);(window as any).__ARKADIA_DEV__={entries,open:(path:string)=>{location.href=path;}};
}
