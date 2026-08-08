// Solo presentación. Costos, efectos y puntos viven en el servidor.
// Los iconos son sprites pixel art (ver data/icons.js), no emoji.

export const RESOURCES = [
  { key: 'wood', label: 'Madera', icon: 'madera' },
  { key: 'stone', label: 'Piedra', icon: 'piedra' },
  { key: 'gold', label: 'Oro', icon: 'oro' },
  { key: 'food', label: 'Comida', icon: 'comida' },
]

export const RES_ICON = Object.fromEntries(RESOURCES.map((r) => [r.key, r.icon]))
export const RES_LABEL = Object.fromEntries(RESOURCES.map((r) => [r.key, r.label]))

export const TIER_STYLE = {
  basico: 'border-stone-500',
  intermedio: 'border-sky-500',
  avanzado: 'border-amber-400',
}

// Costos y cooldowns espejo de _sabotage_cost/_sabotage_cooldown: solo para
// previsualizar. El servidor los cobra y los valida.
export const SABOTAGES = [
  {
    type: 'steal',
    label: 'Robo',
    icon: 'robo',
    cost: { wood: 2 },
    cooldown: 2,
    desc: 'Le quitás 2 unidades del recurso que elijas y pasan a tu almacén. Si no tiene, no te llevás nada.',
  },
  {
    type: 'block',
    label: 'Bloqueo',
    icon: 'bloqueo',
    cost: { stone: 3, gold: 1 },
    cooldown: 2,
    desc: 'La próxima ronda no podrá construir. El Nómada es inmune.',
  },
  {
    type: 'damage',
    label: 'Daño',
    icon: 'danio',
    cost: { gold: 3 },
    cooldown: 2,
    desc: 'Inutilizás uno de sus edificios: deja de dar su efecto. La Fortaleza es inmune.',
  },
  {
    type: 'spy',
    label: 'Espionaje',
    icon: 'espionaje',
    cost: { gold: 1, food: 1 },
    cooldown: 1,
    desc: 'Ves sus recursos, su decisión de esta ronda y su misión secreta. Nadie se entera, ni siquiera él.',
  },
]

export const SABOTAGE_ICON = Object.fromEntries(SABOTAGES.map((s) => [s.type, s.icon]))

export const PATH_ICON = {
  constructor: 'casa',
  acumulador: 'caja',
  superviviente: 'escudo',
  saboteador: 'bandera',
}
