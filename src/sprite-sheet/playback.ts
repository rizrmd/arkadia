import {Rectangle,Sprite,Texture} from 'pixi.js';

/** Row-major grid metadata. Pivot is normalized within each untrimmed cell. */
export interface SpriteSheetConfig {
 title: string;
 source: string;
 columns: number;
 rows: number;
 frameCount?: number;
 fps: number;
 pivot: {x:number;y:number};
 loop?: boolean;
}
export function validateConfig(value:unknown):SpriteSheetConfig {
 const c=value as SpriteSheetConfig;
 if(!c||typeof c.title!=='string'||!c.title.trim()||typeof c.source!=='string'||!c.source.trim())throw Error('Sprite sheet requires a title and source URL');
 for(const n of [c.columns,c.rows])if(!Number.isInteger(n)||n<1||n>256)throw Error('Grid dimensions must be integers from 1 to 256');
 if(!Number.isFinite(c.fps)||c.fps<1||c.fps>60)throw Error('FPS must be between 1 and 60');
 if(!c.pivot||![c.pivot.x,c.pivot.y].every(n=>Number.isFinite(n)&&n>=0&&n<=1))throw Error('Pivot coordinates must be between 0 and 1');
 if(c.frameCount!==undefined&&(!Number.isInteger(c.frameCount)||c.frameCount<1||c.frameCount>c.columns*c.rows))throw Error('Frame count exceeds the grid');
 if(c.loop!==undefined&&typeof c.loop!=='boolean')throw Error('Loop must be boolean');
 return {...c,pivot:{...c.pivot}};
}
export function sliceGrid(sheet:Texture,config:SpriteSheetConfig):Texture[] {
 const c=validateConfig(config);
 if(sheet.width<c.columns||sheet.height<c.rows)throw Error('Grid contains cells smaller than one pixel');
 return Array.from({length:c.frameCount??c.columns*c.rows},(_,i)=>{
  const col=i%c.columns,row=Math.floor(i/c.columns),x=Math.round(col*sheet.width/c.columns),y=Math.round(row*sheet.height/c.rows);
  return new Texture({source:sheet.source,frame:new Rectangle(x,y,Math.round((col+1)*sheet.width/c.columns)-x,Math.round((row+1)*sheet.height/c.rows)-y)});
 });
}
/** Shared clock and frame selection; each attached Sprite keeps its own position/rotation/scale. */
export class SpriteSheetPlayback {
 readonly frames:Texture[];
 readonly config:SpriteSheetConfig;
 private targets=new Set<Sprite>();
 private remainder=0;
 private rate:number;
 private current=0;
 playing=true;
 constructor(sheet:Texture,config:SpriteSheetConfig){this.config=validateConfig(config);this.frames=sliceGrid(sheet,this.config);this.rate=this.config.fps;}
 get fps(){return this.rate;}
 set fps(value:number){if(!Number.isFinite(value)||value<1||value>60)throw Error('FPS must be between 1 and 60');this.rate=value;this.resetClock();}
 get frame(){return this.current;}
 createSprite(){const s=new Sprite(this.frames[this.current]);s.anchor.set(this.config.pivot.x,this.config.pivot.y);this.targets.add(s);return s;}
 detach(sprite:Sprite){this.targets.delete(sprite);}
 seek(frame:number){if(!Number.isInteger(frame))throw Error('Frame must be an integer');this.current=((frame%this.frames.length)+this.frames.length)%this.frames.length;this.resetClock();this.sync();}
 step(amount:number){this.playing=false;this.seek(this.current+amount);}
 resetClock(){this.remainder=0;}
 update(deltaMS:number){
  if(!this.playing||!Number.isFinite(deltaMS)||deltaMS<=0)return;
  this.remainder+=Math.min(deltaMS,100);
  const steps=Math.floor(this.remainder*this.rate/1000);
  if(!steps)return;
  this.remainder-=steps*1000/this.rate;
  const next=this.current+steps;
  if(this.config.loop===false&&next>=this.frames.length){this.current=this.frames.length-1;this.playing=false;this.resetClock();}
  else this.current=next%this.frames.length;
  this.sync();
 }
 private sync(){for(const s of this.targets)if(!s.destroyed)s.texture=this.frames[this.current];}
 /** Releases generated frame views only. The caller owns the shared source texture. */
 destroy(){this.targets.clear();for(const t of this.frames)t.destroy(false);}
}
