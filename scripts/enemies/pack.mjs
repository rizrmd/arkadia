import sharp from 'sharp';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const ALPHA=16,MIN_PART=200;
// 8-connected components over alpha >= ALPHA. Returns label map + component stats.
function components({ data, W, H }) {
  const label = new Int32Array(W * H).fill(-1), parts = [];
  for (let i = 0; i < W * H; i++) {
    if (data[i * 4 + 3] < ALPHA || label[i] >= 0) continue;
    const c = { id: parts.length, n: 0, x0: W, y0: H, x1: -1, y1: -1, sx: 0, sy: 0 }, stack = [i];
    label[i] = c.id;
    while (stack.length) {
      const p = stack.pop(), x = p % W, y = (p - x) / W;
      c.n++; c.sx += x; c.sy += y;
      c.x0 = Math.min(c.x0, x); c.x1 = Math.max(c.x1, x); c.y0 = Math.min(c.y0, y); c.y1 = Math.max(c.y1, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, q = ny * W + nx;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && label[q] < 0 && data[q * 4 + 3] >= ALPHA) { label[q] = c.id; stack.push(q); }
      }
    }
    c.cx = c.sx / c.n; c.cy = c.sy / c.n; parts.push(c);
  }
  return { label, parts };
}

// Groups big components into rows (by centroid y gaps) and columns (by x order). Fails loudly on a mismatch.
function figures(img, rows, cols, name) {
  const { label, parts } = components(img);
  const big = parts.filter(c => c.n >= MIN_PART), specks = parts.filter(c => c.n < MIN_PART);
  if (big.length !== rows * cols) throw Error(`${name}: expected ${rows * cols} figures, found ${big.length}`);
  big.sort((a, b) => a.cy - b.cy);
  const grid = [];
  for (let r = 0; r < rows; r++) grid.push(big.slice(r * cols, (r + 1) * cols).sort((a, b) => a.cx - b.cx));
  for (let r = 1; r < rows; r++) {
    const prevMax = Math.max(...grid[r - 1].map(c => c.cy)), min = Math.min(...grid[r].map(c => c.cy));
    if (min - prevMax < 40) throw Error(`${name}: rows ${r - 1}/${r} not separable by centroid`);
  }
  const owned = new Map(big.map(c => [c.id, [c.id]]));
  let dropped = 0;
  for (const s of specks) {
    const host = big.find(c => s.x0 >= c.x0 - 3 && s.x1 <= c.x1 + 3 && s.y0 >= c.y0 - 3 && s.y1 <= c.y1 + 3);
    if (host) owned.get(host.id).push(s.id); else dropped += s.n;
  }
  return { label, grid, owned, specks: specks.length, droppedPx: dropped };
}

// Copies only the pixels of the given components (never a rectangle of the sheet), so neighbours cannot leak.
function isolate(img, label, ids, c) {
  const set = new Set(ids), w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1, out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = (y + c.y0) * img.W + x + c.x0;
    if (!set.has(label[s])) continue;
    img.data.copy(out, (y * w + x) * 4, s * 4, s * 4 + 4);
  }
  return { data: out, w, h, x0: c.x0, y0: c.y0 };
}

const maskOf = f => { const m = new Uint8Array(f.w * f.h); for (let i = 0; i < m.length; i++) m[i] = f.data[i * 4 + 3] >= ALPHA ? 1 : 0; return m; };

// Ground contact: lowest row whose opaque run is wider than a blade tip (ignores swords/axes poking below feet).
function groundY(f, m) {
  for (let y = f.h - 1; y >= 0; y--) { let n = 0; for (let x = 0; x < f.w; x++) n += m[y * f.w + x]; if (n >= 10) return y; }
  return f.h - 1;
}
// Horizontal centre of the feet band (bottom 14% of the figure, width-weighted).
function feetX(f, m, gy) {
  let s = 0, n = 0; const top = Math.max(0, gy - Math.round(f.h * 0.14));
  for (let y = top; y <= gy; y++) for (let x = 0; x < f.w; x++) if (m[y * f.w + x]) { s += x; n++; }
  return s / n;
}
// Horizontal anchor for `f` (frame-local px) that best overlays it on `base` when both sit on their ground rows:
// searches around the feet centre and keeps the shift with maximum alpha-mask IoU.
function registerX(base, f) {
  let best = { ax: f.fx, iou: -1 };
  const u0 = -Math.max(base.ax, f.w), u1 = Math.max(base.w - base.ax, f.w), v0 = -Math.max(base.gy, f.gy);
  for (let dx = -60; dx <= 60; dx++) {
    const ax = Math.round(f.fx) + dx; let inter = 0, uni = 0;
    for (let v = v0; v <= 0; v += 2) for (let u = u0; u < u1; u += 2) {
      const bx = Math.round(base.ax) + u, by = base.gy + v, fx = ax + u, fy = f.gy + v;
      const a = by >= 0 && bx >= 0 && bx < base.w && base.m[by * base.w + bx], b = fy >= 0 && fx >= 0 && fx < f.w && f.m[fy * f.w + fx];
      if (a && b) inter++; if (a || b) uni++;
    }
    if (inter / uni > best.iou) best = { ax, iou: inter / uni };
  }
  return best;
}



const OUT='public/enemies/v1';
const reference=JSON.parse(await fs.readFile('public/assets/characters/manifest.json','utf8')).characters.revenant;
const manifest={generatedBy:'scripts/enemies/pack.mjs',alphaThreshold:ALPHA,reference:'Revenant current 48-frame contract',styleReference:{image:'reference/rift-runner-v2-SE.png',source:'Rift Runner v2 prototype-v2/neutral-SE.png',sha256:createHash('sha256').update(await fs.readFile(`${OUT}/reference/rift-runner-v2-SE.png`)).digest('hex'),direction:'Simplified stylized low-poly painted forms, matte surfaces, muted charcoal/teal/ochre, soft upper-left lighting'},characters:{}};
const audit={};
for(const id of ['ashfang','mire-imp']){
 const {data,info}=await sharp(`${OUT}/source/${id}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const img={data,W:info.width,H:info.height};
 const {label,grid,owned,specks,droppedPx}=figures(img,8,6,id);
 const rows=grid.map((row,r)=>row.map((c,col)=>{const f=isolate(img,label,owned.get(c.id),c);f.m=maskOf(f);f.gy=groundY(f,f.m);f.fx=feetX(f,f.m,f.gy);return {...f,r,col};}));
 // Preserve relative vertical gait offsets within a row; do not put every lifted foot back on the floor.
 for(const row of rows){const floor=Math.max(...row.map(f=>f.y0+f.gy));for(const f of row)f.ay=floor-f.y0;}
 // Death uses the complete recoil/death row ground line.
 const deathFloor=Math.max(...rows[3].map(f=>f.y0+f.gy));
 for(const f of rows[3])f.ay=deathFloor-f.y0;
 const ref=rows[0][0];ref.ax=ref.fx;
 const all=rows.flat();
 for(const [r,row] of rows.entries()){
   const base=row[0];if(base.ax===undefined)base.ax=base.fx;
   for(let i=1;i<row.length;i++){const f=row[i],b=r===2||r===3?row[i-1]:base;const reg=registerX(b,f);f.ax=reg.ax;f.iou=reg.iou;}
 }
 // Species retain a single source-to-atlas scale across every direction and action.
 // The wide wolf silhouette requires a wider cell than a biped at equivalent height;
 // fit once for the complete character, never fit individual frames.
 const cell=structuredClone(reference.cell),gutter=reference.gutter;
 const maxScale=Math.min(...all.flatMap(f=>[(cell.pivot.x-4)/Math.max(1,f.ax),(cell.w-cell.pivot.x-4)/Math.max(1,f.w-f.ax),(cell.pivot.y-4)/Math.max(1,f.ay),(cell.h-cell.pivot.y-4)/Math.max(1,f.h-f.ay)]));
 const scale=Math.min(id==='ashfang'?.5:.6,maxScale);
 const composites=[],frames=[],tiles=[];
 for(const f of all){
   const w=Math.max(1,Math.round(f.w*scale)),h=Math.max(1,Math.round(f.h*scale));
   const small=await sharp(f.data,{raw:{width:f.w,height:f.h,channels:4}}).resize(w,h).raw().toBuffer();
   for(let i=0;i<small.length;i+=4)if(small[i+3]<ALPHA)small.fill(0,i,i+4);
   const ox=Math.round(cell.pivot.x-f.ax*scale),oy=Math.round(cell.pivot.y-f.ay*scale);
   const tile=await sharp({create:{width:cell.w,height:cell.h,channels:4,background:'#00000000'}}).composite([{input:small,raw:{width:w,height:h,channels:4},left:ox,top:oy}]).raw().toBuffer();
   for(let y=0;y<cell.h;y++)for(let x=0;x<cell.w;x++)if((x===0||y===0||x===cell.w-1||y===cell.h-1)&&tile[(y*cell.w+x)*4+3])throw Error(`${id}: opaque border ${f.r}/${f.col}`);
   tiles.push(tile);
   const x=gutter+f.col*(cell.w+gutter),y=gutter+f.r*(cell.h+gutter);
   composites.push({input:tile,raw:{width:cell.w,height:cell.h,channels:4},left:x,top:y});
   frames.push({row:f.r,col:f.col,x,y,w:cell.w,h:cell.h,source:{file:`source/${id}.png`,x:f.x0,y:f.y0,w:f.w,h:f.h},anchorSourcePx:[f.x0+f.ax,f.y0+f.ay],registrationIoU:f.iou??1});
 }
 const atlasSize=reference.atlasSize;
 await sharp({create:{width:atlasSize[0],height:atlasSize[1],channels:4,background:'#00000000'}}).composite(composites).png().toFile(`${OUT}/${id}.png`);
 const revision=createHash('sha256').update(await fs.readFile(`${OUT}/${id}.png`)).digest('hex').slice(0,16);
 const meta={id,image:`${id}.png`,revision,source:`source/${id}.png`,sourceSize:[img.W,img.H],atlasSize,scale,normalization:scale/.5,gutter,cell,direction:reference.direction,defaultAttack:id==='ashfang'?'Bite':'Claw Swipe',clips:reference.clips,frames};
 manifest.characters[id]=meta;
 audit[id]={figures:all.length,specks,droppedPx,sourceTransparentFraction:1-data.filter((v,i)=>i%4===3&&v>=ALPHA).length/(img.W*img.H),uniformScale:scale,cell,atlasSize,transparentBorders:true};
 await fs.mkdir(`${OUT}/previews`,{recursive:true});
 for(const [name,clip]of Object.entries(meta.clips)){
   const list=clip.frames.map(i=>tiles[i]);
   // Include a short end hold for one-shots; the interactive player itself does not loop them.
   const delays=list.map(()=>Math.round(1000/clip.fps));if(!clip.loop)delays[delays.length-1]+=500;
   await sharp(Buffer.concat(list),{raw:{width:cell.w,height:cell.h*list.length,channels:4,pageHeight:cell.h}}).webp({loop:0,delay:delays,lossless:true}).toFile(`${OUT}/previews/${id}-${name}.webp`);
 }
}
await fs.writeFile(`${OUT}/manifest.json`,JSON.stringify(manifest,null,2));
await fs.writeFile('docs/enemies-v1/pixel-audit.json',JSON.stringify(audit,null,2));
console.log(JSON.stringify(audit,null,2));
