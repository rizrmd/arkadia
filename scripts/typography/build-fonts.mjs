// MSDF atlases for the shared typography module (src/typography). Sources and OFL licences: assets-src/typography/fonts.
//   npm install --prefix ~/.cache/msdf-tools msdf-bmfont-xml@2.7.0   (once; kept out of the game dependencies)
//   uv venv ~/.cache/fonttools-venv && uv pip install --python ~/.cache/fonttools-venv/bin/python fonttools skia-pathops
//   node scripts/typography/build-fonts.mjs
// Writes BMFont XML (.fnt) plus atlas PNGs to public/typography/v2/fonts. XML because Pixi 8.22's text-format parser only
// reads all-lowercase tags and so drops `distanceField`, leaving the font a plain bitmap. The tool cannot read GPOS
// kerning (EB Garamond keeps all of it there), so kerning pairs are measured with Chromium's shaper. On a musl sandbox the bundled glibc msdfgen runs through a glibc loader:
// see scripts/typography/README.md.
import {execFileSync} from 'node:child_process';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {chromium} from 'playwright';
import {launchOptions} from './browser.mjs';
const tool=process.env.MSDF_BMFONT||path.join(os.homedir(),'.cache/msdf-tools/node_modules/.bin/msdf-bmfont');
const python=process.env.FONTTOOLS_PYTHON||path.join(os.homedir(),'.cache/fonttools-venv/bin/python');
const src='assets-src/typography/fonts',out='public/typography/v2/fonts';
const SIZE=64,RANGE=16;
// Printable ASCII plus the HUD separators. Range 16 at size 64 keeps ±8 atlas px of field: room for a 2–3 px outline and a soft shadow.
const charset=[...Array(95)].map((_,i)=>String.fromCharCode(32+i)).join('')+'·•’‘“”–—…×∞';
const fonts=[{file:'EBGaramond-Bold.ttf',name:'garamond-bold',licence:'EBGaramond-OFL.txt'},{file:'EBGaramond-Medium.ttf',name:'garamond-medium-infinite-v1',licence:'EBGaramond-OFL.txt'},{file:'Cinzel-SemiBold.ttf',name:'cinzel-semibold',licence:'Cinzel-OFL.txt'}];
fs.mkdirSync(out,{recursive:true});

async function measureKerning(ttf){
 const browser=await chromium.launch(launchOptions());
 try{
  const page=await browser.newPage();
  return await page.evaluate(async({b64,chars,size})=>{
   const face=new FontFace('k',Uint8Array.from(atob(b64),c=>c.charCodeAt(0)).buffer);await face.load();document.fonts.add(face);
   const ctx=document.createElement('canvas').getContext('2d');ctx.font=`${size}px k`;ctx.fontKerning='normal';
   const w=s=>ctx.measureText(s).width,single=new Map([...chars].map(c=>[c,w(c)])),pairs=[];
   for(const a of chars)for(const b of chars){if(a===' '||b===' ')continue;const k=Math.round(w(a+b)-single.get(a)-single.get(b));if(k)pairs.push([a.codePointAt(0),b.codePointAt(0),k]);}
   return pairs;
  },{b64:fs.readFileSync(ttf).toString('base64'),chars:charset,size:SIZE});
 }finally{await browser.close();}
}

// BMFont text lines → BMFont XML with the MSDF distanceField element.
function toXml(lines,kerning){
 const tag=(name,line)=>`<${name} ${[...line.matchAll(/(\w+)=("[^"]*"|\S+)/g)].map(([,k,v])=>`${k}="${v.replace(/"/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;')}"`).join(' ')}/>`;
 const by=p=>lines.filter(l=>l.startsWith(p+' '));
 return ['<?xml version="1.0"?>','<font>',tag('info',by('info')[0]),tag('common',by('common')[0]),'<pages>',...by('page').map(l=>tag('page',l)),'</pages>',
  `<distanceField fieldType="msdf" distanceRange="${RANGE}"/>`,`<chars count="${by('char').length}">`,...by('char').map(l=>tag('char',l)),'</chars>',
  `<kernings count="${kerning.length}">`,...kerning.map(([a,b,k])=>`<kerning first="${a}" second="${b}" amount="${k}"/>`),'</kernings>','</font>',''].join('\n');
}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'msdf-'));fs.writeFileSync(path.join(tmp,'charset.txt'),charset);
for(const f of fonts.filter(f=>!process.env.FONT_ONLY || f.name===process.env.FONT_ONLY)){
 execFileSync(python,['scripts/typography/remove-overlaps.py',path.join(src,f.file),path.join(tmp,f.file)],{stdio:'inherit'});
 execFileSync(tool,['-f','txt','-o',path.join(tmp,f.name),'-s',String(SIZE),'-r',String(RANGE),'-t','msdf','-p','2','--pot','--smart-size','-m','1024,1024','-i',path.join(tmp,'charset.txt'),path.join(tmp,f.file)],{stdio:['ignore','ignore','inherit']});
 // The tool names the .fnt after the font face.
 const fnt=fs.readdirSync(tmp).find(n=>n.endsWith('.fnt')&&fs.readFileSync(path.join(tmp,n),'utf8').includes(`file="${f.name}.png"`));
 const lines=fs.readFileSync(path.join(tmp,fnt),'utf8').trim().split('\n').filter(l=>!/^kernings? /.test(l));fs.rmSync(path.join(tmp,fnt));
 const kerning=await measureKerning(path.join(src,f.file));
 fs.writeFileSync(path.join(out,f.name+'.fnt'),toXml(lines,kerning));
 fs.copyFileSync(path.join(tmp,f.name+'.png'),path.join(out,f.name+'.png'));
 fs.copyFileSync(path.join(src,f.licence),path.join(out,f.licence));
 console.log(f.name,'glyphs',lines.filter(l=>l.startsWith('char ')).length,'kerning pairs',kerning.length);
}
fs.rmSync(tmp,{recursive:true,force:true});
