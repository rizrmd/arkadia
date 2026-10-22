/** Static, alpha-fitted foundation dressing. No work is performed on pan frames. */
export const FOUNDATION_SOIL='/foundation-transitions/soil-moss.png';
type Sprite={id:string;image:HTMLImageElement;width:number;height:number;foot:number;layer?:string};
const structural=/^(forge|barracks|altar|mage|mine|gate|gate-connector|bastion|rampart-ne|rampart-se|gateway-grand|wall-broken)$/;
export const FOUNDATION_MOSS='/foundation-transitions/moss.png';
export const FOUNDATION_DRIFT='/modular-stronghold/v2/snowdrift-edge.png';
const cache=new Map<string,{under:HTMLCanvasElement;face:HTMLCanvasElement;pad:number;fade?:HTMLCanvasElement}>();
function random(seed:number){let n=seed|0;return()=>{n=(Math.imul(n,1664525)+1013904223)|0;return(n>>>0)/4294967296;};}
export function foundationLayers(p:Sprite,soil:HTMLImageElement,snow?:HTMLImageElement,vegetation?:HTMLImageElement){
 if(!structural.test(p.id)&&p.id!=='expedition')return null;
 const key=p.image.src+':'+p.width+':'+p.layer;let result=cache.get(key);if(result)return result;
 const width=Math.ceil(p.width),height=Math.ceil(p.height),pad=22;
 const sample=document.createElement('canvas');sample.width=width;sample.height=height;const ctx=sample.getContext('2d')!;
 ctx.drawImage(p.image,0,0,width,height);const alpha=ctx.getImageData(0,0,width,height).data;
 // Bottom opaque contour, restricted to the foundation region. Transparent
 // margins and roof overhangs are not treated as ground contact.
 const bottom=Array.from({length:width},(_,x)=>{for(let y=height-1;y>height*.68;y--)if(alpha[(y*width+x)*4+3]>160)return y;return -1;});
 const under=document.createElement('canvas'),face=document.createElement('canvas');under.width=face.width=width+pad*2;under.height=face.height=height+pad*2;
 const ground=under.getContext('2d')!,moss=face.getContext('2d')!;ground.translate(pad,pad);moss.translate(pad,pad);
 const rng=random([...p.id].reduce((s,c)=>s*31+c.charCodeAt(0),17));
 const dry=p.id==='expedition'||p.id==='forge'||p.id==='mine',gate=p.id==='gate'||p.id==='gateway-grand';
 for(let x=4;x<width-4;x+=9){
  const ys=bottom.slice(Math.max(0,x-3),x+4).filter(y=>y>=0).sort((a,b)=>a-b);if(ys.length<5)continue;const y=ys[Math.floor(ys.length/2)];
  // Keep the center approach clear. Entrances must never acquire a green sill.
  const approach=gate&&Math.abs(x-width*.5)<width*.2;
  const length=34+rng()*22,depth=approach?7:14+rng()*11;
  ground.globalAlpha=approach?.16:gate?.25:dry?.5:.6;
  ground.drawImage(soil,x-length/2,y-depth*.35,length,depth);
  // Tiny contact crevice; soft earth decal supplies the broad transition.
  ground.fillStyle='#302c2428';ground.beginPath();ground.ellipse(x,y+1,7,1.8,0,0,Math.PI*2);ground.fill();
  if(vegetation&&!approach&&rng()<(dry?.035:.18)){const size=24+rng()*22;ground.globalAlpha=.78;ground.drawImage(vegetation,x-size*.5,y-3,size,size*vegetation.height/vegetation.width);}
  if(snow&&p.layer==='foreground'&&!approach&&rng()<(gate?.55:.24)){ground.globalAlpha=.74;ground.drawImage(snow,x-22,y+1,44,13);}
  if(approach||rng()>(dry?.16:.62))continue;
  // Broken climbing moss only at the lowest opaque pixels, clipped to the
  // owning sprite below. Sparse stippling preserves masonry and its lighting.
  const climb=3+rng()*(dry?3:9),spread=4+rng()*7;
  for(let n=0;n<19;n++){
   const px=x+(rng()-.5)*spread*2,py=y-rng()*climb;
   moss.globalAlpha=.25+rng()*.36;moss.fillStyle=['#535535','#687044','#77734b','#414731'][Math.floor(rng()*4)];
   moss.beginPath();moss.ellipse(px,py,.5+rng()*1.5,.35+rng()*.8,-.4,0,Math.PI*2);moss.fill();
  }
 }
 moss.globalAlpha=1;moss.globalCompositeOperation='destination-in';moss.drawImage(p.image,0,0,width,height);
 let fade:HTMLCanvasElement|undefined;
 if(gate){
  // Erode the cutout's straight bottom edge into the actual terrain below it.
  // A stable, irregular transition follows each tower's own stone contour;
  // the doorway is excluded so opening alpha and collision remain unchanged.
  fade=document.createElement('canvas');fade.width=width;fade.height=height;
  const f=fade.getContext('2d')!,pixels=f.createImageData(width,height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const edge=bottom[x],tower=Math.abs(x-width*.5)>width*.18;
   const grain=Math.sin(x*1.71+y*2.39)*.65+Math.sin(x*.43)*1.3;
   const t=tower&&edge>=0?Math.max(0,Math.min(1,(edge-y+grain)/3.5)):1;
   const i=(y*width+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;
   pixels.data[i+3]=Math.round(255*t*t*(3-2*t));
  }
  f.putImageData(pixels,0,0);
 }
 result={under,face,pad,fade};cache.set(key,result);return result;
}
export function drawFoundation(ctx:CanvasRenderingContext2D,p:Sprite,soil:HTMLImageElement,part:'under'|'face',snow?:HTMLImageElement,vegetation?:HTMLImageElement){
 const layers=foundationLayers(p,soil,snow,vegetation);if(!layers)return;
 ctx.drawImage(layers[part],-p.width/2-layers.pad,-p.height*p.foot-layers.pad);
}
