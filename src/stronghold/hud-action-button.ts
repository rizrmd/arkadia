import {Assets,Container,Rectangle,Sprite,type FederatedPointerEvent} from 'pixi.js';

export type HudActionGesture={pointerType:string;timeStamp:number};

// Keep the original 46px utility target independent from the smaller artwork.
export function createHudActionButton(stage:Container,icon:string,label:string,activate:(gesture?:HudActionGesture)=>void){
 const button=new Container({label,eventMode:'static',cursor:'pointer'});
 // Utility actions belong to the HUD, below the clock popup (40), skill tree
 // (44.5), full map/lobby (45), and hero picker (70).
 button.zIndex=20;
 button.hitArea=new Rectangle(0,0,46,46);
 const art=button.addChild(new Sprite());
 art.anchor.set(.5);art.position.set(23,23);art.eventMode='none';
 let destroyed=false,pressed=false,pointer=-1;
 void Assets.load(icon).then(texture=>{if(destroyed)return;art.texture=texture;paint();});
 function paint(){art.width=art.height=pressed?26:30;art.y=pressed?25:23;art.tint=pressed?0xbba078:0xffffff;}
 function release(){pressed=false;pointer=-1;paint();}
 button.on('pointerdown',(e:FederatedPointerEvent)=>{if(pointer!==-1||e.button!==0)return;e.preventDefault();e.stopPropagation();pointer=e.pointerId;pressed=true;paint();});
 button.on('pointerup',(e:FederatedPointerEvent)=>{if(e.pointerId!==pointer)return;e.stopPropagation();release();activate({pointerType:e.pointerType,timeStamp:e.nativeEvent?.timeStamp??e.timeStamp});});
 button.on('pointerupoutside',release);
 button.on('pointercancel',release);
 button.on('pointerleave',release);
 window.addEventListener('blur',release);
 stage.addChild(button);
 return {button,position(x:number,y:number){button.position.set(x,y);},destroy(){destroyed=true;window.removeEventListener('blur',release);button.destroy({children:true});}};
}

export function hudActionPosition(bounds:{x:number;y:number;width:number;height:number},inventory=false){
 const x=Math.round(Math.max(8,Math.min(innerWidth-54,bounds.x+bounds.width-46)));
 const y=Math.round(Math.max(8,Math.min(innerHeight-54,bounds.y+bounds.height+(innerWidth<=600?27:8))));
 return {x:inventory?Math.max(8,Math.min(innerWidth-54,x-54)):x,y};
}
