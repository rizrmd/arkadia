import {COURT} from './terrain';
/** Shared gameplay snow asset, density and isometric material projection. */
export const GAMEPLAY_SNOW='/modular-stronghold/v2/snow-soft-texture.png';
export function gameplaySnowPattern(ctx:CanvasRenderingContext2D,image:HTMLImageElement){
 const s=.7*1024/image.width,pattern=ctx.createPattern(image,'repeat')!;
 pattern.setTransform(new DOMMatrix([s,s/2,-s,s/2,COURT.x,COURT.y]));
 return pattern;
}
