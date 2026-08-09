import { useEffect, useState } from 'react'
import { RESOURCES, RES_ICON, RES_LABEL, SABOTAGES } from '../../data/art.js'
import { tinte } from '../../data/colores.js'
import { PixelIcon } from '../PixelIcon.jsx'
import { Button, Modal } from '../ui.jsx'

// Una barra abre el modal, y el modal va en dos pasos: primero a quién, después
// qué. Es el orden en el que se piensa —"a este lo quiero frenar"— y evita el
// panel largo que antes empujaba el mercado fuera de la pantalla.
export function SabotagePanel({
  sabotage,
  onChange,
  disabled,
  me,
  round,
  cooldowns,
  players,
  characters,
  userId,
  target,
  onTarget,
  targetName,
  targetBuildings,
  buildings,
  onSpy,
  spying
}) {
  const [abierto, setAbierto] = useState(false)
  const [paso, setPaso] = useState(1)

  // La ronda nueva llega sola (la cierra el servidor): si el modal quedó
  // abierto sin elegir nada, se cierra para no tapar la mesa recién repartida.
  useEffect(() => {
    setAbierto(false)
    setPaso(1)
  }, [round])

  const cdUntil = t => cooldowns.find(c => c.sabotage_type === t)?.available_from_round ?? 0
  const onCooldown = t => cdUntil(t) > round
  const canPay = cost => Object.entries(cost).every(([k, v]) => me[k] >= v)
  const def = SABOTAGES.find(s => s.type === sabotage?.type)
  const rivales = players.filter(p => p.user_id !== userId)
  const disponibles = SABOTAGES.filter(s => !onCooldown(s.type) && canPay(s.cost)).length

  const abrir = () => {
    setPaso(target ? 2 : 1)
    setAbierto(true)
  }

  const quitar = () => {
    onChange(null)
    onTarget(null)
    setPaso(1)
    setAbierto(false)
  }

  return (
    <>
      {/* Sin sabotajes al alcance la barra queda punteada y apagada, con el
          motivo a la derecha: es el mismo lenguaje que las cartas del mercado. */}
      <button
        type="button"
        disabled={disabled || (!sabotage && disponibles === 0)}
        onClick={abrir}
        className={`flex items-center gap-2.5 rounded-md border p-3 ${
          sabotage || disponibles > 0
            ? 'border-solid'
            : 'cursor-not-allowed border-dashed opacity-60'
        }`}
        style={{
          background: '#241a13',
          borderColor: sabotage ? '#e8a33d' : '#3d2c1d',
        }}
      >
        <PixelIcon name={def?.icon ?? 'sabotaje'} size={15} />
        <span className="text-aldea-ink min-w-0 flex-1 text-left text-[13px]">
          {sabotage ? resumenCorto(sabotage, targetName) : 'Sabotear a alguien'}
        </span>
        {sabotage ? (
          <span className="text-aldea-muted text-[12px]">cambiar</span>
        ) : disponibles > 0 ? (
          <span className="text-aldea-muted text-[12px]">
            {disponibles}/{SABOTAGES.length}
          </span>
        ) : (
          <span className="text-aldea-warm text-[11px]">sin recursos</span>
        )}
      </button>

      {abierto && (
        <Modal
          title="SABOTAJE"
          icon={def?.icon ?? 'sabotaje'}
          onClose={() => setAbierto(false)}
          extra={
            <span className="text-aldea-dim text-[11px]">
              {disponibles} de {SABOTAGES.length} sabotajes
            </span>
          }
        >
          {paso === 1 ? (
            <>
              <p className="text-aldea-muted text-[12px]">Paso 1 de 2 · ¿a quién?</p>
              <div className="flex flex-col gap-[7px]">
                {rivales.map((p, i) => {
                  const on = target === p.user_id
                  return (
                    <button
                      key={p.user_id}
                      type="button"
                      onClick={() => {
                        onTarget(p.user_id)
                        setPaso(2)
                      }}
                      className="hover:border-aldea-accent flex items-center gap-[11px] rounded-lg border p-3"
                      style={{
                        background: on ? 'rgba(232,163,61,.12)' : '#17110d',
                        borderColor: on ? '#e8a33d' : '#3d2c1d',
                      }}
                    >
                      <span
                        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[5px] border-2"
                        style={{ background: '#241a13', borderColor: tinte(indiceDe(players, p)) }}
                      >
                        <PixelIcon name={p.profiles?.avatar || 'aldeano'} size={24} />
                      </span>
                      <span className="font-title text-aldea-ink min-w-0 flex-1 truncate text-left text-[12px] font-bold">
                        {p.profiles?.nickname}
                      </span>
                      {/* Personaje y puntos juntos: es lo que se mira para
                          decidir a quién frenar. */}
                      <span className="text-aldea-dim shrink-0 text-[11px]">
                        {characters?.[p.character_key]?.name ?? '—'} · {p.points} pts
                      </span>
                    </button>
                  )
                })}
              </div>
              <Button full tone="salir" onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <p className="text-aldea-muted text-[12px]">Paso 2 de 2 · ¿qué le hacés?</p>

              <div
                className="flex items-center gap-2 rounded-md border px-3 py-2.5"
                style={{ background: '#17110d', borderColor: '#3d2c1d' }}
              >
                <span className="flex-1 text-[12px]">Objetivo: {targetName}</span>
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="text-aldea-accent text-[11px]"
                >
                  cambiar
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {SABOTAGES.map(s => {
                  const on = sabotage?.type === s.type
                  const cd = onCooldown(s.type)
                  const poor = !canPay(s.cost)
                  return (
                    <button
                      key={s.type}
                      type="button"
                      disabled={cd || poor}
                      onClick={() =>
                        onChange(on ? null : { type: s.type, params: defaults(s.type) })
                      }
                      className="flex flex-col items-center gap-[7px] rounded-lg border px-1.5 py-[11px] disabled:opacity-40"
                      style={{
                        background: on ? '#e8a33d' : '#17110d',
                        borderColor: on ? '#e8a33d' : '#3d2c1d',
                      }}
                    >
                      <span
                        className="flex items-center justify-center rounded-[5px] p-1.5"
                        style={{ background: '#17110d' }}
                      >
                        <PixelIcon name={s.icon} size={20} />
                      </span>
                      <span
                        className="text-[12px] leading-none"
                        style={{ color: on ? '#17110d' : '#f2e7d5' }}
                      >
                        {s.label}
                      </span>
                      {cd ? (
                        <span className="text-aldea-dim text-[10px] leading-none">ronda {cdUntil(s.type)}</span>
                      ) : (
                        <span className="flex items-center gap-[5px]">
                          {Object.entries(s.cost).map(([k, v]) => (
                            <span key={k} className="flex items-center gap-[3px]">
                              <span
                                className="font-title text-[11px] font-bold"
                                style={{ color: on ? '#17110d' : '#e8a33d' }}
                              >
                                {v}
                              </span>
                              <PixelIcon name={RES_ICON[k]} size={15} title={RES_LABEL[k]} />
                            </span>
                          ))}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {sabotage && def && (
                <p
                  className="flex items-start gap-2.5 rounded-md border p-3 text-[12px] leading-[1.6]"
                  style={{ background: '#1d150f', borderColor: '#8a6224' }}
                >
                  <PixelIcon name={def.icon} size={15} className="mt-[2px]" />
                  <span>
                    <span className="text-aldea-accent">{def.label}: </span>
                    {def.desc}
                  </span>
                </p>
              )}

              {sabotage?.type === 'steal' && (
                <div className="flex flex-col gap-1">
                  <span className="text-aldea-muted text-[12px]">¿Qué le robás?</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {RESOURCES.map(r => {
                      const on = sabotage.params?.resource === r.key
                      return (
                        <button
                          key={r.key}
                          type="button"
                          onClick={() => onChange({ ...sabotage, params: { resource: r.key } })}
                          className="flex flex-col items-center gap-1.5 rounded-md border py-2.5"
                          style={{
                            background: on ? '#e8a33d' : '#17110d',
                            borderColor: on ? '#e8a33d' : '#3d2c1d',
                          }}
                        >
                          <span
                            className="flex items-center justify-center rounded-[5px] p-1.5"
                            style={{ background: '#17110d' }}
                          >
                            <PixelIcon name={r.icon} size={20} />
                          </span>
                          <span
                            className="text-[11px] leading-none"
                            style={{ color: on ? '#17110d' : '#9d8b74' }}
                          >
                            {r.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {sabotage?.type === 'damage' &&
                (targetBuildings.length ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-aldea-muted text-[12px]">¿Qué edificio?</span>
                    {targetBuildings.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => onChange({ ...sabotage, params: { building_id: b.id } })}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-[12px] ${
                          sabotage.params?.building_id === b.id
                            ? 'border-aldea-accent bg-aldea-line'
                            : 'bg-aldea-card border-aldea-line'
                        }`}
                      >
                        <PixelIcon name="casa" size={13} />
                        {buildings[b.building_key]?.name ?? b.building_key}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-aldea-warm text-[12px]">
                    Ese rival no tiene edificios que dañar.
                  </p>
                ))}

              {sabotage && (
                <Resumen
                  sabotage={sabotage}
                  targetName={targetName}
                  buildings={buildings}
                  targetBuildings={targetBuildings}
                />
              )}

              {/* Sin acción elegida no hay botón que apretar: un cartel apagado
                  invita a tocarlo y no hace nada. */}
              {!sabotage && (
                <p className="text-aldea-dim text-center text-[12px]">
                  Elegí una acción para continuar.
                </p>
              )}

              <div className={`grid gap-2 ${sabotage ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <Button tone="salir" onClick={quitar}>
                  Volver
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
                  sabotage && (
                    <Button onClick={() => setAbierto(false)}>Sabotear a {targetName}</Button>
                  )
                )}
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  )
}

// El color de cada jugador se asigna por su lugar en la mesa, igual que en la
// sala: hay que buscarlo en la lista completa, no en la de rivales.
const indiceDe = (players, p) => players.findIndex(x => x.user_id === p.user_id)

const resumenCorto = (sabotage, targetName) => {
  const s = SABOTAGES.find(x => x.type === sabotage.type)
  return targetName ? `${s.label} a ${targetName}` : `${s.label} · falta el objetivo`
}

function Resumen({ sabotage, targetName, buildings, targetBuildings }) {
  if (!targetName) return <p className="text-aldea-warm text-[12px]">Elegí a quién.</p>
  const frase = {
    steal: `Le robás ${RES_LABEL[sabotage.params?.resource] ?? '—'} a ${targetName}.`,
    block: `${targetName} no podrá construir la próxima ronda.`,
    damage: (() => {
      const b = targetBuildings.find(x => x.id === sabotage.params?.building_id)
      return b
        ? `Inutilizás ${buildings[b.building_key]?.name ?? 'su edificio'} de ${targetName}.`
        : 'Elegí qué edificio dañar.'
    })(),
    spy: `Vas a espiar a ${targetName}.`
  }[sabotage.type]

  return (
    <p className="bg-aldea-card text-aldea-accent flex items-center gap-2 rounded-lg p-3 text-[12px] leading-relaxed">
      <PixelIcon name="check" size={12} />
      {frase}
    </p>
  )
}


const RES_SPRITE = { wood: 'madera', stone: 'piedra', gold: 'oro', food: 'comida' }
const defaults = type => (type === 'steal' ? { resource: 'wood' } : {})
