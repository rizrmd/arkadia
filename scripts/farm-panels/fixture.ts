// @ts-nocheck
import {Application,Container,Sprite,Assets} from 'pixi.js';
import {loadFonts,installMsdfFx} from '/src/typography/msdf.ts';
import {createFarmPanel} from '/src/stronghold/farm-panel.ts';
const app=new Application();await app.init({width:innerWidth,height:innerHeight,background:0x526572,preference:'webgl'});document.body.append(app.canvas);installMsdfFx(app.renderer);await loadFonts('/typography/v2/fonts/');
const fire=new Sprite(await Assets.load('/buildings/starting-campfire/campfire-v1.png'));fire.anchor.set(.5,545/887);fire.width=320;fire.height=160;fire.position.set(500,620);app.stage.addChild(fire);
const ui=app.stage.addChild(new Container());let pos={x:577,y:420},online=false;let level=0,core=30;const panel=createFarmPanel(ui,()=>({level,core}),()=>online,draw);
await panel.loaded;
function draw(){app.renderer.resize(innerWidth,innerHeight);panel.place(innerWidth/2-577,300,1,innerWidth,innerHeight,pos.x,pos.y);app.render();}
window.fixture={set:(l,c=30)=>{level=l;core=c;draw()},open:()=>{ui.children[0].children[0].emit('pointertap',{stopPropagation(){}})},bounds:()=>{const b=ui.children[0].children[1].getBounds();return {x:b.x,y:b.y,width:b.width,height:b.height}},snapshot:panel.snapshot,move:(x,y)=>{pos={x,y};draw()},online:v=>{online=v;draw()}};draw();