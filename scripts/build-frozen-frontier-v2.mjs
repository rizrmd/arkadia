import fs from 'node:fs/promises';
import sharp from 'sharp';
const root='public/frozen-frontier/v2',docs='docs/frozen-frontier-v2';
const specs=[
 ['ruined-gate','Landmarks',4,[5,1.5],.50,.87,'Broad broken limestone arch with two uneven ruined piers and fallen stones.'],
 ['broken-watchtower','Landmarks',6,[4,4],.51,.86,'Squat round limestone watchtower, collapsed jagged upper wall and exposed timber floor.'],
 ['snowy-shrine','Landmarks',3,[3,3],.50,.86,'Octagonal stepped plinth, carved standing stone and broken canopy on two pillars.'],
 ['pine-tall','Pines',7,[2.5,2.5],.50,.96,'Tall narrow alpine pine, irregular layered dark evergreen needles, heavy snow and visible trunk.'],
 ['pine-broad','Pines',5,[3.8,3.8],.50,.94,'Broad mature alpine pine with asymmetrical spreading boughs, snow pillows and sturdy trunk.'],
 ['pine-sapling','Pines',1.8,[1,1],.50,.95,'Young alpine pine sapling with sparse irregular green boughs, snow and slender trunk.'],
 ['dead-tree','Deadwood',4,[2,2],.50,.94,'Twisted weathered grey brown dead tree with bare branches, snow deposits and roots.'],
 ['dead-snag','Deadwood',2.5,[1.2,1.2],.47,.92,'Broken dead pine snag with jagged trunk, snapped branches, exposed roots and snow.'],
 ['shrub-juniper','Shrubs',.8,[1.3,1],.50,.83,'Low irregular winter juniper shrub, blue green foliage, snow pillows and woody stems.'],
 ['shrub-twigs','Shrubs',.9,[1.2,1],.50,.90,'Leafless winter shrub, tangled reddish grey brown twigs and sparse snow.'],
 ['grass-tussock','Grass',.55,[.65,.65],.50,.90,'Dry grass tussock, curled ochre straw blades, tall seed heads and snow at roots.'],
 ['grass-patch','Grass',.25,[1.3,.7],.50,.75,'Low sprawling sparse dry grass patch, wind bent ochre clumps and snow between roots.'],
 ['rock-boulders','Rocks',.9,[2,1.4],.50,.72,'Three angular grey beige boulders, ochre lichen, thick snow caps and small pebbles.'],
 ['rock-scatter','Rocks',.3,[1.4,.8],.50,.61,'Low loose crescent of flat weathered stones and pebbles, snow patches and lichen.'],
];
await fs.mkdir(`${root}/assets`,{recursive:true});await fs.mkdir(`${root}/sources`,{recursive:true});await fs.mkdir(docs,{recursive:true});
const assets=[];
for(const [id,category,heightM,footprintM,px,py,subject] of specs){
 const source=`assets-src/frozen-frontier/v2/${id}.png`;
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let l=info.width,t=info.height,r=-1,b=-1,clear=0,solid=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const a=data[(y*info.width+x)*4+3];if(!a)clear++;if(a>240)solid++;if(a>8){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y)}}
 if(!clear||!solid||l===0||t===0||r===info.width-1||b===info.height-1)throw Error(`Alpha/crop failure ${id}`);
 const sourceCrop={left:l,top:t,width:r-l+1,height:b-t+1},innerW=category==='Landmarks'?960:640,pad=24;
 const innerH=Math.round(sourceCrop.height/sourceCrop.width*innerW);
 await sharp(source).extract(sourceCrop).resize(innerW,innerH).extend({top:pad,bottom:pad,left:pad,right:pad,background:'#00000000'}).png().toFile(`${root}/assets/${id}.png`);
 // Unmodified generation artifact is also available for the Knowledge audit.
 await fs.copyFile(source,`${root}/sources/${id}.png`);
 const pivot={x:Math.round(pad+innerW*px),y:Math.round(pad+innerH*py)},scale=heightM*37/(pivot.y-pad);
 assets.push({id,category,file:`assets/${id}.png`,source,sourceSize:[info.width,info.height],sourceCrop,size:[innerW+2*pad,innerH+2*pad],pivot,scale,widthWorld:(innerW+2*pad)*scale,heightM,footprintM,alpha:{clearPixels:clear,solidPixels:solid,visibleSourceTouchesEdge:false,cropAlphaThreshold:8},subject,pivotStatus:'Visual ground contact center; design reference, not collision geometry'});
}
const manifest={version:2,status:'asset-and-composition-review',generator:'Built-in image_gen, one independent call per sprite, transparent_background=true',camera:{projection:'2:1 dimetric',groundSlope:.5,tileMeters:3,halfWidth:64,halfHeight:32},lighting:'Soft upper-left daylight; slate blue shadows; ivory snow; weathered beige grey stone',heroReference:{heightM:1.8,heightWorld:66.6,verticalPixelsPerMeter:37},placement:'At ground (x,y): draw asset at (x-pivot.x*scale,y-pivot.y*scale), size asset.size*scale. Pivots refer to padded exports, not original images.',limitations:'Painted perspective and footprints are approximate. Future map integration needs collision, occlusion and walkability calibration. No game imports or preloads.',assets};
await fs.writeFile(`${root}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
const actualPrompts=JSON.parse(await fs.readFile(`${docs}/generation-prompts.json`));
const prompts={generator:manifest.generator,mode:'built-in',transparentBackground:true,reference:'Frozen Frontier v1 kit; Knowledge NKBD792cbcfd038e50c7842b69a9',note:'Exact built-in generation prompts are recorded per asset. Original artifacts are unchanged in assets-src and sources/.',common:'Use case: stylized-concept. Single reusable transparent game sprite. Orthographic 2:1 dimetric camera; ground axes slopes ±0.5. Realistic painterly textured 3D medieval game art matching Frozen Frontier ruins. Upper-left soft daylight, ivory snow, muted slate blue shadows, desaturated winter palette, grey beige weathered limestone and ochre lichen where applicable. Complete isolated silhouette with generous transparent margins and subtle contact shadow. No ground tile, backdrop, people, text or unrelated objects.',assets:assets.map(a=>({id:a.id,prompt:actualPrompts[a.id],subject:a.subject,heightM:a.heightM,footprintM:a.footprintM}))};
await fs.writeFile(`${root}/prompts.json`,JSON.stringify(prompts,null,2)+'\n');
await fs.copyFile(`${root}/prompts.json`,`${docs}/prompts.json`);
console.log(`Exported ${assets.length} transparent assets.`);
