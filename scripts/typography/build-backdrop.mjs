// Clean plate for the HUD sample: the human reference (public/typography/reference.png) with its painted HUD covered by
// feathered patches copied from nearby scenery, so the live HUD can sit on the same scene for 1:1 overlays.
// Every patched area lies under a rebuilt HUD element; only its margins stay visible. Patches apply in order, each reading
// the image as already patched (the XP strip copies the cleaned skill area above it).
//   node scripts/typography/build-backdrop.mjs
import sharp from 'sharp';
const src='public/typography/reference.png',out='public/typography/v2/backdrops/hud-clean.jpg';
// [x, y, width, height] of the painted HUD, then the source offset [dx, dy] of the replacement scenery.
const patches=[
 [[0,0,548,222],[0,222]],
 [[1436,0,236,186],[0,190]],
 [[600,628,475,200],[560,-190]],
 [[490,822,690,62],[0,-150]],
 [[0,846,272,95],[0,-95]],
 [[1462,846,210,95],[0,-95]],
];
const F=14;
const feather=(w,h)=>sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect x="${F}" y="${F}" width="${w-2*F}" height="${h-2*F}" fill="#fff"/></svg>`)).blur(F/2).png().toBuffer();
let image=await sharp(src).png().toBuffer();
for(const [[x,y,w,h],[dx,dy]] of patches){
 // Pad by the feather on sides that are not screen edges, so the blend happens outside the painted HUD.
 const X=Math.max(0,x-F),Y=Math.max(0,y-F),W=Math.min(1672,x+w+F)-X,H=Math.min(941,y+h+F)-Y;
 const piece=await sharp(image).extract({left:X+dx,top:Y+dy,width:W,height:H}).png().toBuffer();
 const mask=await sharp(await feather(W+(X===0?2*F:0)+(X+W===1672?2*F:0),H+(Y===0?2*F:0)+(Y+H===941?2*F:0))).extract({left:X===0?2*F:0,top:Y===0?2*F:0,width:W,height:H}).toBuffer();
 image=await sharp(image).composite([{input:await sharp(piece).ensureAlpha().composite([{input:mask,blend:'dest-in'}]).png().toBuffer(),left:X,top:Y}]).png().toBuffer();
}
await sharp(image).jpeg({quality:90,mozjpeg:true}).toFile(out);
console.log('wrote',out);
