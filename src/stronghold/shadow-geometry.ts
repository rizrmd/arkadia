import companions from '../world/maps/shadow-companions.json';
import catalog from '../world/maps/frozen-frontier-sprites.json';

type Proxy={frame:number[];pivot:number[];world:number[];ground:number[];model:string;heightPx?:number};
const proxies=companions.assets as Record<string,Proxy>;
// Geometry and colour frames are one release. Never silently use a proxy from a repacked atlas.
export function validateShadowCompanions(){
 if(companions.atlas!==catalog.atlas||companions.atlasSha256!==catalog.sha256)throw Error('Shadow companion atlas revision mismatch; rebuild shadow-audit companions');
 for(const [id,s] of Object.entries(catalog.assets)){
  const p=proxies[id];
  if(!p||JSON.stringify([p.frame,p.pivot,p.world,p.ground])!==JSON.stringify([s.frame,s.pivot,s.world,s.ground]))throw Error(`Shadow companion frame mismatch: ${id}`);
 }
}
export function proxyGroundAt(asset:string,fx:number){
 const p=proxies[asset];if(!p)throw Error(`Missing shadow geometry: ${asset}`);
 const n=p.ground.length-1,t=Math.max(0,Math.min(n,fx/p.frame[2]*n)),i=Math.min(n-1,Math.floor(t));
 return (n?p.ground[i]+(p.ground[i+1]-p.ground[i])*(t-i):p.ground[0])*p.frame[3];
}
// Reconstruct the explicit billboard proxy, not a measured 3D surface. x/y are
// projected ground coordinates; z is the screen-vertical world-pixel height.
// Given z, tile u/v can be recovered with unproject(x-origin.x,y-origin.y).
// Shear acts on mirrored local x. The profile stays in unmirrored source space.
export function reconstructProxy(p:{asset:string;x:number;y:number;width:number;height:number;pivot:number[];flip:boolean;shear:number;lift:number},u:number,v:number){
 const g=proxies[p.asset],sx=p.width/g.frame[2]*(p.flip?-1:1),sy=p.height/g.frame[3];
 const lx=sx*(u-p.pivot[0]*g.frame[2]),base=proxyGroundAt(p.asset,u),localY=sy*(v-p.pivot[1]*g.frame[3]);
 const z=g.model==='constant-height-slab'?g.heightPx!*p.width/g.world[0]:sy*(base-v);
 return {x:p.x+lx,y:p.y+p.shear*lx+localY+z,z:p.lift+z};
}
export const shadowCompanionStats=()=>({version:companions.version,atlas:companions.atlas,families:Object.keys(proxies).length,model:companions.model,receivers:'snow plus temple top; no general object receivers'});
