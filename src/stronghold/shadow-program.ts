import {GlProgram} from 'pixi.js';
// Pixi's high-shader compiler defaults to mediump fragments. Atlas UVs and
// packed owner/height bytes need highp; mediump can move alpha-edge samples and
// round world coordinates. Reuse its generated shader, changing only precision.
export function highpShadowProgram(program:GlProgram,name:string){
 if(!program.fragment||!program.vertex)throw Error("Shadow shader source unavailable");
 const fragment=program.fragment.replace(/precision mediump float\s*;/g,'precision highp float;');
 return GlProgram.from({name,vertex:program.vertex,fragment,preferredFragmentPrecision:'highp'});
}
