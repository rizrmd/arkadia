import {Graphics} from 'pixi.js';

// Shared point-up gold crest for manual Rift Dash in Equipped and the Skill Tree.
export function skillHexPoints(cx:number,cy:number,r:number){
 return Array.from({length:6},(_,j)=>[cx+Math.cos(j*Math.PI/3-Math.PI/2)*r,cy+Math.sin(j*Math.PI/3-Math.PI/2)*r]).flat();
}
export function drawSkillHex(g:Graphics,cx:number,cy:number,r:number){
 const k=r/48;
 g.clear().poly(skillHexPoints(cx,cy,r)).stroke({color:0x44270b,width:8*k});
 g.poly(skillHexPoints(cx,cy,r)).stroke({color:0xe8b84f,width:4*k});
 g.poly(skillHexPoints(cx,cy,r-5*k)).stroke({color:0xffedb1,width:1.3*k});
}
