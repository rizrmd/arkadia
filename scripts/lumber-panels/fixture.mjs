import {Application,Container,Sprite,Assets} from 'pixi.js';
import {loadFonts,installMsdfFx} from '/src/typography/msdf.ts';
import {createLumberPanel} from '/src/stronghold/lumber-panel.ts';
const app=new Application();await app.init({width:innerWidth,height:innerHeight,background:0x526572,preference:'webgl'});document.body.append(app.canvas);installMsdfFx(app.renderer);await loadFonts('/typography/v2/fonts/');
const fire=new Sprite(await Assets.load('/buildings/starting-campfire/campfire-v1.png'));fire.anchor.set(.5,545/887);fire.width=320;fire.height=160;fire.position.set(500,620);app.stage.addChild(fire);
const ui=app.stage.addChild(new Container());let pos={x:577,y:420},online=false;const panel=createLumberPanel(ui,()=>({level:Number(new URLSearchParams(location.search).get('level')||0),core:Number(new URLSearchParams(location.search).get('core')||1)}),()=>online,draw);
await panel.loaded;
function draw(){panel.place(-77,300,1,innerWidth,innerHeight,pos.x,pos.y);app.render();}
window.fixture={open:()=>{ui.children[0].children[0].emit('pointertap',{stopPropagation(){}})},bounds:()=>{const b=ui.children[0].children[1].getBounds();return {x:b.x,y:b.y,width:b.width,height:b.height}},snapshot:panel.snapshot,level:(l,c)=>{history.replaceState({},'','?level='+l+'&core='+c);draw()},browse:()=>{ui.children[0].children[1].children.find(c=>c.label==='Next target level').emit('pointertap',{stopPropagation(){}})},move:(x,y)=>{pos={x,y};draw()},online:v=>{online=v;draw()}};draw();