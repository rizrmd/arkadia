import sharp from 'sharp';

// Calibrate neutral limestone midtones against the adjoining rampart's front
// masonry. Preserve coping highlights, dark joints, blue cloth and warm oak.
export async function stoneMean(file,area){
 const {data}=await sharp(file).extract(area).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const sums=[0,0,0];let count=0;
 for(let i=0;i<data.length;i+=4){
  const [r,g,b,a]=data.subarray(i,i+4);
  if(a<200||r<70||r-g>38||g-b>42||b>g+6)continue;
  for(let c=0;c<3;c++)sums[c]+=data[i+c];count++;
 }
 return sums.map(n=>n/count);
}
export const wallStone=await stoneMean('public/modular-stronghold/v2/rampart-se.png',{left:250,top:280,width:260,height:90});
export function matchStone(data,sourceMean){
 const gain=wallStone.map((n,c)=>n/sourceMean[c]);
 for(let i=0;i<data.length;i+=4){
  const [r,g,b]=data.subarray(i,i+3),luma=(r+g+b)/3;
  if(r<g*.98||g<b*.98)continue;
  const weight=Math.max(0,Math.min(1,(luma-45)/35,(235-luma)/65));
  for(let c=0;c<3;c++)data[i+c]=Math.round(data[i+c]*(1+(gain[c]-1)*weight));
 }
 return data;
}
