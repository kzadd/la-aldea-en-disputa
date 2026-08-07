import { AnimatePresence, motion } from 'framer-motion'
import { RES_ICON } from '../../data/art.js'

const DEFENSE = {
  guardiana: 'el escudo de La Guardiana',
  muralla: 'la Muralla',
  fortaleza: 'la Fortaleza',
  nomada: 'El Nómada es inmune',
}

const REASON = {
  slot_taken: 'se la llevó otro',
  no_resources: 'sin recursos',
  blocked: 'bloqueado',
  empty: 'no había nada que robar',
}

const ICON = { build: '🏠', steal: '🫳', block: '⛔', damage: '💥' }

// Reveal dramático (GAME_DESIGN §5.3): quién hizo qué a quién. Los eventos ya
// vienen resueltos del servidor; acá solo se narran y se animan en secuencia.
export function RevealOverlay({ events, players, buildings, round, userId }) {
  // El espionaje nunca aparece acá: es la única acción silenciosa (§5.3)
  const shown = events.filter((e) => ['build', 'steal', 'block', 'damage'].includes(e.type))

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      // Opaco a propósito: un fondo translúcido deja leer el mercado por debajo
      // y ensucia el momento del reveal.
      className="bg-aldea-bg absolute inset-0 z-10 flex flex-col gap-3 overflow-y-auto p-4"
    >
      <h2 className="text-aldea-accent py-2 text-center">Revelación · ronda {round}</h2>

      {shown.length === 0 && <p className="text-center opacity-60">Nadie movió un dedo.</p>}

      <AnimatePresence>
        {shown.map((e, i) => (
          <motion.p
            key={e.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.5 }}
            className="bg-aldea-panel rounded p-3 leading-relaxed"
          >
            {ICON[e.type]} <b>{who(e.actor_id, players, userId)}</b>{' '}
            {narrate(e, players, buildings, userId)}
          </motion.p>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

const who = (id, players, userId) =>
  id === userId ? 'Tú' : (players.find((p) => p.user_id === id)?.profiles?.nickname ?? '—')

// A quién le pasó: "a ti" cuando la víctima es quien mira
const whom = (id, players, userId) =>
  id === userId ? 'ti' : (players.find((p) => p.user_id === id)?.profiles?.nickname ?? '—')

// Español: si el actor sos vos, la frase va en segunda persona.
const v = (mine, tercera, segunda) => (mine ? segunda : tercera)

function narrate(e, players, buildings, userId) {
  const mine = e.actor_id === userId
  const target = whom(e.target_id, players, userId)
  const name = buildings[e.payload.building]?.name ?? 'un edificio'
  const dim = (t) => <span className="opacity-60">{t}</span>

  if (e.type === 'build') {
    return e.payload.success
      ? `${v(mine, 'construyó', 'construiste')} ${name}`
      : dim(`no ${v(mine, 'pudo', 'pudiste')} construir (${REASON[e.payload.reason] ?? e.payload.reason})`)
  }

  if (e.type === 'steal') {
    if (e.payload.success) {
      return (
        <>
          le {v(mine, 'robó', 'robaste')} {e.payload.amount}
          {RES_ICON[e.payload.resource]} a <b>{target}</b>
        </>
      )
    }
    return dim(
      `${v(mine, 'intentó', 'intentaste')} robar a ${target} y ${
        e.payload.blocked_by ? `lo frenó ${DEFENSE[e.payload.blocked_by]}` : REASON[e.payload.reason] ?? 'falló'
      }`
    )
  }

  if (e.type === 'block') {
    return e.payload.success ? (
      <>
        {v(mine, 'bloqueó', 'bloqueaste')} la construcción de <b>{target}</b>
      </>
    ) : (
      dim(`${v(mine, 'intentó', 'intentaste')} bloquear a ${target} — ${DEFENSE[e.payload.blocked_by]}`)
    )
  }

  if (e.type === 'damage') {
    return e.payload.success ? (
      <>
        {v(mine, 'dañó', 'dañaste')} {name} de <b>{target}</b>
      </>
    ) : (
      dim(`${v(mine, 'intentó', 'intentaste')} dañar a ${target} — ${DEFENSE[e.payload.blocked_by]}`)
    )
  }
  return null
}
