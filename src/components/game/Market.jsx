import { RESOURCES } from '../../data/art.js'
import { PixelIcon } from '../PixelIcon.jsx'

// 6 cartas visibles para todos (GAME_DESIGN §4.1). El costo mostrado ya viene
// con la pasiva del Herrero aplicada por el servidor vía `discount`.
//
// Tres estados, como en el diseño: alcanzable (borde ámbar sólido), elegida
// (borde azul y fondo teñido) y fuera de alcance (borde punteado, apagada y con
// el detalle de lo que falta).
export function Market({ market, buildings, me, selected, onSelect, disabled }) {
  return (
    <div className="grid grid-cols-2 gap-[7px]">
      {market.map(({ slot, building_key }) => {
        const b = buildings[building_key]
        if (!b) {
          return (
            <div
              key={slot}
              className="border-aldea-line text-aldea-faint rounded-md border border-dashed p-3 text-center text-[11px]"
            >
              mazo agotado
            </div>
          )
        }
        const cost = effectiveCost(b, me.character_key)
        const falta = RESOURCES.filter(r => me[r.key] < cost[r.key])
        const puede = falta.length === 0
        const on = selected === slot
        return (
          <button
            key={slot}
            disabled={disabled || !puede}
            onClick={() => onSelect(on ? null : slot)}
            className={`flex flex-col gap-[7px] rounded-md border p-[11px] text-left ${
              puede || on ? 'border-solid' : 'cursor-not-allowed border-dashed'
            }`}
            style={{
              background: on ? 'rgba(110,168,216,.1)' : puede ? '#17110d' : '#140f0b',
              borderColor: on ? '#6ea8d8' : puede ? '#8a6224' : '#3d2c1d',
              opacity: puede || on ? 1 : 0.72,
            }}
          >
            <span className="flex items-center gap-[7px]">
              <span
                className={`font-title min-w-0 flex-1 text-[13px] leading-tight font-bold ${
                  on ? 'text-[#8fc0e8]' : 'text-aldea-accent'
                }`}
              >
                {b.name}
              </span>
              <span className="font-title text-aldea-ink text-[14px] font-bold">{b.points}</span>
              <PixelIcon name="trofeo" size={15} title="puntos" />
            </span>

            <span className="flex flex-wrap gap-2.5">
              {RESOURCES.filter(r => cost[r.key] > 0).map(r => (
                <span key={r.key} className="flex items-center gap-[5px]">
                  <span
                    className={`font-title text-[12px] font-bold ${
                      me[r.key] < cost[r.key] ? 'text-aldea-warm' : 'text-aldea-accent'
                    }`}
                  >
                    {cost[r.key]}
                  </span>
                  <PixelIcon name={r.icon} size={15} title={r.label} />
                </span>
              ))}
            </span>

            <span className="text-[12px] leading-[1.5]">{b.description}</span>

            {falta.length > 0 && (
              <span className="text-aldea-warm text-[11px] leading-[1.3]">
                te faltan{' '}
                {falta
                  .map(r => `${cost[r.key] - me[r.key]} ${r.label.toLowerCase()}`)
                  .join(' y ')}
              </span>
            )}
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
    food: b.cost_food
  }
}
