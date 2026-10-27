
 import {Application,Assets,Sprite,Texture,Rectangle,Text,Graphics} from 'pixi.js';
 const app=new Application();await app.init({width:1050,height:340,background:0x586977});document.body.append(app.canvas);
 const atlas=await Assets.load('/wildlife/imagegen-atlas.png');const sprites=[];
 const names=['Deer walk','Deer run','Crocodile crawl','Crocodile swim'];
 for(let row=0;row<4;row++){const s=new Sprite();s.anchor.set(.5,.82);s.position.set(135+row*260,270);sprites.push(s);app.stage.addChild(s);const g=new Graphics().moveTo(s.x-100,270).lineTo(s.x+100,270).stroke({color:0xffffff,alpha:.4,width:1});app.stage.addChild(g);const t=new Text({text:names[row],style:{fontSize:18,fill:0xffffff}});t.position.set(s.x-90,300);app.stage.addChild(t);}
 window.frame=i=>{sprites.forEach((s,row)=>s.texture=new Texture({source:atlas.source,frame:new Rectangle(i*256,row*256,256,256)}));app.render();};window.frame(0);window.ready=true;
 