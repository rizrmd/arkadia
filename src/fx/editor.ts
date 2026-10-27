import {SpritesheetImporter} from './spritesheet-importer';
import {Container,Graphics,Text} from 'pixi.js';
import {resolveCue,cueKeys} from './cues';
import {RUNTIME_VISUALS,emptyVisuals,refreshAppliedVisuals,setVisualPreview,isolateVisualLayer,setVisualPhaseLayers,prepareVisualTextures,type VisualPatch,type VisualDocument} from './visuals';
import type {HeroId} from '../stronghold/heroes';

type Button=(parent:Container,text:string,x:number,y:number,w:number,action:()=>void,active?:boolean,label?:string)=>unknown;
type Layer={effect:string;id:string;name:string;phase:string;fields:(keyof VisualPatch)[]};
const FIELDS:{key:keyof VisualPatch;label:string;min?:number;max?:number;step?:number}[]=[
 {key:'color',label:'Tint · hex color'},{key:'opacity',label:'Opacity',min:0,max:1,step:.1},{key:'size',label:'Visual size × (not damage area)',min:.02,max:8,step:.1},
 {key:'count',label:'Particle count ×',min:0,max:4,step:.25},{key:'rate',label:'Emission rate ×',min:0,max:4,step:.25},{key:'lifetime',label:'Lifetime ×',min:.05,max:8,step:.1},{key:'speed',label:'Particle speed ×',min:0,max:8,step:.1},
 {key:'direction',label:'Visual direction °',min:-180,max:180,step:10},{key:'spread',label:'Visual spread °',min:0,max:360,step:10},{key:'gravity',label:'Gravity',min:-20,max:20,step:.5},
 {key:'x',label:'Emitter X · tiles',min:-10,max:10,step:.1},{key:'y',label:'Emitter height · tiles',min:-10,max:10,step:.1},{key:'z',label:'Emitter Z · tiles',min:-10,max:10,step:.1},
 {key:'delay',label:'Layer start · seconds',min:0,max:10,step:.05},{key:'duration',label:'Emission duration · seconds',min:.01,max:10,step:.1},
 {key:'texture',label:'Texture / flipbook path'},{key:'blend',label:'Blend mode'},{key:'columns',label:'Flipbook columns',min:1,max:16,step:1},{key:'rows',label:'Flipbook rows',min:1,max:16,step:1},{key:'fps',label:'Flipbook FPS',min:1,max:120,step:1}
];
const ALL=FIELDS.map(f=>f.key),DRAFT='arkodia.fx-editor.draft.v1';
const fallback=(key:keyof VisualPatch)=>['opacity','size','count','rate','lifetime','speed','columns','rows'].includes(key)?1:key==='fps'?30:key==='duration'?1:key==='color'||key==='texture'?'':key==='blend'?'alpha':0;
export class FxEditor {
 open=false;seeking=false;private seekTicket=0;phase='all';speed=1;timeline=0;duration=5;solo=false;scroll=0;notice='Loading visual settings…';busy=false;
 private draft=emptyVisuals();private saved=emptyVisuals();private applied=emptyVisuals();private undo:VisualDocument[]=[];private redo:VisualDocument[]=[];
 private previewError=false;private storageFailure=false;private active=0;private access='';private input?:{key:string;value:string;replace:boolean};private layers:Layer[]=[];private rect={x:0,y:0,w:0,h:0};private phaseFilter:string[]|null=null;
 importer=new SpritesheetImporter({redraw:()=>this.o.redraw(),access:()=>this.access,use:a=>{if(!this.current||this.busy)return;this.undo.push(structuredClone(this.draft));this.redo=[];const {effect,id}=this.current;this.draft.effects[effect]??={};this.draft.effects[effect][id]={...this.patch(),texture:a.texture,columns:a.columns,rows:a.rows,fps:a.fps,frameCount:a.frameCount,pivotX:a.pivotX,pivotY:a.pivotY,loop:a.loop};this.persist();setVisualPreview(this.draft);void this.updatePreview();}});
 constructor(private o:{hero:()=>HeroId;skill:()=>string|undefined;catalog:()=>Record<string,any>;redraw:()=>void;replay:()=>Promise<void>;seek:(time:number)=>Promise<void>;prepare:()=>Promise<void>;rank:()=>number;setRank:(value:number)=>void;paused:()=>boolean;pause:()=>void}){}
 get editing(){return !!this.input||this.importer.open;}
 get dirty(){return JSON.stringify(this.draft.effects)!==JSON.stringify(this.saved.effects);}
 get pendingApply(){return JSON.stringify(this.saved.effects)!==JSON.stringify(this.applied.effects);}
 get current(){return this.layers[this.active];}
 get phaseKeys(){return this.phaseFilter;}
 snapshot(){return {seeking:this.seeking,open:this.open,importer:this.importer.snapshot(),phase:this.phase,speed:this.speed,timeline:this.timeline,solo:this.solo,dirty:this.dirty,pendingApply:this.pendingApply,busy:this.busy,notice:this.notice,editing:this.input?.key??null,revision:this.saved.revision,appliedRevision:this.applied.revision,layers:this.layers,current:this.current,patch:this.patch(),draft:this.draft,undo:this.undo.length,redo:this.redo.length};}
 async load(){
  await this.importer.restore();
  try{const state=await refreshAppliedVisuals();this.saved=state.saved;this.applied=state.applied;this.draft=structuredClone(state.saved);const raw=localStorage.getItem(DRAFT);if(raw){const d=JSON.parse(raw);if(d.version!==1||!d.effects)throw Error('Invalid local draft retained; use Reset saved to recover.');this.draft=d;}
   setVisualPreview(this.draft);this.notice=this.dirty?'Local draft restored':'Visual settings loaded';
  }catch(e){this.notice='Settings could not load. Local draft retained. '+String(e);const raw=localStorage.getItem(DRAFT);if(raw)try{this.draft=JSON.parse(raw);setVisualPreview(this.draft);}catch{}}
  this.select();this.o.redraw();
 }
 select(){
  const hero=this.o.hero(),skill=this.o.skill(),catalog=this.o.catalog();this.layers=[];
  for(const key of cueKeys(hero)){if(skill&&key!==skill&&!key.startsWith(skill+'.'))continue;if(!skill)continue;if(skill==='flame-fan'&&key.endsWith('.detonate')||skill==='rift-dash'&&key.startsWith('rift-dash.'))continue;const cue=resolveCue(hero,key)?.cue;
   for(const l of cue?.layers??[]){const fx=catalog[l.effect];if(!fx)continue;fx.emitters?.forEach((e:any,index:number)=>this.layers.push({effect:l.effect,id:String(index),name:e.name??`Emitter ${index+1}`,phase:key.startsWith('hit.')?'impact':key==='attack.swing'?'cast':key.startsWith('combo.')?'aura':key.includes('.')?key.split('.').slice(1).join('.'):'aura',fields:ALL}));}
  }
  const runtime=skill==='flame-fan'?'runtime/flame-fan':skill==='rift-dash'?'runtime/rift-dash':undefined;
  if(runtime){const def=RUNTIME_VISUALS[runtime];for(const l of def.layers)this.layers.push({effect:runtime,id:l.id,name:l.name,phase:l.phase??def.phase,fields:l.fields});}
  const unique=new Map(this.layers.map(l=>[l.effect+':'+l.id,l]));this.layers=[...unique.values()];this.active=Math.min(this.active,Math.max(0,this.layers.length-1));this.scroll=0;
  if(this.phase!=='all'&&!this.phases().includes(this.phase))this.phase='all';this.filters();
 }
 phases(){return [...new Set(this.layers.map(l=>l.phase))];}
 private patch():VisualPatch{return this.current?this.draft.effects[this.current.effect]?.[this.current.id]??{}:{};}
 private persist(){try{localStorage.setItem(DRAFT,JSON.stringify(this.draft));this.storageFailure=false;return true;}catch{this.storageFailure=true;this.notice='Draft could not be stored. Free browser storage before reloading.';return false;}}
 private mutate(key:keyof VisualPatch,value:unknown){if(!this.current||this.busy)return;this.undo.push(structuredClone(this.draft));if(this.undo.length>40)this.undo.shift();this.redo=[];
  const {effect,id}=this.current;this.draft.effects[effect]??={};this.draft.effects[effect][id]??={};if(value==='')delete this.draft.effects[effect][id][key];else (this.draft.effects[effect][id] as any)[key]=value;
  this.persist();setVisualPreview(this.draft);this.notice='Draft changed · not applied to game';this.o.redraw();void this.updatePreview();
 }
 private async updatePreview(){this.busy=true;this.notice='Preparing updated visuals…';this.o.redraw();try{await prepareVisualTextures();await this.o.prepare();await this.o.replay();this.previewError=false;this.notice=this.storageFailure?'Draft not stored: browser storage is full. Save before leaving.':this.dirty?'Draft preview · not applied to game':'Preview matches saved visuals';}catch(e){this.previewError=true;this.notice='Preview failed: '+String(e);}finally{this.busy=false;this.o.redraw();}}
 private history(redo=false){const from=redo?this.redo:this.undo,to=redo?this.undo:this.redo;if(!from.length||this.busy)return;to.push(structuredClone(this.draft));this.draft=from.pop()!;this.draft.revision=this.saved.revision;this.persist();setVisualPreview(this.draft);void this.updatePreview();}
 private filters(){const phase=this.phase==='all'?null:new Set(this.layers.filter(l=>l.phase===this.phase).map(l=>l.effect));this.phaseFilter=phase?[...phase]:null;setVisualPhaseLayers(this.phase==='all'?null:this.layers.filter(l=>l.phase===this.phase).map(l=>l.effect+':'+l.id));
  const l=this.current;isolateVisualLayer(this.solo&&l?l.effect:undefined,this.solo&&l?l.id:'*');
 }
 private async cyclePhase(){if(this.busy||this.seeking)return;const choices=['all',...this.phases()],i=choices.indexOf(this.phase);this.phase=choices[(i+1)%choices.length];if(this.phase!=='all'){const first=this.layers.findIndex(l=>l.phase===this.phase);if(first>=0)this.active=first;}this.scroll=0;this.filters();this.o.redraw();await this.o.replay();}
 private layer(delta:number){if(this.busy||this.seeking)return;const filtered=this.layers.filter(l=>this.phase==='all'||l.phase===this.phase);if(!filtered.length)return;const current=filtered.indexOf(this.current),l=filtered[(current+delta+filtered.length)%filtered.length];this.active=this.layers.indexOf(l);this.scroll=0;this.filters();this.o.redraw();if(this.solo)void this.o.replay();}
 async save(apply=false){if(this.busy||this.seeking){this.notice='Preparing preview. Wait before Save / Apply.';this.o.redraw();return;}if(this.previewError){this.notice='Fix the preview error before Save / Apply.';this.o.redraw();return;}if(this.dirty&&this.draft.revision!==this.saved.revision){this.notice='Conflict: local draft uses an older saved revision. Reset saved to load current visuals.';this.o.redraw();return;}if(!this.access){this.notice='Enter editor access key before Save / Apply.';this.input={key:'access',value:'',replace:true};this.o.redraw();return;}if(apply&&this.dirty){this.notice='Save draft before Apply to Game.';this.o.redraw();return;}
  this.busy=true;this.notice=apply?'Applying saved visuals to game…':'Saving visual definition…';this.o.redraw();
  try{const body=structuredClone(this.draft);body.revision=this.saved.revision;const r=await fetch('/api/vfx/'+(apply?'apply':'save'),{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+this.access},body:JSON.stringify(body)});if(!r.ok)throw Error((await r.text()).trim());const state=await r.json();this.saved=state.saved;this.applied=state.applied;this.draft.revision=this.saved.revision;this.persist();setVisualPreview(this.draft);
   if(apply){await refreshAppliedVisuals();const channel=new BroadcastChannel('arkodia.vfx.visuals');channel.postMessage('applied');channel.close();}
   this.notice=apply?`Applied to Game · revision ${this.applied.revision}`:`Saved · revision ${this.saved.revision} · not applied`;
  }catch(e){this.notice=(apply?'Apply failed: ':'Save failed: ')+String(e);}finally{this.busy=false;this.o.redraw();}
 }
 private async reset(){if(this.busy||this.seeking)return;this.busy=true;this.notice='Loading saved visual definition…';this.o.redraw();try{const state=await refreshAppliedVisuals();this.saved=state.saved;this.applied=state.applied;this.undo.push(structuredClone(this.draft));if(this.undo.length>40)this.undo.shift();this.redo=[];this.draft=structuredClone(this.saved);this.persist();setVisualPreview(this.draft);this.busy=false;await this.updatePreview();}catch(e){this.busy=false;this.notice='Reset failed; draft retained: '+String(e);this.o.redraw();}}
 private edit(key:string,value:unknown){this.input={key,value:String(value??''),replace:true};this.o.redraw();}
 private commit(){if(!this.input)return;const {key,value}=this.input;
  if(key==='access'){this.access=value.trim();this.input=undefined;this.notice='Access key set for this tab';this.o.redraw();return;}
  const def=FIELDS.find(f=>f.key===key)!;let parsed:unknown=value;
  if(def.min!==undefined){const n=Number(value);if(!Number.isFinite(n)||n<def.min||n>def.max!){this.notice=`Enter ${def.min} to ${def.max}`;this.o.redraw();return;}if(['columns','rows'].includes(key)&&!Number.isInteger(n)){this.notice='Enter a whole number for the flipbook grid';this.o.redraw();return;}parsed=n;}
  if(key==='color'&&value&&!/^#[0-9a-f]{6}$/i.test(value)){this.notice='Use a six-digit hex color, e.g. #ff8800';this.o.redraw();return;}
  if(key==='texture'&&value&&!/^\/?[a-z0-9_./-]+\.(png|webp)$/i.test(value)){this.notice='Use an existing local PNG/WebP asset path';this.o.redraw();return;}
  this.input=undefined;this.mutate(key as keyof VisualPatch,parsed);
 }
 key(e:KeyboardEvent){if(this.importer.key(e))return true;if(this.input){e.preventDefault();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='v'){void navigator.clipboard.readText().then(t=>{if(this.input){this.input.value=t;this.input.replace=false;this.o.redraw();}}).catch(()=>{this.notice='Paste denied. Type the value or use the on-screen keys.';this.o.redraw();});return true;}
   if(e.key==='Enter')this.commit();else if(e.key==='Escape'){this.input=undefined;this.o.redraw();}else if(e.key==='Backspace'){this.input.value=this.input.replace?'':this.input.value.slice(0,-1);this.input.replace=false;this.o.redraw();}else if(e.key.length===1){this.input.value=(this.input.replace?'':this.input.value)+e.key;this.input.replace=false;this.o.redraw();}return true;}
  if(this.open&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();this.history(e.shiftKey);return true;}if(this.open&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();void this.save();return true;}return false;
 }
 wheel(x:number,y:number,delta:number){if(this.importer.open){this.importer.wheel(delta);return true;}if(!this.open||x<this.rect.x||y<this.rect.y||this.input)return false;this.scroll=Math.max(0,Math.min(this.maxScroll, this.scroll+delta));this.o.redraw();return true;}
 private maxScroll=0;private timelineLabel?:Text;private timelineTrack?:{g:Graphics;x:number;y:number;w:number};
 tick(age:number){this.importer.tick(1/60);this.timeline=Math.min(this.duration,age);if(this.timelineLabel&&!this.timelineLabel.destroyed)this.timelineLabel.text=`Timeline ${this.timeline.toFixed(2)} / ${this.duration.toFixed(2)} s`;const t=this.timelineTrack;if(t&&!t.g.destroyed)t.g.clear().rect(t.x,t.y,t.w*this.timeline/this.duration,3).fill(0x83d8bc);}
 scrub(fraction:number){const ticket=++this.seekTicket;this.seeking=true;this.notice='Scrubbing preview…';this.timeline=Math.max(0,Math.min(this.duration,fraction*this.duration));void this.o.seek(this.timeline).catch(e=>{this.notice='Scrub failed: '+String(e);}).finally(()=>{if(ticket===this.seekTicket){this.seeking=false;this.notice=`Paused at ${this.timeline.toFixed(2)} s`;this.o.redraw();}});}
 canScroll(x:number,y:number){return this.open&&!this.input&&x>=this.rect.x&&(this.importer.open||y>=this.rect.y+332&&y<=this.rect.h-216);}
 draw(parent:Container,button:Button,x:number,y:number,w:number,h:number){
  this.rect={x,y,w,h};if(this.importer.open){this.importer.draw(parent,button,x,y,w,h);return;}const label=(s:string,xx:number,yy:number,size=12,color=0xdce6eb)=>{const t=new Text({text:s,style:{fontFamily:'Arial',fontSize:size,fill:color}});t.position.set(xx,yy);parent.addChild(t);return t;};
  label(this.dirty?'Unsaved draft':this.pendingApply?'Saved · pending Apply':'Saved / Applied',x,y,12,this.dirty?0xecc18b:0x83d8bc);
  const note=label(this.notice,x,y+22,11);note.style.wordWrap=true;note.style.wordWrapWidth=w;
  button(parent,'Phase: '+(this.phase==='all'?'Full sequence':this.phase==='bolt'?'Projectile':this.phase),x,y+66,w-104,()=>{void this.cyclePhase();},false,'editor-phase');button(parent,`Rank ${this.o.rank()} / 5`,x+w-96,y+66,96,()=>this.o.setRank(this.o.rank()%5+1),false,'editor-rank');
  const l=this.current;label(l?l.name.slice(0,46):'No implemented VFX for this node',x,y+112,12,0xffd79e);if(l){const path=label(l.effect+' / '+l.id,x,y+132,10,0x9fb4c3);path.style.wordWrap=true;path.style.wordWrapWidth=w;}
  button(parent,'‹ Layer',x,y+164,(w-16)/3,()=>this.layer(-1),false,'editor-layer-prev');button(parent,'Layer ›',x+(w-16)/3+8,y+164,(w-16)/3,()=>this.layer(1),false,'editor-layer-next');button(parent,this.solo?'Solo: ON':'Solo: OFF',x+2*((w-16)/3+8),y+164,(w-16)/3,()=>{if(this.busy||this.seeking)return;this.solo=!this.solo;this.filters();this.o.redraw();void this.o.replay();},this.solo,'editor-solo');
  button(parent,'Replay',x,y+208,(w-16)/3,()=>{void this.o.replay();},false,'editor-replay');button(parent,this.o.paused()?'Resume':'Pause',x+(w-16)/3+8,y+208,(w-16)/3,()=>this.o.pause(),false,'editor-pause');button(parent,`Speed ${this.speed}×`,x+2*((w-16)/3+8),y+208,(w-16)/3,()=>{const values=[.25,.5,1,2];this.speed=values[(values.indexOf(this.speed)+1)%values.length];this.o.redraw();},false,'editor-speed');
  button(parent,'Scrub timeline · drag',x,y+252,w,()=>{},false,'editor-timeline');const progress=new Graphics();parent.addChild(progress);this.timelineTrack={g:progress,x,y:y+283,w};this.timelineLabel=label(`Timeline ${this.timeline.toFixed(2)} / ${this.duration.toFixed(2)} s`,x,y+290,10,0x9fb4c3);button(parent,`${this.duration}s span`,x+w-84,y+288,84,()=>{this.duration=this.duration===5?10:this.duration===10?20:this.duration===20?30:5;this.o.redraw();},false,'editor-span');
  const top=y+332,bottom=h-216,fields=FIELDS.filter(f=>l?.fields.includes(f.key));this.maxScroll=Math.max(0,(fields.length+1)*43-(bottom-top));this.scroll=Math.min(this.scroll,this.maxScroll);
  const bg=new Graphics().rect(x-3,top-4,w+6,Math.max(20,bottom-top)).fill(0x142536);parent.addChild(bg);
  const patch=this.patch();
  fields.forEach((f,i)=>{const yy=top+i*43-this.scroll;if(yy<top||yy+36>bottom)return;const value=(patch as any)[f.key]??fallback(f.key),txt=typeof value==='number'?Math.round(value*1000)/1000:value||'Original';
   button(parent,f.label+': '+txt,x,yy,w,()=>{if(f.key==='blend'){const modes=['alpha','additive','screen','multiply'];this.mutate('blend',modes[(modes.indexOf(String(value))+1)%4]);}else this.edit(f.key,value);},false,'field-'+f.key);
  });
  if(l){const yy=top+fields.length*43-this.scroll;if(yy>=top&&yy+34<=bottom)button(parent,patch.enabled===false?'Layer hidden':'Layer visible',x,yy,w,()=>this.mutate('enabled',patch.enabled===false),false,'field-enabled');}
  const by=h-202,third=(w-16)/3;
  button(parent,'Undo',x,by,third,()=>this.history(),false,'editor-undo');button(parent,'Redo',x+third+8,by,third,()=>this.history(true),false,'editor-redo');button(parent,'Reset saved',x+2*(third+8),by,third,()=>this.reset(),false,'editor-reset');
  button(parent,'Save',x,by+44,(w-8)/2,()=>{void this.save();},false,'editor-save');button(parent,'Apply to Game',x+(w+8)/2,by+44,(w-8)/2,()=>{void this.save(true);},false,'editor-apply');
  button(parent,'Access key',x,by+88,w,()=>this.edit('access',''),false,'editor-access');
  label('Visual area only · damage area unchanged',x,by+134,11,0x9fb4c3);button(parent,'Import Spritesheet with Codex',x,by+154,w,()=>{this.importer.open=true;void this.importer.catalog();this.o.redraw();},false,'input-import-open');
  if(this.input)this.drawInput(parent,button,label,x,w,h);
 }
 private drawInput(parent:Container,button:Button,label:(s:string,x:number,y:number,size?:number,color?:number)=>Text,x:number,w:number,h:number){
  const input=this.input!,top=80;parent.addChild(new Graphics().rect(x-10,top-10,w+20,h-top+10).fill({color:0x09131e,alpha:.99}));
  label(input.key==='access'?'Editor access key':'Edit '+input.key,x+8,top+8,16,0xffd79e);
  const value=label(input.key==='access'?'•'.repeat(Math.min(40,input.value.length)):input.value||'(original)',x+8,top+45,16);value.style.wordWrap=true;value.style.wordWrapWidth=w-16;
  const help=label(this.notice.startsWith('Enter ')||this.notice.startsWith('Use ')?this.notice:'Type, paste, Enter to commit · Esc to cancel',x+8,top+105,10,0x9fb4c3);help.style.wordWrap=true;help.style.wordWrapWidth=w-16;
  const chars=input.key==='color'?'#0123456789abcdef':input.key==='access'?'0123456789abcdef':input.key==='texture'?'abcdefghijklmnopqrstuvwxyz0123456789/._-':'1234567890.-';
  const columns=6,kw=(w-16)/columns;[...chars].forEach((c,i)=>button(parent,c,x+8+i%columns*kw,top+140+Math.floor(i/columns)*40,kw-4,()=>{input.value=(input.replace?'':input.value)+c;input.replace=false;this.o.redraw();},false,'input-'+c));
  const by=Math.min(h-102,top+150+Math.ceil(chars.length/columns)*40);
  button(parent,'Backspace',x+8,by,w-16,()=>{input.value=input.replace?'':input.value.slice(0,-1);input.replace=false;this.o.redraw();},false,'input-backspace');
  button(parent,'Commit',x+8,by+44,(w-24)/2,()=>this.commit(),false,'input-commit');button(parent,'Cancel',x+16+(w-24)/2,by+44,(w-24)/2,()=>{this.input=undefined;this.o.redraw();},false,'input-cancel');
 }
}
