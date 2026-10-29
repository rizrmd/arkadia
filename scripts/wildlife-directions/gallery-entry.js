import {Application,Assets,Sprite,Texture,Rectangle,Text,Graphics} from 'pixi.js';
const app=new Application();await app.init({width:1200,height:600,background:0x34464b,antialias:true});document.body.append(app.canvas);
const atlas=await Assets.load('/wildlife/eight-directions-atlas.png'),directions=['N','NE','E','SE','S','SW','W','NW'],sprites=[];
for(let species=0;species<2;species++){
 const title=new Text({text:species?'Crocodile — eight compass directions':'Deer — eight compass directions',style:{fontSize:22,fill:0xf2e3bb}});title.position.set(20,12+species*300);app.stage.addChild(title);
 for(let direction=0;direction<8;direction++){
  const sprite=new Sprite();sprite.anchor.set(.5,210/256);sprite.position.set(75+direction*150,240+species*300);sprite.scale.set(.58);sprites.push({sprite,row:species*8+direction});app.stage.addChild(sprite);
  const label=new Text({text:directions[direction],style:{fontSize:18,fill:0xffffff}});label.anchor.set(.5);label.position.set(sprite.x,260+species*300);app.stage.addChild(label);
 }
}
window.setFrame=i=>{for(const {sprite,row}of sprites)sprite.texture=new Texture({source:atlas.source,frame:new Rectangle(i*256,row*256,256,256)});app.render();};window.setFrame(0);window.galleryReady=true;
