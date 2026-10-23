import { Container, Graphics, Sprite } from 'pixi.js';
import type { FrameSet } from './frames';
import { MsdfText } from './text';
import { ROLES } from './tokens';

interface Meter {
 value: MsdfText;
 fill: Sprite;
 fillMask: Graphics;
 y: number;
 h: number;
 left: number;
 bottomLeft: number;
 ratio: number;
}
const INK = 0x050507;
const OUTLINE = { color: INK, alpha: 1, width: 1.15 };

/** Live reference console in 560 × 170 design units. Raster materials never stretch with current value. */
export class PlayerConsole extends Container {
 private art = this.addChild(new Container());
 private nameText = this.addChild(new MsdfText({ ...ROLES['hud-name'], font: 'console', size: 30.5, fill: 0xfff8e8, outline: OUTLINE }, ''));
 private levelText = this.addChild(new MsdfText({ ...ROLES['hud-level'], font: 'console', size: 31, fill: 0xfff9e9, outline: OUTLINE }, '1'));
 private rows: Meter[] = [];
 private portrait = '';
 private key = '';
 constructor(private frames: FrameSet) {
  super();
  this.nameText.place(165,54);
  const labels = ['HP', 'GATE', 'XP'];
  [0xf71325,0x00d5ed,0xffc51c].forEach((color,i)=>{
   const y=[66,99,133][i], h=i===2?17:24;
   const left=i===2?240:i===1?247:244, bottomLeft=i===1?234:230;
   const path=[left,y+1.5,555,y+1.5,542,y+h-1.5,bottomLeft,y+h-1.5];
   const g=this.addChild(new Graphics());
   // Dark metal label plate, recessed track and thin bevel copied from reference proportions.
   g.poly([169,y+1,558,y+1,544,y+h+2,154,y+h+2]).fill({color:0x000000,alpha:.55});
   g.poly([169,y,558,y,544,y+h,155,y+h]).fill(0x0b0c0d).stroke({color:INK,width:2.1});
   g.poly([170,y+1,556,y+1,543,y+h-1,157,y+h-1]).stroke({color:i===2?0x987526:0x99968b,width:.65});
   const texture=frames.texture(['console-hp-material','console-gate-material','console-xp-material'][i]);
   const track=this.addChild(new Sprite(texture));
   track.position.set(bottomLeft,y);track.width=326;track.height=h;track.tint=0x645344;
   const trackMask=this.addChild(new Graphics().poly(path).fill(0xffffff));
   track.mask=trackMask;
   const fill=this.addChild(new Sprite(texture));
   fill.position.copyFrom(track.position);fill.width=track.width;fill.height=h;
   const fillMask=this.addChild(new Graphics());fill.mask=fillMask;
   const trim=this.addChild(new Graphics());
   trim.poly(path).stroke({color,width:1});
   trim.moveTo(left+1,y+2).lineTo(553,y+2).stroke({color:0xfff9e4,width:.6,alpha:.65});
   if(i===2)for(let x=256;x<515;x+=33){
    trim.moveTo(x+.5,y+6).lineTo(x+.5,y+h-4).stroke({color:0x170f02,width:1.2});
    trim.moveTo(x,y+6).lineTo(x,y+h-4).stroke({color:0xffe3a0,width:.65});
   }
   const value=this.addChild(new MsdfText({...ROLES['hud-value'],font:'console',size:i===2?14.5:16.5,fill:0xfff8e7,outline:OUTLINE},''));
   const label=this.addChild(new MsdfText({...ROLES['hud-name'],font:'console',size:13,fill:0xfff4db,outline:OUTLINE},labels[i]));
   label.place(198,y+h*.73);
   const icon=this.addChild(new Graphics());
   if(i===0){
    icon.moveTo(180,y+10).bezierCurveTo(169,y-1,165,y+11,180,y+20).bezierCurveTo(198,y+5,184,y+1,180,y+10).fill(0x9d0d18).stroke({color:0xffb2a6,width:.9});
    icon.moveTo(169.5,y+8).bezierCurveTo(169,y+3,175,y+4,178,y+7).stroke({color:0xffe5d8,width:.65});
   } else if(i===1){
    icon.moveTo(171,y+21).lineTo(171,y+10).arc(178,y+10,7,Math.PI,0).lineTo(185,y+21).stroke({color:0xaffaff,width:1.1});
    for(let x=174;x<=182;x+=2.7)icon.moveTo(x,y+8).lineTo(x,y+21).stroke({color:0x7beeff,width:.8});
    icon.moveTo(173,y+10).lineTo(183,y+10).stroke({color:0xe7ffff,width:.8});
   } else {
    icon.poly([178,y+1,181,y+7,185,y+9,181,y+11,178,y+16,175,y+11,171,y+9,175,y+7]).stroke({color:0xffe38a,width:1});
   }
   this.rows.push({value,fill,fillMask,y,h,left,bottomLeft,ratio:0});
  });
  const badge=this.addChild(new Graphics());
  badge.circle(29,137.8,20.5).fill(0x030303).stroke({color:0x120b02,width:1.4});
  badge.circle(29,137,19.2).fill(0x100e0a).stroke({color:0xc58d2b,width:1.6});
  badge.circle(29,136.5,18.4).stroke({color:0xffe6a2,width:.6});
  badge.circle(29,137,17.6).fill(0x07090b);
  this.setChildIndex(this.levelText,this.children.length-1);
 }
 update(name:string,portrait:string,level:number,values:[number,number][]) {
  const key=JSON.stringify([name,portrait,level,values]);
  if(key===this.key)return;
  this.key=key;
  this.nameText.scale.set(1);
  this.nameText.text=name;
  this.nameText.place(165,54);
  if(this.nameText.width>390)this.nameText.scale.x=390/this.nameText.width;
  this.levelText.scale.set(1);
  this.levelText.text=String(level);
  this.levelText.place(29,147,0.5);
  if(this.levelText.width>30)this.levelText.scale.set(30/this.levelText.width);
  if(this.portrait!==portrait){
   this.portrait=portrait;
   for(const child of this.art.removeChildren())child.destroy();
   // A single transparent portrait+bezel asset: no opaque sibling can cover it.
   const image=this.art.addChild(new Sprite(this.frames.texture(`console-${portrait}`)));
   image.position.set(7,12);image.width=140;image.height=140;
  }
  this.rows.forEach((row,i)=>{
   const [raw,rawMax]=values[i];
   const current=Number.isFinite(raw)?Math.max(0,raw):0;
   const max=Number.isFinite(rawMax)?Math.max(1,rawMax):1;
   const ratio=Math.min(1,current/max),{fillMask:g,y,h,left,bottomLeft}=row;
   row.ratio=ratio;row.fill.visible=ratio>0;
   g.clear();
   // A vertical reveal, rather than scaling/shortening the painted material or using a slanted moving tip.
   const end=bottomLeft+(555-bottomLeft)*ratio;
   if(ratio>0){
    if(end<left){
     const upperY=y+1.5+(left-end)/(left-bottomLeft)*(h-3);
     g.poly([end,upperY,end,y+h-1.5,bottomLeft,y+h-1.5]).fill(0xffffff);
    } else {
     g.poly([left,y+1.5,end,y+1.5,Math.min(end,542),y+h-1.5,bottomLeft,y+h-1.5]).fill(0xffffff);
    }
   }
   row.value.text=`${Math.floor(current)} / ${Math.floor(max)}`;
   row.value.place(536,y+h*.77,1);
  });
 }
}
