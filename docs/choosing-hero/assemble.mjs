import fs from 'node:fs';
import sharp from 'sharp';
const root='public/choosing-hero/v1';
const manifest=JSON.parse(fs.readFileSync(`${root}/manifest.json`));
const lookup=Object.fromEntries(manifest.assets.map(a=>[a.name,a.file]));
const svg=(w,h,body)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const text=(w,h,lines)=>svg(w,h,`<defs><filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000"/></filter></defs>${lines.map(l=>`<text x="${l.x}" y="${l.y}" text-anchor="${l.anchor||'middle'}" fill="${l.color||'#fff0bd'}" font-family="Georgia, serif" font-size="${l.size}" ${l.tracking?`letter-spacing="${l.tracking}"`:''} filter="url(#shadow)">${esc(l.text)}</text>`).join('')}`);
fs.mkdirSync(`${root}/cards`,{recursive:true});
const heroes=[{id:'ember-warden',name:'Ember Warden',skill:'Flame Fan',desc:'Wield flame to strike nearby foes.',color:'#962509',icon:'skill-flame-fan'},{id:'rift-runner',name:'Rift Runner',skill:'Rift Bolt',desc:'Strike enemies with rift energy.',color:'#07516d',icon:'skill-rift-bolt'}];
for(const h of heroes){
 const bg=svg(320,400,`<defs><radialGradient id="g"><stop stop-color="${h.color}"/><stop offset="1" stop-color="#050607"/></radialGradient></defs><rect width="320" height="400" fill="url(#g)"/>`);
 const k=h.id==='ember-warden'?.88:1.12,rw=Math.round(440*k),rh=Math.round(660*k),left=Math.round((rw-320)/2+(h.id==='ember-warden'?8:0)),hero=await sharp(lookup[h.id]).resize(rw,rh,{fit:'fill'}).extract({left,top:0,width:320,height:400}).png().toBuffer();
 const shade=svg(320,400,'<defs><linearGradient id="s" x2="0" y2="1"><stop offset="0.62" stop-color="#000" stop-opacity="0"/><stop offset="0.9" stop-color="#000" stop-opacity="0.95"/></linearGradient></defs><rect width="320" height="400" fill="url(#s)"/>');
 const portrait=`${root}/cards/${h.id}-portrait.png`;
 await sharp(bg).composite([{input:hero},{input:shade},{input:svg(320,400,'<rect x="19" y="25" width="282" height="348" rx="10" fill="white"/>'),blend:'dest-in'}]).png().toFile(portrait);
 for(const selected of [false,true]){
 const layers=[{input:await sharp(lookup[selected?'card-frame-selected':'card-frame']).resize(320,400).png().toBuffer()}];
 if(selected)layers.push({input:await sharp(lookup['selected-badge']).resize(64,64).toBuffer(),left:24,top:264});
 layers.push({input:text(320,400,[{x:160,y:selected?327:345,size:25,text:h.name},...(selected?[{x:160,y:354,size:23,text:'Selected',color:'#ffdc64'}]:[])])});
 await sharp(portrait).composite(layers).png().toFile(`${root}/cards/${h.id}-${selected?'selected':'default'}.png`);
 }
}
const layouts=[];
for(const mobile of [false,true]) for(const h of heroes){
 const W=mobile?864:1672,H=mobile?1824:941,layers=[],elements=[];
 async function asset(name,x,y,w,ht){layers.push({input:await sharp(lookup[name]||`${root}/${name}`).resize(w,ht,{fit:'fill'}).png().toBuffer(),left:x,top:y});elements.push({asset:name,x,y,width:w,height:ht});}
 const bg=await sharp(lookup[mobile?'castle-mobile':'castle-desktop']).resize(W,H,{fit:'cover'}).png().toBuffer();
 if(mobile){
  // Top-aligned hero crop allows the lower figure to sit beneath the card row.
  const hi=await sharp(lookup[h.id]).resize(864,1296,{fit:'fill'}).extract({left:0,top:0,width:864,height:1080}).png().toBuffer();layers.push({input:hi,left:0,top:174});elements.push({asset:h.id,x:0,y:174,width:864,height:1080,crop:'top 1080px of 864x1296'});
  await asset('back',20,20,80,80);await asset('compass-crest',386,4,92,92);await asset('divider',78,155,708,46);
  for(let i=0;i<heroes.length;i++) await asset(`cards/${heroes[i].id}-${heroes[i].id===h.id?'selected':'default'}.png`,100+i*340,866,324,405);
  const compact=false;
  await asset('panel-mobile',24,1255,816,compact?350:425);
  await asset('button-default',24,compact?1605:1660,816,164);
  const labels=[{x:432,y:72,size:52,text:'ARKODIA',tracking:10},{x:432,y:145,size:48,text:'CHOOSE YOUR HERO'}, {x:432,y:compact?1324:1320,size:42,text:compact?'LOADOUT':h.name.toUpperCase()}];
  if(!compact){labels.push({x:432,y:1372,size:25,text:h.desc},{x:432,y:1408,size:29,text:'LOADOUT'});await asset('divider',140,1328,584,42);}
  const iy=compact?1350:1420;const iconSize=compact?150:136;
  for(let i=0;i<3;i++){await asset(i===0?h.icon:'skill-empty',150+i*208+(150-iconSize)/2,iy,iconSize,iconSize);labels.push({x:225+i*208,y:iy+(compact?174:158),size:26,text:i===0?h.skill:'Empty'});}
  labels.push({x:225,y:iy+(compact?203:185),size:24,text:'Lv. 1',color:'#ffda65'});
  if(!compact)labels.push({x:432,y:1634,size:18,text:'Skills cast automatically when enemies enter range.'});
  labels.push({x:432,y:compact?1707:1762,size:44,text:'BEGIN JOURNEY'});
  layers.push({input:text(W,H,labels)});
 }else{
  const hi=await sharp(lookup[h.id]).resize(800,1200,{fit:'fill'}).extract({left:0,top:0,width:800,height:800}).png().toBuffer();layers.push({input:hi,left:346,top:141});elements.push({asset:h.id,x:346,y:141,width:800,height:800,crop:'top 800px of 800x1200'});
  await asset('back',42,92,56,56);await asset('compass-crest',152,7,66,66);await asset('divider',420,68,820,55);
  for(let i=0;i<heroes.length;i++)await asset(`cards/${heroes[i].id}-${heroes[i].id===h.id?'selected':'default'}.png`,60,158+i*350,270,338);
  await asset('panel-desktop',1155,130,485,660);await asset('button-default',1155,744,485,97);await asset('divider',1200,256,395,28);
  const labels=[{x:180,y:61,size:42,text:'ARKODIA',tracking:7},{x:110,y:129,size:24,text:'Back',anchor:'start'},{x:830,y:73,size:57,text:'CHOOSE YOUR HERO'},{x:830,y:122,size:28,text:'Choose a hero to begin your journey.'},{x:1398,y:239,size:42,text:h.name.toUpperCase()},{x:1398,y:310,size:23,text:h.desc},{x:1205,y:394,size:26,text:'LOADOUT',anchor:'start'}];
  await asset('divider',1330,375,260,30);
  for(let i=0;i<3;i++){await asset(i===0?h.icon:'skill-empty',1194+i*139,427,126,126);labels.push({x:1257+i*139,y:580,size:23,text:i===0?h.skill:'Empty'});}
  labels.push({x:1257,y:609,size:22,text:'Lv. 1',color:'#ffdc65'},{x:1398,y:650,size:18,text:'Skills cast automatically when enemies'},{x:1398,y:677,size:18,text:'enter range. Gain new skills through'},{x:1398,y:704,size:18,text:'random level-up blessings.'},{x:1398,y:804,size:35,text:'BEGIN JOURNEY'});
  layers.push({input:text(W,H,labels)});
 }
 const file=`${root}/previews/${h.id}-${mobile?'mobile':'desktop'}.png`;
 await sharp(bg).composite(layers).png().toFile(file);layouts.push({hero:h.id,device:mobile?'mobile':'desktop',width:W,height:H,file,elements});
}
fs.writeFileSync(`${root}/layouts.json`,JSON.stringify(layouts,null,2)+'\n');
console.log('Created 6 reusable card files and 4 assembled previews.');
