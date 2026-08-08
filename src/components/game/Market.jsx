import { RESOURCES, TIER_STYLE } from '../../data/art.js'
import { PixelIcon } from '../PixelIcon.jsx'

// 6 cartas visibles para todos (GAME_DESIGN §4.1). El costo mostrado ya viene
// con la pasiva del Herrero aplicada por el servidor vía `discount`.
export function Market({ market, buildings, me, selected, onSelect, disabled }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {market.map(({ slot, building_key }) => {
        const b = buildings[building_key]
        if (!b) {
          return (
            <div key={slot} className="bg-aldea-panel/40 rounded p-2 text-center opacity-40">
              mazo agotado
            </div>
          )
        }
        const cost = effectiveCost(b, me.character_key)
        const afford = RESOURCES.every((r) => me[r.key] >= cost[r.key])
        const on = selected === slot
        return (
          <button
            key={slot}
            disabled={disabled || !afford}
            onClick={() => onSelect(on ? null : slot)}
            className={`flex flex-col gap-1 rounded border-2 p-2 text-left transition disabled:opacity-40 ${
              on
                ? 'border-aldea-accent bg-aldea-accent/20 ring-aldea-accent ring-2'
                : `bg-aldea-panel ${TIER_STYLE[b.tier]}`
            }`}
          >
            <span className="flex items-center justify-between gap-1">
              <span className={on ? 'text-aldea-ink' : 'text-aldea-accent'}>{b.name}</span>
              <span className="flex items-center gap-1">
                {b.points}
                <PixelIcon name="trofeo" size={12} title="puntos" />
              </span>
            </span>
            {/* Sin esto no había ninguna señal de cuál habías elegido */}
            {on && (
              <span className="text-aldea-accent flex items-center gap-1">
                <PixelIcon name="check" size={10} />
                Elegida
              </span>
            )}
            <span className="flex flex-wrap gap-2">
              {RESOURCES.filter((r) => cost[r.key] > 0).map((r) => (
                <span
                  key={r.key}
                  className={`flex items-center gap-1 ${me[r.key] < cost[r.key] ? 'text-red-400' : ''}`}
                >
                  {cost[r.key]}
                  <PixelIcon name={r.icon} size={12} title={r.label} />
                </span>
              ))}
            </span>
            <span className="leading-relaxed opacity-60">{b.description}</span>
          </button>
        )
      })}
    </div>
  )
}

// Espejo de _building_cost() en el servidor: solo para previsualizar. La verdad
// se cobra en resolve_round.
export function effectiveCost(b, characterKey) {
  return {
    wood: b.cost_wood,
    stone: Math.max(0, b.cost_stone - (characterKey === 'herrero' ? 1 : 0)),
    gold: b.cost_gold,
    food: b.cost_food,
  }
}
