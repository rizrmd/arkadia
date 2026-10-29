// @ts-nocheck
import {Application,Container,Cache} from 'pixi.js';
import {loadFonts,installMsdfFx} from '/src/typography/msdf.ts';
import {createCoreUpgradePanel} from '/src/stronghold/core-upgrade-panel.ts';
import {createFarmPanel} from '/src/stronghold/farm-panel.ts';
import {createLumberPanel} from '/src/stronghold/lumber-panel.ts';
import {createKitchenPanel} from '/src/stronghold/kitchen-panel.ts';
import {createWallsPanel} from '/src/stronghold/walls-panel.ts';
import {createMinePanel} from '/src/stronghold/mine-panel.ts';
import {fresh,load,KEY} from '/src/stronghold/economy.ts';
import {constructionStatus,startConstruction,settleConstruction,constructionLevel} from '/src/stronghold/construction-rules.ts';
import {transactResources} from '/src/stronghold/store.ts';
import {resourceLabel,INFINITE_WOOD_FOOD} from '/src/stronghold/resource-mode.ts';
import {MsdfText} from '/src/typography/text.ts';
const app=new Application();await app.init({width:innerWidth,height:innerHeight,background:0x526572,preference:'webgl'});document.body.append(app.canvas);installMsdfFx(app.renderer);await loadFonts('/typography/v2/fonts/');
const ui=app.stage.addChild(new Container());ui.sortableChildren=true;let online=false,panels=[],roots=[],errors=[];
const kinds=['core','farm','lumber','kitchen','walls','mine'];const factories=[createCoreUpgradePanel,createFarmPanel,createLumberPanel,createKitchenPanel,createWallsPanel,createMinePanel];
const read=()=>load(localStorage.getItem(KEY));
const funds=()=>{const s=read();return {gold:s.gold,wood:s.resources.storedWood,food:s.resources.food,coreLevel:constructionLevel(s,'core'),queueUntil:s.construction?.readyAt??0,status:kind=>constructionStatus(s,kind,INFINITE_WOOD_FOOD,online),start:kind=>transactResources(s=>startConstruction(s,kind,Date.now(),INFINITE_WOOD_FOOD,online)).then(draw)};};
const counters=ui.addChild(new MsdfText({font:'body',size:24,letterSpacing:0,fill:0xffffff},resourceLabel(0,'wood')+'   '+resourceLabel(0,'food')));counters.position.set(15,20);
function draw(){app.renderer.resize(innerWidth,innerHeight);for(const p of panels)p.place(innerWidth/2-577,300,1,innerWidth,innerHeight,577,390);app.render();}
async function reset(level=0,gold=1e9,core=30,farm=30){for(const r of roots)r.destroy({children:true});panels=[];const s=fresh();s.gold=gold;s.strongholdCore={completedLevel:core};s.farm={completedLevel:farm};for(const k of ['farm','lumberMill','kitchen','walls','mine'])s[k]={completedLevel:k==='farm'?farm:level};s.resources={wood:13,food:17,storedWood:0,storedFood:19};localStorage.setItem(KEY,JSON.stringify(s));
 panels=factories.map((f,i)=>i===0?f(ui,core,()=>online,draw,funds):f(ui,()=>({level:constructionLevel(read(),kinds[i]),core:constructionLevel(read(),'core'),farm:constructionLevel(read(),'farm')}),()=>online,draw,funds));roots=ui.children.filter(c=>c!==counters);await Promise.all(panels.map(p=>p.loaded));draw();}
const point=c=>{const b=c.getBounds();return {x:(b.minX+b.maxX)/2,y:(b.minY+b.maxY)/2,width:b.width,height:b.height}};
await reset();
window.fixture={draw,reset,states:()=>panels.map(p=>p.snapshot()),badge:i=>point(roots[i].children[0]),button:i=>{const b=roots[i].children[1].children.find(c=>c.label?.includes('start construction')||c.label?.includes('unavailable'));return {...point(b),eventMode:b.eventMode,tint:b.tint};},save:()=>read(),settle:async()=>{await transactResources(s=>settleConstruction(s,s.construction.readyAt));draw();},set:({gold,core,farm,wood,online:co})=>{const s=read();if(gold!==undefined)s.gold=gold;if(wood!==undefined)s.resources.storedWood=wood;if(core!==undefined)s.strongholdCore.completedLevel=core;if(farm!==undefined)s.farm.completedLevel=farm;if(co!==undefined)online=co;localStorage.setItem(KEY,JSON.stringify(s));draw();},counters:()=>({text:counters.text,bounds:point(counters),glyphs:counters.children.length,infinityGlyph:!!Cache.get('EBGaramond-Medium-bitmap').chars['∞']?.texture})};draw();
