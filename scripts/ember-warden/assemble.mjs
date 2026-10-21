import fs from 'node:fs/promises';import sharp from 'sharp';import {createHash} from 'node:crypto';
const root='public/ember-warden/v1',out='docs/ember-warden',hash=b=>createHash('sha256').update(b).digest('hex');
const entries=(await fs.readdir(root+'/metadata')).filter(f=>f.endsWith('.json')).sort();let clips=[];const sources=new Set;for(const f of entries){const m=JSON.parse(await fs.readFile(root+'/metadata/'+f));sources.add(m.sourceHash);clips.push(...m.clips)}
const revisions=JSON.parse(await fs.readFile(out+'/source-revisions.json'));if([...sources].some(h=>!revisions.accepted.includes(h)))throw Error('Unknown render source revision');
const dirs=['N','NE','E','SE','S','SW','W','NW'],actions=['idle','run','flame-fan','flame-fan-moving','cinder-step','ember-snare','furnace-heart','hurt','death'];for(const a of actions)for(const d of dirs)if(clips.filter(c=>c.action===a&&c.direction===d).length!==1)throw Error('Missing/duplicate '+a+' '+d);
await fs.mkdir(root+'/vfx',{recursive:true});const svg=(content)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="384" height="384">${content}</svg>`);
const flame=(x,y,scale,phase)=>`<path d="M ${x} ${y} q ${-7*scale} ${-8*scale} ${-2*scale} ${-20*scale} q ${4*scale} ${9*scale} ${9*scale} ${-14*scale} q ${10*scale} ${25*scale} ${-7*scale} ${34*scale}" fill="${phase%2?'#ffab27':'#ff6b17'}" opacity=".8"/><ellipse cx="${x+2*scale}" cy="${y-6*scale}" rx="${3*scale}" ry="${7*scale}" fill="#fff3ac"/>`;
const vfx=[];
for(const action of ['flame-fan','flame-fan-moving','cinder-step','ember-snare','furnace-heart'])for(let group=0;group<4;group++){
 const selected=dirs.slice(group*2,group*2+2).map(d=>clips.find(c=>c.action===action&&c.direction===d)),count=selected[0].frames.length,cols=6,rows=Math.ceil(count/cols);let composites=[];
 for(let di=0;di<selected.length;di++){
  const body=selected[di],yaw={N:-90,NE:-45,E:0,SE:45,S:90,SW:135,W:180,NW:225}[body.direction],r=yaw*Math.PI/180;
  const frames=[];
  for(let f=0;f<count;f++){
   const active=action==='flame-fan-moving'?1:action==='flame-fan'?(f>=5&&f<=8?Math.min(1,(f-4)/2,(9-f)/2):0):action==='cinder-step'?(f>=5&&f<=8?Math.sin((f-4)/5*Math.PI):0):action==='ember-snare'?(f>=5?Math.min(1,(f-4)/2,(count-1-f)/2):0):f>=5?Math.min(1,(f-4)/2,(count-1-f)/2):0;
   const socket=body.frames[f].muzzle.map(n=>n+64),ground=[192,243.2];let shapes='';
   if(active>0){
    if(action.startsWith('flame-fan')){
     // Origin follows the actual anatomical right wrist, never the opposite arm.
     let tongues='';for(let j=0;j<13;j++){const spread=-.52+j*.087,len=63+18*Math.sin(j*4.7+f*Math.PI*6/count),tipx=len*Math.cos(spread),tipy=len*Math.sin(spread)*.65; tongues+=`<path d="M 0 0 Q ${tipx*.55} ${tipy-8} ${tipx} ${tipy} Q ${tipx*.62} ${tipy+8} 0 0" fill="${j%3===0?'#fff0a0':j%3===1?'#ffad28':'#fb521a'}" opacity=".72"/>`}
     shapes=`<g transform="translate(${socket}) rotate(${yaw})" opacity="${active}">${tongues}<ellipse cx="9" cy="0" rx="13" ry="5" fill="#fff4b9"/></g>`;
    }else if(action==='cinder-step'){
     for(let j=0;j<9;j++){const dist=12+j*9,x=ground[0]-Math.cos(r)*dist,y=ground[1]-Math.sin(r)*dist*.65;shapes+=`<g opacity="${active*(1-j/12)}">${flame(x,y,.35+j*.025,f+j)}</g>`}
    }else if(action==='ember-snare'){
     const [x,y]=ground;shapes=`<g opacity="${active}"><ellipse cx="${x}" cy="${y}" rx="48" ry="19" fill="#ef5e12" fill-opacity=".12" stroke="#ffae37" stroke-width="2"/><ellipse cx="${x}" cy="${y}" rx="34" ry="13" fill="none" stroke="#feca69"/><path d="M ${x-35} ${y} L ${x+20} ${y-12} L ${x+20} ${y+12} Z" fill="none" stroke="#ffb83c"/>`;
     if(f>=7)for(let j=0;j<9;j++)shapes+=flame(x-36+j*9,y-3+Math.sin(j*3)*6,(f===8?1.2:.65)*(1+Math.sin(j*2+f)*.2),f+j);shapes+='</g>';
    }else{
     const [x,y]=ground;shapes=`<g opacity="${active*.75}"><ellipse cx="${x}" cy="${y}" rx="41" ry="17" fill="#ff8617" fill-opacity=".12" stroke="#ffc56b" stroke-width="2"/>`;
     for(let j=0;j<12;j++){const a=j*Math.PI/6+f*.15;shapes+=flame(x+Math.cos(a)*36,y-10-Math.sin(a)*13-((j+f)%4)*12,.32,f+j)}shapes+='</g>';
    }
   }
   const bytes=await sharp(svg(shapes)).png().toBuffer();const raw=await sharp(bytes).raw().toBuffer();let bounds=[384,384,0,0];for(let ay=0;ay<384;ay++)for(let ax=0;ax<384;ax++)if(raw[(ay*384+ax)*4+3]){bounds[0]=Math.min(bounds[0],ax);bounds[1]=Math.min(bounds[1],ay);bounds[2]=Math.max(bounds[2],ax+1);bounds[3]=Math.max(bounds[3],ay+1)}if(bounds[2]===0)bounds=[0,0,1,1];if(active>0&&Math.min(bounds[0],bounds[1],384-bounds[2],384-bounds[3])<2)throw Error('VFX clipped '+body.id+' '+f);const x=(f%cols)*384,y=(di*rows+Math.floor(f/cols))*384;composites.push({input:bytes,left:x,top:y});frames.push({rect:[x,y,384,384],origin:[192,243.2],alphaBounds:bounds,gauntlet:socket,active:active>0});
  }
  vfx.push({id:body.id,action,direction:body.direction,image:`vfx/${action}-${group}.png`,frames,fps:body.fps,loop:body.loop,holdLastFrame:false,drawOrder:['N','NE','NW'].includes(body.direction)?'behind-body':'in-front-of-body'});
 }
 await sharp({create:{width:384*cols,height:384*rows*2,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(composites).png().toFile(`${root}/vfx/${action}-${group}.png`);
}
const resources={};for(const dir of ['sheets','vfx','source'])for(const f of await fs.readdir(root+'/'+dir)){const p=dir+'/'+f;resources[p]=hash(await fs.readFile(root+'/'+p))}
for(const c of [...clips,...vfx])c.image+='?v='+resources[c.image].slice(0,12);
const manifest={version:1,status:'candidate-not-final-art',sourceHash:revisions.accepted.at(-1),sourceRevisions:[...sources],cell:[256,256],pivot:[128,179.2],directions:dirs,actions,skills:[{name:'Flame Fan',id:'flame-fan',role:'Automatic continuous forward fire; moving body variant supplied.'},{name:'Cinder Step',id:'cinder-step',role:'Short fire dash leaving an ember trail; proposed mechanic.'},{name:'Ember Snare',id:'ember-snare',role:'Place a slowing seal that subsequently erupts; proposed mechanic.'},{name:'Furnace Heart',id:'furnace-heart',role:'Temporary empowered flame stance; proposed mechanic.'}],clips,vfx,resources,notes:['All body positions use the same orthographic scene and anatomical right gauntlet.','Flame Fan sustain is frames 5–7; restart/cancel/recovery requires an eventual gameplay animator.','Moving attack is a distinct locomotion loop; preview uses short blends for entry/exit, not a fifth skill.','Death is one-shot hold-last-frame. Optional co-op downed state would require a separate revive policy and clip.','VFX are deterministic vector-authored effects rasterized to transparent sheets; flame tongues remain stylized.','No numerical balance or gameplay integration.']};
await fs.writeFile(root+'/manifest.json',JSON.stringify(manifest,null,2));
const audit={sourceHash:manifest.sourceHash,bodyClips:clips.length,bodyFrames:clips.reduce((n,c)=>n+c.frames.length,0),vfxClips:vfx.length,alpha:[],endpoints:[],contacts:[],limitations:['Controlled 3D appearance differs from painterly approved concept; no final art acceptance.','Hair, face, cloth and shoulder shapes remain simplified.','Cross-fade transitions are review approximations; physical collisions and gameplay integration are outside scope.']};
for(const p of Object.keys(resources).filter(p=>p.startsWith('sheets/'))){const im=sharp(await fs.readFile(root+'/'+p)),m=await im.metadata();if(!m.hasAlpha)throw Error('No alpha '+p);const related=clips.filter(c=>c.image.split('?')[0]===p);for(const c of related){let first,last;for(let i=0;i<c.frames.length;i++){const f=c.frames[i],b=f.alphaBounds,edge=Math.min(b[0],b[1],256-b[2],256-b[3]);if(edge<3)throw Error('Clipping '+c.id+' '+i);const raw=await sharp(await fs.readFile(root+'/'+p)).extract({left:f.rect[0],top:f.rect[1],width:256,height:256}).raw().toBuffer();if(i===0)first=hash(raw);if(i===c.frames.length-1)last=hash(raw)}if(!c.loop&&c.action!=='death')audit.endpoints.push({clip:c.id,pixelIdentical:first===last});
 }audit.alpha.push({image:p,hasAlpha:true,frames:related.reduce((n,c)=>n+c.frames.length,0),transparentCellMargin:true})}
// Verify actual source foot positions with root travel applied during stance.
for(const c of clips.filter(c=>['run','flame-fan-moving'].includes(c.action))){const a={N:Math.PI,NE:3*Math.PI/4,E:Math.PI/2,SE:Math.PI/4,S:0,SW:-Math.PI/4,W:-Math.PI/2,NW:-3*Math.PI/4}[c.direction];let error=0;for(const n of ['Left','Right']){let prev;for(let i=0;i<c.frames.length;i++){const f=c.frames[i],phase=(f.time+(n==='Right'?.5:0))%1,foot=f.worldFeet[n],world=[foot[0]+Math.sin(a)*1.1458333333*f.time*.8,foot[1]-Math.cos(a)*1.1458333333*f.time*.8];if(phase<.6&&prev&&prev.phase<phase)error=Math.max(error,Math.hypot(world[0]-prev.world[0],world[1]-prev.world[1]));prev=phase<.6?{phase,world}:null}}audit.contacts.push({clip:c.id,maxPlantedDisplacement:error,pass:error<1e-5})}
if(audit.endpoints.some(x=>!x.pixelIdentical)||audit.contacts.some(x=>!x.pass))throw Error('Motion audit failed');
await fs.writeFile(out+'/pixel-and-contact-audit.json',JSON.stringify(audit,null,2));console.log(JSON.stringify({clips:audit.bodyClips,frames:audit.bodyFrames,vfxClips:vfx.length,sourceHash:manifest.sourceHash}));
