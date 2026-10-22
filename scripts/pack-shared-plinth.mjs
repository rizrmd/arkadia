import sharp from 'sharp';

// Trim transparent margins, then weather and desaturate the pilaster so its
// sunlit face, coping cap and inner re-entrant corner blend seamlessly with
// the adjacent main gate towers and lower rampart courses.
const input='assets-src/gate-seamless/shared-plinth-pillar-source.png';
const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
let left=info.width,top=info.height,right=0,bottom=0;
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
 if(data[(y*info.width+x)*4+3]<=128)continue;
 left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
}
const W=260,H=305;
const pixels=await sharp(input).extract({left,top,width:right-left+1,height:bottom-top+1}).resize(W,H,{fit:'fill'}).ensureAlpha().raw().toBuffer();
const smoothstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const i=(y*W+x)*4,a=pixels[i+3];
 if(!a)continue;
 let r=pixels[i],g=pixels[i+1],b=pixels[i+2];
 const luma=.299*r+.587*g+.114*b;
 // True yellow-green moss has G > R*0.91 and G - B > 32 (unlike warm limestone where R - G > 18).
 const mossiness=Math.max(0,Math.min(1,((g-b)-(r-g)*1.35-10)/22));
 const topSurfaceT=(1-smoothstep(24,58,y))*(1-smoothstep(48,92,x));
 let targetL=luma*(.81+.07*topSurfaceT);
 const knee=88+18*topSurfaceT;
 if(targetL>knee)targetL=knee+(targetL-knee)*(.52+.14*topSurfaceT);
 // Contact ambient occlusion where the pilaster tucks against the taller gate tower.
 const aoT=smoothstep(56,104,x);
 const capT=1-smoothstep(18,82,y);
 targetL*=1-(.18+.14*capT)*aoT;
 const scale=luma>1?targetL/luma:1;
 r*=scale;g*=scale;b*=scale;
 const newL=.299*r+.587*g+.114*b;
 const neutralR=newL*1.14,neutralG=newL*.98,neutralB=newL*.80;
 const desat=(.46-.10*topSurfaceT)*(1-mossiness*.7);
 r=r*(1-desat)+neutralR*desat;
 g=g*(1-desat)+neutralG*desat;
 b=b*(1-desat)+neutralB*desat;
 if(mossiness>.02){
  // Shift bright yellow moss toward deep weathered olive matching the main gate base.
  const m=mossiness*.65;
  r=r*(1-m)+newL*.94*m;
  g=g*(1-m)+newL*1.02*m;
  b=b*(1-m)+newL*.52*m;
 }
 pixels[i]=Math.max(0,Math.min(255,Math.round(r)));
 pixels[i+1]=Math.max(0,Math.min(255,Math.round(g)));
 pixels[i+2]=Math.max(0,Math.min(255,Math.round(b)));
}

const trimmed=await sharp(pixels,{raw:{width:W,height:H,channels:4}}).png().toBuffer();
await sharp(trimmed).png().toFile('public/modular-stronghold/v2/gate-connector-left-v3.png');
await sharp(trimmed).flop().png().toFile('public/modular-stronghold/v2/gate-connector-right-v3.png');
console.log({left,top,right,bottom});
