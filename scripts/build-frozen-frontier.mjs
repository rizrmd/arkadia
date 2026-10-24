import fs from 'node:fs/promises';
import sharp from 'sharp';
const root='public/frozen-frontier/v1';
// Pivots are centers of contact footprints, measured on the visible sprite.
// widthWorld uses the existing 128x64 px / 3m tile; height is a design target.
const specs=[
 ['wall-ne',144,.5,.75,[3,.45],2.4],['wall-se',144,.5,.75,[3,.45],2.4],
 ['corner-n',144,.5,.76,[1.5,1.5],2.4],['corner-s',144,.5,.76,[1.5,1.5],2.4],
 ['arch-ne',156,.5,.85,[3,.65],3.6],['arch-se',156,.5,.85,[3,.65],3.6],
 ['pillar-intact',36,.5,.94,[.65,.65],2.4],['pillar-broken',32,.5,.87,[.65,.65],1.1],
 ['stairs-ne',110,.5,.67,[1.5,1.5],.75],['stairs-nw',110,.5,.67,[1.5,1.5],.75],
 ['foundation',256,.5,.56,[6,6],.3],['paving',256,.5,.5,[6,6],0],
 ['rubble',86,.5,.72,[1.5,1],.5],['snow-cap-ne',144,.5,.5,[3,.5],.08],['snow-cap-se',144,.5,.5,[3,.5],.08]
];
const assets=[];
for(const [id,widthWorld,px,py,footprintM,heightM] of specs){
 const source=`assets-src/frozen-frontier/v1/${id}.png`;
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let l=info.width,t=info.height,r=0,b=0,clear=0,solid=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const a=data[(y*info.width+x)*4+3];if(a===0)clear++;if(a>240)solid++;
  if(a>8){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
 }
 if(!clear||!solid||r<=l)throw Error(`Invalid alpha: ${id}`);
 const crop={left:l,top:t,width:r-l+1,height:b-t+1};
 const width=768,height=Math.round(crop.height/crop.width*width);
 const file=`assets/${id}.png`;
 await sharp(source).extract(crop).resize(width,height).png().toFile(`${root}/${file}`);
 assets.push({id,file,source,sourceSize:[info.width,info.height],sourceCrop:crop,size:[width,height],pivot:{x:Math.round(width*px),y:Math.round(height*py)},widthWorld,scale:widthWorld/width,footprintM,heightM,alpha:{clearPixels:clear,solidPixels:solid},orientation:id.split('-').at(-1),pivotStatus:'review placement reference; refine collision/joins during later integration'});
}
const manifest={version:1,status:'concept-kit-review',generator:'built-in image_gen; separate call per asset',camera:{projection:'2:1 dimetric',halfWidth:64,halfHeight:32,tileMeters:3,groundSlope:.5},lighting:'Soft upper-left daylight; no mirrored variants',heroReference:{heightM:1.8,displayHeightWorld:66.66,note:'Approximate existing 3D hero 101px foot pivot × DISPLAY .66; composition uses 37 world px per vertical meter.'},placement:'draw at (x-pivot.x*scale,y-pivot.y*scale), dimensions=size*scale; snow-cap pivot is attachment center, offset upward to wall ledge',limitations:'Generated silhouettes vary from exact 2:1; initial art kit requires join, collision and occlusion calibration before gameplay placement. Not loaded by the game.',assets};
await fs.writeFile(`${root}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
await fs.copyFile('docs/frozen-frontier/prompts.json',`${root}/prompts.json`);
await fs.writeFile('docs/frozen-frontier/verification.json',JSON.stringify({assetCount:assets.length,allHaveTransparency:true,allHaveSolidPixels:true,allPivotsInBounds:assets.every(a=>a.pivot.x>=0&&a.pivot.y>=0&&a.pivot.x<a.size[0]&&a.pivot.y<a.size[1]),gameImports:0,assets:assets.map(a=>({id:a.id,size:a.size,alpha:a.alpha}))},null,2)+'\n');
console.log(`Exported ${assets.length} transparent sprites with pivots.`);
