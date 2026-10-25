/** Shared connected Flame Fan material. Canonical unit-radius sector, +X forward.
 * No bloom or vertical expansion: presentation never adds to authoritative reach. */
export function createFlameFanMaterial(size=256){
 const canvas=Object.assign(document.createElement('canvas'),{width:size,height:size});
 const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
 if(!gl)throw Error('WebGL is required for Flame Fan');
 const vert=`attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
 const frag=`precision highp float;
uniform float t;uniform float rank;uniform float size;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=a*noise(p);p=p*2.03+vec2(7.1,3.7);a*=.5;}return n;}
void main(){
 vec2 p=(gl_FragCoord.xy/size-.5)*2.;
 float age=t-.42,growth=smoothstep(0.,.30,age);
 float r=length(p)/max(.001,growth),a=atan(p.y,p.x);
 float flow=fbm(vec2(a*(5.+rank),r*5.-t*1.8));
 float warp=fbm(vec2(a*(10.+rank*2.)+flow*4.,r*7.-t*2.4));
 // Additional curled tongue strata are rank dependent, while the lower body stays connected.
 float folds=0.;
 for(int i=0;i<5;i++){float layer=float(i);float active=step(layer+.5,rank);
  float curl=sin(a*(8.+layer*3.)+r*(13.+layer*2.)-t*(5.+layer*.7)+warp*8.);
  float band=1.-smoothstep(.02,.105,abs(r-(.3+layer*.135+curl*.055)));
  folds+=active*band*(.16+.035*layer);}
 float rim=.94+.035*sin(a*(13.+rank*4.)+flow*8.)+.025*warp;
 float side=1.-smoothstep(.922,.94248,abs(a));
 float edge=1.-smoothstep(rim-.035,rim,r);
 float heat=clamp(.06+flow*.53+warp*.32+folds*1.20+(1.-r)*(.09+rank*.024)+(rank-1.)*.034,0.,1.);
 vec3 col=mix(vec3(.7,.035,.001),vec3(1.,.22,.002),smoothstep(.18,.5,heat));
 col=mix(col,vec3(1.,.64,.025),smoothstep(.48,.73,heat));
 col=mix(col,vec3(1.,.98,.72),smoothstep(.84,1.14,heat));
 float fade=1.-smoothstep(1.95,2.6,t);
 float density=.34+rank*.045;
 float alpha=side*edge*density*smoothstep(0.,.06,age)*fade;
 gl_FragColor=vec4(col,alpha);
}`;
 function compile(type:number,source:string){const shader=gl!.createShader(type)!;gl!.shaderSource(shader,source);gl!.compileShader(shader);if(!gl!.getShaderParameter(shader,gl!.COMPILE_STATUS))throw Error(gl!.getShaderInfoLog(shader)||'Flame shader failed');return shader;}
 const program=gl.createProgram()!;gl.attachShader(program,compile(gl.VERTEX_SHADER,vert));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,frag));gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'Flame material failed');
 gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 const pos=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
 const time=gl.getUniformLocation(program,'t'),rank=gl.getUniformLocation(program,'rank');gl.uniform1f(gl.getUniformLocation(program,'size'),size);
 return {canvas,render(level:number,t:number){gl!.uniform1f(time,t);gl!.uniform1f(rank,level);gl!.viewport(0,0,size,size);gl!.drawArrays(gl!.TRIANGLES,0,6);return canvas;}};
}
