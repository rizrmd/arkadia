import {prewarmOcclusionAlpha,type Placed} from '../../src/stronghold/hero';

export async function alphaCacheProbe(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
 const c=canvas.getContext('2d')!;c.fillStyle='white';c.fillRect(0,0,16,32);
 const image=new Image();image.src=canvas.toDataURL();await image.decode();
 const placed={image} as Placed,first=prewarmOcclusionAlpha(placed)!;
 const descriptors=new Map<string,PropertyDescriptor>();let reads=0;
 for(const key of ['src','naturalWidth','naturalHeight','width','height']){
  const d=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,key);if(!d?.get)continue;descriptors.set(key,d);
  Object.defineProperty(HTMLImageElement.prototype,key,{...d,get(){reads++;return d.get!.call(this);}});
 }
 let same=true;const start=performance.now();
 for(let i=0;i<10000;i++)if(prewarmOcclusionAlpha(placed)!==first)same=false;
 const lookupMs=performance.now()-start;
 for(const [key,d] of descriptors)Object.defineProperty(HTMLImageElement.prototype,key,d);
 const expected=c.getImageData(0,0,32,32).data;let alphaMismatch=0;
 for(let i=0;i<first.data.length;i++)if(first.data[i]!==expected[i*4+3])alphaMismatch++;
 const other=document.createElement('canvas');other.width=other.height=32;other.getContext('2d')!.fillRect(16,0,16,32);
 const left=prewarmOcclusionAlpha({image:canvas as unknown as HTMLImageElement} as Placed)!;
 const right=prewarmOcclusionAlpha({image:other as unknown as HTMLImageElement} as Placed)!;
 const distinctCanvases=left!==right&&left.data[0]>0&&right.data[0]===0;
 canvas.dataset.frame='0';const gate={image,occluder:canvas} as Placed,closed=prewarmOcclusionAlpha(gate)!;
 c.clearRect(0,0,32,32);c.fillRect(16,0,16,32);canvas.dataset.frame='8';const open=prewarmOcclusionAlpha(gate)!;
 return {lookups:10000,lookupMs,domReads:reads,sameMask:same,alphaMismatch,distinctCanvases,gateInvalidates:closed!==open&&closed.data[0]>0&&open.data[0]===0};
}
