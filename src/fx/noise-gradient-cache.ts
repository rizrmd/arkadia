type Gradient=(x:number,y:number,z:number,seed:number,out:number[])=>void;
// Hashing already coerces all four inputs to int32 in NixieFX. Keep full keys,
// rather than trusting the slot hash, so collisions never change the noise field.
export function cacheCornerGradient(compute:Gradient):Gradient{
 const count=8192,mask=count-1,valid=new Uint8Array(count),keys=new Int32Array(count*4),values=new Float64Array(count*3);
 return (x,y,z,seed,out)=>{
  const ix=x|0,iy=y|0,iz=z|0,is=seed|0;
  const slot=(Math.imul(ix,522133279)^Math.imul(iy,2246822507)^Math.imul(iz,668265263)^Math.imul(is,3266489909))&mask,k=slot*4,v=slot*3;
  if(valid[slot]&&keys[k]===ix&&keys[k+1]===iy&&keys[k+2]===iz&&keys[k+3]===is){out[0]=values[v];out[1]=values[v+1];out[2]=values[v+2];return;}
  compute(x,y,z,seed,out);valid[slot]=1;keys[k]=ix;keys[k+1]=iy;keys[k+2]=iz;keys[k+3]=is;values[v]=out[0];values[v+1]=out[1];values[v+2]=out[2];
 };
}
