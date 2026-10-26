// Match frontier-view's P·R·P⁻¹ source-art transform (P = diag(1, 1/2)).
// This rotates the photographed source plane, not the physical height axis.
export function shadowSourceMatrix(sx:number,sy:number,shear=0,groundRotation=0):[number,number,number,number]{
 if(!groundRotation)return [sx,shear*sx,0,sy];
 const r=groundRotation*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
 return [c*sx,.5*s*sx,-2*s*sy,c*sy];
}
export function shadowSourceOffset(x:number,y:number,shear=0,groundRotation=0){
 const [a,b,c,d]=shadowSourceMatrix(1,1,shear,groundRotation);
 return {x:a*x+c*y,y:b*x+d*y};
}
