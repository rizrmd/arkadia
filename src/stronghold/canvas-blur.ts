let nativeBlurWorks:boolean|undefined;

// Safari versions without Canvas 2D filters silently ignore an assigned filter.
// Probe pixels once: checking the property alone also accepts no-op implementations.
export function supportsCanvasBlur():boolean{
 if(nativeBlurWorks!==undefined)return nativeBlurWorks;
 const canvas=document.createElement('canvas');canvas.width=9;canvas.height=9;
 const ctx=canvas.getContext('2d')!;
 ctx.filter='blur(1px)';ctx.fillStyle='white';ctx.fillRect(4,4,1,1);
 nativeBlurWorks=ctx.getImageData(3,4,1,1).data[3]>0;
 return nativeBlurWorks;
}

// Separable Gaussian in premultiplied alpha, matching Canvas blur without dark
// fringes around transparent branches. Only used while baking cached textures.
export function gaussianBlurRGBA(data:Uint8ClampedArray,width:number,height:number,sigma:number):Uint8ClampedArray{
 const radius=Math.ceil(sigma*3),kernel=new Float32Array(radius*2+1);
 let total=0;
 for(let k=-radius;k<=radius;k++){const weight=Math.exp(-k*k/(2*sigma*sigma));kernel[k+radius]=weight;total+=weight;}
 for(let k=0;k<kernel.length;k++)kernel[k]/=total;
 const horizontal=new Float32Array(data.length),out=new Uint8ClampedArray(data.length);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const dst=(y*width+x)*4;
  for(let k=-radius;k<=radius;k++){
   const sx=x+k;if(sx<0||sx>=width)continue;
   const src=(y*width+sx)*4,weight=kernel[k+radius],alpha=data[src+3]/255;
   horizontal[dst]+=data[src]*alpha*weight;
   horizontal[dst+1]+=data[src+1]*alpha*weight;
   horizontal[dst+2]+=data[src+2]*alpha*weight;
   horizontal[dst+3]+=data[src+3]*weight;
  }
 }
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  let r=0,g=0,b=0,a=0;
  for(let k=-radius;k<=radius;k++){
   const sy=y+k;if(sy<0||sy>=height)continue;
   const src=(sy*width+x)*4,weight=kernel[k+radius];
   r+=horizontal[src]*weight;g+=horizontal[src+1]*weight;b+=horizontal[src+2]*weight;a+=horizontal[src+3]*weight;
  }
  const dst=(y*width+x)*4;
  if(a>0){out[dst]=r*255/a;out[dst+1]=g*255/a;out[dst+2]=b*255/a;out[dst+3]=a;}
 }
 return out;
}

export function drawBlurredCanvas(ctx:CanvasRenderingContext2D,source:HTMLCanvasElement,sigma:number,pad:number):void{
 if(supportsCanvasBlur()){
  ctx.filter=`blur(${sigma}px)`;ctx.drawImage(source,-pad,-pad);ctx.filter='none';
  return;
 }
 const sourceCtx=source.getContext('2d')!;
 const pixels=sourceCtx.getImageData(0,0,source.width,source.height);
 pixels.data.set(gaussianBlurRGBA(pixels.data,source.width,source.height,sigma));
 // putImageData crops the padded result without blending away translucent pixels.
 ctx.putImageData(pixels,-pad,-pad);
}
