import { RESOURCES, SABOTAGES } from '../../data/art.js'
import { PixelIcon } from '../PixelIcon.jsx'

// Las 4 acciones, siempre visibles (GAME_DESIGN §5.1). Se deshabilitan por
// cooldown o por falta de recursos; el servidor revalida todo igual.
export function SabotagePanel({
  sabotage,
  onChange,
  disabled,
  me,
  round,
  cooldowns,
  target,
  targetName,
  targetBuildings,
  buildings,
  onSpy,
  spying,
}) {
  const cdUntil = (t) => cooldowns.find((c) => c.sabotage_type === t)?.available_from_round ?? 0
  const onCooldown = (t) => cdUntil(t) > round
  const canPay = (cost) => Object.entries(cost).every(([k, v]) => me[k] >= v)

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-1">
        {SABOTAGES.map((s) => {
          const on = sabotage?.type === s.type
          const cd = onCooldown(s.type)
          const poor = !canPay(s.cost)
          return (
            <button
              key={s.type}
              type="button"
              disabled={disabled || cd || poor}
              onClick={() =>
                s.type === 'spy'
                  ? onChange({ type: 'spy' })
                  : onChange(on ? null : { type: s.type, params: defaults(s.type) })
              }
              title={cd ? `Disponible en la ronda ${cdUntil(s.type)}` : s.label}
              className={`bg-aldea-panel flex flex-col items-center gap-1 rounded p-2 disabled:opacity-30 ${
                on ? 'ring-aldea-accent ring-2' : ''
              }`}
            >
              <PixelIcon name={s.icon} size={18} />
              <span className="text-[8px]">{s.label}</span>
              <Cost cost={s.cost} cd={cd ? cdUntil(s.type) : null} />
            </button>
          )
        })}
      </div>

      {sabotage && (
        <div className="bg-aldea-panel flex flex-col gap-2 rounded p-2">
          <p className="opacity-60">
            {target ? `Objetivo: ${targetName}` : 'Elige un rival arriba ↑'}
          </p>

          {sabotage.type === 'steal' && (
            <div className="grid grid-cols-4 gap-1">
              {RESOURCES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => onChange({ ...sabotage, params: { resource: r.key } })}
                  title={r.label}
                  className={`flex items-center justify-center rounded py-2 ${
                    sabotage.params?.resource === r.key
                      ? 'bg-aldea-accent text-aldea-bg'
                      : 'bg-aldea-bg'
                  }`}
                >
                  <PixelIcon name={r.icon} size={14} />
                </button>
              ))}
            </div>
          )}

          {sabotage.type === 'block' && (
            <p className="opacity-60">No podrá construir la próxima ronda.</p>
          )}

          {sabotage.type === 'damage' &&
            (target ? (
              targetBuildings.length ? (
                <div className="flex flex-col gap-1">
                  {targetBuildings.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => onChange({ ...sabotage, params: { building_id: b.id } })}
                      className={`flex items-center gap-2 rounded px-2 py-2 text-left ${
                        sabotage.params?.building_id === b.id
                          ? 'bg-aldea-accent text-aldea-bg'
                          : 'bg-aldea-bg'
                      }`}
                    >
                      <PixelIcon name="casa" size={12} />
                      {buildings[b.building_key]?.name ?? b.building_key}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-red-400">Ese rival no tiene edificios que dañar.</p>
              )
            ) : null)}

          {sabotage.type === 'spy' && (
            <>
              <p className="leading-relaxed opacity-60">
                Verás sus recursos, su decisión de esta ronda y su misión secreta. Nadie se entera.
              </p>
              <button
                type="button"
                disabled={!target || spying}
                onClick={() => onSpy(target)}
                className="bg-aldea-accent text-aldea-bg flex items-center justify-center gap-2 rounded px-3 py-2 disabled:opacity-40"
              >
                <PixelIcon name="espionaje" size={12} />
                {spying ? 'Espiando…' : 'Espiar ahora'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Cost({ cost, cd }) {
  if (cd) return <span className="text-[8px] opacity-60">r{cd}</span>
  return (
    <span className="flex items-center gap-1 text-[8px] opacity-70">
      {Object.entries(cost).map(([k, v]) => (
        <span key={k} className="flex items-center gap-[1px]">
          {v}
          <PixelIcon name={RES_SPRITE[k]} size={10} />
        </span>
      ))}
    </span>
  )
}

const RES_SPRITE = { wood: 'madera', stone: 'piedra', gold: 'oro', food: 'comida' }
const defaults = (type) => (type === 'steal' ? { resource: 'wood' } : {})
