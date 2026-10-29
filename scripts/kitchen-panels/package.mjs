import fs from 'node:fs/promises';
import sharp from 'sharp';
const dir='public/kitchen-panels/kit';
await sharp(dir+'/kitchen-original.png').trim().resize(320,256,{fit:'inside'}).png().toFile(dir+'/kitchen.png');
const shared=['frame','charcoal','hammer','header','gold','wood','clock','tick','divider','button','button-disabled','button-pressed'];
await fs.writeFile(dir+'/manifest.json',JSON.stringify({tool:'built-in imagegen',date:'2026-10-29',icon:'/kitchen-panels/kit/kitchen.png',original:'/kitchen-panels/kit/kitchen-original.png',shared:Object.fromEntries(shared.map(n=>[n,`/core-upgrade/kit/${n}.png`])),coverage:Array.from({length:30},(_,i)=>({target:i+1,operation:i?'upgrade':'build',completedCoreRequired:i+1,completedFarmRequired:i+1})),economy:{goldBaseline:75,woodBaseline:40,minutesBaseline:1,resourceGrowth:1.25,durationGrowth:1.2,rounding:'ceil from baseline'},transactions:'Unavailable: construction queue and persistent timers are not implemented.'},null,2));
await fs.writeFile(dir+'/prompts.md',`## Kitchen pantry icon\n\nBuilt-in imagegen, 29 October 2026. Original transparent PNG retained; runtime copy trims transparent margins and downsamples only.\n\nPrompt: A small rustic medieval pantry: warmly painted timber food storage cupboard and covered food crate, iron corner bands, small terracotta roof, food-storage identity (no chef, no cooking stove, no flames). Rich hand-painted medieval game icon, warm antique gold highlights and cool charcoal shadows, clean readable silhouette matching ornate gold-and-charcoal game panel components. Isolated full object centered, front three-quarter view, generous transparent margin. No background, ground plane, text, letters, numbers, UI frame or watermarks. Transparent PNG; 2D painted bitmap.\n\nShared components reuse the separately imagegen-generated Core kit. No model or procedural replacement artwork. All dynamic labels and values use native Pixi MSDF text.\n`);

// Keep unmodified PNG bytes downloadable even when image URLs negotiate WebP.
import {execFileSync} from 'node:child_process';
execFileSync('python3',['-c',`import zipfile
from pathlib import Path
d=Path('public/kitchen-panels/kit')
with zipfile.ZipFile(d/'source-kit.zip','w',zipfile.ZIP_DEFLATED) as z:
 for name in ['kitchen-original.png','kitchen.png','manifest.json','prompts.md']:z.write(d/name,name)
`]);
