// The ARKADIA logo stays an image (not live text): Cinzel SemiBold letters with the Choosing Hero compass crest in place
// of the second A, baked by Chromium at @3x and downscaled to @2x/@1x.
//   node scripts/typography/build-logo.mjs   → public/typography/v2/hero/logo@{1,2,3}x.png (270 × 70 at @1x)
import fs from 'node:fs';import sharp from 'sharp';import {chromium} from 'playwright';
import {launchOptions} from './browser.mjs';
const W=270,H=70,out='public/typography/v2/hero';
fs.mkdirSync(out,{recursive:true});
const font=fs.readFileSync('assets-src/typography/fonts/Cinzel-SemiBold.ttf').toString('base64');
const crest=(await sharp('assets-src/choosing-hero/v1/compass-crest.png').trim().resize(240,240,{fit:'contain',background:'#0000'}).png().toBuffer()).toString('base64');
const letters=(t,x)=>`<text x="${x}" y="50" font-family="Cinzel" font-size="43" letter-spacing="9" fill="url(#g)" stroke="#2a1606" stroke-width="1.2" paint-order="stroke" filter="url(#s)">${t}</text>`;
const html=`<style>@font-face{font-family:Cinzel;src:url(data:font/ttf;base64,${font})}html,body{margin:0;background:transparent}</style>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>
<linearGradient id="g" x1="0" y1="18" x2="0" y2="50" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff4cc"/><stop offset=".5" stop-color="#f0c464"/><stop offset="1" stop-color="#a86e26"/></linearGradient>
<filter id="s" x="-10%" y="-30%" width="120%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="1.6" flood-color="#000" flood-opacity=".8"/></filter></defs>
${letters('ARK',2)}<image href="data:image/png;base64,${crest}" x="${W/2-33}" y="2" width="66" height="66"/>${letters('DIA',W/2+30)}</svg>`;
const browser=await chromium.launch(launchOptions());
try{
 const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:3});
 await page.setContent(html);await page.evaluate(()=>document.fonts.ready);
 const master=await page.locator('svg').screenshot({omitBackground:true});
 for(const s of [1,2,3])await (s===3?sharp(master):sharp(master).resize(W*s,H*s,{kernel:'lanczos3'})).png().toFile(`${out}/logo@${s}x.png`);
}finally{await browser.close();}
console.log('wrote',out+'/logo@{1,2,3}x.png');
