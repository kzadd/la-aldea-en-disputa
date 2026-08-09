import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { RES_ICON, RES_LABEL } from '../../data/art.js'
import { PixelIcon } from '../PixelIcon.jsx'

const DEFENSE = {
  guardiana: 'el escudo de La Guardiana',
  muralla: 'la Muralla',
  fortaleza: 'la Fortaleza',
  nomada: 'El Nómada es inmune'
}

const REASON = {
  slot_taken: 'se la llevó otro',
  no_resources: 'sin recursos',
  blocked: 'bloqueado',
  empty: 'no había nada que robar'
}

const ICON = { build: 'casa', steal: 'robo', block: 'bloqueo', damage: 'danio' }

// Reveal dramático (GAME_DESIGN §5.3): quién hizo qué a quién. Los eventos ya
// vienen resueltos del servidor; acá solo se narran y se animan en secuencia.
export function RevealOverlay({ events, players, buildings, round, userId, deadline }) {
  // El espionaje nunca aparece acá: es la única acción silenciosa (§5.3)
  const shown = events.filter(e => ['build', 'steal', 'block', 'damage'].includes(e.type))
  const left = useCountdown(deadline)

  // Quien no hizo nada visible también tiene su línea: si no, una ronda tranquila
  // se veía vacía y no quedaba claro que el resto sí había jugado. Al que espió
  // se lo saltea —su acción es secreta y ni a él le vamos a decir otra cosa—.
  const espié = events.some(e => e.type === 'spy_private' && e.actor_id === userId)
  const actuaron = new Set(shown.map(e => e.actor_id))
  const quietos = players.filter(
    p => !actuaron.has(p.user_id) && !(p.user_id === userId && espié)
  )

  const lineas = [
    ...shown.map(e => ({
      key: e.id,
      icon: ICON[e.type],
      mio: e.actor_id === userId,
      nombre: who(e.actor_id, players, userId),
      texto: narrate(e, players, buildings, userId)
    })),
    ...quietos.map(p => ({
      key: `quieto-${p.user_id}`,
      icon: 'casa',
      mio: p.user_id === userId,
      nombre: who(p.user_id, players, userId),
      texto: p.user_id === userId ? 'guardaste tus recursos' : 'guardó sus recursos'
    }))
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      // Opaco a propósito: un fondo translúcido deja leer el mercado por debajo
      // y ensucia el momento del reveal.
      className="bg-aldea-card absolute inset-0 z-10 flex flex-col gap-3 overflow-y-auto p-4"
    >
      <h2 className="flex items-center justify-center gap-2.5 py-2 text-center">
        <span className="font-title text-aldea-accent text-[13px] font-bold">
          Revelación · ronda {round}
        </span>
        {left !== null && (
          <span
            className="font-title rounded-[5px] border px-2.5 py-1.5 text-[12px] leading-none font-bold"
            style={{ background: '#241a13', borderColor: '#3d2c1d', color: '#f2e7d5' }}
          >
            {left}s
          </span>
        )}
      </h2>

      {lineas.length === 0 && (
        <p className="text-aldea-dim py-4 text-center text-[13px]">Nadie movió un dedo.</p>
      )}

      <AnimatePresence>
        {lineas.map((l, i) => (
          <motion.p
            key={l.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            // 5 s de reveal: las líneas tienen que estar todas antes del cierre
            transition={{ delay: Math.min(i * 0.3, 2) }}
            className="border-aldea-line flex items-start gap-2.5 rounded-md border p-3"
            style={{ background: '#241a13' }}
          >
            <PixelIcon name={l.icon} size={15} className="mt-[2px]" />
            {/* Nombre en Silkscreen y el relato en la tipografía del cuerpo:
                el ojo salta de nombre en nombre y después lee qué pasó. */}
            <span className="flex flex-1 flex-wrap items-baseline gap-1.5">
              <span
                className={`font-title text-[12px] leading-[1.4] font-bold ${
                  l.mio ? 'text-aldea-ink' : 'text-aldea-accent'
                }`}
              >
                {l.nombre}
              </span>
              <span className="text-[13px] leading-[1.5]" style={{ color: '#d8cbb8' }}>
                {l.texto}
              </span>
            </span>
          </motion.p>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

// Cuánto falta para que el reveal se cierre solo. Lo decide el servidor; acá
// solo se muestra, para no quedarse mirando sin saber cuánto queda.
function useCountdown(deadline) {
  const [left, setLeft] = useState(null)
  useEffect(() => {
    if (!deadline) return setLeft(null)
    const tick = () =>
      setLeft(Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [deadline])
  return left
}

const who = (id, players, userId) =>
  id === userId ? 'Tú' : (players.find(p => p.user_id === id)?.profiles?.nickname ?? '—')

// A quién le pasó: "a ti" cuando la víctima es quien mira
const whom = (id, players, userId) =>
  id === userId ? 'ti' : (players.find(p => p.user_id === id)?.profiles?.nickname ?? '—')

// Español: si el actor sos vos, la frase va en segunda persona.
const v = (mine, tercera, segunda) => (mine ? segunda : tercera)

function narrate(e, players, buildings, userId) {
  const mine = e.actor_id === userId
  const target = whom(e.target_id, players, userId)
  const name = buildings[e.payload.building]?.name ?? 'un edificio'
  const dim = t => <span className="opacity-60">{t}</span>

  if (e.type === 'build') {
    return e.payload.success
      ? `${v(mine, 'construyó', 'construiste')} ${name}`
      : dim(
          `no ${v(mine, 'pudo', 'pudiste')} construir (${REASON[e.payload.reason] ?? e.payload.reason})`
        )
  }

  if (e.type === 'steal') {
    if (e.payload.success) {
      return (
        <>
          le {v(mine, 'robó', 'robaste')} {e.payload.amount}{' '}
          <PixelIcon
            name={RES_ICON[e.payload.resource]}
            size={11}
            title={RES_LABEL[e.payload.resource]}
          />{' '}
          a <b>{target}</b>
        </>
      )
    }
    return dim(
      `${v(mine, 'intentó', 'intentaste')} robar a ${target} y ${
        e.payload.blocked_by
          ? `lo frenó ${DEFENSE[e.payload.blocked_by]}`
          : (REASON[e.payload.reason] ?? 'falló')
      }`
    )
  }

  if (e.type === 'block') {
    return e.payload.success ? (
      <>
        {v(mine, 'bloqueó', 'bloqueaste')} la construcción de <b>{target}</b>
      </>
    ) : (
      dim(
        `${v(mine, 'intentó', 'intentaste')} bloquear a ${target} — ${DEFENSE[e.payload.blocked_by]}`
      )
    )
  }

  if (e.type === 'damage') {
    return e.payload.success ? (
      <>
        {v(mine, 'dañó', 'dañaste')} {name} de <b>{target}</b>
      </>
    ) : (
      dim(
        `${v(mine, 'intentó', 'intentaste')} dañar a ${target} — ${DEFENSE[e.payload.blocked_by]}`
      )
    )
  }
  return null
}
