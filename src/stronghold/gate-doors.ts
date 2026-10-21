/** Only the two door leaves animate. The stone gateway stays in the cached world. */
export function createGateDoors(layer:HTMLElement,image:HTMLImageElement,onPassable:(open:boolean)=>void){
 const width=270,height=image.height*width/image.width,canvas=document.createElement('div');
 canvas.id='world-gate-doors';const resolutionWidth=540,resolutionHeight=Math.ceil(height*2);
 canvas.style.cssText=`position:absolute;left:0;top:0;width:${width}px;height:${height}px;transform-origin:0 0;pointer-events:none;will-change:transform`;
 layer.append(canvas);
 // Each leaf is clipped to its own half of the arched doorway, excluding the masonry.
 const leaves=[-1,1].map(side=>{
  const raw=document.createElement('canvas');raw.width=resolutionWidth;raw.height=resolutionHeight;
  const r=raw.getContext('2d')!;r.scale(2,2);r.beginPath();
  if(side<0){r.moveTo(97,145);r.lineTo(97,87);r.bezierCurveTo(97,75,116,65,135,64);r.lineTo(135,145);}
  else{r.moveTo(135,145);r.lineTo(135,64);r.bezierCurveTo(154,65,173,75,173,87);r.lineTo(173,145);}
  r.closePath();r.clip();r.drawImage(image,0,0,width,height);
  const tinted=document.createElement('canvas');tinted.width=raw.width;tinted.height=raw.height;
  tinted.style.cssText=`position:absolute;left:0;top:0;width:${width}px;height:${height}px;transform-origin:${side<0?97:173}px 0;will-change:transform`;canvas.append(tinted);
  return {side,raw,tinted};
 });
 let progress=0,target=0,frame=0,last=0,passable=false,tint='';
 function paint(){
  const eased=progress*progress*(3-2*progress),angle=eased*Math.PI*.49;
  for(const {side,tinted} of leaves)tinted.style.transform=`matrix(${Math.cos(angle)},${side*.16*Math.sin(angle)},0,1,0,0)`;
  canvas.dataset.progress=progress.toFixed(3);canvas.dataset.state=progress===target?(target?'open':'closed'):(target?'opening':'closing');
  const next=progress>=.8;if(next!==passable){passable=next;onPassable(next);}
 }
 function tick(now:number){const dt=last?Math.min(50,now-last):16;last=now;progress=Math.max(0,Math.min(1,progress+(target?1:-1)*dt/700));paint();if(progress!==target)frame=requestAnimationFrame(tick);else{frame=0;last=0;}}
 function setTint(rgb:number[]){const key=rgb.join();if(key===tint)return;tint=key;
  for(const {raw,tinted} of leaves){const t=tinted.getContext('2d')!;t.globalCompositeOperation='copy';t.drawImage(raw,0,0);t.globalCompositeOperation='multiply';t.fillStyle=`rgb(${rgb.map(v=>Math.round(v*255))})`;t.fillRect(0,0,tinted.width,tinted.height);t.globalCompositeOperation='destination-in';t.drawImage(raw,0,0);t.globalCompositeOperation='source-over';}paint();
 }
 setTint([1,1,1]);
 return {setTint,setOpen(open:boolean){target=open?1:0;if(!frame&&progress!==target)frame=requestAnimationFrame(tick);},place(x:number,y:number,scale:number){canvas.style.transform=`translate3d(${x+442*scale}px,${y+(790-height*.97)*scale}px,0) scale(${scale})`;}};
}
