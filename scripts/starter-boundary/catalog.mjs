import fs from 'node:fs/promises';import {createServer} from 'vite';
const vite=await createServer({configFile:false,server:{middlewareMode:true},logLevel:'error'});
try{
 const {starterEnclosure,palisadeColumns,STARTER_BOUNDARY_ART,STARTER_COMPONENTS}=await vite.ssrLoadModule('/src/stronghold/starter-enclosure.ts');
 const p='src/environment/catalog.json',catalog=JSON.parse(await fs.readFile(p,'utf8')),stronghold=catalog.assets.find(a=>a.id==='stronghold');
 stronghold.components=stronghold.components.filter(p=>!p.file.includes('/starter-stronghold/snowy-')&&!p.file.includes('/starter-boundary/straight-'));
 for(const p of stronghold.components)if(p.file.includes('full-gateway-v7-closed')){p.file=STARTER_BOUNDARY_ART+'gate-closed.png';p.width=270;}
 const walls=starterEnclosure([]).filter(p=>p.file.startsWith(STARTER_BOUNDARY_ART));
 stronghold.components.push(...walls.map(p=>({file:p.file,width:p.width,foot:p.foot,dx:p.x-577,dy:p.y-320,shear:p.shear,vertical:p.vertical})));
 const manifest=JSON.parse(await fs.readFile('public/buildings/starter-boundary/manifest.json','utf8'));
 catalog.assets=catalog.assets.filter(a=>!a.id.startsWith('starter-boundary:'));
 for(const a of manifest.assets){
  const c=STARTER_COMPONENTS[a.name],width=c?a.width*.75:a.width*.45,foot=c?(c.contacts[0][1]+c.contacts[1][1])/2/a.height:.9;
  const slope=a.name.includes('-ne')?-.5:.5,shear=c?slope-.75*(c.contacts[1][1]-c.contacts[0][1])/(c.contacts[1][0]-c.contacts[0][0]):0;
  const file=STARTER_BOUNDARY_ART+a.file;
  catalog.assets.push({id:'starter-boundary:'+a.name,label:'Starter '+a.name.replaceAll('-',' '),file,width,height:a.height*width/a.width,pivot:[.5,foot],blocks:a.name==='debris'||a.name==='threshold'||c?[]:[[-.4,-.3,.4,.3]],layer:a.name==='debris'||a.name==='threshold'?'ground':'world',footprint:c?3.5:1,columns:c?palisadeColumns({id:'rampart-'+(a.name.includes('-ne')?'ne':'se'),file,x:0,y:0,width,shear,vertical:.75}):[],...(c?{components:[{file,width,foot,dx:0,dy:0,shear,vertical:.75}]}:{})});
 }
 for(const open of [false,true]){const file=STARTER_BOUNDARY_ART+'gate-'+(open?'open':'closed')+'.png';catalog.assets.push({id:'starter-boundary:gate-'+(open?'open':'closed'),label:'Starter gate '+(open?'open':'closed'),file,width:270,height:135,pivot:[.5,.97],blocks:open?[[-1.2,-.2,-.55,.2],[.55,-.2,1.2,.2]]:[[-1.2,-.2,1.2,.2]],layer:'world',footprint:2.4});}
 const nav=JSON.parse(await fs.readFile('public/coop/nav.json'));stronghold.columns=nav.columns.map(c=>({...c,x:c.x-577,back:c.back-320,front:c.front-320}));
 const prefab=JSON.parse(await fs.readFile('src/stronghold/prefabs/stronghold.json')),g=prefab.gate;
 for(const side of [-1,1])for(let d=g.archHalfWidth;d<=g.towerHalfSpan;d+=g.columnStep){const f=g.towerFront,front=d<f.knee?f.base+(d-g.archHalfWidth)*f.rise:f.peak-(d-f.knee)*f.fall;stronghold.columns.push({x:g.x+side*d-577,w:g.columnStep,back:front-g.towerDepth-320,front:front-320});}for(let d=-g.doors.halfWidth;d<=g.doors.halfWidth;d+=g.columnStep)stronghold.columns.push({x:g.x+d-577,w:g.columnStep,back:g.doors.back-320,front:g.doors.front-320});
 await fs.writeFile(p,JSON.stringify(catalog,null,2)+'\n');
 await fs.copyFile(p,'server/internal/environment/catalog.json');
 console.log('Editor:',walls.length,'registered walls and',manifest.assets.length,'starter palette components');
}finally{await vite.close();}
