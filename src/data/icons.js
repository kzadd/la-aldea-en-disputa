// Sprites pixel art. Cada uno trae su propia paleta de 3-4 tonos (`p`) y su
// rejilla (`g`), un carácter por píxel y `.` transparente. Es el sistema del
// prototipo de diseño: iconos de 5x5, retratos de 7x7.
// El renderer está en components/PixelIcon.jsx. Nada de emoji: el emoji lo
// dibuja el sistema operativo y cambia de estilo en cada teléfono.

const s = (p, g) => ({ p, g })

// Paletas compartidas
const MADERA = { a: '#a9754a', b: '#5c3d24', c: '#c99a6a' }
const PIEDRA = { a: '#9aa0a6', b: '#4e555b', c: '#c2c7cc' }
const ORO = { a: '#e8c33d', b: '#8f6f22', c: '#f6e08a' }
const COMIDA = { a: '#6dbf4a', b: '#2f6320', c: '#8fd96a' }
const TINTA = { a: '#f2e7d5', b: '#17110d', c: '#a08e78' }
const ACENTO = { a: '#e8a33d', b: '#8a6224', c: '#f2bd63' }

export const ICONS = {
  // ------------------------------------------------------------- recursos
  madera: s(MADERA, ['.ccb.', 'caaab', 'cacab', 'caaab', '.bbb.']),
  piedra: s(PIEDRA, ['..cc.', '.caab', 'caaab', 'aabbb', '.bbb.']),
  oro: s(ORO, ['.ccb.', 'ccaab', 'caaab', 'abbbb', '.bbb.']),
  comida: s(COMIDA, ['.c.c.', 'caaab', '.cab.', '..b..', '..b..']),

  // ------------------------------------------------------------ sabotajes
  robo: s({ a: '#e0a884', b: '#8c5a3c' }, ['a.a.a', 'aaaaa', 'aaaaa', '.aaa.', '..b..']),
  // Daga: el sabotaje en general. La mano es la del Robo y no puede
  // representar a los cuatro.
  sabotaje: s({ a: '#c8ccd4', b: '#e8a33d', c: '#8c5a3c' }, [
    '..a..',
    '..a..',
    'bbbbb',
    '..c..',
    '..c..'
  ]),
  bloqueo: s({ a: '#e05a4a', b: '#f2e7d5' }, ['..a..', 'aaaaa', 'bbbbb', 'aaaaa', '..a..']),
  danio: s({ a: '#e8a33d', b: '#e07a5f' }, ['a.a.a', '.aaa.', 'aabaa', '.aaa.', 'a.a.a']),
  espionaje: s({ a: '#f2e7d5', b: '#4a8fd0', c: '#17110d' }, ['.....', '.aaa.', 'abcba', '.aaa.', '.....']),

  // ------------------------------------------------------------------- UI
  casa: s({ a: '#a9754a', b: '#5c3d24', c: '#d8b98f', d: '#c99a6a' },
    ['..d..', '.dab.', 'daaab', '.cbc.', '.cbc.']),
  trofeo: s(ORO, ['ccaab', 'caaab', '.cab.', '..b..', '.cbb.']),
  medalla: s(ORO, ['a...a', '.a.a.', '.ccc.', 'caaac', '.ccc.']),
  secreto: s({ a: '#e8a33d', b: '#8a6224', c: '#17110d' },
    ['.bbb.', 'b...b', 'aaaaa', 'acbca', 'aaaaa']),
  // Aro claro y esfera oscura: al revés se veía como un bloque blanco
  reloj: s({ a: '#f2e7d5', b: '#17110d', c: '#e8a33d' },
    ['.aaa.', 'abbba', 'abcba', 'abbba', '.aaa.']),
  check: s({ a: '#7fb069', b: '#4d7a3f' }, ['....a', '...aa', 'b..aa', 'baaa.', '.bba.']),
  cruz: s({ a: '#e07a5f', b: '#8c3a28' }, ['a...a', '.a.a.', '..a..', '.a.a.', 'a...a']),
  escudo: s({ a: '#4a8fd0', b: '#17110d', c: '#2a5f96' },
    ['ccccc', 'caaac', 'caaac', '.cac.', '..c..']),
  caja: s(MADERA, ['ccccc', 'cabac', 'caaac', 'cabac', 'bbbbb']),
  bandera: s({ a: '#c0492e', b: '#8a6224', c: '#e07a5f' },
    ['baaa.', 'baca.', 'baaa.', 'b....', 'b....']),
  hoja: s(COMIDA, ['...cc', '.caa.', 'caaa.', '.aab.', 'b....']),
  torre: s({ a: '#9aa0a6', b: '#4e555b', c: '#e8a33d' },
    ['a.a.a', 'aaaaa', '.aca.', '.aaa.', 'bbbbb']),
  persona: s({ a: '#e8c9a0', b: '#2a1c12', c: '#e8a33d' },
    ['.aaa.', 'ababa', '.aaa.', 'ccccc', 'c...c']),
  desconectado: s({ a: '#9d8b74', b: '#c0492e' },
    ['aaaaa', 'ab.ba', 'a.b.a', 'ab.ba', 'aaaaa']),
  copiar: s(TINTA, ['.aaaa', '.a..a', 'aaaaa', 'a..aa', 'aaaa.']),
  whatsapp: s({ a: '#7fb069', b: '#f2e7d5' }, ['.aaa.', 'abbba', 'ab.ba', 'abbba', 'a.aaa']),
  salir: s(TINTA, ['aaa..', 'a..a.', 'a.aaa', 'a..a.', 'aaa..']),
  lapiz: s({ a: '#e8a33d', b: '#8a6224', c: '#f2e7d5' },
    ['...cc', '..caa', '.caa.', 'baa..', 'bb...']),
  interrogante: s({ a: '#a08e78' }, ['.aa..', '...a.', '..a..', '.....', '..a..']),
  flecha_abajo: s({ a: '#a08e78' }, ['.....', 'aa.aa', '.aaa.', '..a..', '.....']),
  flecha_arriba: s({ a: '#a08e78' }, ['.....', '..a..', '.aaa.', 'aa.aa', '.....']),
  flecha_izq: s({ a: '#a08e78' }, ['..a..', '.a...', 'aaaaa', '.a...', '..a..']),
  stats: s(ACENTO, ['b....', 'b..a.', 'b.aa.', 'baaa.', 'bbbbb']),
  viento: s({ a: '#8fd96a', b: '#2f6320' }, ['.....', 'aaa..', '..aab', 'aaa..', '.....']),

  // --------------------------------------------------------- avatares 7x7
  aldeano: s({ a: '#e8c9a0', b: '#2a1c12', c: '#4a7fb5' },
    ['.ccccc.', 'ccccccc', '.aaaaa.', '.ababa.', '.aaaaa.', '..bbb..', '.aaaaa.']),
  alien: s({ a: '#5ec24a', b: '#0f1a0c', c: '#5ec24a' },
    ['..aaa..', '.aaaaa.', 'aaaaaaa', 'abbabba', 'aaaaaaa', '.aaaaa.', '..a.a..']),
  oso: s({ a: '#a9754a', b: '#241a13', c: '#7a5233' },
    ['cc...cc', '.aaaaa.', 'aaaaaaa', 'abaaaba', 'aaaaaaa', '.accca.', '..aaa..']),
  rana: s({ a: '#6dbf4a', b: '#12200f', c: '#6dbf4a' },
    ['.a...a.', 'aba.aba', 'aaaaaaa', 'aaaaaaa', 'abbbbba', '.aaaaa.', '..aaa..']),
  zorro: s({ a: '#e8a33d', b: '#17110d', c: '#f2e7d5' },
    ['a.....a', 'aa...aa', 'aaaaaaa', 'abaaaba', 'aaaaaaa', '.acaca.', '..aaa..']),
  pinguino: s({ a: '#2a2a2e', b: '#e8a33d', c: '#f2e7d5' },
    ['..aaa..', '.aaaaa.', 'aaaaaaa', 'acaaaca', 'aacbcaa', '.ccccc.', '..c.c..']),
  dragon: s({ a: '#4fae6a', b: '#12200f', c: '#2f7a45' },
    ['c..c..c', '.aaaaa.', 'aaaaaaa', 'abaaaba', 'aaaaaaa', '.accca.', '..aaa..']),
  mapache: s({ a: '#9aa0a6', b: '#2a2a2e', c: '#f2e7d5' },
    ['a.....a', 'aaaaaaa', 'abbbbba', 'abcbcba', 'aaaaaaa', '.accca.', '..aaa..']),
  robot: s({ a: '#8c93a8', b: '#17110d', c: '#e8a33d' },
    ['...c...', '...a...', 'aaaaaaa', 'acaaaca', 'aaaaaaa', 'abbbbba', 'aaaaaaa']),
  buho: s({ a: '#b98a4e', b: '#17110d', c: '#f2e7d5' },
    ['aa...aa', 'aaaaaaa', 'acccca.', 'abcacba', 'acccca.', '.a.b.a.', '..aaa..']),
  gato: s({ a: '#4c4a52', b: '#17110d', c: '#8ed17a' },
    ['a.....a', 'aa...aa', 'aaaaaaa', 'acaaaca', 'aaaaaaa', '.abbba.', '..aaa..']),
  jabali: s({ a: '#6d5a4a', b: '#17110d', c: '#f2e7d5' },
    ['.a...a.', 'aaaaaaa', 'abaaaba', 'aaaaaaa', 'caaaaac', '.aaaaa.', '..bbb..']),
  bruja: s({ a: '#e8c9a0', b: '#2a1c12', c: '#6a4a86' },
    ['...c...', '..ccc..', 'ccccccc', '.aaaaa.', '.ababa.', '.abbba.', '.aaaaa.']),
  esqueleto: s({ a: '#e4e0d4', b: '#17110d', c: '#a8a293' },
    ['..aaa..', '.aaaaa.', 'aaaaaaa', 'abbabba', 'aaaaaaa', '.ababa.', '..aaa..']),
  fantasma: s({ a: '#cfe3ef', b: '#17110d', c: '#9fc4d8' },
    ['..aaa..', '.aaaaa.', 'aaaaaaa', 'abaaaba', 'aaaaaaa', 'aaaaaaa', 'a.a.a.a']),

  // ------------------------------------------------------ personajes 7x7
  granjero: s({ a: '#6dbf4a', b: '#d8b25a', c: '#2a1c12' },
    ['..ccc..', '.bbbbb.', '..aaa..', '.aaaaa.', 'aaaaaaa', '.aaaaa.', '..a.a..']),
  guardiana: s({ a: '#4a8fd0', b: '#17110d', c: '#2a5f96' },
    ['.ccccc.', 'ccccccc', '.aaaaa.', 'abbbbba', '.abbba.', '.aaaaa.', '..aaa..']),
  arquitecta: s({ a: '#c98bd0', b: '#17110d', c: '#7d4f8c' },
    ['ccccccc', '.aaaaa.', 'abbbbba', 'aaaaaaa', 'abbbbba', '.aaaaa.', 'ccccccc']),
  herrero: s({ a: '#e07a5f', b: '#17110d', c: '#8c93a8' },
    ['..ccc..', '..ccc..', '..aaa..', '.aaaaa.', 'aaaaaaa', '.aaaaa.', '..a.a..']),
  comerciante: s({ a: '#d8c85a', b: '#17110d', c: '#a8912f' },
    ['..ccc..', '.caaac.', 'caaaaac', 'caabaac', 'caaaaac', '.caaac.', '..ccc..']),
  espia: s({ a: '#e8c9a0', b: '#17110d', c: '#2a2a2e' },
    ['..ccc..', 'ccccccc', '.aaaaa.', '.babab.', '.aaaaa.', '..bbb..', '..aaa..']),
  saqueador: s({ a: '#e8c9a0', b: '#17110d', c: '#c0492e' },
    ['.......', '.ccccc.', '.aaaaa.', '.babab.', '.aaaaa.', '.ccccc.', '..aaa..']),
  nomada: s({ a: '#e8c9a0', b: '#17110d', c: '#a9754a' },
    ['..ccc..', '.ccccc.', '.caaac.', '.cbabc.', '.caaac.', '..ccc..', '..c.c..']),
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
  { key: 'buho', label: 'Búho' },
  { key: 'gato', label: 'Gato' },
  { key: 'jabali', label: 'Jabalí' },
  { key: 'bruja', label: 'Bruja' },
  { key: 'esqueleto', label: 'Esqueleto' },
  { key: 'fantasma', label: 'Fantasma' },
]

// Cada avatar tiene su propio sprite; la clave y el nombre del icono coinciden.
export const AVATAR_SPRITE = (key) => key

// Personaje -> sprite (misma clave)
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

// Medallas: mismo sprite, distinto metal
export const MEDAL_TINT = [
  { a: '#e8c33d', b: '#8f6f22', c: '#f6e08a' }, // oro
  { a: '#c2c7cc', b: '#6f767c', c: '#eef1f4' }, // plata
  { a: '#c98a52', b: '#7d4f2a', c: '#e5b183' }, // bronce
]
