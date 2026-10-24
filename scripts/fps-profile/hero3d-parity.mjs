// Pixel parity of the 3D hero sprite + ground shadow: drives the former CPU readback renderer (LEGACY=path to a copy
// of the old hero-3d.ts, e.g. `git show 199d1e5:src/stronghold/hero-3d.ts`) and the current all-GPU renderer through
// the same clip/dt sequence and compares both outputs pixel by pixel.
//   LEGACY=/abs/path/hero-3d-legacy.ts node scripts/fps-profile/hero3d-parity.mjs [out.webp]
import {createServer} from 'vite';
import sharp from 'sharp';
import {launch} from '../vfx/browser.mjs';

const LEGACY=process.env.LEGACY;if(!LEGACY)throw Error('set LEGACY');
const OUT=process.argv[2]||'';
const vite=await createServer({server:{host:'127.0.0.1',port:18000+(process.pid%900),strictPort:true,hmr:false,watch:null,fs:{strict:false}},logLevel:'error'});
await vite.listen();const GAME=vite.resolvedUrls.local[0].replace(/\/$/,'');
const browser=await launch();
try{
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errors.push(m.text());});
 await page.goto(`${GAME}/@vite/client`);
 const res=await page.evaluate(async legacy=>{
  const [cur,old]=await Promise.all([import('/src/stronghold/hero-3d.ts'),import('/@fs'+legacy)]);
  const A=old.get3dHeroRenderer(),B=cur.get3dHeroRenderer();
  const hero='ember-warden';
  for(let i=0;i<600&&!(A.isHeroReady(hero)&&B.isHeroReady(hero));i++)await new Promise(r=>setTimeout(r,100));
  if(!A.isHeroReady(hero)||!B.isHeroReady(hero))return {error:'models not ready'};
  const sun={alpha:.8,dx:.42,dy:.18,wx:1,wy:0};const cell={w:114,h:103,pivot:{x:57,y:101}};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const grab=(c,w,h,sx=0,sy=0)=>{const k=document.createElement('canvas');k.width=w;k.height=h;const g=k.getContext('2d',{willReadFrequently:true});g.drawImage(c,sx,sy,w,h,0,0,w,h);return g.getImageData(0,0,w,h).data;};
  const steps=[['idle',false,'255,255,255',0],['idle',false,'255,255,255',0],['move',true,'255,255,255',0],['cast',false,'255,255,255',0],['cast',true,'224,200,176',0],['idle',false,'255,255,255',.8]];
  const out=[];const shots=[];
  for(const [clip,moving,tint,night] of steps){
   const o={heroId:hero,clip,moving,yaw:Math.PI*.25,dt:.37,tint,night,sun,cell};
   const ra=A.updateAndRender(o),rb=B.updateAndRender(o);
   const rb2=rb;
   const W=ra.sprite.width,H=ra.sprite.height,pa=grab(ra.sprite,W,H),pb=grab(rb2.sprite,W,H);
   let diff=0,alphaDiff=0,maxD=0,opaqueA=0,opaqueB=0;
   for(let i=0;i<pa.length;i+=4){const d=Math.max(Math.abs(pa[i]-pb[i]),Math.abs(pa[i+1]-pb[i+1]),Math.abs(pa[i+2]-pb[i+2]),Math.abs(pa[i+3]-pb[i+3]));if(d>maxD)maxD=d;if(d>12)diff++;if((pa[i+3]>0)!==(pb[i+3]>0))alphaDiff++;if(pa[i+3]>0)opaqueA++;if(pb[i+3]>0)opaqueB++;}
   let shadow=null;
   if(ra.shadow&&rb2.shadow){const sa=ra.shadow,sb=rb2.shadow;const qa=grab(sa.canvas,sa.sw,sa.sh),qb=grab(sb.canvas,sb.sw,sb.sh,sb.sx??0,sb.sy??0);let sd=0,ca=0,cb=0;if(sa.sw===sb.sw&&sa.sh===sb.sh)for(let i=3;i<qa.length;i+=4){if(Math.abs(qa[i]-qb[i])>2)sd++;if(qa[i])ca++;if(qb[i])cb++;}shadow={sizeA:[sa.sw,sa.sh],sizeB:[sb.sw,sb.sh],diffPx:sd,pxA:ca,pxB:cb};}
   out.push({clip,moving,tint,night,W,H,opaqueA,opaqueB,diffPx:diff,alphaFlips:alphaDiff,maxChannelDiff:maxD,shadow,shadowB:Boolean(rb2.shadow)});
   const toUrl=(c,w,h,sx=0,sy=0)=>{const k=document.createElement('canvas');k.width=w;k.height=h;k.getContext('2d').drawImage(c,sx,sy,w,h,0,0,w,h);return k.toDataURL('image/png');};
   shots.push({a:toUrl(ra.sprite,W,H),b:toUrl(rb2.sprite,W,H),sa:ra.shadow?toUrl(ra.shadow.canvas,ra.shadow.sw,ra.shadow.sh):null,sb:rb2.shadow?toUrl(rb2.shadow.canvas,rb2.shadow.sw,rb2.shadow.sh,rb2.shadow.sx??0,rb2.shadow.sy??0):null,label:`${clip}${moving?' moving':''}${night?' night':''}${tint!=='255,255,255'?' tinted':''}`});
  }
  return {out,shots};
 },LEGACY);
 if(res.error)throw Error(res.error);
 console.table(res.out.map(r=>({clip:r.clip,moving:r.moving,night:r.night,opaqueOld:r.opaqueA,opaqueNew:r.opaqueB,diffPx:r.diffPx,alphaFlips:r.alphaFlips,maxDiff:r.maxChannelDiff,shadowDiff:r.shadow?.diffPx,shadowPxOld:r.shadow?.pxA,shadowPxNew:r.shadow?.pxB})));
 if(OUT){
  // contact sheet: per step [old sprite+shadow | new sprite+shadow] on a ground-coloured tile, 2x
  const tiles=[];const TW=228,TH=206;
  for(const s of res.shots){
   for(const [spr,sh] of [[s.a,s.sa],[s.b,s.sb]]){
    const layers=[];
    if(sh){const buf=Buffer.from(sh.split(',')[1],'base64');layers.push({input:buf,left:0,top:0});}
    layers.push({input:Buffer.from(spr.split(',')[1],'base64'),left:0,top:0});
    let img=sharp({create:{width:TW+40,height:TH+20,channels:4,background:'#6f6a55'}});
    const shBuf=layers.length>1?await sharp(layers[0].input).resize({width:TW+40,height:TH+20,fit:'inside'}).png().toBuffer():null;
    const comp=[];if(shBuf)comp.push({input:shBuf,left:0,top:0,blend:'over'});comp.push({input:layers[layers.length-1].input,left:20,top:10});
    tiles.push(await img.composite(comp).png().toBuffer());
   }
  }
  const cols=2,TW2=TW+40,TH2=TH+20,rows=res.shots.length;
  const label=(t,w)=>Buffer.from(`<svg width="${w}" height="26"><rect width="100%" height="100%" fill="#14161c"/><text x="8" y="18" fill="#e8e1cf" font-family="monospace" font-size="13">${t}</text></svg>`);
  const comp=[];
  comp.push({input:label('OLD (CPU readback)',TW2),left:0,top:0},{input:label('NEW (GPU pass)',TW2),left:TW2+8,top:0});
  res.shots.forEach((s,r)=>{comp.push({input:label(s.label,TW2*2+8),left:0,top:26+r*(TH2+26)});for(let c=0;c<cols;c++)comp.push({input:tiles[r*2+c],left:c*(TW2+8),top:52+r*(TH2+26)});});
  await sharp({create:{width:TW2*2+8,height:52+rows*(TH2+26),channels:4,background:'#14161c'}}).composite(comp).webp({quality:88}).toFile(OUT);
  console.log('wrote',OUT);
 }
 if(errors.length)console.log('console:',errors.slice(0,6));
}finally{await browser.close();await vite.close();}
