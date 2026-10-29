import sharp from 'sharp';
import fs from 'node:fs/promises';
await fs.mkdir('public/foundation-transitions',{recursive:true});
for(const [source,name,width] of [['soil-moss-source','soil-moss',768],['moss-source','moss',384]]){
 const file=`assets-src/foundation-transitions/${source}.png`;
 await sharp(file).trim().resize({width}).png().toFile(`public/foundation-transitions/${name}.png`);
 await sharp(file).resize({width:1024,withoutEnlargement:true}).webp({quality:88}).toFile(`public/foundation-transitions/${source}.webp`);
}
