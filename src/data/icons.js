// Sprites pixel art 8x8. Cada carácter es un píxel; el renderer está en
// components/PixelIcon.jsx. Nada de emoji: el emoji lo dibuja el sistema
// operativo y cambia de estilo en cada teléfono.

export const PALETTE = {
  '.': null, // transparente
  k: '#120c08', // contorno
  w: '#f0e0c8', // tinta
  a: '#d9a441', // oro / acento
  A: '#8a6520', // oro oscuro
  g: '#9a9a9a', // piedra
  G: '#565656', // piedra oscura
  b: '#9c6b3c', // madera
  B: '#5f3f1f', // madera oscura
  n: '#7ab84a', // verde
  N: '#3f6a22', // verde oscuro
  r: '#c0483a', // rojo
  R: '#6d2018', // rojo oscuro
  u: '#4a7fbf', // azul
  U: '#2a4a73', // azul oscuro
  s: '#e8b98a', // piel
  c: '#cfd6dd', // plata
  p: '#8a6bb0', // púrpura
  o: '#e07b39', // naranja
  O: '#a8511e', // naranja oscuro
}

export const ICONS = {
  // ------------------------------------------------------------- recursos
  // Los cuatro recursos se leen a 10px y aparecen por todos lados: se dibujan
  // con siluetas bien distintas entre sí (tablón vertical, roca, moneda, espiga).
  madera: [
    '.kkkkkk.',
    'kbbbbbbk',
    'kbBBBBbk',
    'kbbbbbbk',
    'kbBBBBbk',
    'kbbbbbbk',
    'kbBBBBbk',
    '.kkkkkk.',
  ],
  piedra: [
    '........',
    '..kkkk..',
    '.kggggk.',
    'kgggGggk',
    'kggGGgGk',
    'kgGGGGGk',
    '.kkkkkk.',
    '........',
  ],
  oro: [
    '..kkkk..',
    '.kaaaak.',
    'kawaaaak',
    'kawaAAak',
    'kaaaAAak',
    'kaaaaaak',
    '.kaaaak.',
    '..kkkk..',
  ],
  comida: [
    '...aa...',
    '..aAAa..',
    '.aAaaAa.',
    '..aAAa..',
    '.aAaaAa.',
    '..aAAa..',
    '...NN...',
    '...NN...',
  ],

  // ----------------------------------------------------------- personajes
  herrero: [
    '.....kk.',
    '....kggk',
    '...kgggk',
    '..kkggkk',
    '.kBBkk..',
    'kBBk....',
    'kBk.....',
    'kk......',
  ],
  comerciante: [
    '...k....',
    '.kkkkkk.',
    'ka.k.ak.',
    'kaakaak.',
    '.aa.aa..',
    '...k....',
    '..kkk...',
    '.kkkkk..',
  ],
  espia: [
    '..kkkk..',
    '.kkkkkk.',
    'kkkkkkkk',
    '.swwwws.',
    '.skwwks.',
    '..swws..',
    '........',
    '........',
  ],
  guardiana: [
    '.kkkkkk.',
    'kuuuuuuk',
    'kuwwwwuk',
    'kuwUUwuk',
    'kuuwwuuk',
    '.kuuuuk.',
    '..kuuk..',
    '...kk...',
  ],
  granjero: [
    '..kkkk..',
    '.kaaaak.',
    'kkkkkkkk',
    '...na...',
    '..nNan..',
    '.nNanNn.',
    '..nNan..',
    '...kN...',
  ],
  saqueador: [
    'kk......',
    'kkrrrrk.',
    'kkrRRrk.',
    'kkrrrrk.',
    'kk.kk...',
    'kk......',
    'kk......',
    'kk......',
  ],
  arquitecta: [
    'kk......',
    'kck.....',
    'kcck....',
    'kcAck...',
    'kcAAck..',
    'kcAAAck.',
    'kcccccck',
    'kkkkkkkk',
  ],
  nomada: [
    '...k....',
    '...ka...',
    '..kaak..',
    '..kaak..',
    '.kaAAak.',
    '.kaAAak.',
    'kaAkkAak',
    'kkkkkkkk',
  ],

  // ------------------------------------------------------------ sabotajes
  robo: [
    '..k.k.k.',
    '.ksksksk',
    '.kssssk.',
    'kssssssk',
    'kssssssk',
    '.kssssk.',
    '..kssk..',
    '...kk...',
  ],
  bloqueo: [
    '..kkkk..',
    '.krrrrk.',
    'krrrrrrk',
    'kwwwwwwk',
    'kwwwwwwk',
    'krrrrrrk',
    '.krrrrk.',
    '..kkkk..',
  ],
  danio: [
    'k..k..k.',
    '.k.k.k..',
    '..krk...',
    'kkrrrkk.',
    '..krk...',
    '.k.k.k..',
    'k..k..k.',
    '........',
  ],
  espionaje: [
    '........',
    '..kkkk..',
    '.kwwwwk.',
    'kwwUUwwk',
    'kwwUUwwk',
    '.kwwwwk.',
    '..kkkk..',
    '........',
  ],

  // ------------------------------------------------------------------- UI
  stats: [
    'k.......',
    'k....aa.',
    'k..aaaa.',
    'k.aaaaa.',
    'k.aaaaa.',
    'k.aaaaa.',
    'kkkkkkkk',
    '........',
  ],
  trofeo: [
    '.kkkkkk.',
    'kaaaaaak',
    'kkaaaakk',
    '.kaaaak.',
    '..kaak..',
    '...kk...',
    '..kaak..',
    '.kkkkkk.',
  ],
  medalla: [
    '.k....k.',
    '.kk..kk.',
    '..kkkk..',
    '.kaaaak.',
    'kaAAAAak',
    'kaAAAAak',
    '.kaaaak.',
    '..kkkk..',
  ],
  casa: [
    '...kk...',
    '..kaak..',
    '.kaaaak.',
    'kaaaaaak',
    'kkkkkkkk',
    'kbbkkbbk',
    'kbbkkbbk',
    'kkkkkkkk',
  ],
  caja: [
    'kkkkkkkk',
    'kbbkkbbk',
    'kbbkkbbk',
    'kkkkkkkk',
    'kbbkkbbk',
    'kbbkkbbk',
    'kbbkkbbk',
    'kkkkkkkk',
  ],
  escudo: [
    'kkkkkkkk',
    'kuuuuuuk',
    'kuUUUUuk',
    'kuUUUUuk',
    '.kuUUuk.',
    '..kuuk..',
    '...kk...',
    '........',
  ],
  bandera: [
    'kk......',
    'kkrrrrk.',
    'kkrRRrk.',
    'kkrrrrk.',
    'kk......',
    'kk......',
    'kk......',
    'kk......',
  ],
  check: [
    '........',
    '......kn',
    '.....knn',
    'k...knn.',
    'kn.knn..',
    '.knnn...',
    '..kn....',
    '........',
  ],
  reloj: [
    '..kkkk..',
    '.kwwwwk.',
    'kwwkwwwk',
    'kwwkwwwk',
    'kwkkkwwk',
    'kwwwwwwk',
    '.kwwwwk.',
    '..kkkk..',
  ],
  hoja: [
    '........',
    '...nnnn.',
    '..nNnnn.',
    '.nNnnnn.',
    'nNnnnn..',
    '.nNnn...',
    '..kn....',
    '...k....',
  ],
  secreto: [
    '..kkkk..',
    '.k....k.',
    '.k....k.',
    'kkkkkkkk',
    'kaaaaaak',
    'kaakkaak',
    'kaaaaaak',
    'kkkkkkkk',
  ],
  torre: [
    'k.kk.k..',
    'kkkkkkk.',
    '.kggk...',
    '.kgak...',
    '.kggk...',
    '.kggk...',
    'kkggkk..',
    'kkkkkk..',
  ],
  persona: [
    '..kkk...',
    '.kswsk..',
    '.ksssk..',
    '..kkk...',
    '.kaaak..',
    'kaaaaak.',
    'kak.kak.',
    'kk...kk.',
  ],
  desconectado: [
    'kkkkkkkk',
    'kwwwwwwk',
    'kwrwwrwk',
    'kwwrrwwk',
    'kwrwwrwk',
    'kwwwwwwk',
    'kkkkkkkk',
    '...kk...',
  ],
  copiar: [
    '..kkkkk.',
    '..kwwwk.',
    'kkkkkwk.',
    'kwwwkwk.',
    'kwwwkkk.',
    'kwwwwwk.',
    'kwwwwwk.',
    'kkkkkkk.',
  ],
  whatsapp: [
    '.kkkkkk.',
    'knnnnnnk',
    'knwwnnnk',
    'knwnnnnk',
    'knwwwnnk',
    'knnnwwnk',
    'kwnnnnnk',
    '.kkkkkk.',
  ],
  salir: [
    'kkkkk...',
    'kwwwk...',
    'kwwwk.k.',
    'kwwwkkkk',
    'kwwwkkkk',
    'kwwwk.k.',
    'kwwwk...',
    'kkkkk...',
  ],
  // ------------------------------------------------------------- avatares
  // Retratos de perfil. Se leen a 24px dentro del marco de la tarjeta y a 32px
  // en el selector, así que cada uno tiene una silueta distinta (orejas, cuernos,
  // antena) para reconocerse de lejos aunque el color se pierda.
  // El aldeano es un retrato como los demás (los otros son cabezas; el sprite
  // `persona` es de cuerpo entero y desentonaba en la fila). El gorro se tiñe
  // según el nombre para que no sean todos idénticos.
  aldeano: [
    '..kkkk..',
    '.kaaaak.',
    'kaaaaaak',
    'kssssssk',
    'kskssksk',
    'kssssssk',
    '.kskksk.',
    '..kkkk..',
  ],
  alien: [
    '..nnnn..',
    '.nnnnnn.',
    'nnnnnnnn',
    'nkknnkkn',
    'nkknnkkn',
    'nnnnnnnn',
    '.nnnnnn.',
    '..nNNn..',
  ],
  oso: [
    'bb....bb',
    'bBb..bBb',
    '.bbbbbb.',
    'bbbbbbbb',
    'bkbbbbkb',
    'bbbwwbbb',
    '.bwkkwb.',
    '..bbbb..',
  ],
  rana: [
    '.nn..nn.',
    'nknnnnkn',
    'nnnnnnnn',
    'nnnnnnnn',
    'nNnnnnNn',
    '.nkkkkn.',
    '..nnnn..',
    '........',
  ],
  zorro: [
    'oo....oo',
    'oOo..oOo',
    '.oooooo.',
    'oooooooo',
    'ookookoo',
    '.owwwwo.',
    '..wkkw..',
    '...ww...',
  ],
  // Cuerpo gris oscuro y no negro: sobre el fondo de la app el negro puro
  // desaparece y el pingüino quedaba como una mancha blanca flotando.
  pinguino: [
    '..kkkk..',
    '.kGGGGk.',
    'kGwwwwGk',
    'kGkwwkGk',
    'kGwoowGk',
    'kGwwwwGk',
    '.kGGGGk.',
    '.oo..oo.',
  ],
  dragon: [
    'n......n',
    'nn....nn',
    '.nnnnnn.',
    'nnrnnrnn',
    'nnnnnnnn',
    'nnkNNknn',
    '.nkkkkn.',
    '..nnnn..',
  ],
  mapache: [
    'gg....gg',
    'gGg..gGg',
    '.gwwwwg.',
    'gkkwwkkg',
    'gkwwwwkg',
    '.gwkkwg.',
    '..gwwg..',
    '...gg...',
  ],
  robot: [
    '...a....',
    '...k....',
    'kkkkkkkk',
    'kcccccck',
    'kcuccuck',
    'kcccccck',
    'kckkkkck',
    'kkkkkkkk',
  ],

  lapiz: [
    '.....kk.',
    '....kaak',
    '...kaak.',
    '..kaak..',
    '.kwak...',
    'kwwk....',
    'kwk.....',
    'kk......',
  ],
  flecha_abajo: [
    '........',
    '..kkkk..',
    '..kwwk..',
    '..kwwk..',
    'kkkwwkkk',
    '.kwwwwk.',
    '..kwwk..',
    '...kk...',
  ],
  flecha_arriba: [
    '...kk...',
    '..kwwk..',
    '.kwwwwk.',
    'kkkwwkkk',
    '..kwwk..',
    '..kwwk..',
    '..kkkk..',
    '........',
  ],
  interrogante: [
    '..kkkk..',
    '.kaaaak.',
    'kak..kak',
    '.....ka.',
    '...kka..',
    '...ka...',
    '........',
    '...ka...',
  ],
}

// Personaje -> sprite
export const CHARACTER_SPRITE = {
  herrero: 'herrero',
  comerciante: 'comerciante',
  espia: 'espia',
  guardiana: 'guardiana',
  granjero: 'granjero',
  saqueador: 'saqueador',
  arquitecta: 'arquitecta',
  nomada: 'nomada',
}

// Avatares elegibles. El orden es el del selector; las claves tienen que
// coincidir con la lista blanca de `set_my_avatar()`: si acá se agrega uno, hay
// que agregarlo también en la base o la RPC lo rechaza.
export const AVATARS = [
  { key: 'aldeano', label: 'Aldeano' },
  { key: 'alien', label: 'Alien' },
  { key: 'oso', label: 'Oso' },
  { key: 'rana', label: 'Rana' },
  { key: 'zorro', label: 'Zorro' },
  { key: 'pinguino', label: 'Pingüino' },
  { key: 'dragon', label: 'Dragón' },
  { key: 'mapache', label: 'Mapache' },
  { key: 'robot', label: 'Robot' },
]

// Cada avatar tiene su propio sprite; la clave y el nombre del icono coinciden.
export const AVATAR_SPRITE = (key) => key

// Medallas: mismo sprite, distinto metal
export const MEDAL_TINT = [
  { a: '#d9a441', A: '#8a6520' }, // oro
  { a: '#cfd6dd', A: '#7d858c' }, // plata
  { a: '#c08a4a', A: '#7a5222' }, // bronce
]
