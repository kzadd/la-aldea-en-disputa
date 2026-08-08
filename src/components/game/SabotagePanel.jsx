import { useState } from 'react'
import { RESOURCES, RES_LABEL, SABOTAGES } from '../../data/art.js'
import { PixelIcon } from '../PixelIcon.jsx'
import { Avatar } from '../Avatar.jsx'
import { Button, Modal } from '../ui.jsx'

// Un solo botón abre el modal con todo: qué sabotaje, contra quién y con qué
// detalle. Antes eran cuatro botones y un panel que crecía debajo del mercado;
// en un móvil eso empujaba el resto de la pantalla y no se entendía nada.
export function SabotagePanel({
  sabotage,
  onChange,
  disabled,
  me,
  round,
  cooldowns,
  players,
  userId,
  target,
  onTarget,
  targetName,
  targetBuildings,
  buildings,
  onSpy,
  spying,
}) {
  const [abierto, setAbierto] = useState(false)
  const def = SABOTAGES.find((s) => s.type === sabotage?.type)

  const cdUntil = (t) => cooldowns.find((c) => c.sabotage_type === t)?.available_from_round ?? 0
  const onCooldown = (t) => cdUntil(t) > round
  const canPay = (cost) => Object.entries(cost).every(([k, v]) => me[k] >= v)
  const rivales = players.filter((p) => p.user_id !== userId)
  const disponibles = SABOTAGES.filter((s) => !onCooldown(s.type) && canPay(s.cost)).length

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAbierto(true)}
        className={`flex items-center gap-2 rounded p-3 disabled:opacity-40 ${
          sabotage ? 'bg-aldea-accent text-aldea-bg' : 'bg-aldea-panel'
        }`}
      >
        <PixelIcon name={def?.icon ?? 'robo'} size={18} />
        <span className="min-w-0 flex-1 text-left">
          {sabotage ? resumenCorto(sabotage, targetName) : 'Sabotear a alguien'}
        </span>
        <span className="opacity-60">
          {sabotage ? 'cambiar' : `${disponibles}/${SABOTAGES.length}`}
        </span>
        <PixelIcon name="flecha_abajo" size={10} />
      </button>

      {abierto && (
        <Modal title="Sabotaje" onClose={() => setAbierto(false)}>
          <div className="grid grid-cols-4 gap-1">
            {SABOTAGES.map((s) => {
              const on = sabotage?.type === s.type
              const cd = onCooldown(s.type)
              const poor = !canPay(s.cost)
              return (
                <button
                  key={s.type}
                  type="button"
                  disabled={cd || poor}
                  onClick={() =>
                    s.type === 'spy'
                      ? onChange({ type: 'spy' })
                      : onChange(on ? null : { type: s.type, params: defaults(s.type) })
                  }
                  className={`flex flex-col items-center gap-1 rounded p-2 disabled:opacity-30 ${
                    on ? 'bg-aldea-accent text-aldea-bg' : 'bg-aldea-bg'
                  }`}
                >
                  <PixelIcon name={s.icon} size={18} />
                  <span className="text-[8px]">{s.label}</span>
                  <Cost cost={s.cost} cd={cd ? cdUntil(s.type) : null} />
                </button>
              )
            })}
          </div>

          {!sabotage && (
            <p className="leading-relaxed opacity-60">
              Elegí una acción para ver qué hace. Las apagadas están en cooldown o no te
              alcanza para pagarlas.
            </p>
          )}

          {sabotage && (
            <>
              <p className="bg-aldea-bg flex items-start gap-2 rounded p-2 leading-relaxed">
                <PixelIcon name={def.icon} size={12} className="mt-[2px]" />
                <span>
                  <b className="text-aldea-accent">{def.label}:</b>{' '}
                  <span className="opacity-80">{def.desc}</span>
                </span>
              </p>

              <div className="flex flex-col gap-1">
                <span className="opacity-60">¿A quién?</span>
                <div className="flex flex-wrap gap-1">
                  {rivales.map((p) => {
                    const on = target === p.user_id
                    return (
                      <button
                        key={p.user_id}
                        type="button"
                        onClick={() => onTarget(on ? null : p.user_id)}
                        className={`flex items-center gap-1 rounded px-2 py-2 ${
                          on ? 'bg-aldea-accent text-aldea-bg' : 'bg-aldea-bg'
                        }`}
                      >
                        <Avatar
                          avatar={p.profiles?.avatar}
                          nickname={p.profiles?.nickname ?? ''}
                          size={12}
                          frame={false}
                        />
                        <span className="max-w-[5rem] truncate">{p.profiles?.nickname}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {sabotage.type === 'steal' && (
                <div className="flex flex-col gap-1">
                  <span className="opacity-60">¿Qué le robás?</span>
                  <div className="grid grid-cols-4 gap-1">
                    {RESOURCES.map((r) => (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => onChange({ ...sabotage, params: { resource: r.key } })}
                        title={r.label}
                        className={`flex items-center justify-center gap-1 rounded py-2 ${
                          sabotage.params?.resource === r.key
                            ? 'bg-aldea-accent text-aldea-bg'
                            : 'bg-aldea-bg'
                        }`}
                      >
                        <PixelIcon name={r.icon} size={14} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sabotage.type === 'damage' &&
                (target ? (
                  targetBuildings.length ? (
                    <div className="flex flex-col gap-1">
                      <span className="opacity-60">¿Qué edificio?</span>
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

              <Resumen
                sabotage={sabotage}
                targetName={targetName}
                buildings={buildings}
                targetBuildings={targetBuildings}
              />
            </>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              tone="ghost"
              onClick={() => {
                onChange(null)
                onTarget(null)
                setAbierto(false)
              }}
            >
              Quitar
            </Button>
            {sabotage?.type === 'spy' ? (
              <Button
                disabled={!target || spying}
                onClick={async () => {
                  await onSpy(target)
                  setAbierto(false)
                }}
              >
                {spying ? 'Espiando…' : 'Espiar ahora'}
              </Button>
            ) : (
              <Button onClick={() => setAbierto(false)}>Listo</Button>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}

const resumenCorto = (sabotage, targetName) => {
  const s = SABOTAGES.find((x) => x.type === sabotage.type)
  return targetName ? `${s.label} a ${targetName}` : `${s.label} · falta el objetivo`
}

function Resumen({ sabotage, targetName, buildings, targetBuildings }) {
  if (!targetName) return <p className="text-red-400">Elegí a quién.</p>
  const frase = {
    steal: `Le robás ${RES_LABEL[sabotage.params?.resource] ?? '—'} a ${targetName}.`,
    block: `${targetName} no podrá construir la próxima ronda.`,
    damage: (() => {
      const b = targetBuildings.find((x) => x.id === sabotage.params?.building_id)
      return b
        ? `Inutilizás ${buildings[b.building_key]?.name ?? 'su edificio'} de ${targetName}.`
        : 'Elegí qué edificio dañar.'
    })(),
    spy: `Vas a espiar a ${targetName}.`,
  }[sabotage.type]

  return (
    <p className="bg-aldea-bg text-aldea-accent flex items-center gap-2 rounded p-2 leading-relaxed">
      <PixelIcon name="check" size={12} />
      {frase}
    </p>
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
