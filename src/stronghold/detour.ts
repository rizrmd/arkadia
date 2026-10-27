// Bounded A* in tile coordinates. Unlike local veering, a route may initially
// move away from its target to escape a U-shaped footprint. All edges are swept.
export type NavPoint={x:number;y:number};
export type Detour={points:NavPoint[];target:NavPoint;ttl:number};
export function navClear(a:NavPoint,b:NavPoint,free:(p:NavPoint)=>boolean,cliff:(a:NavPoint,b:NavPoint)=>boolean){
 const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.05));let prev=a;
 for(let i=1;i<=n;i++){const p={x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n};if(!free(p)||cliff(prev,p))return false;prev=p;}
 return true;
}
export function planDetour(from:NavPoint,to:NavPoint,clear:(a:NavPoint,b:NavPoint)=>boolean):NavPoint[]{
 const cell=.25,budget=4096,key=(i:number,j:number)=>`${i},${j}`;
 type Node={i:number;j:number;g:number;h:number;parent?:Node};
 const h=(i:number,j:number)=>Math.hypot(from.x+i*cell-to.x,from.y+j*cell-to.y);
 const point=(n:Node)=>({x:from.x+n.i*cell,y:from.y+n.j*cell});
 const start:Node={i:0,j:0,g:0,h:h(0,0)},heap:Node[]=[],cost=new Map<string,number>([['0,0',0]]);
 const push=(n:Node)=>{heap.push(n);let c=heap.length-1;while(c){const p=(c-1)>>1;if(heap[p].g+heap[p].h<=n.g+n.h)break;heap[c]=heap[p];c=p;}heap[c]=n;};
 const pop=()=>{const first=heap[0],last=heap.pop()!;if(heap.length){let c=0;while(true){let m=c;for(const k of [2*c+1,2*c+2])if(k<heap.length&&heap[k].g+heap[k].h<(m===c?last.g+last.h:heap[m].g+heap[m].h))m=k;if(m===c)break;heap[c]=heap[m];c=m;}heap[c]=last;}return first;};
 push(start);let best=start;
 for(let count=0;heap.length&&count<budget;count++){
  const n=pop();if(n.g!==cost.get(key(n.i,n.j)))continue;
  if(n.h<best.h)best=n;
  if(n.h<cell*1.5&&clear(point(n),to)){best=n;break;}
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){
   if(!i&&!j)continue;const ni=n.i+i,nj=n.j+j,g=n.g+Math.hypot(i,j)*cell,k=key(ni,nj);
   if(g>=(cost.get(k)??Infinity))continue;
   const next={i:ni,j:nj,g,h:h(ni,nj),parent:n};if(!clear(point(n),point(next)))continue;
   cost.set(k,g);push(next);
  }
 }
 const points:NavPoint[]=[];for(let n:Node|undefined=best;n?.parent;n=n.parent)points.push(point(n));points.reverse();return points;
}
export function detourDirection(state:Detour,from:NavPoint,to:NavPoint,dt:number,clear:(a:NavPoint,b:NavPoint)=>boolean):NavPoint|null{
 state.ttl-=dt;
 if(clear(from,to)){state.points=[];state.target=to;state.ttl=0;return to;}
 while(state.points.length&&Math.hypot(state.points[0].x-from.x,state.points[0].y-from.y)<.001)state.points.shift();
 if(state.ttl<=0||Math.hypot(to.x-state.target.x,to.y-state.target.y)>.75||state.points.length&&!clear(from,state.points[0])){
  state.points=planDetour(from,to,clear);state.target={...to};state.ttl=750;
 }
 return state.points[0]??null;
}
