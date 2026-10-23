import type {Application,Container,Texture} from 'pixi.js';
import type {PixiVfxEffectInstance,PixiVfxRenderer,PixiVfxTextureProvider} from 'nixie-fx/pixi';
import type {VfxExportedEffect} from 'nixie-fx/export';
import type {VfxTextureAssetRef} from 'nixie-fx';
import type {ShaderGraph} from 'nixie-fx/materials';
import {groundProjection,worldProjection,UNIT_PX,type Anchor,type View} from './space';
import {tilePoint} from '../stronghold/terrain';
// The NixieFX stage: two planes layered into the world — "ground" under every figure (decals: rune circles, scorch,
// shock rings) and "world" over them (sparks, flames, smoke) — playing the exported effects of vfx/ (packed by
// scripts/vfx/pack.mjs into /vfx/skills.bin). In the game the planes are containers of its own Pixi scene
// ({host}), drawn by its renderer; elsewhere (the FX Lab) they are two transparent canvases of their own
// ({under, over}: the DOM elements the ground canvas goes before and the world canvas goes after).
// An effect is addressed by its authored file without .json, e.g. "ember-warden/flame-fan.cast"; a key ending
// in ".ground" plays on the ground plane. Finished instances go back to a per-effect pool for reuse.
export type Plane='ground'|'world';
export type FxPlay={u:number;v:number;h?:number;yaw?:number;scale?:number;seed?:number;follow?:()=>{u:number;v:number}};
export type FxHandle={
 readonly key:string;
 /** Moves the emitter inside its effect frame (units): world-space particles already emitted stay behind. */
 setLocal(x:number,y?:number,z?:number):void;
 /** Moves the whole effect, particles included. */
 moveTo(u:number,v:number):void;
 /** Stops emitting and lets live particles finish. */
 release():void;
 readonly alive:boolean;
};
type Live={key:string;plane:Plane;inst:PixiVfxEffectInstance;anchor:Anchor;follow?:FxPlay['follow'];age:number;released:boolean;handle:FxHandle};
const BUNDLE='/vfx/skills.bin',POOL=12;
// NixieFX bloom also tone-maps every particle (ACES), which dulls saturated fire toward olive over the snow; effects
// carry their own additive glow layers instead. ?fxbloom=1 turns it on for comparison.
const BLOOM=typeof location!=='undefined'&&new URLSearchParams(location.search).get('fxbloom')==='1';
// Diablo-style NixieFX Tier-2 ShaderGraph Master Materials:
// 1. eroded-scroll: Dual UV panner + RGBA packed noise + Voronoi/Perlin noise + smoothstep alpha erosion
// 2. polar-shockwave: polarCoordinates + radial UV scrolling + Voronoi dissolve + 1D ember LUT
// 3. ember-lut: 1D gradientRamp LUT mapping charcoal soot edges -> molten crimson/orange -> white-hot core
const EMBER_RAMP_STOPS=[
 {position:0.0,color:[0.10,0.03,0.01,1]},
 {position:0.24,color:[0.62,0.09,0.02,1]},
 {position:0.54,color:[0.98,0.34,0.04,1]},
 {position:0.80,color:[1.00,0.74,0.18,1]},
 {position:1.0,color:[1.00,0.97,0.84,1]},
];
const ERODED_SCROLL_GRAPH={
 id:'eroded-scroll',name:'Eroded Scroll Master',version:1,blend:'normal',shadingModel:'unlit',opacityMaskClipValue:0.005,
 params:[
  {id:'p_scroll_a',name:'scrollA',type:'vec2',value:[0.35,-0.95],min:-4,max:4},
  {id:'p_scroll_b',name:'scrollB',type:'vec2',value:[-0.28,-0.55],min:-4,max:4},
  {id:'p_noise_scale',name:'noiseScale',type:'float',value:3.8,min:0.5,max:16},
  {id:'p_erode_str',name:'erodeStrength',type:'float',value:0.52,min:0,max:1},
  {id:'p_edge_soft',name:'edgeSoftness',type:'float',value:0.22,min:0.02,max:0.5},
  {id:'p_emissive',name:'emissiveBoost',type:'float',value:1.65,min:0,max:5},
 ],
 nodes:[
  {id:'uv0',type:'uv',position:[0,0],params:{},inputs:{}},
  {id:'time',type:'time',position:[0,80],params:{},inputs:{}},
  {id:'relTime',type:'particleRelativeTime',position:[0,160],params:{},inputs:{}},
  {id:'prand',type:'particleRandom',position:[0,240],params:{},inputs:{}},
  {id:'dyn',type:'dynamicParameter',position:[0,320],params:{},inputs:{}},
  {id:'psA',type:'param',position:[0,400],params:{name:'scrollA'},inputs:{}},
  {id:'psB',type:'param',position:[0,480],params:{name:'scrollB'},inputs:{}},
  {id:'pnScale',type:'param',position:[0,560],params:{name:'noiseScale'},inputs:{}},
  {id:'pErode',type:'param',position:[0,640],params:{name:'erodeStrength'},inputs:{}},
  {id:'pSoft',type:'param',position:[0,720],params:{name:'edgeSoftness'},inputs:{}},
  {id:'pEmis',type:'param',position:[0,800],params:{name:'emissiveBoost'},inputs:{}},
  {id:'panA',type:'panner',position:[200,0],params:{speed:[0.35,-0.95]},inputs:{uv:'e_uv_panA',time:'e_time_panA',speed:'e_psA_panA'}},
  {id:'panB',type:'panner',position:[200,100],params:{speed:[-0.28,-0.55]},inputs:{uv:'e_uv_panB',time:'e_time_panB',speed:'e_psB_panB'}},
  {id:'noiseTexA',type:'textureSample',position:[400,0],params:{tex:'textures/noise.png'},inputs:{uv:'e_panA_texA'}},
  {id:'noiseTexB',type:'textureSample',position:[400,100],params:{tex:'textures/noise.png'},inputs:{uv:'e_panB_texB'}},
  {id:'voronoi',type:'noise',position:[400,200],params:{mode:'voronoi',scale:3.8,seed:7.3,outputMin:0,outputMax:1},inputs:{uv:'e_panA_vor',scale:'e_nscale_vor',seed:'e_prand_vor'}},
  {id:'mainTex',type:'textureSample',position:[400,300],params:{tex:''},inputs:{uv:'e_uv_main'}},
  {id:'mixNoiseA',type:'lerp',position:[600,60],params:{t:0.45},inputs:{a:'e_texA_r',b:'e_texB_g'}},
  {id:'combNoise',type:'lerp',position:[760,120],params:{t:0.35},inputs:{a:'e_mixA_comb',b:'e_vor_comb'}},
  {id:'agePlusDyn',type:'add',position:[600,220],params:{b:0},inputs:{a:'e_rel_add',b:'e_dyn_add'}},
  {id:'erodeThr',type:'multiply',position:[760,220],params:{b:0.52},inputs:{a:'e_age_mul',b:'e_perode_mul'}},
  {id:'erodeHi',type:'add',position:[920,220],params:{b:0.22},inputs:{a:'e_thr_hi',b:'e_psoft_hi'}},
  {id:'erodeMask',type:'smoothstep',position:[1080,160],params:{edge0:0,edge1:0.25},inputs:{in:'e_comb_sm',edge0:'e_thr_sm',edge1:'e_hi_sm'}},
  {id:'finalAlpha',type:'multiply',position:[1240,260],params:{b:1},inputs:{a:'e_mainA_fa',b:'e_mask_fa'}},
  {id:'lumaIn',type:'multiply',position:[920,60],params:{b:1},inputs:{a:'e_mainR_luma',b:'e_comb_luma'}},
  {id:'lut',type:'gradientRamp',position:[1080,60],params:{stops:EMBER_RAMP_STOPS},inputs:{t:'e_luma_lut'}},
  {id:'shadedRgb',type:'multiply',position:[1240,60],params:{b:1},inputs:{a:'e_mainRgb_sh',b:'e_lut_sh'}},
  {id:'premultBase',type:'multiply',position:[1400,60],params:{b:1},inputs:{a:'e_sh_pre',b:'e_fa_pre'}},
  {id:'emisBoost',type:'multiply',position:[1400,160],params:{b:1.65},inputs:{a:'e_pre_em',b:'e_pemis_em'}},
 ],
 edges:[
  {id:'e_uv_panA',source:'uv0',sourceHandle:'out',target:'panA',targetHandle:'uv'},
  {id:'e_time_panA',source:'time',sourceHandle:'out',target:'panA',targetHandle:'time'},
  {id:'e_psA_panA',source:'psA',sourceHandle:'out',target:'panA',targetHandle:'speed'},
  {id:'e_uv_panB',source:'uv0',sourceHandle:'out',target:'panB',targetHandle:'uv'},
  {id:'e_time_panB',source:'time',sourceHandle:'out',target:'panB',targetHandle:'time'},
  {id:'e_psB_panB',source:'psB',sourceHandle:'out',target:'panB',targetHandle:'speed'},
  {id:'e_panA_texA',source:'panA',sourceHandle:'out',target:'noiseTexA',targetHandle:'uv'},
  {id:'e_panB_texB',source:'panB',sourceHandle:'out',target:'noiseTexB',targetHandle:'uv'},
  {id:'e_panA_vor',source:'panA',sourceHandle:'out',target:'voronoi',targetHandle:'uv'},
  {id:'e_nscale_vor',source:'pnScale',sourceHandle:'out',target:'voronoi',targetHandle:'scale'},
  {id:'e_prand_vor',source:'prand',sourceHandle:'out',target:'voronoi',targetHandle:'seed'},
  {id:'e_uv_main',source:'uv0',sourceHandle:'out',target:'mainTex',targetHandle:'uv'},
  {id:'e_texA_r',source:'noiseTexA',sourceHandle:'R',target:'mixNoiseA',targetHandle:'a'},
  {id:'e_texB_g',source:'noiseTexB',sourceHandle:'G',target:'mixNoiseA',targetHandle:'b'},
  {id:'e_mixA_comb',source:'mixNoiseA',sourceHandle:'out',target:'combNoise',targetHandle:'a'},
  {id:'e_vor_comb',source:'voronoi',sourceHandle:'out',target:'combNoise',targetHandle:'b'},
  {id:'e_rel_add',source:'relTime',sourceHandle:'out',target:'agePlusDyn',targetHandle:'a'},
  {id:'e_dyn_add',source:'dyn',sourceHandle:'Param1',target:'agePlusDyn',targetHandle:'b'},
  {id:'e_age_mul',source:'agePlusDyn',sourceHandle:'out',target:'erodeThr',targetHandle:'a'},
  {id:'e_perode_mul',source:'pErode',sourceHandle:'out',target:'erodeThr',targetHandle:'b'},
  {id:'e_thr_hi',source:'erodeThr',sourceHandle:'out',target:'erodeHi',targetHandle:'a'},
  {id:'e_psoft_hi',source:'pSoft',sourceHandle:'out',target:'erodeHi',targetHandle:'b'},
  {id:'e_comb_sm',source:'combNoise',sourceHandle:'out',target:'erodeMask',targetHandle:'in'},
  {id:'e_thr_sm',source:'erodeThr',sourceHandle:'out',target:'erodeMask',targetHandle:'edge0'},
  {id:'e_hi_sm',source:'erodeHi',sourceHandle:'out',target:'erodeMask',targetHandle:'edge1'},
  {id:'e_mainA_fa',source:'mainTex',sourceHandle:'A',target:'finalAlpha',targetHandle:'a'},
  {id:'e_mask_fa',source:'erodeMask',sourceHandle:'out',target:'finalAlpha',targetHandle:'b'},
  {id:'e_mainR_luma',source:'mainTex',sourceHandle:'R',target:'lumaIn',targetHandle:'a'},
  {id:'e_comb_luma',source:'combNoise',sourceHandle:'out',target:'lumaIn',targetHandle:'b'},
  {id:'e_luma_lut',source:'lumaIn',sourceHandle:'out',target:'lut',targetHandle:'t'},
  {id:'e_mainRgb_sh',source:'mainTex',sourceHandle:'RGB',target:'shadedRgb',targetHandle:'a'},
  {id:'e_lut_sh',source:'lut',sourceHandle:'out',target:'shadedRgb',targetHandle:'b'},
  {id:'e_sh_pre',source:'shadedRgb',sourceHandle:'out',target:'premultBase',targetHandle:'a'},
  {id:'e_fa_pre',source:'finalAlpha',sourceHandle:'out',target:'premultBase',targetHandle:'b'},
  {id:'e_pre_em',source:'premultBase',sourceHandle:'out',target:'emisBoost',targetHandle:'a'},
  {id:'e_pemis_em',source:'pEmis',sourceHandle:'out',target:'emisBoost',targetHandle:'b'},
 ],
 outputs:{baseColor:'e_sh_pre',emissive:'e_pre_em',opacity:'e_fa_pre',opacityMask:'e_fa_pre'},
};
const POLAR_SHOCKWAVE_GRAPH={
 id:'polar-shockwave',name:'Polar Shockwave Master',version:1,blend:'normal',shadingModel:'unlit',opacityMaskClipValue:0.005,
 params:[
  {id:'p_rad_scale',name:'radialScale',type:'float',value:1.2,min:0.2,max:6},
  {id:'p_len_scale',name:'lengthScale',type:'float',value:2.0,min:0.5,max:8},
  {id:'p_polar_spd',name:'polarSpeed',type:'vec2',value:[-0.85,0.28],min:-4,max:4},
  {id:'p_vor_scale',name:'voronoiScale',type:'float',value:4.5,min:1,max:16},
  {id:'p_erode_str',name:'erodeStrength',type:'float',value:0.55,min:0,max:1},
  {id:'p_emissive',name:'emissiveBoost',type:'float',value:1.85,min:0,max:5},
 ],
 nodes:[
  {id:'uv0',type:'uv',position:[0,0],params:{},inputs:{}},
  {id:'time',type:'time',position:[0,80],params:{},inputs:{}},
  {id:'relTime',type:'particleRelativeTime',position:[0,160],params:{},inputs:{}},
  {id:'prand',type:'particleRandom',position:[0,240],params:{},inputs:{}},
  {id:'dyn',type:'dynamicParameter',position:[0,320],params:{},inputs:{}},
  {id:'pRad',type:'param',position:[0,400],params:{name:'radialScale'},inputs:{}},
  {id:'pLen',type:'param',position:[0,480],params:{name:'lengthScale'},inputs:{}},
  {id:'pSpd',type:'param',position:[0,560],params:{name:'polarSpeed'},inputs:{}},
  {id:'pVorS',type:'param',position:[0,640],params:{name:'voronoiScale'},inputs:{}},
  {id:'pErode',type:'param',position:[0,720],params:{name:'erodeStrength'},inputs:{}},
  {id:'pEmis',type:'param',position:[0,800],params:{name:'emissiveBoost'},inputs:{}},
  {id:'polar',type:'polarCoordinates',position:[200,0],params:{center:[0.5,0.5],radialScale:1.2,lengthScale:2.0},inputs:{UV:'e_uv_polar','Radial Scale':'e_rad_polar','Length Scale':'e_len_polar'}},
  {id:'panPolar',type:'panner',position:[380,0],params:{speed:[-0.85,0.28]},inputs:{uv:'e_polar_pan',time:'e_time_pan',speed:'e_spd_pan'}},
  {id:'noiseTex',type:'textureSample',position:[560,0],params:{tex:'textures/noise.png'},inputs:{uv:'e_pan_ntex'}},
  {id:'voronoi',type:'noise',position:[560,120],params:{mode:'voronoi',scale:4.5,seed:3.7,outputMin:0,outputMax:1},inputs:{uv:'e_pan_vor',scale:'e_vors_vor',seed:'e_prand_vor'}},
  {id:'mainTex',type:'textureSample',position:[560,240],params:{tex:''},inputs:{uv:'e_uv_main'}},
  {id:'combNoise',type:'lerp',position:[740,60],params:{t:0.42},inputs:{a:'e_ntex_g',b:'e_vor_comb'}},
  {id:'agePlusDyn',type:'add',position:[740,180],params:{b:0},inputs:{a:'e_rel_add',b:'e_dyn_add'}},
  {id:'erodeThr',type:'multiply',position:[900,180],params:{b:0.55},inputs:{a:'e_age_mul',b:'e_erode_mul'}},
  {id:'erodeHi',type:'add',position:[1060,180],params:{b:0.24},inputs:{a:'e_thr_hi'}},
  {id:'erodeMask',type:'smoothstep',position:[1220,140],params:{edge0:0,edge1:0.25},inputs:{in:'e_comb_sm',edge0:'e_thr_sm',edge1:'e_hi_sm'}},
  {id:'finalAlpha',type:'multiply',position:[1380,220],params:{b:1},inputs:{a:'e_mainA_fa',b:'e_mask_fa'}},
  {id:'lumaIn',type:'multiply',position:[900,40],params:{b:1},inputs:{a:'e_mainR_luma',b:'e_ntexB_luma'}},
  {id:'lut',type:'gradientRamp',position:[1060,40],params:{stops:EMBER_RAMP_STOPS},inputs:{t:'e_luma_lut'}},
  {id:'shadedRgb',type:'multiply',position:[1220,40],params:{b:1},inputs:{a:'e_mainRgb_sh',b:'e_lut_sh'}},
  {id:'premultBase',type:'multiply',position:[1380,60],params:{b:1},inputs:{a:'e_sh_pre',b:'e_fa_pre'}},
  {id:'emisBoost',type:'multiply',position:[1540,120],params:{b:1.85},inputs:{a:'e_pre_em',b:'e_pemis_em'}},
 ],
 edges:[
  {id:'e_uv_polar',source:'uv0',sourceHandle:'out',target:'polar',targetHandle:'UV'},
  {id:'e_rad_polar',source:'pRad',sourceHandle:'out',target:'polar',targetHandle:'Radial Scale'},
  {id:'e_len_polar',source:'pLen',sourceHandle:'out',target:'polar',targetHandle:'Length Scale'},
  {id:'e_polar_pan',source:'polar',sourceHandle:'out',target:'panPolar',targetHandle:'uv'},
  {id:'e_time_pan',source:'time',sourceHandle:'out',target:'panPolar',targetHandle:'time'},
  {id:'e_spd_pan',source:'pSpd',sourceHandle:'out',target:'panPolar',targetHandle:'speed'},
  {id:'e_pan_ntex',source:'panPolar',sourceHandle:'out',target:'noiseTex',targetHandle:'uv'},
  {id:'e_pan_vor',source:'panPolar',sourceHandle:'out',target:'voronoi',targetHandle:'uv'},
  {id:'e_vors_vor',source:'pVorS',sourceHandle:'out',target:'voronoi',targetHandle:'scale'},
  {id:'e_prand_vor',source:'prand',sourceHandle:'out',target:'voronoi',targetHandle:'seed'},
  {id:'e_uv_main',source:'uv0',sourceHandle:'out',target:'mainTex',targetHandle:'uv'},
  {id:'e_ntex_g',source:'noiseTex',sourceHandle:'G',target:'combNoise',targetHandle:'a'},
  {id:'e_vor_comb',source:'voronoi',sourceHandle:'out',target:'combNoise',targetHandle:'b'},
  {id:'e_rel_add',source:'relTime',sourceHandle:'out',target:'agePlusDyn',targetHandle:'a'},
  {id:'e_dyn_add',source:'dyn',sourceHandle:'Param1',target:'agePlusDyn',targetHandle:'b'},
  {id:'e_age_mul',source:'agePlusDyn',sourceHandle:'out',target:'erodeThr',targetHandle:'a'},
  {id:'e_erode_mul',source:'pErode',sourceHandle:'out',target:'erodeThr',targetHandle:'b'},
  {id:'e_thr_hi',source:'erodeThr',sourceHandle:'out',target:'erodeHi',targetHandle:'a'},
  {id:'e_comb_sm',source:'combNoise',sourceHandle:'out',target:'erodeMask',targetHandle:'in'},
  {id:'e_thr_sm',source:'erodeThr',sourceHandle:'out',target:'erodeMask',targetHandle:'edge0'},
  {id:'e_hi_sm',source:'erodeHi',sourceHandle:'out',target:'erodeMask',targetHandle:'edge1'},
  {id:'e_mainA_fa',source:'mainTex',sourceHandle:'A',target:'finalAlpha',targetHandle:'a'},
  {id:'e_mask_fa',source:'erodeMask',sourceHandle:'out',target:'finalAlpha',targetHandle:'b'},
  {id:'e_mainR_luma',source:'mainTex',sourceHandle:'R',target:'lumaIn',targetHandle:'a'},
  {id:'e_ntexB_luma',source:'noiseTex',sourceHandle:'B',target:'lumaIn',targetHandle:'b'},
  {id:'e_luma_lut',source:'lumaIn',sourceHandle:'out',target:'lut',targetHandle:'t'},
  {id:'e_mainRgb_sh',source:'mainTex',sourceHandle:'RGB',target:'shadedRgb',targetHandle:'a'},
  {id:'e_lut_sh',source:'lut',sourceHandle:'out',target:'shadedRgb',targetHandle:'b'},
  {id:'e_sh_pre',source:'shadedRgb',sourceHandle:'out',target:'premultBase',targetHandle:'a'},
  {id:'e_fa_pre',source:'finalAlpha',sourceHandle:'out',target:'premultBase',targetHandle:'b'},
  {id:'e_pre_em',source:'premultBase',sourceHandle:'out',target:'emisBoost',targetHandle:'a'},
  {id:'e_pemis_em',source:'pEmis',sourceHandle:'out',target:'emisBoost',targetHandle:'b'},
 ],
 outputs:{baseColor:'e_sh_pre',emissive:'e_pre_em',opacity:'e_fa_pre',opacityMask:'e_fa_pre'},
};
const EMBER_LUT_GRAPH={
 id:'ember-lut',name:'Ember 1D LUT Master',version:1,blend:'normal',shadingModel:'unlit',opacityMaskClipValue:0.005,
 params:[
  {id:'p_lut_power',name:'lutContrast',type:'float',value:0.92,min:0.3,max:2.5},
  {id:'p_erode_str',name:'erodeStrength',type:'float',value:0.32,min:0,max:1},
  {id:'p_emissive',name:'emissiveBoost',type:'float',value:1.45,min:0,max:5},
 ],
 nodes:[
  {id:'uv0',type:'uv',position:[0,0],params:{},inputs:{}},
  {id:'relTime',type:'particleRelativeTime',position:[0,80],params:{},inputs:{}},
  {id:'prand',type:'particleRandom',position:[0,160],params:{},inputs:{}},
  {id:'pContrast',type:'param',position:[0,240],params:{name:'lutContrast'},inputs:{}},
  {id:'pErode',type:'param',position:[0,320],params:{name:'erodeStrength'},inputs:{}},
  {id:'pEmis',type:'param',position:[0,400],params:{name:'emissiveBoost'},inputs:{}},
  {id:'mainTex',type:'textureSample',position:[220,0],params:{tex:''},inputs:{uv:'e_uv_main'}},
  {id:'cellNoise',type:'noise',position:[220,120],params:{mode:'voronoi',scale:4.2,seed:5.1,outputMin:0.25,outputMax:1},inputs:{uv:'e_uv_noise',seed:'e_prand_noise'}},
  {id:'lumaPow',type:'power',position:[420,0],params:{exp:0.92},inputs:{base:'e_mainR_pow',exp:'e_pcon_pow'}},
  {id:'lut',type:'gradientRamp',position:[600,0],params:{stops:EMBER_RAMP_STOPS},inputs:{t:'e_pow_lut'}},
  {id:'erodeThr',type:'multiply',position:[420,180],params:{b:0.32},inputs:{a:'e_rel_mul',b:'e_perode_mul'}},
  {id:'erodeHi',type:'add',position:[600,180],params:{b:0.26},inputs:{a:'e_thr_hi'}},
  {id:'erodeMask',type:'smoothstep',position:[780,140],params:{edge0:0,edge1:0.26},inputs:{in:'e_cell_sm',edge0:'e_thr_sm',edge1:'e_hi_sm'}},
  {id:'finalAlpha',type:'multiply',position:[960,180],params:{b:1},inputs:{a:'e_mainA_fa',b:'e_mask_fa'}},
  {id:'shadedRgb',type:'multiply',position:[780,20],params:{b:1},inputs:{a:'e_mainRgb_sh',b:'e_lut_sh'}},
  {id:'premultBase',type:'multiply',position:[960,60],params:{b:1},inputs:{a:'e_sh_pre',b:'e_fa_pre'}},
  {id:'emisBoost',type:'multiply',position:[1140,100],params:{b:1.45},inputs:{a:'e_pre_em',b:'e_pemis_em'}},
 ],
 edges:[
  {id:'e_uv_main',source:'uv0',sourceHandle:'out',target:'mainTex',targetHandle:'uv'},
  {id:'e_uv_noise',source:'uv0',sourceHandle:'out',target:'cellNoise',targetHandle:'uv'},
  {id:'e_prand_noise',source:'prand',sourceHandle:'out',target:'cellNoise',targetHandle:'seed'},
  {id:'e_mainR_pow',source:'mainTex',sourceHandle:'R',target:'lumaPow',targetHandle:'base'},
  {id:'e_pcon_pow',source:'pContrast',sourceHandle:'out',target:'lumaPow',targetHandle:'exp'},
  {id:'e_pow_lut',source:'lumaPow',sourceHandle:'out',target:'lut',targetHandle:'t'},
  {id:'e_rel_mul',source:'relTime',sourceHandle:'out',target:'erodeThr',targetHandle:'a'},
  {id:'e_perode_mul',source:'pErode',sourceHandle:'out',target:'erodeThr',targetHandle:'b'},
  {id:'e_thr_hi',source:'erodeThr',sourceHandle:'out',target:'erodeHi',targetHandle:'a'},
  {id:'e_cell_sm',source:'cellNoise',sourceHandle:'out',target:'erodeMask',targetHandle:'in'},
  {id:'e_thr_sm',source:'erodeThr',sourceHandle:'out',target:'erodeMask',targetHandle:'edge0'},
  {id:'e_hi_sm',source:'erodeHi',sourceHandle:'out',target:'erodeMask',targetHandle:'edge1'},
  {id:'e_mainA_fa',source:'mainTex',sourceHandle:'A',target:'finalAlpha',targetHandle:'a'},
  {id:'e_mask_fa',source:'erodeMask',sourceHandle:'out',target:'finalAlpha',targetHandle:'b'},
  {id:'e_mainRgb_sh',source:'mainTex',sourceHandle:'RGB',target:'shadedRgb',targetHandle:'a'},
  {id:'e_lut_sh',source:'lut',sourceHandle:'out',target:'shadedRgb',targetHandle:'b'},
  {id:'e_sh_pre',source:'shadedRgb',sourceHandle:'out',target:'premultBase',targetHandle:'a'},
  {id:'e_fa_pre',source:'finalAlpha',sourceHandle:'out',target:'premultBase',targetHandle:'b'},
  {id:'e_pre_em',source:'premultBase',sourceHandle:'out',target:'emisBoost',targetHandle:'a'},
  {id:'e_pemis_em',source:'pEmis',sourceHandle:'out',target:'emisBoost',targetHandle:'b'},
 ],
 outputs:{baseColor:'e_sh_pre',emissive:'e_pre_em',opacity:'e_fa_pre',opacityMask:'e_fa_pre'},
};
const RIFT_RAMP_STOPS=[
 {position:0.0,color:[0.08,0.02,0.22,1]},
 {position:0.24,color:[0.24,0.08,0.62,1]},
 {position:0.52,color:[0.52,0.24,0.94,1]},
 {position:0.78,color:[0.42,0.84,1.00,1]},
 {position:1.0,color:[0.94,0.98,1.00,1]},
];
const RIFT_ERODED_SCROLL_GRAPH={
 ...ERODED_SCROLL_GRAPH,
 id:'rift-eroded-scroll',name:'Rift Eroded Scroll Master',
 nodes:ERODED_SCROLL_GRAPH.nodes.map(n=>n.id==='lut'?{...n,params:{stops:RIFT_RAMP_STOPS}}:n),
};
const RIFT_POLAR_SHOCKWAVE_GRAPH={
 ...POLAR_SHOCKWAVE_GRAPH,
 id:'rift-polar-shockwave',name:'Rift Polar Shockwave Master',
 nodes:POLAR_SHOCKWAVE_GRAPH.nodes.map(n=>n.id==='lut'?{...n,params:{stops:RIFT_RAMP_STOPS}}:n),
};
const RIFT_LUT_GRAPH={
 ...EMBER_LUT_GRAPH,
 id:'rift-lut',name:'Rift 1D LUT Master',
 nodes:EMBER_LUT_GRAPH.nodes.map(n=>n.id==='lut'?{...n,params:{stops:RIFT_RAMP_STOPS}}:n),
};
const BUILTIN_MATERIALS:Record<string,unknown>={
 'eroded-scroll':ERODED_SCROLL_GRAPH,
 'polar-shockwave':POLAR_SHOCKWAVE_GRAPH,
 'ember-lut':EMBER_LUT_GRAPH,
 'rift-eroded-scroll':RIFT_ERODED_SCROLL_GRAPH,
 'rift-polar-shockwave':RIFT_POLAR_SHOCKWAVE_GRAPH,
 'rift-lut':RIFT_LUT_GRAPH,
};
// The bundle is gzipped JSON (~20x smaller; named .bin because servers treat .gz as an encoding), inflated here
// since the server sends files uncompressed.
let bundlePromise:Promise<{manifest:unknown;effects:Record<string,unknown>;materials?:Record<string,unknown>}>|null=null;
export function fetchBundle():Promise<{manifest:unknown;effects:Record<string,unknown>;materials?:Record<string,unknown>}>{
 return bundlePromise??=(async()=>{
  const res=await fetch(BUNDLE);if(!res.ok||!res.body)throw Error(`${BUNDLE}: ${res.status}`);
  return new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).json();
 })();
}
// NixieFX (and Pixi, where the page has none yet) loads with the effect bundle, after the first paint.
const PIXI=()=>import('pixi.js');
const planeOf=(key:string):Plane=>key.endsWith('.ground')?'ground':'world';

async function mountPlane(host:{before?:Element;after?:Element},id:string,z:string){
 const {Application}=await PIXI();const app=new Application();
 await app.init({backgroundAlpha:0,antialias:false,autoStart:false,sharedTicker:false,preference:'webgl',powerPreference:'high-performance',
  resolution:Math.min(devicePixelRatio||1,2),autoDensity:true,width:innerWidth,height:innerHeight});
 app.ticker.stop();
 const c=app.canvas;c.id=id;c.setAttribute('aria-hidden','true');c.style.cssText=`position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none${z}`;
 if(host.before)host.before.before(c);else host.after!.after(c);
 // Additive particles add light without covering what is under the canvas: colour is summed, alpha is kept, so
 // the browser composites the light additively over the DOM world below.
 const r=app.renderer as any,gl=r.gl as WebGL2RenderingContext|undefined;
 if(gl&&r.state?.blendModesMap)r.state.blendModesMap.add=[gl.ONE,gl.ONE,gl.ZERO,gl.ONE];
 return app;
}

export type FxStageOptions={
 under?:Element;
 over?:Element;
 host?:{ground:Container;world:Container};
 depthLayers?:{back:Container;front:Container};
 getHeroWorld?:()=>{x:number;y:number};
 occlusionAt?:(px:number,py:number,wx?:number,wy?:number,rad?:number,flat?:boolean,includeHero?:boolean,anchorY?:number)=>number;
 bloom?:boolean;
};
export function createFxStage(o:FxStageOptions){
 const view:View={x:0,y:0,scale:1};
 const effects=new Map<string,VfxExportedEffect>(),pool=new Map<string,PixiVfxEffectInstance[]>(),live:Live[]=[];
 const pending:{at:number;run:()=>void}[]=[];
 let clock=0,ready=false,failed='',planes:Record<Plane,{app:Application|null;vfx:PixiVfxRenderer;root:Container}>|null=null;
 let Rect:typeof import('pixi.js').Rectangle|null=null;
 let played=0,peakParticles=0,idle=false,occludedParticles=0,minOcclusion=1,meanOcclusion=1,backEffects=0,frontEffects=0;
 const textures=new Map<string,Texture>(),alphaTextures=new Map<string,Texture>();
 let deriveAlpha:typeof import('nixie-fx/pixi').createDerivedAlphaTexture|null=null;
 const textureProvider:PixiVfxTextureProvider={
  staticAssets:true,
  async preload(refs:VfxTextureAssetRef[]){await Promise.all(refs.map(async ref=>{if(!textures.has(ref.path)){const tex=await (await PIXI()).Assets.load<Texture>({src:'/vfx/'+ref.path,data:{scaleMode:'linear'}});if(tex?.source){tex.source.scaleMode='linear';tex.source.autoGarbageCollect=false;}textures.set(ref.path,tex);}}));},
  getTexture:(ref:VfxTextureAssetRef)=>textures.get(ref.path),
  getAlphaTexture:(ref,opacitySource,invert)=>{
   const key=`${ref.path}|${opacitySource}|${invert?1:0}`;
   const hit=alphaTextures.get(key);if(hit)return hit;
   const src=textures.get(ref.path);if(!src||!deriveAlpha)return undefined;
   const derived=deriveAlpha(src,opacitySource,invert)??src;
   if(derived?.source)derived.source.autoGarbageCollect=false;
   alphaTextures.set(key,derived);
   return derived;
  },
  resolveUrl:(ref:VfxTextureAssetRef)=>'/vfx/'+ref.path,
 };
 const boot=(async()=>{
  // The NixieFX runtime loads with the bundle, off the game's first paint.
  const [{PixiVfxRenderer,createDerivedAlphaTexture},{loadVfxExportBundle},{shareParticleEffectDefinition},{normalizeShaderGraph},packed]=await Promise.all([import('nixie-fx/pixi'),import('nixie-fx/export'),import('nixie-fx'),import('nixie-fx/materials'),fetchBundle()]);
  deriveAlpha=createDerivedAlphaTexture;
  const materialGraphs=new Map<string,ShaderGraph>();
  for(const [id,raw] of Object.entries({...BUILTIN_MATERIALS,...(packed.materials??{})})){
   materialGraphs.set(id,normalizeShaderGraph(raw));
  }
  const materialGraphProvider=(shaderId:string)=>materialGraphs.get(shaderId);
  const bundle=loadVfxExportBundle({manifest:packed.manifest,effectsByPath:packed.effects},{requiredBackend:'pixi2d'});
  for(const fx of bundle.effectsById.values()){
   const effKey=(fx.sourceEffectFile??fx.id).replace(/\.json$/,'');
   const isGround=effKey.endsWith('.ground');
   const isHeroSkill=effKey.startsWith('rift-runner/')||effKey.includes('rift-bolt')||effKey.startsWith('ember-warden/')||effKey.includes('cleave')||effKey.includes('shockwave')||effKey.includes('rift-dash')||effKey.includes('rift-trap');
   if(o.host&&fx.emitters&&!isHeroSkill){
    const maxEmitters=isGround?8:5;
    if(fx.emitters.length>maxEmitters){
     const src=fx.emitters.filter((e:any)=>!/(smoke|glint|hand core)/i.test(e.name??''));
     const base=src.length>=maxEmitters?src:fx.emitters;
     if(base.length>maxEmitters){
      const step=(base.length-1)/(maxEmitters-1);
      fx.emitters=Array.from({length:maxEmitters},(_,i)=>base[Math.round(i*step)]);
     }else{
      fx.emitters=base;
     }
    }
    const perMax=isGround?38:Math.max(14,Math.min(22,Math.floor(88/Math.max(1,fx.emitters.length))));
    for(const e of fx.emitters as any[]){
     e.maxParticles=Math.min(e.maxParticles||perMax,perMax);
     if(e.spawn){
      if(typeof e.spawn.rate==='number'&&e.spawn.rate>perMax)e.spawn.rate=perMax;
      const rv=e.spawn.rateValue;
      if(rv){
       if(typeof rv.value==='number'&&rv.value>perMax)rv.value=perMax;
       if(typeof rv.min==='number'&&rv.min>perMax)rv.min=perMax;
       if(typeof rv.max==='number'&&rv.max>perMax)rv.max=perMax;
      }
      if(e.spawn.bursts)for(const b of e.spawn.bursts){
       if(isGround)b.count=Math.min(perMax,b.count);
       else if(b.count>6)b.count=Math.min(perMax,Math.max(10,Math.ceil(b.count*.8)));
      }
     }
    }
   }
   effects.set(effKey,fx);
  }
  await textureProvider.preload!(bundle.manifest.assets.filter((a):a is VfxTextureAssetRef=>a.type==='texture'));
  const {Container,Rectangle}=await PIXI();Rect=Rectangle;
  // The ground plane is drawn as seen from above and squashed to the 2:1 ground (space.ts groundProjection).
  const make=(parent:Container,app:Application|null,flat:boolean,bloom:boolean)=>{const root=new Container();if(flat)root.scale.set(1,.5);parent.addChild(root);
   return {app,root,vfx:new PixiVfxRenderer({parent:root,textureProvider,materialGraphProvider,pixiRenderer:bloom&&app?app.renderer:undefined,bloom:bloom&&app?{enabled:true,quality:'low',threshold:1,intensity:1.6,radius:22}:undefined})};};
  if(o.host)planes={ground:make(o.host.ground,null,true,false),world:make(o.host.world,null,false,false)};
  else{const [ground,world]=await Promise.all([mountPlane({before:o.under!},'world-fx-ground',''),mountPlane({after:o.over!},'world-fx-over',';z-index:3')]);
   planes={ground:make(ground.stage,ground,true,false),world:make(world.stage,world,false,o.bloom??BLOOM)};}
  resize();addEventListener('resize',resize);
  // Prewarm combat effect pool in small macrotask slices during boot so neither boot frames nor combat frames stall.
  if(o.host&&planes){
   let batch=0;
   for(const [key,fx] of effects){
    if(key.startsWith('ui/'))continue;
    const plane=planeOf(key),P=planes[plane],proj=projection(plane,{u:0,v:0,h:0,yaw:0,scale:1});
    const copies=key.endsWith('.bolt')?5:key.includes('.impact')||key.startsWith('shared/hit.')?3:1;
    const list=pool.get(key)??[];
    for(let c=0;c<copies;c++){
     const inst=P.vfx.createEffect(fx,{projection:proj,position:[0,0,0],seed:c+1,timeSeconds:0,autoStart:false,addToStage:false});
     shareParticleEffectDefinition(inst.definition);
     inst.spawn({position:[0,0,0],seed:c+1,timeSeconds:0});
     inst.update(0.08,0.08);
     inst.stop();inst.root.visible=false;P.vfx.removeEffect(inst,false);
     list.push(inst);
    }
    pool.set(key,list);
    if(++batch%12===0)await new Promise(r=>setTimeout(r,0));
   }
  }
  ready=true;
 })().catch(e=>{failed=String(e?.message??e);console.error('NixieFX stage unavailable; skills play without particle effects.',e);});

 function resize(){if(!planes||!Rect)return;const Rectangle=Rect;const w=innerWidth,h=innerHeight;for(const p of Object.values(planes))p.app?.renderer.resize(w,h);
  planes.world.vfx.setBoundsArea(new Rectangle(-64,-64,w+128,h+128));planes.ground.vfx.setBoundsArea(new Rectangle(-64,-128,w+128,h*2+256));}
 function projection(plane:Plane,a:Anchor){return plane==='ground'?groundProjection(view,a):worldProjection(view,a);}

 function play(key:string,at:FxPlay,delayMs=0):FxHandle|null{
  if(delayMs>0){let h:FxHandle|null=null;const proxy:FxHandle={key,setLocal:(x,y,z)=>h?.setLocal(x,y,z),moveTo:(u,v)=>h?.moveTo(u,v),release:()=>{h?h.release():(cancel=true);},get alive(){return h?h.alive:!cancel;}};
   let cancel=false;pending.push({at:clock+delayMs/1000,run:()=>{if(!cancel)h=play(key,at);}});return proxy;}
  if(!ready||!planes)return null;
  const fx=effects.get(key);if(!fx){console.warn('Unknown NixieFX effect',key);return null;}
  const plane=planeOf(key),anchor:Anchor={u:at.u,v:at.v,h:at.h??0,yaw:at.yaw??0,scale:at.scale??1},proj=projection(plane,anchor),P=planes[plane];
  const seed=at.seed??((Math.random()*0x7fffffff)|0);
  if(o.host){
   const isHeroGround=key.startsWith('ember-warden/')||key.startsWith('rift-runner/')||key.includes('cleave')||key.includes('shockwave');
   if(!isHeroGround&&live.length>=16&&tilePoint(anchor.u,anchor.v).y>920&&(key.endsWith('.ground')||key.endsWith('.rim'))){
    played++;
    return {key,setLocal:()=>{},moveTo:()=>{},release:()=>{},get alive(){return false;}};
   }
   const maxSame=key.endsWith('.bolt')?5:key.includes('.impact')||key.startsWith('shared/hit.')?3:1;
   let sameCount=0,oldest:Live|null=null;
   for(let i=0;i<live.length;i++){
    const cand=live[i];
    if(cand.key===key){if(!oldest||cand.age>oldest.age)oldest=cand;sameCount++;}
   }
   if(sameCount>=maxSame&&oldest){
    oldest.anchor.u=anchor.u;oldest.anchor.v=anchor.v;oldest.anchor.h=anchor.h;oldest.anchor.yaw=anchor.yaw;oldest.anchor.scale=anchor.scale;
    oldest.follow=at.follow;
    oldest.inst.setProjection(proj);
    if(oldest.age>=0.045||oldest.released){
     oldest.age=0;oldest.released=false;
     oldest.inst.spawn({position:[0,0,0],seed,timeSeconds:clock});oldest.inst.root.visible=true;
    }
    played++;
    return oldest.handle;
   }
  }
  let inst=pool.get(key)?.pop();
  if(inst){P.vfx.addEffect(inst,true);inst.setProjection(proj);inst.spawn({position:[0,0,0],seed,timeSeconds:clock});inst.root.visible=true;}
  else{
   inst=P.vfx.createEffect(fx,{projection:proj,position:[0,0,0],seed,timeSeconds:clock,autoStart:false});
   import('nixie-fx').then(m=>m.shareParticleEffectDefinition(inst!.definition)).catch(()=>{});
   inst.spawn({position:[0,0,0],seed,timeSeconds:clock});
  }
  played++;
  const l:Live={key,plane,inst,anchor,follow:at.follow,age:0,released:false,handle:null!};
  l.handle={key,
   setLocal:(x,y=0,z=0)=>l.inst.setPosition([x,y,z]),
   moveTo:(u,v)=>{anchor.u=u;anchor.v=v;},
   release:()=>{if(l.released)return;l.released=true;l.inst.stop();l.inst.root.visible=false;},
   get alive(){return live.includes(l);}};
  live.push(l);
  return l.handle;
 }

 // Once per rendered frame, in seconds. render=false advances the simulation only (scripted captures).
 const staticOccCache=new Map<number,number>(),heroOccCache=new Map<number,number>();
 let lastOccHx=-1e9,lastOccHy=-1e9;
 function frame(dt:number,render=true){
  if(!planes)return;
  clock+=dt;
  for(let i=pending.length-1;i>=0;i--)if(pending[i].at<=clock){const p=pending.splice(i,1)[0];p.run();}
  for(const l of live){l.age+=dt;if(l.follow){const p=l.follow();l.anchor.u=p.u;l.anchor.v=p.v;}}
  planes.ground.vfx.update(dt,{timeSeconds:clock});planes.world.vfx.update(dt,{timeSeconds:clock});
  const occFn=o.occlusionAt,heroPos=o.getHeroWorld?.(),layers=o.depthLayers,sc=view.scale||1;
  const hx=heroPos?.x??0,hy=heroPos?.y??0;
  if(Math.abs(hx-lastOccHx)>2||Math.abs(hy-lastOccHy)>2||heroOccCache.size>2048){
   heroOccCache.clear();lastOccHx=hx;lastOccHy=hy;
  }
  if(staticOccCache.size>8192)staticOccCache.clear();
  let occCount=0,occMin=1,occSum=0,occTotal=0,backCnt=0,frontCnt=0;
  for(let i=live.length-1;i>=0;i--){
   const l=live[i];
   if(!l.inst.isActive){
    live.splice(i,1);
    l.inst.root.removeFromParent();
    const list=pool.get(l.key)??[];
    if(list.length<POOL){l.inst.stop();l.inst.root.visible=false;planes[l.plane].vfx.removeEffect(l.inst,false);list.push(l.inst);pool.set(l.key,list);}
    else planes[l.plane].vfx.removeEffect(l.inst,true);
    continue;
   }
   const a=l.anchor,pos=(l.inst as any).position??[0,0,0],cs=Math.cos(a.yaw),sn=Math.sin(a.yaw),lx=pos[0]*a.scale,lz=pos[2]*a.scale;
   const anchorPt=tilePoint(a.u+lx*cs-lz*sn,a.v+lx*sn+lz*cs),anchorLift=(pos[1]*a.scale+a.h)*UNIT_PX;
   const flat=l.plane==='ground',anchorY=anchorPt.y,aHashY=((anchorY*.125)|0)*668265263;
   if(flat&&anchorY>860)continue;
   const canOcclude=Boolean(occFn)&&(anchorY<=860||(!flat&&Boolean(heroPos&&Math.abs(anchorPt.x-heroPos.x)<=110&&Math.abs(anchorY-heroPos.y)<=110)));
   let sumPy=0,cntPy=0,maxPy=-Infinity;
   const walkInst=(inst:any)=>{
    const views=inst?.emitterViews as any[]|undefined;
    if(views)for(let v=0;v<views.length;v++){
     const ev=views[v],ds=ev.depthSort as {particle:any;depth:number}[]|undefined;
     const isAdd=ev.container?.blendMode==='add';
     if(ds)for(let j=0;j<ds.length;j++){
      const entry=ds[j],p=entry.particle;
      const py=(-entry.depth-view.y)/sc,px=(p.x-view.x)/sc,wx=px,wy=flat?py:(p.y-view.y)/sc;
      sumPy+=py;cntPy++;if(py>maxPy)maxPy=py;
      if(canOcclude&&occFn){
       const nearHero=!flat&&py<hy-2&&Math.abs(wx-hx)<=64&&wy>=hy-116&&wy<=hy+36;
       if(anchorY>850&&py>850&&wy>850&&!nearHero){
        occTotal++;occSum+=1;
        continue;
       }
       const texW=p.texture?.orig?.width??64,rad=Math.abs(p.scaleX)*texW*.5/sc,rBin=(rad*.25)|0;
       const gk=(((px*.125)|0)*73856093)^(((py*.125)|0)*19349663)^(((wy*.125)|0)*83492791)^(rBin*2654435761)^aHashY^(flat?1:2);
       const cache=nearHero?heroOccCache:staticOccCache;
       let occ=cache.get(gk);
       if(occ===undefined){
        occ=occFn(px,py,wx,wy,rad,flat,nearHero,anchorY);
        cache.set(gk,occ);
       }
       occTotal++;occSum+=occ;if(occ<occMin)occMin=occ;
       if(occ<.999){p.alpha=occ<=.01?0:isAdd?Math.min(occ*.28,p.alpha*occ*.35):p.alpha*occ;occCount++;}
      }
     }
     const tc=ev.trailContainer?.particleChildren as any[]|undefined;
     if(canOcclude&&occFn&&tc?.length)for(let j=0;j<tc.length;j++){
      const tp=tc[j],px=(tp.x-view.x)/sc,wy=flat?(tp.y*.5-view.y)/sc:(tp.y-view.y)/sc,py=flat?wy:anchorY;
      const nearHero=!flat&&py<hy-2&&Math.abs(px-hx)<=64&&wy>=hy-116&&wy<=hy+36;
      if(anchorY>850&&py>850&&wy>850&&!nearHero){
       occTotal++;occSum+=1;
       continue;
      }
      const occ=occFn(px,py,px,wy,6,flat,nearHero,anchorY);
      occTotal++;occSum+=occ;if(occ<occMin)occMin=occ;
      if(occ<.999){tp.alpha=occ<=.01?0:isAdd?Math.min(occ*.28,tp.alpha*occ*.35):tp.alpha*occ;occCount++;}
     }
     if(canOcclude&&occFn&&ev.trailMesh?.visible){
      const occ=occFn(anchorPt.x,anchorY,anchorPt.x,anchorY-anchorLift,12,flat,!flat,anchorY);
      ev.trailMesh.alpha=occ;
      occTotal++;occSum+=occ;if(occ<occMin)occMin=occ;if(occ<.999)occCount++;
     }
    }
    const kids=inst?.childInstances as any[]|undefined;
    if(kids)for(let k=0;k<kids.length;k++)walkInst(kids[k]);
   };
   if(canOcclude)walkInst(l.inst);
   if(l.plane==='world'&&layers&&heroPos){
    const effY=cntPy>0?sumPy/cntPy:anchorY-anchorLift*.5;
    const isBehind=effY<heroPos.y-2;
    const targetLayer=isBehind?layers.back:layers.front;
    if(l.inst.root.parent!==targetLayer)targetLayer.addChild(l.inst.root);
    l.inst.root.zIndex=effY;
    if(isBehind)backCnt++;else frontCnt++;
   }
  }
  occludedParticles=occCount;minOcclusion=occTotal?Number(occMin.toFixed(3)):1;meanOcclusion=occTotal?Number((occSum/occTotal).toFixed(3)):1;
  backEffects=backCnt;frontEffects=frontCnt;
  peakParticles=Math.max(peakParticles,planes.world.vfx.stats.activeParticles+planes.ground.vfx.stats.activeParticles);
  // Own canvases only (a host scene renders itself): nothing playing draws the cleared planes once, then leaves
  // the GPU alone until something plays.
  const empty=!live.length&&!pending.length;if(render&&!(empty&&idle)){planes.ground.app?.render();planes.world.app?.render();}idle=empty;
 }

 return {
  ready:()=>ready,
  loaded:boot,
  failed:()=>failed,
  has:(key:string)=>effects.has(key),
  keys:()=>[...effects.keys()],
  place(x:number,y:number,scale:number){view.x=x;view.y=y;view.scale=scale;},
  play,frame,
  particleCount:()=>planes?planes.world.vfx.stats.activeParticles+planes.ground.vfx.stats.activeParticles:0,
  liveCount:()=>live.length,
  stats:()=>({ready,failed,effects:effects.size,live:live.length,played,peakParticles,
   occludedParticles,minOcclusion,meanOcclusion,backEffects,frontEffects,
   particles:planes?planes.world.vfx.stats.activeParticles+planes.ground.vfx.stats.activeParticles:0,
   missing:planes?[...planes.world.vfx.stats.missingTextureRefs,...planes.ground.vfx.stats.missingTextureRefs].map(r=>r.path):[],
   unsupported:planes?[...planes.world.vfx.stats.unsupportedFeatures,...planes.ground.vfx.stats.unsupportedFeatures].map(f=>f.featureKey):[],
   playing:live.map(l=>`${l.key}:${l.inst.stats.activeParticles}`)}),
 };
}
export type FxStage=ReturnType<typeof createFxStage>;
