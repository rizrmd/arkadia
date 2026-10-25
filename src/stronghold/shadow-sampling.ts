export const SHADOW_SAMPLING_GLSL=`uniform sampler2D uDepth;uniform sampler2D uSecondDepth;uniform sampler2D uDynamicDepth;uniform sampler2D uDynamicSecond;
uniform vec4 uLightBounds;uniform vec4 uDynamicLightBounds;uniform vec4 uSun;uniform vec4 uDynamicSun;uniform vec4 uCamera;
float zOf(vec4 p){return (mod(floor(p.g*255.0+.5),16.0)*256.0+floor(p.b*255.0+.5))*.5;}
float ownerOf(vec4 p){return floor(p.r*255.0+.5)*16.0+floor(floor(p.g*255.0+.5)/16.0);}
vec4 texAt(sampler2D tex,vec2 p,vec4 b){vec2 uv=(p-b.xy)/b.zw;if(any(lessThan(uv,vec2(0.0)))||any(greaterThanEqual(uv,vec2(1.0))))return vec4(0.0);return texture(tex,uv);}
float blockOne(sampler2D first,sampler2D second,vec4 bounds,vec2 ray,float h,float own){vec4 d=texAt(first,ray,bounds);if(own>0.0&&h>2.0&&abs(ownerOf(d)-own)<.5)d=texAt(second,ray,bounds);return zOf(d)>h+.75?d.a:0.0;}
// Filter each field on its own texel grid: terrain's coarse grid must not
// quantize the higher resolution live actor silhouettes.
float fieldCoverage(sampler2D first,sampler2D second,vec4 bounds,vec2 ray,float h,float own,float stepSize){
vec2 grid=(ray-bounds.xy)/stepSize-.5,f=fract(grid),base=bounds.xy+(floor(grid)+.5)*stepSize;
return mix(mix(blockOne(first,second,bounds,base,h,own),blockOne(first,second,bounds,base+vec2(stepSize,0.0),h,own),f.x),mix(blockOne(first,second,bounds,base+vec2(0.0,stepSize),h,own),blockOne(first,second,bounds,base+vec2(stepSize),h,own),f.x),f.y);}
float shadowCoverage(vec2 world,float h,float own){vec2 ray=world+vec2(0.0,h)+uSun.xy*h;
float terrain=fieldCoverage(uDepth,uSecondDepth,uLightBounds,ray,h,own,max(uSun.w,.001));
float actors=fieldCoverage(uDynamicDepth,uDynamicSecond,uDynamicLightBounds,ray+(uDynamicSun.xy-uSun.xy)*h,h,own,max(uDynamicSun.w,.001));
return max(terrain,actors);}
`;
