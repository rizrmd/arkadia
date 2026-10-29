// @ts-nocheck
import {Application,Container,Sprite,Assets} from 'pixi.js';
import {loadFonts,installMsdfFx} from '/src/typography/msdf.ts';
import {createCoreUpgradePanel} from '/src/stronghold/core-upgrade-panel.ts';
import {createFarmPanel} from '/src/stronghold/farm-panel.ts';
import {createLumberPanel} from '/src/stronghold/lumber-panel.ts';
import {createKitchenPanel} from '/src/stronghold/kitchen-panel.ts';
import {createWallsPanel} from '/src/stronghold/walls-panel.ts';
import {createMinePanel} from '/src/stronghold/mine-panel.ts';
const app=new Application();await app.init({width:innerWidth,height:innerHeight,background:0x526572,preference:'webgl'});document.body.append(app.canvas);installMsdfFx(app.renderer);await loadFonts('/typography/v2/fonts/');
const fire=new Sprite(await Assets.load('/buildings/starting-campfire/campfire-v1.png'));fire.anchor.set(.5,545/887);fire.width=320;fire.height=160;fire.position.set(500,620);app.stage.addChild(fire);
const ui=app.stage.addChild(new Container());let pos={x:577,y:420},online=false;let level=0,core=30;const panel=createMinePanel(ui,()=>({level,core}),()=>online,draw);
const mineRoot=ui.children[0];const peers=[];await panel.loaded;peers.push(createWallsPanel(ui,()=>({level:0,core}),()=>online,draw),createCoreUpgradePanel(ui,1,()=>online,draw),createFarmPanel(ui,()=>({level:0,core}),()=>online,draw),createLumberPanel(ui,()=>({level:0,core}),()=>online,draw),createKitchenPanel(ui,()=>({level:0,core,farm:0}),()=>online,draw));await Promise.all(peers.map(p=>p.loaded));
function draw(){app.renderer.resize(innerWidth,innerHeight);panel.place(innerWidth/2-577,300,1,innerWidth,innerHeight,pos.x,pos.y);for(const peer of peers)peer.place(innerWidth/2-577,300,1,innerWidth,innerHeight,pos.x,pos.y);app.render();}
window.fixture={badges:()=>ui.children.map(root=>({visible:root.children[0].visible,enabled:root.children[0].eventMode==='static'&&root.children[0].interactiveChildren})),peerStates:()=>peers.map(p=>p.snapshot()),peerOpen:()=>ui.getChildByLabel('Stronghold Core upgrade').children[0].emit('pointertap',{stopPropagation(){}}),close:()=>mineRoot.children[1].getChildByLabel('Close Mine panel').emit('pointertap',{stopPropagation(){}}),destroy:()=>panel.destroy(),texts:()=>{const out=[];function walk(c){if(typeof c.text==='string')out.push(c.text);for(const ch of c.children||[])walk(ch)}walk(mineRoot);return out;},set:(l,c=30)=>{level=l;core=c;draw()},open:()=>{mineRoot.children[0].emit('pointertap',{stopPropagation(){}})},bounds:()=>{const b=mineRoot.children[1].getBounds();return {x:b.x,y:b.y,width:b.width,height:b.height}},snapshot:panel.snapshot,move:(x,y)=>{pos={x,y};draw()},online:v=>{online=v;draw()}};draw();