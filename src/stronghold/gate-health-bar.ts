import {Container, Graphics, Sprite} from 'pixi.js';
import {MsdfText} from '../typography/text';
import {ROLES} from '../typography/tokens';
import type {FrameSet} from '../typography/frames';

/** Compact world meter using the hero console's slanted frame and green material. */
export class GateHealthBar extends Container {
 private fill: Sprite;
 private fillMask: Graphics;
 private caption: MsdfText;
 private hp = 100;
 private max = 100;
 constructor(frames: FrameSet) {
  super();
  const shape = [-82,-11,84,-11,74,11,-92,11];
  this.addChild(new Graphics()).poly(shape).fill(0x0b0c0d).stroke({color:0x050507,width:2});
  this.addChild(new Graphics()).poly([-81,-10,82,-10,73,10,-90,10]).stroke({color:0x987526,width:.65});
  const path = [-35,-8,79,-8,71,8,-43,8];
  const texture=frames.texture('console-xp-material');
  const track=this.addChild(new Sprite(texture));
  track.position.set(-43,-9);track.width=124;track.height=18;track.tint=0x645344;
  const trackMask=this.addChild(new Graphics()).poly(path).fill(0xffffff);track.mask=trackMask;
  this.fill=this.addChild(new Sprite(texture));
  this.fill.position.copyFrom(track.position);this.fill.width=track.width;this.fill.height=track.height;this.fill.tint=0x00d5ed;
  this.fillMask=this.addChild(new Graphics());this.fill.mask=this.fillMask;
  this.addChild(new Graphics()).poly(path).stroke({color:0x00d5ed,width:.65});
  const role={...ROLES['hud-value'],font:'console' as const,size:10,fill:0xfff8e7,outline:{color:0x050507,alpha:1,width:1}};
  this.addChild(new MsdfText(role,'GATE')).place(-75,4);
  this.caption=this.addChild(new MsdfText(role,''));
  this.eventMode='none';
  this.redraw();
 }
 setHealth(hp:number,max=100) {
  const next=Number.isFinite(hp)?Math.max(0,hp):0;
  const nextMax=Number.isFinite(max)?Math.max(1,max):1;
  if(next===this.hp&&nextMax===this.max)return;
  this.hp=next;this.max=nextMax;this.redraw();
 }
 private redraw() {
  const ratio=Math.min(1,this.hp/this.max),end=-43+122*ratio;
  this.fill.visible=ratio>0;
  this.fillMask.clear();
  if(ratio>0){
   if(end < -35){const upper=-8+((-35-end)/8)*16;this.fillMask.poly([end,upper,end,8,-43,8]).fill(0xffffff);}
   else this.fillMask.poly([-35,-8,end,-8,Math.min(end,71),8,-43,8]).fill(0xffffff);
  }
  this.caption.text=`${Math.floor(this.hp)} / ${Math.floor(this.max)}`;
  this.caption.place(69,4,1);
 }
 override destroy() {super.destroy({children:true});}
}
