import {Container,Graphics,Sprite,Texture,Rectangle,Assets} from 'pixi.js';
import {asset,world,type EnvironmentMap,type ObjectPlacement} from './model';
// This is the only renderer for authored assets: the editor and gameplay use identical art, size and pivots.
export async function renderObjects(map:EnvironmentMap,target:Container,markers=false){
 const placed:any[]=[];target.sortableChildren=true;
 await Promise.all(map.objects.map(async o=>{const a=asset(o.asset),p=world(o);if(o.asset==='spawn'){if(markers){const g=new Graphics().ellipse(0,0,24,12).fill({color:0xe6a44b,alpha:.35}).stroke({color:0xffdc85,width:2}).moveTo(-10,0).lineTo(10,0).moveTo(0,-8).lineTo(0,8).stroke({color:0xffffff,width:2});g.position.copyFrom(p);g.label=o.id;target.addChild(g);}return;}
 if(a.components){for(const part of a.components){const t=await Assets.load<Texture>(part.file),s=new Sprite(t);s.anchor.set(.5,part.foot);s.scale.set(part.width/t.width,part.width/t.width*part.vertical);s.skew.y=Math.atan(part.shear);s.position.set(p.x+part.dx,p.y+part.dy);s.zIndex=s.y;s.label=o.id;target.addChild(s);const img=new Image();img.src=part.file;await img.decode();placed.push({layer:'world',id:o.id+':'+part.file,x:s.x,y:s.y,width:part.width,height:t.height*part.width/t.width,foot:part.foot,shear:part.shear,vertical:part.vertical,depth:s.y,opacity:1,file:part.file,selected:false,occluder:undefined,image:img});}return;}
 const base=await Assets.load<Texture>(a.file),texture=a.frame?new Texture({source:base.source,frame:new Rectangle(...a.frame as [number,number,number,number])}):base;
 const s=new Sprite(texture);s.anchor.set(a.pivot[0],a.pivot[1]);s.width=a.width;s.height=a.height;s.position.copyFrom(p);s.zIndex=a.layer==='ground'?-1e7:p.y;s.label=o.id;target.addChild(s);
 const canvas=document.createElement('canvas');canvas.width=a.frame?.[2]??texture.width;canvas.height=a.frame?.[3]??texture.height;const ctx=canvas.getContext('2d')!,source=base.source.resource as CanvasImageSource;if(a.frame)ctx.drawImage(source,...a.frame as [number,number,number,number],0,0,canvas.width,canvas.height);else ctx.drawImage(source,0,0);const img=new Image();img.src=canvas.toDataURL();await img.decode();
 placed.push({authored:o,layer:a.layer,id:o.id,x:p.x+a.width*(.5-a.pivot[0]),y:p.y,width:a.width,height:a.height,foot:a.pivot[1],shear:0,vertical:1,depth:p.y,opacity:1,file:a.file+':'+o.id,selected:false,occluder:undefined,image:img});
 }));return placed;
}
