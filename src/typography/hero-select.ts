import {Assets,Container,Graphics,NineSliceSprite,Sprite,type Texture} from 'pixi.js';
import {MsdfText} from './text';

// Choose Your Hero, with every word live MSDF text. Art, frames and English strings come from the Choosing Hero kit
// (public/choosing-hero/v1, commit 1a413f1), referenced read-only. Desktop matches the 1672 × 941 reference; the
// portrait layout matches the kit's 864 × 1824 mobile references (Ember: Loadout as panel title; Rift: full panel).
export type HeroId='ember-warden'|'rift-runner';
interface Labels{title:string;subtitle:string;back:string;loadout:string;journey:string;selected:string;empty:string;level:string;automatic:string;blessings:string;heroes:Record<HeroId,{name:string;description:string;skill:string}>}
const HEROES:HeroId[]=['ember-warden','rift-runner'];
const SKILL_ICON:Record<HeroId,string>={'ember-warden':'skill-flame-fan','rift-runner':'skill-rift-bolt'};
// Cinzel's lower case is small caps: title case gives the reference's tall initials (EMBER WARDEN, BEGIN JOURNEY).
const titleCase=(s:string)=>s.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
const DESIGN={desktop:{width:1672,height:941},mobile:{width:864,height:1824}};

export class HeroSelect extends Container{
 private stage=new Container();
 private bg=new Sprite();
 private overlay=new Sprite();
 public onSelect?:(hero:HeroId)=>void;
 public onConfirm?:(hero:HeroId)=>void;
 public onBack?:()=>void;
 private constructor(private kit:Record<string,Texture>,private logo:Texture,private labels:Labels,private references:Partial<Record<string,Texture>>,public hero:HeroId,public device:'desktop'|'mobile'){
  super();this.addChild(this.bg,this.stage,this.overlay);this.overlay.alpha=0;this.build();
 }
 static async load(kitBase:string,logo:string,references:Record<string,string>,hero:HeroId){
  const files=['backgrounds/castle-desktop.png','backgrounds/castle-mobile.png','heroes/ember-warden.png','heroes/rift-runner.png','cards/ember-warden-portrait.png','cards/rift-runner-portrait.png',
   ...['card-frame','card-frame-selected','selected-badge','back','divider','panel-desktop','panel-mobile','button-default','skill-flame-fan','skill-rift-bolt','skill-empty'].map(n=>`components/${n}.png`)];
  const textures=await Promise.all(files.map(f=>Assets.load<Texture>({src:kitBase+f,data:{autoGenerateMipmaps:true}})));
  const labels=await (await fetch(kitBase+'labels.en.json')).json() as Labels;
  const logoTex=await Assets.load<Texture>({src:logo,data:{resolution:3,autoGenerateMipmaps:true}});
  const refs=Object.fromEntries(await Promise.all(Object.entries(references).map(async([k,u])=>[k,await Assets.load<Texture>(u)] as const)));
  return new HeroSelect(Object.fromEntries(files.map((f,i)=>[f.replace(/^.*\/|\.png$/g,''),textures[i]])),logoTex,labels,refs,hero,'desktop');
 }
 set referenceAlpha(a:number){this.overlay.alpha=a;}
 select(hero:HeroId){this.hero=hero;this.build();this.onSelect?.(hero);}
 confirm(){this.onConfirm?.(this.hero);}
 back(){if(this.onBack)this.onBack();else this.onConfirm?.(this.hero);}
 private sprite(name:string,x:number,y:number,w:number,h:number){const s=new Sprite(this.kit[name]);s.position.set(x,y);s.width=w;s.height=h;return this.stage.addChild(s);}
 private text(...args:ConstructorParameters<typeof MsdfText>){return this.stage.addChild(new MsdfText(...args));}
 private card(id:HeroId,x:number,y:number,w:number,h:number,names:{selected:[number,number];plain:number}){
  const selected=id===this.hero,k=w/320,c=this.stage.addChild(new Container());
  c.position.set(x,y);c.eventMode='static';c.cursor='pointer';c.on('pointertap',()=>this.select(id));
  for(const n of [`${id}-portrait`,selected?'card-frame-selected':'card-frame']){const s=c.addChild(new Sprite(this.kit[n]));s.width=w;s.height=h;}
  if(selected){const b=c.addChild(new Sprite(this.kit['selected-badge']));b.position.set(24*k,264*k);b.width=b.height=64*k;}
  const name=this.labels.heroes[id].name,size=this.device==='mobile'?29:27;
  if(selected){this.text('body-lg',name,{size}).place(x+w/2,names.selected[0],.5);this.text('accent',this.labels.selected,{size:size-4}).place(x+w/2,names.selected[1],.5);}
  else this.text('body-lg',name,{size}).place(x+w/2,names.plain,.5);
 }
 private build(){
  this.stage.removeChildren().forEach(c=>c.destroy({children:true}));
  const L=this.labels,h=L.heroes[this.hero],mobile=this.device==='mobile',{width:W,height:H}=DESIGN[this.device];
  this.bg.texture=this.kit[mobile?'castle-mobile':'castle-desktop'];
  const ref=this.references[`${this.hero}-${this.device}`];this.overlay.texture=ref??this.kit['castle-desktop'];this.overlay.visible=!!ref;
  if(!mobile){
   const art=this.sprite(this.hero,346,141,800,1200),mask=new Graphics().rect(346,141,800,800).fill(0xffffff);art.mask=mask;this.stage.addChild(mask);
   const logo=this.stage.addChild(new Sprite(this.logo));logo.position.set(42,16);
   const backBtn=this.sprite('back',42,92,56,56);backBtn.eventMode='static';backBtn.cursor='pointer';backBtn.on('pointertap',()=>this.back());
   const backTxt=this.text('body',L.back);backTxt.place(106,126);backTxt.eventMode='static';backTxt.cursor='pointer';backTxt.on('pointertap',()=>this.back());
   this.sprite('divider',420,68,820,55);
   this.text('display-title',L.title).place(W/2,77,.5);
   this.text('body-lg',L.subtitle,{size:27}).place(W/2,121,.5);
   HEROES.forEach((id,i)=>this.card(id,60,158+i*350,270,338,{selected:[430+i*350,453+i*350],plain:158+i*350+288}));
   this.sprite('panel-desktop',1155,130,485,660);
   this.text('display-name',h.name,{size:41.5}).place(1397,235,.5);
   this.sprite('divider',1200,256,395,28);
   this.text('body',h.description,{size:23}).place(1397,306,.5);
   this.text('label-wide',L.loadout).place(1200,392);
   this.sprite('divider',1330,375,260,30);
   for(let i=0;i<3;i++){this.sprite(i?'skill-empty':SKILL_ICON[this.hero],1194+i*139,427,126,126);this.text('body',i?L.empty:h.skill,{size:22.5}).place(1257+i*139,563,.5);}
   this.text('accent',L.level,{size:21}).place(1257,590,.5);
   // The paragraph wraps to the panel's dark interior: panel width less 40 px on each side.
   const para=this.text('paragraph',`${L.automatic} ${L.blessings}`,{wrapWidth:485-80});para.place(1397,642,.5);
   const journeyBtn=this.sprite('button-default',1155,744,485,97);journeyBtn.eventMode='static';journeyBtn.cursor='pointer';journeyBtn.on('pointertap',()=>this.confirm());
   this.text('display-button',titleCase(L.journey)).place(1397,795,.5);
  }else{
   const art=new Sprite(this.kit[this.hero]);art.position.set(0,174);art.width=864;art.height=1296;
   const mask=new Graphics().rect(0,174,864,1080).fill(0xffffff);art.mask=mask;this.stage.addChild(art,mask);
   const backBtn=this.sprite('back',20,20,80,80);backBtn.eventMode='static';backBtn.cursor='pointer';backBtn.on('pointertap',()=>this.back());
   const logo=this.stage.addChild(new Sprite(this.logo));logo.width=290;logo.height=290*70/270;logo.position.set(432-145,18);
   this.sprite('divider',78,172,708,40);
   this.text('display-title',L.title,{size:46.5}).place(432,150,.5);
   // The panel goes under the card row: the cards' lower ornaments overlap its top rail, as in the references.
   const compact=false;
   const panelH=compact?358:465,panelY=1222;
   const panel=new NineSliceSprite({texture:this.kit['panel-mobile'],leftWidth:64,topHeight:64,rightWidth:64,bottomHeight:64,width:816,height:panelH});panel.position.set(24,panelY);this.stage.addChild(panel);
   HEROES.forEach((id,i)=>this.card(id,100+i*340,866,324,405,{selected:[1167,1193],plain:1170}));
   let iconY:number,iconSize:number,nameY:number;
   if(compact){
    this.text('display-name',titleCase(L.loadout),{size:46}).place(432,1297,.5);
    this.sprite('divider',170,1290,524,40);
    iconY=1345;iconSize=150;nameY=1520;
   }else{
    this.text('display-name',h.name,{size:46}).place(432,1290,.5);
    this.sprite('divider',170,1292,524,32);
    this.text('body',h.description,{size:29}).place(432,1346,.5);
    this.text('label-wide',L.loadout,{size:24,align:'center'}).place(432,1398,.5);
    this.sprite('divider',110,1376,234,30);this.sprite('divider',520,1376,234,30);
    iconY=1412;iconSize=140;nameY=1576;
   }
   const cols=[228,431,634];
   cols.forEach((cx,i)=>{this.sprite(i?'skill-empty':SKILL_ICON[this.hero],cx-iconSize/2,iconY,iconSize,iconSize);this.text('body',i?L.empty:h.skill,{size:25}).place(cx,nameY,.5);});
   this.text('accent',L.level,{size:23}).place(cols[0],nameY+25,.5);
   if(!compact){
    this.sprite('divider',140,1596,584,30);
    const para=this.text('paragraph',L.automatic,{size:26,wrapWidth:816-2*70});para.place(432,1646,.5);
   }
   const buttonY=compact?1572:1662;
   const journeyBtn=this.sprite('button-default',24,buttonY,816,164);journeyBtn.eventMode='static';journeyBtn.cursor='pointer';journeyBtn.on('pointertap',()=>this.confirm());
   this.text('display-button',titleCase(L.journey),{size:50}).place(432,buttonY+83,.5);
  }
  this.layout(this.lastSize[0],this.lastSize[1]);
 }
 private lastSize:[number,number]=[1672,941];
 // Portrait viewports below 900 CSS px use the mobile composition; the stage scales uniformly and centres.
 layout(width:number,height:number){
  this.lastSize=[width,height];
  const device=width<900&&width<height?'mobile':'desktop';
  if(device!==this.device){this.device=device;this.build();return this.stage.scale.x;}
  const {width:W,height:H}=DESIGN[device],s=Math.min(width/W,height/H),ox=(width-W*s)/2,oy=(height-H*s)/2;
  this.stage.scale.set(s);this.stage.position.set(ox,oy);
  const bg=this.bg;bg.scale.set(Math.max(width/bg.texture.width,height/bg.texture.height));bg.position.set((width-bg.width)/2,(height-bg.height)/2);
  this.overlay.position.set(ox,oy);this.overlay.width=W*s;this.overlay.height=H*s;
  return s;
 }
 static sceneScale(width:number,height:number){const d=width<900&&width<height?DESIGN.mobile:DESIGN.desktop;return Math.min(width/d.width,height/d.height);}
}
