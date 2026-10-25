export const SHADOW_SAMPLING_GLSL=`uniform sampler2D uDepth;uniform sampler2D uSecondDepth;uniform sampler2D uDynamicDepth;uniform sampler2D uDynamicSecond;
uniform vec4 uLightBounds;uniform vec4 uDynamicLightBounds;uniform vec4 uSun;uniform vec4 uDynamicSun;uniform vec4 uCamera;
float zOf(vec4 p){return (mod(floor(p.g*255.0+.5),16.0)*256.0+floor(p.b*255.0+.5))*.5;}
float ownerOf(vec4 p){return floor(p.r*255.0+.5)*16.0+floor(floor(p.g*255.0+.5)/16.0);}
vec4 texAt(sampler2D tex,vec2 p,vec4 b){vec2 uv=(p-b.xy)/b.zw;if(any(lessThan(uv,vec2(0.0)))||any(greaterThanEqual(uv,vec2(1.0))))return vec4(0.0);return texture(tex,uv);}
bool sameCaster(float id,float own){return own>0.0&&(abs(id-own)<.5||(own<=uCamera.w*.5&&abs(id-own-uCamera.w)<.5));}
vec4 secondAt(sampler2D tex,vec2 p,vec4 b,float atlasMode,float part){vec2 uv=(p-b.xy)/b.zw;if(any(lessThan(uv,vec2(0.0)))||any(greaterThanEqual(uv,vec2(1.0))))return vec4(0.0);if(atlasMode>1.5)uv.y=(uv.y+part)*.5;return texture(tex,uv);}
float eligible(vec4 d,float h,float own){return zOf(d)>h+.75&&!(h>2.0&&sameCaster(ownerOf(d),own))?d.a:0.0;}
float blockOne(sampler2D first,sampler2D second,vec4 bounds,vec2 ray,float h,float own,float atlasMode){vec4 d=texAt(first,ray,bounds);if(zOf(d)<=h+.75)return 0.0;float a=eligible(d,h,own);if(a>.999)return a;vec4 next=secondAt(second,ray,bounds,atlasMode,0.0);a=max(a,eligible(next,h,own));if(atlasMode>1.5)a=max(a,eligible(secondAt(second,ray,bounds,atlasMode,1.0),h,own));return a;}
// Filter each field on its own texel grid: terrain's coarse grid must not
// quantize the higher resolution live actor silhouettes.
float fieldCoverage(sampler2D first,sampler2D second,vec4 bounds,vec2 ray,float h,float own,float stepSize,float atlasMode){
vec2 grid=(ray-bounds.xy)/stepSize-.5,f=fract(grid),base=bounds.xy+(floor(grid)+.5)*stepSize;
return mix(mix(blockOne(first,second,bounds,base,h,own,atlasMode),blockOne(first,second,bounds,base+vec2(stepSize,0.0),h,own,atlasMode),f.x),mix(blockOne(first,second,bounds,base+vec2(0.0,stepSize),h,own,atlasMode),blockOne(first,second,bounds,base+vec2(stepSize),h,own,atlasMode),f.x),f.y);}
float shadowCoverage(vec2 world,float h,float own){vec2 ray=world+vec2(0.0,h)+uSun.xy*h;
float terrain=fieldCoverage(uDepth,uSecondDepth,uLightBounds,ray,h,own,max(uSun.w,.001),0.0);
float actors=fieldCoverage(uDynamicDepth,uDynamicSecond,uDynamicLightBounds,ray+(uDynamicSun.xy-uSun.xy)*h,h,own,max(uDynamicSun.w,.001),uDynamicSun.z);
return max(terrain,actors);}
`;
