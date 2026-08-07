// Solo presentación. Costos, efectos y puntos viven en el servidor.

export const RESOURCES = [
  { key: 'wood', label: 'Madera', icon: '🪵' },
  { key: 'stone', label: 'Piedra', icon: '🪨' },
  { key: 'gold', label: 'Oro', icon: '🪙' },
  { key: 'food', label: 'Comida', icon: '🌾' },
]

export const RES_ICON = Object.fromEntries(RESOURCES.map((r) => [r.key, r.icon]))

export const CHARACTER_ICON = {
  herrero: '🔨',
  comerciante: '⚖️',
  espia: '🕵️',
  guardiana: '🛡️',
  granjero: '🌾',
  saqueador: '🏴',
  arquitecta: '📐',
  nomada: '🐫',
}

export const TIER_STYLE = {
  basico: 'border-stone-500',
  intermedio: 'border-sky-500',
  avanzado: 'border-amber-400',
}

// Costos y cooldowns espejo de _sabotage_cost/_sabotage_cooldown: solo para
// previsualizar. El servidor los cobra y los valida.
export const SABOTAGES = [
  { type: 'steal', label: 'Robo', icon: '🫳', cost: { wood: 2 }, cooldown: 2 },
  { type: 'block', label: 'Bloqueo', icon: '⛔', cost: { stone: 3, gold: 1 }, cooldown: 2 },
  { type: 'damage', label: 'Daño', icon: '💥', cost: { gold: 3 }, cooldown: 2 },
  { type: 'spy', label: 'Espionaje', icon: '👁️', cost: { gold: 1, food: 1 }, cooldown: 1 },
]

export const costLabel = (cost) =>
  Object.entries(cost)
    .map(([k, v]) => `${v}${RES_ICON[k]}`)
    .join(' ')
