import {Assets,NineSliceSprite,Sprite,type Texture} from 'pixi.js';

// HUD frames and art are exported at @1x, @2x and @3x from @3x masters (scripts/typography/build-frames.mjs).
// The set is chosen from the device pixels each design pixel covers: devicePixelRatio × scene scale, rounded up.
// A 1672-wide layout at DPR 2.625 needs @3x; the same layout on a 390 px phone (scale .23) needs only @1x.
export type FrameScale=1|2|3;
export const pickFrameScale=(dpr:number,sceneScale=1):FrameScale=>{const d=dpr*sceneScale;return d<=1.05?1:d<=2.05?2:3;};

interface Manifest{frames:Record<string,{width:number;height:number;slice?:[number,number,number,number]}>}
export class FrameSet{
 private constructor(readonly scale:FrameScale,private manifest:Manifest,private textures:Record<string,Texture>){}
 static async load(base:string,scale:FrameScale){
  const manifest=await (await fetch(base+'manifest.json')).json() as Manifest;
  const names=Object.keys(manifest.frames);
  // The resolution makes texture sizes read in @1x units, so layouts and slice borders are scale-independent.
  const textures=await Promise.all(names.map(n=>Assets.load<Texture>({src:`${base}@${scale}x/${n}.png`,data:{resolution:scale,autoGenerateMipmaps:true}})));
  return new FrameSet(scale,manifest,Object.fromEntries(names.map((n,i)=>[n,textures[i]])));
 }
 texture(name:string){const t=this.textures[name];if(!t)throw Error(`Unknown frame ${name}`);return t;}
 size(name:string){return this.manifest.frames[name];}
 // Stretchable frames become NineSliceSprites: corners keep their pixels, edges stretch along one axis only.
 frame(name:string,width?:number,height?:number){
  const m=this.size(name),texture=this.texture(name);
  if(!m.slice){const s=new Sprite(texture);if(width)s.width=width;if(height)s.height=height;return s;}
  const [leftWidth,topHeight,rightWidth,bottomHeight]=m.slice;
  return new NineSliceSprite({texture,leftWidth,topHeight,rightWidth,bottomHeight,width:width??m.width,height:height??m.height});
 }
}
