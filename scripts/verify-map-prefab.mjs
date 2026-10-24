import {createServer} from 'vite';import fs from 'node:fs';import assert from 'node:assert/strict';
// Map spec and Stronghold prefab checks (Knowledge: Environment > Map Specification): node scripts/verify-map-prefab.mjs
// The map size follows from 5 minutes of walking from the center to each edge at hero speed (net/movement.ts),
// the Stronghold court sits on the map center inside the center chunk, and the server embeds the client's prefab.
const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error',optimizeDeps:{noDiscovery:true,include:[]}});
try{
 const {MAP,MAP_CENTER,STRONGHOLD_ORIGIN,courtToMap,chunkOf}=await vite.ssrLoadModule('/src/world/map.ts');
 const {fullSpeed,ACROSS,UPDOWN}=await vite.ssrLoadModule('/src/stronghold/net/movement.ts');
 const {STRONGHOLD}=await vite.ssrLoadModule('/src/stronghold/prefabs/stronghold.ts');
 assert.ok(fs.readFileSync('src/stronghold/prefabs/stronghold.json').equals(fs.readFileSync('server/internal/sim/stronghold.json')),'server/internal/sim/stronghold.json must be a copy of the client prefab');
 // One tile along a ground axis is the screen vector (64, 32); walking it runs at fullSpeed in that direction.
 const tile=Math.hypot(64,32),edgeTilesPerS=fullSpeed(64,32)/tile,half=MAP.sizeTiles/2;
 const edgeMin=half/edgeTilesPerS/60;
 // Corners lie on the ground diagonals: straight down/up the screen (UPDOWN) or straight across (ACROSS).
 const downMin=MAP.sizeTiles*32/UPDOWN/60,acrossMin=MAP.sizeTiles*64/ACROSS/60;
 const report={map:MAP.id,sizeTiles:MAP.sizeTiles,km:MAP.sizeTiles*MAP.metersPerTile/1000,tilesPerS:+edgeTilesPerS.toFixed(4),mPerS:+(edgeTilesPerS*MAP.metersPerTile).toFixed(3),
  centerToEdgeMin:+edgeMin.toFixed(3),centerToCornerMin:{topBottom:+downMin.toFixed(2),leftRight:+acrossMin.toFixed(2),average:+((downMin+acrossMin)/2).toFixed(2)},
  chunks:MAP.sizeTiles/MAP.chunkTiles,strongholdOrigin:STRONGHOLD_ORIGIN,centerChunk:chunkOf(MAP_CENTER)};
 assert.ok(Math.abs(edgeMin-5)<.01,'center to edge must be 5 minutes, got '+edgeMin);
 assert.equal(MAP.sizeTiles%MAP.chunkTiles,0);assert.equal((MAP.sizeTiles/MAP.chunkTiles)%2,1,'an odd chunk count keeps one chunk on the center');
 const anchor=courtToMap(STRONGHOLD.anchor);assert.deepEqual(anchor,MAP_CENTER,'the court center sits on the map center');
 const n=STRONGHOLD.court.size,corners=[[0,0],[n,n]].map(([u,v])=>chunkOf(courtToMap({u,v})));
 assert.deepEqual(corners[0],report.centerChunk);assert.deepEqual(corners[1],report.centerChunk);
 console.log(JSON.stringify(report,null,1));console.log('PASS map spec and Stronghold prefab');
}finally{await vite.close();}
