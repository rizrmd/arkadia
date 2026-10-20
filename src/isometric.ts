// One ground-plane convention for terrain, props, buildings and actors.
// 2:1 dimetric game projection: axes ±atan(1/2), NOT ±30 degrees.
export const ISO = Object.freeze({halfWidth:64,halfHeight:32,slope:.5});
export type Point = {x:number;y:number};
export function project(x:number,y:number):Point {
  return {x:(x-y)*ISO.halfWidth,y:(x+y)*ISO.halfHeight};
}
export function unproject(x:number,y:number):Point {
  return {x:(x/ISO.halfWidth+y/ISO.halfHeight)/2,y:(y/ISO.halfHeight-x/ISO.halfWidth)/2};
}
// Calibrate the two painted ground axes without leaning vertical posts.
// The matrix acts about the sprite's foot pivot; positions and depth stay fixed.
export function groundCalibration(rising:number,falling:number) {
  if(!(rising<0&&falling>0))throw Error('Ground axes must straddle horizontal');
  const vertical=2*ISO.slope/(falling-rising);
  return {shear:ISO.slope-vertical*falling,vertical};
}
