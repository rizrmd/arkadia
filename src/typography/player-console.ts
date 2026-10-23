import { Container, Graphics, Sprite } from 'pixi.js';
import type { FrameSet } from './frames';
import { MsdfText } from './text';
import { ROLES } from './tokens';

/** Reference console, in 560 × 170 design units. Text and fills remain live. */
export class PlayerConsole extends Container {
 private art = this.addChild(new Container());
 private nameText = this.addChild(new MsdfText({ ...ROLES['hud-name'], size: 29, fill: 0xfff7e6 }, ''));
 private levelText = this.addChild(new MsdfText({ ...ROLES['hud-level'], size: 27 }, '1'));
 private rows: { graphics: Graphics; value: MsdfText; y: number; h: number; color: number }[] = [];
 private portrait = '';
 private key = '';
 constructor(private frames: FrameSet) {
  super();
  const bezel = this.addChild(new Graphics());
  bezel.circle(77, 82, 69).fill(0x08090e).stroke({color:0x110e08,width:5});
  bezel.circle(77, 82, 68).stroke({color:0xeac267,width:2});
  bezel.circle(77, 82, 65.5).stroke({color:0xffedac,width:0.8});
  const mask = this.addChild(new Graphics().circle(77,82,64).fill(0xffffff));
  this.art.mask = mask;
  this.setChildIndex(this.art, this.getChildIndex(bezel) + 1);
  this.nameText.place(165, 51);
  const labels = ['HP', 'GATE', 'XP'];
  [0xf31325,0x04c5e6,0xffc522].forEach((color,i)=>{
   const y=62+i*32, h=i===2?18:24;
   const graphics=this.addChild(new Graphics());
   const value=this.addChild(new MsdfText({...ROLES['hud-value'],size:i===2?16:18,fill:0xfff6de,outline:{color:0x000000,alpha:1,width:1.3}},''));
   const label=this.addChild(new MsdfText({...ROLES['hud-name'],size:i===2?14:15,fill:0xfff5dd},labels[i]));
   label.place(201,y+h*.73);
   const icon=this.addChild(new Graphics());
   if(i===0){
    icon.moveTo(183,y+10).bezierCurveTo(170,y-2,165,y+12,183,y+20).bezierCurveTo(201,y+6,188,y+1,183,y+10).fill(0x9e101c).stroke({color:0xffb2a6,width:1});
   } else if(i===1){
    icon.moveTo(175,y+21).lineTo(175,y+9).arc(183,y+9,8,Math.PI,0).lineTo(191,y+21).stroke({color:0xaffaff,width:1.3});
    for(let x=179;x<=187;x+=4)icon.moveTo(x,y+7).lineTo(x,y+21).stroke({color:0x7beeff,width:1});
   } else {
    icon.poly([183,y+1,186,y+7,193,y+9,186,y+11,183,y+17,180,y+11,173,y+9,180,y+7]).stroke({color:0xffe38a,width:1.2});
   }
   this.rows.push({graphics,value,y,h,color});
  });
  const badge=this.addChild(new Graphics());
  badge.circle(29,137,20).fill(0x08090c).stroke({color:0x1c1205,width:4});
  badge.circle(29,137,19).stroke({color:0xecc36c,width:1.6});
  this.setChildIndex(this.levelText,this.children.length-1);
  this.levelText.place(29,146,0.5);
 }
 update(name:string,portrait:string,level:number,values:[number,number][]) {
  const key=JSON.stringify([name,portrait,level,values]);
  if(key===this.key)return;
  this.key=key;
  this.nameText.scale.set(1);
  this.nameText.text=name;
  this.nameText.place(165,51);
  if(this.nameText.width>390)this.nameText.scale.x=390/this.nameText.width;
  this.levelText.text=String(level);
  this.levelText.place(29,146,0.5);
  if(this.portrait!==portrait){
   this.portrait=portrait;
   for(const child of this.art.removeChildren())child.destroy();
   const image=this.art.addChild(new Sprite(this.frames.texture(portrait)));
   image.anchor.set(.5); image.position.set(77,82); image.width=137;image.height=137;
  }
  this.rows.forEach((row,i)=>{
   const [raw,rawMax]=values[i];
   const current=Number.isFinite(raw)?Math.max(0,raw):0;
   const max=Number.isFinite(rawMax)?Math.max(1,rawMax):1;
   const ratio=Math.min(1,current/max),{graphics:g,y,h,color}=row;
   g.clear();
   g.poly([165,y,558,y,544,y+h,151,y+h]).fill(0x090b0d).stroke({color:0x020303,width:2.5});
   g.poly([166,y+1,557,y+1,543,y+h-1,152,y+h-1]).stroke({color:i===2?0xc28c24:0x8f9895,width:.7});
   // Full track stays visible at zero. Clip the slanted fill at the exact current ratio.
   g.poly([237,y+1.5,555,y+1.5,542,y+h-1.5,224,y+h-1.5]).fill({color,alpha:.2});
   if(ratio>0){
    const top=237+318*ratio, bottom=224+318*ratio;
    g.poly([237,y+1.5,top,y+1.5,bottom,y+h-1.5,224,y+h-1.5]).fill(color);
    g.poly([237,y+1.5,top,y+1.5,top-4,y+h*.35,233,y+h*.35]).fill({color:0xffffff,alpha:.16});
    // Faceted inlays give the bars a cut-crystal finish without bitmap stretching.
    for(let x=244;x<bottom-7;x+=17)g.poly([x,y+3,x+9,y+7,x+3,y+h-3,x-6,y+h-7]).fill({color:0x000000,alpha:.09});
   }
   g.poly([237,y+1.5,555,y+1.5,542,y+h-1.5,224,y+h-1.5]).stroke({color,width:.9});
   if(i===2)for(let x=250;x<505;x+=33)g.moveTo(x,y+6).lineTo(x,y+h-5).stroke({color:0xffe5a1,width:.8,alpha:.8});
   row.value.text=`${Math.floor(current)} / ${Math.floor(max)}`;
   row.value.place(536,y+h*.77,1);
  });
 }
}
