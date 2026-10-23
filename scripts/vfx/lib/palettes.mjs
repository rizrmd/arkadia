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
 flame:{c:[[0,'#fff6cc'],[.18,'#ffc438'],[.46,'#ff6810'],[.76,'#d42406'],[1,'#6a0c02']]},
 hot:{c:[[0,'#fffdf2'],[.18,'#ffd24c'],[.46,'#ff7414'],[.76,'#d82806'],[1,'#6e0e04']]},
 body:{c:[[0,'#ffecb0'],[.22,'#ffaa2c'],[.52,'#f45810'],[.80,'#c82206'],[1,'#580a02']]},
 light:'#ff7818',spark:'#ffc850',deep:'#8e1806',accent:'#fff2b8',mid:'#7a1406',dark:'#380804',smoke:'#241612',rock:'#382018',
};
export const RIFT={
 flame:{c:[[0,'#a472ff'],[.24,'#6c34eb'],[.56,'#4416b4'],[.82,'#220864'],[1,'#1d1838']]},
 hot:{c:[[0,'#eef8ff'],[.20,'#68d8ff'],[.48,'#6c34eb'],[.78,'#4416b4'],[1,'#200660']]},
 body:{c:[[0,'#c69cff'],[.24,'#7848ff'],[.54,'#4416b4'],[.82,'#220864'],[1,'#18064c']]},
 light:'#6c34eb',spark:'#68d8ff',deep:'#32128e',accent:'#eef8ff',mid:'#4416b4',dark:'#220864',smoke:'#1d1838',rock:'#220864',
};
export const SEISMIC={
 flame:{c:[[0,'#fff6dc'],[.3,'#ffd986'],[.7,'#e0a448'],[1,'#b07a32']]},
 hot:{c:[[0,'#fffaf0'],[.2,'#fff0bf'],[.5,'#ffd06a'],[.8,'#d9902e'],[1,'#7a4a16']]},
 body:{c:[[0,'#fff3d0'],[.3,'#ffd57a'],[.65,'#d79a3c'],[1,'#5a3412']]},
 light:'#ffc65a',spark:'#ffe39a',deep:'#8a5a1e',accent:'#fff4cf',mid:'#6e4618',dark:'#3a220c',smoke:'#6b5a48',rock:'#6a5a4c',
};
// Molten earth: the Seismic Slam as the Ember Warden casts it.
export const MAGMA={
 flame:{c:[[0,'#fff6d8'],[.20,'#ffc854'],[.50,'#ff7214'],[.78,'#d42808'],[1,'#680e04']]},
 hot:{c:[[0,'#fffdf2'],[.20,'#ffd464'],[.48,'#ff7c18'],[.78,'#d82c08'],[1,'#5e0c04']]},
 body:{c:[[0,'#ffe6a4'],[.26,'#ff9428'],[.60,'#d8380c'],[1,'#380804']]},
 light:'#ff7418',spark:'#ffc858',deep:'#8c1806',accent:'#fff0b8',mid:'#6e1206',dark:'#2e0804',smoke:'#261814',rock:'#2c1a14',
};
export const ASTRAL={
 flame:{c:[[0,'#f2fcff'],[.22,'#7ce4ff'],[.50,'#4e68ff'],[.78,'#381ca8'],[1,'#1c0858']]},
 hot:{c:[[0,'#ffffff'],[.20,'#88ecff'],[.48,'#5472ff'],[.78,'#3a1eb0'],[1,'#1e085c']]},
 body:{c:[[0,'#e8f8ff'],[.26,'#6cd8ff'],[.56,'#4a58f0'],[.82,'#321698'],[1,'#180648']]},
 light:'#5478ff',spark:'#88ecff',deep:'#2e1490',accent:'#ffffff',mid:'#381ca8',dark:'#1e085c',smoke:'#201844',rock:'#281c64',
};
export const GOLD={
 flame:{c:[[0,'#fffbe0'],[.35,'#ffe58a'],[.7,'#ffc040'],[1,'#e09820']]},
 hot:{c:[[0,'#ffffff'],[.2,'#fff6c8'],[.5,'#ffd85a'],[.8,'#f0a020'],[1,'#8a5208']]},
 body:{c:[[0,'#fffbe0'],[.35,'#ffe07a'],[.7,'#ffb22e'],[1,'#7a4a0a']]},
 light:'#ffd04a',spark:'#fff1a8',deep:'#b07414',accent:'#bff6ff',mid:'#8a5208',dark:'#4a2c04',smoke:'#4a4030',rock:'#5a5040',
};
export const BLOOD={
 flame:{c:[[0,'#ffc8bc'],[.4,'#ff5a48'],[1,'#c41c18']]},
 hot:{c:[[0,'#fff0ec'],[.25,'#ff9c8a'],[.6,'#e8302a'],[1,'#5a0606']]},
 body:{c:[[0,'#ffb4a6'],[.4,'#e3352c'],[1,'#3a0404']]},
 light:'#ff3b30',spark:'#ff8a7a',deep:'#7a0a0a',accent:'#ffd6cf',mid:'#6a0808',dark:'#340404',smoke:'#2a1010',rock:'#3a1a1a',
};
export const STEEL={
 flame:{c:[[0,'#ffffff'],[.5,'#fff3dc'],[1,'#e0c8a0']]},
 hot:{c:[[0,'#ffffff'],[.3,'#fff8e6'],[.7,'#ffd99a'],[1,'#c08a4a']]},
 body:{c:[[0,'#ffffff'],[.5,'#fff0d2'],[1,'#a07850']]},
 light:'#fff1cf',spark:'#fff6dc',deep:'#8a6a4a',accent:'#ffffff',mid:'#6a523a',dark:'#382c20',smoke:'#4a4440',rock:'#5a5450',
};
export const LIFE={
 flame:{c:[[0,'#f4ffe8'],[.4,'#b4f59a'],[1,'#4ac46a']]},
 hot:{c:[[0,'#ffffff'],[.25,'#eaffd8'],[.6,'#8af27a'],[1,'#1f7a3a']]},
 body:{c:[[0,'#f2ffe6'],[.4,'#9cf27e'],[1,'#1f6a32']]},
 light:'#7ef29a',spark:'#d8ffb8',deep:'#2a8a4a',accent:'#fff6c8',mid:'#1f6a32',dark:'#10381a',smoke:'#1a3020',rock:'#2a3a2a',
};
