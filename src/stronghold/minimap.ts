import {Container,Graphics} from 'pixi.js';
import {project,unproject} from '../isometric';
import {MAP,STRONGHOLD_ORIGIN} from '../world/map';
import {RELIEF} from '../world/relief';
import {STRONGHOLD} from './prefabs/stronghold';
import {COURT} from './terrain';
import {slots} from './scene';
import type {Building} from './economy';

// Geometry stays on the GPU. Only its translation and the live marker change per frame.
// Court-local ground tiles are shared with collision; actor elevation must not move the map marker.
export class Minimap extends Container {
 private geometry=new Graphics();
 private viewport=new Container();
 private clip=new Graphics();
 private frame=new Graphics();
 private marker=new Graphics();
 private size=0;
 private pxPerTile=1;
 private last={x:NaN,y:NaN};
 private tile={u:0,v:0};
 private built='';
 private count=0;
 constructor(){
  super();this.eventMode='none';this.zIndex=9;
  this.viewport.addChild(this.geometry);this.addChild(this.viewport,this.clip,this.frame,this.marker);this.viewport.mask=this.clip;
  this.marker.poly([0,-6,4.5,5,0,2.5,-4.5,5]).fill(0x50ecff).stroke({color:0x10282e,width:1.3});
 }
 private rebuild(built:Building[]){
  const g=this.geometry;g.clear();this.count=0;
  const line=(points:number[][],closed=true,alpha=.85)=>{
   const p=points.flatMap(([u,v])=>{const q=project(u,v);return [q.x/64,q.y/64];});
   g.poly(p,closed).stroke({color:0xd8b66b,width:1/this.pxPerTile,alpha});this.count++;
  };
  const rect=(u:number,v:number,w:number,h:number,alpha=.85)=>line([[u,v],[u+w,v],[u+w,v+h],[u,v+h]],true,alpha);
  const o=STRONGHOLD_ORIGIN,n=MAP.sizeTiles;
  rect(-o.u,-o.v,n,n,1);
  rect(0,0,COURT.size,COURT.size);
  // Real prefab wall locations, omitting decorative ground props.
  for(const p of STRONGHOLD.props){
   if(p.layout==='legacy')continue;
   if(p.id==='rampart-se')rect(p.u-2.2,p.v-.2,4.4,.4);
   else if(p.id==='rampart-ne')rect(p.u-.2,p.v-2.2,.4,4.4);
   else if(p.id==='bastion'){
    const q=project(p.u,p.v);g.ellipse(q.x/64,q.y/64,.85,.43).stroke({color:0xe2bf72,width:1/this.pxPerTile});this.count++;
   }
  }
  for(const id of built){
   const b=slots[id];if(!b)continue;
   const t=unproject(b.x-COURT.x,b.y-COURT.y);
   // Building symbols use their real slot and scaled width, rather than a decorative atlas.
   const r=Math.max(.35,Math.min(2.2,b.width/256));rect(t.x-r,t.y-r,r*2,r*2);
  }
  for(const f of RELIEF)line(f.outline??[[f.u0,f.v0],[f.u1,f.v0],[f.u1,f.v1],[f.u0,f.v1]],true,f.type==='ramp'?.45:.75);
 }
 updateMap(world:{x:number;y:number},width:number,height:number,telemetryBottom:number,built:Building[]){
  const size=Math.round(width<height?Math.min(112,width*.265):Math.min(148,height*.28));
  const top=Math.ceil(telemetryBottom+8),right=8;
  this.visible=top+size<height*.65;
  if(size!==this.size){
   this.size=size;this.pxPerTile=(size-14)/32;this.built='';
   this.clip.clear().roundRect(2,2,size-4,size-4,8).fill(0xffffff);
   this.frame.clear().roundRect(0,0,size,size,9).fill({color:0x172127,alpha:.16}).stroke({color:0xd8b66b,width:1,alpha:.95});
   this.frame.roundRect(3,3,size-6,size-6,7).stroke({color:0xd8b66b,width:.5,alpha:.45});
   // North points up in the same ground-plane orientation as the game.
   this.frame.moveTo(size/2-3,10).lineTo(size/2,5).lineTo(size/2+3,10).stroke({color:0xf2d590,width:1});
   this.geometry.scale.set(this.pxPerTile);
  }
  this.position.set(width-size-right,top);
  const key=built.join(',');if(key!==this.built){this.built=key;this.rebuild(built);}
  const t=unproject(world.x-COURT.x,world.y-COURT.y);this.tile={u:t.x,v:t.y};
  const p=project(t.x,t.y),k=this.pxPerTile/64;
  this.geometry.position.set(size/2-p.x*k,size/2-p.y*k);
  this.marker.position.set(size/2,size/2);
  const dx=world.x-this.last.x,dy=world.y-this.last.y;
  if(Number.isFinite(dx)&&Math.hypot(dx,dy)>.05)this.marker.rotation=Math.atan2(dy,dx)+Math.PI/2;
  this.last={...world};
 }
 snapshot(){return {visible:this.visible,bounds:{x:this.x,y:this.y,width:this.size,height:this.size},tile:this.tile,mapTile:{u:this.tile.u+STRONGHOLD_ORIGIN.u,v:this.tile.v+STRONGHOLD_ORIGIN.v},geometryCount:this.count,pxPerTile:this.pxPerTile,marker:{x:this.size/2,y:this.size/2,rotation:this.marker.rotation}};}
}
