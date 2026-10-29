import type {EnvironmentSprite} from './terrain';
import {STRONGHOLD} from './prefabs/stronghold';
export const STARTER_BOUNDARY_ART='/buildings/starter-boundary/';
// Source contacts measured on the new component sheet, not historical palisade pixels.
// Four pieces per court side; the last front run terminates at the makeshift gate.
export const STARTER_CONTACTS={ne:[[48,207],[350,86]],se:[[46,88],[350,210]]} as const;
export const STARTER_COMPONENTS={
 'straight-ne-a':{width:416,contacts:STARTER_CONTACTS.ne},
 'straight-ne-b':{width:384,contacts:[[45,210],[349,90]]},
 'straight-se-a':{width:416,contacts:STARTER_CONTACTS.se},
 'straight-se-b':{width:384,contacts:[[43,91],[345,213]]},
} as const;
export const PALISADE={span:240,height:62};
export function starterEnclosure(props:EnvironmentSprite[]):EnvironmentSprite[]{
 const result=props.filter(p=>!['bastion','wall-broken','rampart-ne','rampart-se'].includes(p.id));
 const {origin,size}=STRONGHOLD.court;
 for(const front of [false,true])for(const axis of ['ne','se'] as const){
  const length=front?size*64-120:size*64,count=Math.ceil(length/PALISADE.span),span=length/count;
  for(let i=0;i<count;i++){
   const distance=(i+.5)*span,sign=axis==='se'?1:-1;
   const x=origin.x+sign*(front?size*64-distance:distance),y=origin.y+(front?size*32+distance*(453/840):distance*.5);
   const direction=front?(axis==='ne'?'se':'ne'):axis;
   const variant=i%3===1?'b':'a',name=`straight-${direction}-${variant}` as keyof typeof STARTER_COMPONENTS;
   const component=STARTER_COMPONENTS[name],[a,b]=component.contacts,scale=span/(b[0]-a[0]),vertical=.75;
   const slope=(direction==='ne'?-1:1)*(front?453/840:.5),shear=slope-vertical*(b[1]-a[1])/(b[0]-a[0]);
   const sourceCenter=(a[0]+b[0])/2,offset=(sourceCenter-component.width/2)*scale;
   result.push({id:'rampart-'+direction,layer:front?'foreground':'backdrop',x:x-offset,y:y-shear*offset,width:component.width*scale,foot:(a[1]+b[1])/2/256,vertical,shear,depth:y,opacity:1,file:STARTER_BOUNDARY_ART+name+'.png'});
  }
 }
 return result;
}
// Registered endpoint interval reserves the full low boundary even between sparse timbers.
export function palisadeColumns(p:{id:string;file:string;x:number;y:number;width?:number}){
 if(!p.file.startsWith(STARTER_BOUNDARY_ART+'straight-'))return null;
 const name=p.file.slice(STARTER_BOUNDARY_ART.length,-4) as keyof typeof STARTER_COMPONENTS,component=STARTER_COMPONENTS[name];
 const [a,b]=component.contacts,width=p.width??component.width,scale=width/component.width;
 const centerOffset=((a[0]+b[0])/2-component.width/2)*scale;
 const shear=(p as {shear?:number}).shear??0,vertical=(p as {vertical?:number}).vertical??.75;
 const slope=shear+vertical*(b[1]-a[1])/(b[0]-a[0]),span=(b[0]-a[0])*scale,cols=[];
 const cx=p.x+centerOffset,cy=p.y+shear*centerOffset;
 const steps=Math.ceil(span/3);for(let i=0;i<=steps;i++){const dx=-span/2+i*span/steps,y=cy+dx*slope;cols.push({x:cx+dx,w:4,back:y-9,front:y+9,height:PALISADE.height});}
 return cols;
}
