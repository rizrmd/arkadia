export const SHADOW_SAMPLING_GLSL=`uniform sampler2D uDepth;uniform sampler2D uSecondDepth;uniform sampler2D uDynamicDepth;uniform sampler2D uDynamicSecond;
uniform vec4 uLightBounds;uniform vec4 uDynamicLightBounds;uniform vec4 uSun;uniform vec4 uDynamicSun;uniform vec4 uCamera;
float zOf(vec4 p){return (mod(floor(p.g*255.0+.5),16.0)*256.0+floor(p.b*255.0+.5))*.5;}
float ownerOf(vec4 p){return floor(p.r*255.0+.5)*16.0+floor(floor(p.g*255.0+.5)/16.0);}
vec4 texAt(sampler2D tex,vec2 p,vec4 b){vec2 uv=(p-b.xy)/b.zw;if(any(lessThan(uv,vec2(0.0)))||any(greaterThanEqual(uv,vec2(1.0))))return vec4(0.0);return texture(tex,uv);}
float blockOne(sampler2D first,sampler2D second,vec4 bounds,vec2 ray,float h,float own){vec4 d=texAt(first,ray,bounds);if(own>0.0&&h>2.0&&abs(ownerOf(d)-own)<.5)d=texAt(second,ray,bounds);return zOf(d)>h+.75?d.a:0.0;}
float blocked(vec2 ray,float h,float own){return max(blockOne(uDepth,uSecondDepth,uLightBounds,ray,h,own),blockOne(uDynamicDepth,uDynamicSecond,uDynamicLightBounds,ray+(uDynamicSun.xy-uSun.xy)*h,h,own));}
float shadowCoverage(vec2 world,float h,float own){vec2 ray=world+vec2(0.0,h)+uSun.xy*h;vec2 grid=(ray-uLightBounds.xy)/uSun.w-.5;vec2 f=fract(grid),base=uLightBounds.xy+(floor(grid)+.5)*uSun.w;
return mix(mix(blocked(base,h,own),blocked(base+vec2(uSun.w,0.0),h,own),f.x),mix(blocked(base+vec2(0.0,uSun.w),h,own),blocked(base+vec2(uSun.w,uSun.w),h,own),f.x),f.y);}
`;
