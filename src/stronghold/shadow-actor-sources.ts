import type {Renderer,Sprite,TextureSource} from 'pixi.js';
export type ActorAnchor={groundX?:number;groundY:number;lift:number;owner?:number};
/** Bind-space GLB geometry and the exact evaluated pose used by its color producer. */
export type ActorSkinnedGeometry={key:string;positions:Float32Array;joints:Float32Array;weights:Float32Array;indices:Uint32Array;bindMatrix:Float32Array};
export type ActorSkinnedPose={geometry:ActorSkinnedGeometry;bindInverse:Float32Array;bones:Float32Array;model:Float32Array;camera:Float32Array;heightScale:number;heightRange:[number,number]};
export type ActorShadowFrame={source:HTMLImageElement|HTMLCanvasElement;frame:[number,number,number,number];width:number;height:number;pivot:[number,number];flip:boolean;revision:number|string;groundOffsetY?:number;depthSpan?:number;skinned?:ActorSkinnedPose[]};
export type ActorShadowSource={sprite:Sprite;anchor:()=>ActorAnchor;frame:ActorShadowFrame|null;owner:number};
const actors=new Map<Sprite,ActorShadowSource>(),sources=new WeakMap<TextureSource,()=>ActorAnchor>(),free:number[]=[];
const listeners=new Set<(actor:ActorShadowSource)=>void>();
export function onActorShadowFrame(listener:(actor:ActorShadowSource)=>void){listeners.add(listener);return ()=>listeners.delete(listener);}
let next=3000,active=0,modeRevision=0;
export function registerActorShadowSprite(sprite:Sprite,anchor:()=>ActorAnchor){
 if(actors.has(sprite))return;
 const owner=free.pop()??next++;if(owner>=3999)throw Error('Actor shadow owner pool exhausted');
 const wrapped=()=>({...anchor(),owner});const record:ActorShadowSource={sprite,anchor:wrapped,owner,frame:null};actors.set(sprite,record);const source=sprite.texture.source;sources.set(source,wrapped);
 sprite.once('destroyed',()=>{if(!actors.delete(sprite))return;free.push(owner);if(sources.get(source)===wrapped)sources.delete(source);});
}
export const actorAnchorForSprite=(sprite:Sprite)=>actors.get(sprite)?.anchor;
export const actorAnchorForTexture=(source:TextureSource)=>sources.get(source);
export function publishActorShadowFrame(sprite:Sprite,frame:ActorShadowFrame){const actor=actors.get(sprite);if(actor){actor.frame=frame;for(const listener of listeners)listener(actor);}}
export const actorShadowSources=()=>actors.values();
export function retainUnifiedActorShadows(){if(!active++)modeRevision++;let retained=true;return ()=>{if(!retained)return;retained=false;if(!--active)modeRevision++;};}
export const unifiedActorShadowsActive=()=>active>0;
export const actorShadowModeRevision=()=>modeRevision;

export type ActorHeightTile={bounds:Float32Array;uv:Float32Array;rect:[number,number,number,number]};
const heightTiles=new WeakMap<Renderer,Map<number,ActorHeightTile>>();
export function actorHeightTile(renderer:Renderer,owner:number){return heightTiles.get(renderer)?.get(owner);}
export function setActorHeightTile(renderer:Renderer,owner:number,tile:ActorHeightTile|undefined){let map=heightTiles.get(renderer);if(!map){map=new Map();heightTiles.set(renderer,map);}if(tile)map.set(owner,tile);else map.delete(owner);}
