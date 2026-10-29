// @ts-nocheck
import {Application,Container,Sprite,Assets,Cache} from 'pixi.js';
import {FONTS} from '/src/typography/tokens.ts';
import {loadFonts,installMsdfFx} from '/src/typography/msdf.ts';
import {createCoreUpgradePanel} from '/src/stronghold/core-upgrade-panel.ts';
import {createFarmPanel} from '/src/stronghold/farm-panel.ts';
import {createLumberPanel} from '/src/stronghold/lumber-panel.ts';
import {createKitchenPanel} from '/src/stronghold/kitchen-panel.ts';
import {createWallsPanel} from '/src/stronghold/walls-panel.ts';
import {createMinePanel} from '/src/stronghold/mine-panel.ts';
const app=new Application();await app.init({width:innerWidth,height:innerHeight,background:0x526572,preference:'webgl'});document.body.append(app.canvas);installMsdfFx(app.renderer);await loadFonts('/typography/v2/fonts/');
const fire=new Sprite(await Assets.load('/buildings/starting-campfire/campfire-v1.png'));fire.anchor.set(.5,545/887);fire.width=320;fire.height=160;fire.position.set(500,620);app.stage.addChild(fire);
const ui=app.stage.addChild(new Container());ui.sortableChildren=true;
let pos={x:577,y:390},online=false,level=1,core=1,farm=0,funds={gold:0,wood:0},worldActions=0;
const factories=[createCoreUpgradePanel,createFarmPanel,createLumberPanel,createKitchenPanel,createWallsPanel,createMinePanel];
const panels=factories.map((f,i)=>i===0?f(ui,1,()=>online,draw,()=>funds):f(ui,()=>({level,core,farm}),()=>online,draw,()=>funds));
const roots=[...ui.children];await Promise.all(panels.map(p=>p.loaded));
app.canvas.addEventListener('pointerdown',()=>{if(!panels.some(p=>p.snapshot().open))worldActions++});
app.canvas.addEventListener('pointerup',()=>{if(!panels.some(p=>p.snapshot().open))worldActions++});
function draw(){app.renderer.resize(innerWidth,innerHeight);for(const p of panels)p.place(innerWidth/2-577,300,1,innerWidth,innerHeight,pos.x,pos.y);app.render();}
const point=c=>{const b=c.getBounds();return {x:(b.minX+b.maxX)/2,y:(b.minY+b.maxY)/2,width:b.width,height:b.height}};
const titles=['STRONGHOLD CORE','FARM','LUMBER MILL','KITCHEN','WALLS','MINE'];
const rect=c=>{const b=c.getBounds();if(typeof c.inkCenterY==='function'){
 const f=Cache.get(`${FONTS[c.role.font].family}-bitmap`),scale=c.size/f.fontMetrics.fontSize;let shift=(f.lineHeight-f.fontMetrics.fontSize)/2;if(shift-f.baseLineOffset<0)shift=0;
 const glyphs=[...c.text].filter(ch=>ch.trim()).map(ch=>f.chars[ch]).filter(g=>g?.texture);
 const top=Math.min(...glyphs.map(g=>Math.round(f.baseLineOffset+g.yOffset+shift)))*scale,bottom=Math.max(...glyphs.map(g=>Math.round(f.baseLineOffset+g.yOffset+shift)+g.texture.orig.height))*scale;
 return {left:b.minX,top:c.toGlobal({x:0,y:top}).y,right:b.maxX,bottom:c.toGlobal({x:0,y:bottom}).y};
 }return {left:b.minX,top:b.minY,right:b.maxX,bottom:b.maxY}};
const layout=i=>{const panel=roots[i].children[1],children=panel.children;const title=children.find(c=>c.text===titles[i]);const level=children.find(c=>typeof c.text==='string'&&(/^(Level |Build Level )/.test(c.text)));const divider=children.find(c=>c.texture?.label?.includes('/divider.png'));const portrait=children.find(c=>c.texture?.label?.match(/\/(campfire|farm|lumber|kitchen|walls|mine|core-\d+)\.png/));return {origin:panel.toGlobal({x:0,y:0}),scale:panel.scale.x,title:rect(title),level:rect(level),divider:rect(divider),portrait:rect(portrait)}};
const control=(i,label)=>{const panel=roots[i].children[1],child=panel.children.find(c=>c.label===label||(label==='close'&&c.label?.startsWith('Close ')));const area=child.hitArea;return child.toGlobal({x:area.x+area.width/2,y:area.y+area.height/2})};
window.fixture={layout,control,draw,states:()=>panels.map(p=>p.snapshot()),badges:()=>roots.map(r=>({visible:r.children[0].visible,enabled:r.children[0].eventMode==='static',...point(r.children[0]),...r.children[0].toGlobal({x:0,y:0})})),panel:i=>({...point(roots[i].children[1]),scale:roots[i].children[1].scale.x}),button:i=>{const b=roots[i].children[1].children.find(c=>c.label?.includes('unavailable'));return {...point(b),eventMode:b.eventMode,tint:b.tint,texture:b.texture.label}},texts:i=>{const out=[];function walk(c){if(typeof c.text==='string')out.push(c.text);for(const ch of c.children||[])walk(ch)}walk(roots[i].children[1]);return out;},set:(v)=>{({level=level,core=core,farm=farm,funds=funds,online=online,pos=pos}=v);draw()},worldActions:()=>worldActions};draw();
