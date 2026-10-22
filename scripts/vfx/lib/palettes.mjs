// Colour families for skill effects. Every layer in layers.mjs reads these keys, so a new element (frost, poison…)
// is one more palette and every existing recipe can be re-skinned with it.
//   hot   — white-hot core fading to the element colour (flashes, spark heads)
//   body  — the element's flame/energy over a particle's life (additive layers)
//   flame — the same, saturated and without a dark tail, for alpha-blended bodies that must read on bright snow
//   light — the glow colour around cores
//   spark — small bright bits (embers, glints)
//   deep  — the darkest hue, for the tail of long-lived particles
//   smoke — alpha-blended residue (smoke, dust); rock — debris chunks
export const EMBER={
 flame:{c:[[0,'#ffc24a'],[.15,'#ff9c30'],[.45,'#ff6c1c'],[.8,'#e2401a'],[1,'#b82c0e']]},
 hot:{c:[[0,'#fff6d2'],[.18,'#ffd873'],[.45,'#ff9a2e'],[.75,'#f0501a'],[1,'#a8200a']]},
 body:{c:[[0,'#ffe7a0'],[.18,'#ffb13b'],[.45,'#ff6a14'],[.75,'#c8300a'],[1,'#3a0802']]},
 light:'#ff8a2a',spark:'#ffd27a',deep:'#a8200a',accent:'#ffe9a8',smoke:'#2f2522',rock:'#4a2a1e',
};
export const RIFT={
 flame:{c:[[0,'#f4f0ff'],[.3,'#bba8ff'],[.6,'#8c64ff'],[1,'#5a36e0']]},
 hot:{c:[[0,'#ffffff'],[.2,'#e6f6ff'],[.45,'#8fe6ff'],[.75,'#8b62ff'],[1,'#4a1bb8']]},
 body:{c:[[0,'#f2ecff'],[.25,'#b9a2ff'],[.55,'#7d4dff'],[.85,'#4a1fc0'],[1,'#1c0a5a']]},
 light:'#7d5cff',spark:'#9cf0ff',deep:'#3b1aa0',accent:'#d9fbff',smoke:'#1d1838',rock:'#2a2450',
};
export const SEISMIC={
 flame:{c:[[0,'#fff6dc'],[.3,'#ffd986'],[.7,'#e0a448'],[1,'#b07a32']]},
 hot:{c:[[0,'#fffaf0'],[.2,'#fff0bf'],[.5,'#ffd06a'],[.8,'#d9902e'],[1,'#7a4a16']]},
 body:{c:[[0,'#fff3d0'],[.3,'#ffd57a'],[.65,'#d79a3c'],[1,'#5a3412']]},
 light:'#ffc65a',spark:'#ffe39a',deep:'#8a5a1e',accent:'#fff4cf',smoke:'#6b5a48',rock:'#6a5a4c',
};
// Molten earth: the Seismic Slam as the Ember Warden casts it.
export const MAGMA={
 flame:{c:[[0,'#ffd468'],[.25,'#ffa436'],[.6,'#ff6a1e'],[1,'#d8400e']]},
 hot:{c:[[0,'#fff2c8'],[.2,'#ffd06a'],[.5,'#ff8a24'],[.8,'#d8400e'],[1,'#6a1404']]},
 body:{c:[[0,'#ffd88a'],[.3,'#ff9a30'],[.65,'#d8481a'],[1,'#3a0a04']]},
 light:'#ff7a24',spark:'#ffc66a',deep:'#9a2208',accent:'#ffe2a0',smoke:'#3a2a24',rock:'#3a221a',
};
export const ASTRAL={
 flame:{c:[[0,'#ffffff'],[.35,'#d2e4ff'],[.7,'#98acff'],[1,'#6a72ff']]},
 hot:{c:[[0,'#ffffff'],[.25,'#e8f4ff'],[.55,'#a8cbff'],[.85,'#6a7dff'],[1,'#33309a']]},
 body:{c:[[0,'#f6faff'],[.35,'#bfd9ff'],[.7,'#7c8dff'],[1,'#2b2a7a']]},
 light:'#8fb4ff',spark:'#e4f0ff',deep:'#3a3aa8',accent:'#ffffff',smoke:'#2a2e48',rock:'#3a3e58',
};
export const GOLD={
 flame:{c:[[0,'#fffbe0'],[.35,'#ffe58a'],[.7,'#ffc040'],[1,'#e09820']]},
 hot:{c:[[0,'#ffffff'],[.2,'#fff6c8'],[.5,'#ffd85a'],[.8,'#f0a020'],[1,'#8a5208']]},
 body:{c:[[0,'#fffbe0'],[.35,'#ffe07a'],[.7,'#ffb22e'],[1,'#7a4a0a']]},
 light:'#ffd04a',spark:'#fff1a8',deep:'#b07414',accent:'#bff6ff',smoke:'#4a4030',rock:'#5a5040',
};
export const BLOOD={
 flame:{c:[[0,'#ffc8bc'],[.4,'#ff5a48'],[1,'#c41c18']]},
 hot:{c:[[0,'#fff0ec'],[.25,'#ff9c8a'],[.6,'#e8302a'],[1,'#5a0606']]},
 body:{c:[[0,'#ffb4a6'],[.4,'#e3352c'],[1,'#3a0404']]},
 light:'#ff3b30',spark:'#ff8a7a',deep:'#7a0a0a',accent:'#ffd6cf',smoke:'#2a1010',rock:'#3a1a1a',
};
export const STEEL={
 flame:{c:[[0,'#ffffff'],[.5,'#fff3dc'],[1,'#e0c8a0']]},
 hot:{c:[[0,'#ffffff'],[.3,'#fff8e6'],[.7,'#ffd99a'],[1,'#c08a4a']]},
 body:{c:[[0,'#ffffff'],[.5,'#fff0d2'],[1,'#a07850']]},
 light:'#fff1cf',spark:'#fff6dc',deep:'#8a6a4a',accent:'#ffffff',smoke:'#4a4440',rock:'#5a5450',
};
export const LIFE={
 flame:{c:[[0,'#f4ffe8'],[.4,'#b4f59a'],[1,'#4ac46a']]},
 hot:{c:[[0,'#ffffff'],[.25,'#eaffd8'],[.6,'#8af27a'],[1,'#1f7a3a']]},
 body:{c:[[0,'#f2ffe6'],[.4,'#9cf27e'],[1,'#1f6a32']]},
 light:'#7ef29a',spark:'#d8ffb8',deep:'#2a8a4a',accent:'#fff6c8',smoke:'#1a3020',rock:'#2a3a2a',
};
