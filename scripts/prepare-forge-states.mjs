import sharp from 'sharp';
// Extract the generated sprite sheet without changing the painted artwork.
const edges=[0,550,1055,1580,2172];
for(let i=0;i<4;i++){const cell=await sharp('public/fortress-ui/forge-states.png').extract({left:edges[i],top:0,width:edges[i+1]-edges[i],height:724}).toBuffer();await sharp(cell).trim().toFile(`public/fortress-ui/forge-${[1,0,2,3][i]}.png`);}
