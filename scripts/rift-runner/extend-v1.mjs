import fs from 'node:fs';
const base='public/rift-runner/v1',root='public/rift-runner/v3',m=JSON.parse(fs.readFileSync(base+'/manifest.json'));
const painted=JSON.parse(fs.readFileSync(root+'/manifest.json')),run=JSON.parse(fs.readFileSync(root+'/run-proof-manifest.json')),idle=JSON.parse(fs.readFileSync(root+'/idle-corrections-manifest.json'));
const replacementIds=new Set([...painted.clips,...run.clips,...idle.clips].map(c=>c.id));
if(run.clips.length!==8||run.clips.some(c=>c.frames.length!==8))throw Error('Incomplete run replacement');
m.clips=m.clips.filter(c=>!replacementIds.has(c.id));
for(const [manifest,kind] of [[painted,'painted'],[run,'painted-run'],[idle,'painted-idle']]) {
 for(const sheet of manifest.sheets){
  const name=kind+'-'+sheet.image.split('/').at(-1).replace('.png',''),cell=sheet.cell[0];
  m.sheets=m.sheets.filter(s=>s.name!==name);
  m.sheets.push({name,file:sheet.image.startsWith('../')?sheet.image:'../v3/'+sheet.image,cell,layer:'body'});
  for(const c of sheet.clips)m.clips.push({...c,sheet:name,cellSize:cell,source:'painted-v3',pivot:cell===352?[176,240]:[160,224],frames:c.frames.map(f=>f.cell)});
 }
}
const used=new Set(m.clips.map(c=>c.sheet));m.sheets=m.sheets.filter(s=>used.has(s.name));
m.cell=[352,352];m.bodyPivot=[176,240];m.frameCount=m.clips.reduce((n,c)=>n+c.frames.length,0);m.status='painted-run-replacement-pending-whole-set-acceptance';
fs.writeFileSync(base+'/manifest.json',JSON.stringify(m,null,2));console.log({clips:m.clips.length,frames:m.frameCount,sheets:m.sheets.length});
