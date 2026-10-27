// Browser-only validation scene: actual production Pixi renderer and tree.
 import {Application} from 'pixi.js';
 import {loadFonts,installMsdfFx} from '/src/typography/msdf.ts';
 import {SkillTree} from '/src/stronghold/skill-tree.ts';import {fresh} from '/src/stronghold/progression.ts';
 const app=new Application();await app.init({width:innerWidth,height:innerHeight,preference:'webgl',background:0x080b0e});document.body.append(app.canvas);installMsdfFx(app.renderer);await loadFonts('/typography/v2/fonts/');
 const p=fresh();p.skills['rift-dash']=1;p.slots=['rift-bolt','rift-dash'];
 const tree=new SkillTree(app.stage,{run:()=>p,region:()=>({rect:{x:8,y:8,width:innerWidth-16,height:innerHeight-16},vertical:innerWidth<600||innerHeight<450}),equip:(slot,id)=>{const at=p.slots.indexOf(id);if(at>=0)p.slots[at]=p.slots[slot];p.slots[slot]=id;return true;}});
 await tree.show('rift-dash',0);(window as any).test={tree,p,app};
