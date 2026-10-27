/** Pixel evidence is deliberately separate from semantic/animation estimates. */
export type FrameRect={x:number;y:number;width:number;height:number};
export type SheetAnalysis={width:number;height:number;columns:number;rows:number;marginX:number;marginY:number;spacingX:number;spacingY:number;frames:FrameRect[];order:number[];fps:number;pivotX:number;pivotY:number;loop:boolean;groups:{name:string;order:number[]}[];confidence:{slicing:number;order:number;groups:number};notes:string[];source:'pixels'|'codex+pixels'};
type Span={start:number;end:number};
function spans(values:Uint32Array):Span[]{const out:Span[]=[];let start=-1;for(let i=0;i<=values.length;i++){if(values[i]>0&&start<0)start=i;if(!values[i]&&start>=0){out.push({start,end:i});start=-1;}}return out;}
function regular(s:Span[]){if(s.length<2||s.length>16)return false;const widths=s.map(v=>v.end-v.start),steps=s.slice(1).map((v,i)=>v.start-s[i].start),step=steps.reduce((a,b)=>a+b,0)/steps.length;return Math.max(...steps)-Math.min(...steps)<=Math.max(2,step*.08)&&Math.max(...widths)-Math.min(...widths)<=Math.max(3,Math.max(...widths)*.25);}
export function sliceGrid(width:number,height:number,columns:number,rows:number,marginX=0,marginY=0,spacingX=0,spacingY=0):FrameRect[]{
 if(![width,height,columns,rows,marginX,marginY,spacingX,spacingY].every(Number.isInteger)||width<1||height<1||columns<1||rows<1||columns>16||rows>16||Math.min(marginX,marginY,spacingX,spacingY)<0)throw Error('Invalid grid values');
 const fw=Math.floor((width-2*marginX-(columns-1)*spacingX)/columns),fh=Math.floor((height-2*marginY-(rows-1)*spacingY)/rows);if(fw<1||fh<1)throw Error('Grid does not fit image');
 return Array.from({length:columns*rows},(_,i)=>({x:marginX+i%columns*(fw+spacingX),y:marginY+Math.floor(i/columns)*(fh+spacingY),width:fw,height:fh}));
}
export function analyzePixels(width:number,height:number,rgba:Uint8ClampedArray):SheetAnalysis{
 if(width<1||height<1||width*height>16777216||rgba.length!==width*height*4)throw Error('Image must contain at most 16 megapixels');
 const xs=new Uint32Array(width),ys=new Uint32Array(height);let transparent=false;for(let i=3;i<rgba.length;i+=4)if(rgba[i]<16){transparent=true;break;}
 // Opaque backgrounds are inferred from corner colors only when all corners agree.
 const corners=[0,(width-1)*4,(height-1)*width*4,(width*height-1)*4];const bg=corners.every(i=>[0,1,2].every(c=>Math.abs(rgba[i+c]-rgba[c])<10));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,content=transparent?rgba[i+3]>16:!bg||[0,1,2].some(c=>Math.abs(rgba[i+c]-rgba[c])>18);if(content){xs[x]++;ys[y]++;}}
 const sx=spans(xs),sy=spans(ys),rx=regular(sx),ry=regular(sy);const columns=rx?sx.length:1,rows=ry?sy.length:1;
 // Multiple objects can be a static illustration: slicing remains an explicit estimate.
 const multi=columns*rows>1,confidence=multi?(rx&&ry?.78:.58):.9;
 const marginX=rx?sx[0].start:0,marginY=ry?sy[0].start:0;
 const spacingX=rx?Math.round(sx.slice(1).reduce((a,v,i)=>a+v.start-sx[i].end,0)/(sx.length-1)):0;
 const spacingY=ry?Math.round(sy.slice(1).reduce((a,v,i)=>a+v.start-sy[i].end,0)/(sy.length-1)):0;
 // Use measured content rectangles rather than symmetric-grid assumptions for inferred frames.
 const frames=multi?Array.from({length:columns*rows},(_,i)=>({x:rx?sx[i%columns].start:0,y:ry?sy[Math.floor(i/columns)].start:0,width:rx?sx[i%columns].end-sx[i%columns].start:width,height:ry?sy[Math.floor(i/columns)].end-sy[Math.floor(i/columns)].start:height})):[{x:0,y:0,width,height}];
 const order=frames.map((_,i)=>i);return {width,height,columns,rows,marginX,marginY,spacingX,spacingY,frames,order,fps:12,pivotX:.5,pivotY:.5,loop:true,groups:[{name:'Animation 1',order:[...order]}],confidence:{slicing:confidence,order:multi?.25:1,groups:multi?.2:1},notes:[multi?'Estimated slicing from repeated pixel occupancy; separate objects may not be animation frames. Confirm outlines.':'No reliable repeated grid detected. Imported as one static frame.', 'Playback order, groups, FPS, pivot and looping are estimates; confirm before saving.','Pixel analysis only. Codex visual analysis has not run.'],source:'pixels'};
}
