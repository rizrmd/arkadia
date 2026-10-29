import {Application,Container,Sprite,Assets} from 'pixi.js';
import {loadFonts,installMsdfFx} from '../../src/typography/msdf';
import {createKitchenPanel} from '../../src/stronghold/kitchen-panel';
const app=new Application();await app.init({width:innerWidth,height:innerHeight,background:0x526572,preference:'webgl'});document.body.append(app.canvas);installMsdfFx(app.renderer);await loadFonts('/typography/v2/fonts/');
const fire=new Sprite(await Assets.load('/buildings/starting-campfire/campfire-v1.png'));fire.anchor.set(.5,545/887);fire.width=320;fire.height=160;fire.position.set(innerWidth/2,620);app.stage.addChild(fire);
const ui=app.stage.addChild(new Container());let pos={x:577,y:420},online=false;const qs=new URLSearchParams(location.search);
let state={level:Number(qs.get('level')??0),core:Number(qs.get('core')??30),farm:Number(qs.get('farm')??30)};
const panel=createKitchenPanel(ui,()=>state,()=>online,draw);await panel.loaded;
function draw(){panel.place(innerWidth/2-577,300,1,innerWidth,innerHeight,pos.x,pos.y);app.render();}
(window as any).fixture={open:()=>{ui.children[0].children[0].emit('pointertap',{stopPropagation(){}})},bounds:()=>{const b=ui.children[0].children[1].getBounds();return {x:b.x,y:b.y,width:b.width,height:b.height}},setLevel:(level:number)=>{state={...state,level};draw()},snapshot:panel.snapshot,move:(x:number,y:number)=>{pos={x,y};draw()},online:(v:boolean)=>{online=v;draw()}};draw();
