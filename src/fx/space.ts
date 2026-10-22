import {tilePoint} from '../stronghold/terrain';
import type {PixiVfxProjection,PixiVfxProjectionPoint} from 'nixie-fx/pixi';
// NixieFX effect space → the Stronghold's isometric screen. Effects are authored in tile units with +X along the
// aim, +Y up and +Z to the caster's right (vfx/README.md). Each playing effect gets its own projection that places
// that local frame on the ground at an anchor tile, turned to its aim and scaled, then runs the world's 2:1
// projection and the camera (place()) on it.

// Screen pixels per tile unit at zoom 1: a tile's half diagonal, so a circle of radius r tiles drawn flat on the
// ground and a ring of particles at radius r land on the same ellipse. Height uses the same unit.
export const UNIT_PX=64*Math.SQRT2;
export type View={x:number;y:number;scale:number};
// u, v: ground tile · h: lift above the ground in units · yaw: aim in tile space (radians from +u toward +v)
export type Anchor={u:number;v:number;h:number;yaw:number;scale:number};

// Tile-space yaw of a screen-space angle (the combat code aims in screen space).
export function yawOfScreenAngle(angle:number){const sx=Math.cos(angle),sy=Math.sin(angle);return Math.atan2(sy/32-sx/64,sx/64+sy/32);}

function place(view:View,a:Anchor,w:readonly number[]){
 const c=Math.cos(a.yaw),s=Math.sin(a.yaw),x=w[0]*a.scale,z=w[2]*a.scale,p=tilePoint(a.u+x*c-z*s,a.v+x*s+z*c);
 return {x:view.x+p.x*view.scale,y:view.y+p.y*view.scale,lift:(w[1]*a.scale+a.h)*UNIT_PX*view.scale};
}
// Volumetric effects drawn over the characters.
export function worldProjection(view:View,a:Anchor):PixiVfxProjection{
 return {
  project(w,out?:PixiVfxProjectionPoint){const p=place(view,a,w),o=out??{x:0,y:0};o.x=p.x;o.y=p.y-p.lift;o.visible=true;return o;},
  pixelsPerWorldUnit:()=>UNIT_PX*view.scale*a.scale,
  depth:w=>-place(view,a,w).y,
 };
}
// Ground decals. The ground plane's container is squashed to half height (stage.ts), so here the effect is drawn
// as if seen from straight above: billboards become flat ellipses that still spin correctly. Height is ignored.
export function groundProjection(view:View,a:Anchor):PixiVfxProjection{
 return {
  project(w,out?:PixiVfxProjectionPoint){const p=place(view,a,w),o=out??{x:0,y:0};o.x=p.x;o.y=p.y*2;o.visible=true;return o;},
  pixelsPerWorldUnit:()=>UNIT_PX*view.scale*a.scale,
  depth:()=>0,
 };
}
