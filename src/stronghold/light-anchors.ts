// Authored Stronghold light sources in sprite source pixels. size is the
// emissive mask radius; drop is source px from the light down to its ground pool;
// radius is the pool radius in world px (0 keeps only the emissive mask). The
// lightmap has no occlusion, so lights hidden behind the front walls stay mask-only.
// Review overlays: node scripts/extract-emissive.mjs [output dir].
export type LightKind='fire'|'window'|'candle'|'holy'|'arcane';
export type Anchor={x:number;y:number;size:number;kind:LightKind;radius:number;drop?:number;intensity?:number;bright?:boolean};
export const LIGHT_SPRITES:Record<string,Anchor[]>={
 '/fortress-ui/forge-1.webp':[
  {x:160,y:240,size:22,kind:'window',radius:85,drop:90,intensity:0.7},
  {x:272,y:240,size:22,kind:'window',radius:85,drop:90,intensity:0.7}
 ],
 '/fortress-ui/forge-2.webp':[
  {x:297,y:280,size:50,kind:'fire',radius:140,drop:70,intensity:1},
  {x:335,y:370,size:50,kind:'fire',radius:0},
  {x:150,y:283,size:16,kind:'window',radius:60,drop:70,intensity:0.6},
  {x:381,y:262,size:16,kind:'candle',radius:60,drop:40,intensity:0.6}
 ],
 '/fortress-ui/forge-3.webp':[
  {x:340,y:370,size:55,kind:'fire',radius:150,drop:80,intensity:1},
  {x:428,y:462,size:45,kind:'fire',radius:0},
  {x:437,y:325,size:16,kind:'candle',radius:70,drop:120,intensity:0.6},
  {x:186,y:418,size:14,kind:'candle',radius:50,drop:40,intensity:0.5},
  {x:118,y:372,size:16,kind:'window',radius:55,drop:60,intensity:0.6}
 ],
 '/assets/stronghold/barracks.png':[
  {x:241,y:302,size:22,kind:'fire',radius:80,drop:60,intensity:0.85},
  {x:346,y:277,size:22,kind:'fire',radius:80,drop:60,intensity:0.85}
 ],
 '/assets/stronghold/altar.png':[
  {x:345,y:285,size:42,kind:'holy',radius:140,drop:150,intensity:0.8,bright:true},
  {x:255,y:345,size:40,kind:'candle',radius:90,drop:60,intensity:0.8},
  {x:405,y:385,size:38,kind:'candle',radius:90,drop:60,intensity:0.8},
  {x:345,y:370,size:34,kind:'candle',radius:0},
  {x:75,y:372,size:30,kind:'fire',radius:80,drop:60,intensity:0.9},
  {x:345,y:468,size:30,kind:'fire',radius:90,drop:50,intensity:0.9},
  {x:170,y:405,size:24,kind:'candle',radius:50,drop:30,intensity:0.6},
  {x:415,y:480,size:26,kind:'candle',radius:60,drop:30,intensity:0.6}
 ],
 '/assets/stronghold/mage.png':[
  {x:222,y:345,size:48,kind:'arcane',radius:120,drop:200,intensity:0.9,bright:true},
  {x:338,y:330,size:30,kind:'window',radius:70,drop:210,intensity:0.6},
  {x:200,y:198,size:14,kind:'window',radius:0},
  {x:272,y:512,size:22,kind:'fire',radius:75,drop:60,intensity:0.8},
  {x:362,y:500,size:22,kind:'fire',radius:75,drop:60,intensity:0.8},
  {x:62,y:478,size:16,kind:'candle',radius:0},
  {x:160,y:480,size:14,kind:'candle',radius:0},
  {x:68,y:515,size:12,kind:'arcane',radius:0}
 ],
 '/assets/stronghold/expedition.png':[
  {x:455,y:150,size:32,kind:'candle',radius:110,drop:150,intensity:0.9}
 ],
 '/assets/stronghold/mine.png':[
  {x:220,y:212,size:24,kind:'fire',radius:80,drop:90,intensity:0.85},
  {x:275,y:245,size:45,kind:'fire',radius:70,drop:30,intensity:0.6}
 ],
 '/modular-stronghold/v2/full-gateway-v4-open.webp':[
  {x:231,y:277,size:28,kind:'fire',radius:110,drop:130,intensity:1},
  {x:537,y:277,size:28,kind:'fire',radius:110,drop:130,intensity:1}
 ],
 '/modular-stronghold/v2/full-gateway-v3-open.webp':[
  {x:231,y:277,size:28,kind:'fire',radius:110,drop:130,intensity:1},
  {x:537,y:277,size:28,kind:'fire',radius:110,drop:130,intensity:1}
 ],
 '/modular-stronghold/v2/gateway-open.png':[
  {x:355,y:395,size:32,kind:'fire',radius:110,drop:245,intensity:1},
  {x:840,y:395,size:32,kind:'fire',radius:110,drop:245,intensity:1}
 ],
 '/modular-stronghold/v2/brazier.png':[
  {x:300,y:250,size:230,kind:'fire',radius:85,drop:600,intensity:1}
 ]
};
// Flame/arcane pixel test shared by the runtime mask and the authoring script.
export function emissive(r:number,g:number,b:number,bright=false){return r>215&&g>110&&b<135&&r-g>30||b>200&&g>130&&r<150||bright&&.299*r+.587*g+.114*b>232;}
