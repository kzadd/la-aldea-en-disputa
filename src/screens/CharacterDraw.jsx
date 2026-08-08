import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { enterGame, getMyMission } from '../lib/api.js'
import { CHARACTER_SPRITE } from '../data/icons.js'
import { PixelIcon } from '../components/PixelIcon.jsx'
import { Button, Panel } from '../components/ui.jsx'

const SPIN_MS = 2200

// Sorteo en vivo (GAME_DESIGN §2.3): el personaje es público, la misión no.
export default function CharacterDraw({ gameId, userId, players, characters, onDone }) {
  const [spinning, setSpinning] = useState(true)
  const [entrando, setEntrando] = useState(false)
  const [face, setFace] = useState(0)
  const [mission, setMission] = useState(null)
  const keys = Object.keys(characters)
  const me = players.find((p) => p.user_id === userId)

  useEffect(() => {
    const spin = setInterval(() => setFace((f) => f + 1), 90)
    const stop = setTimeout(() => {
      clearInterval(spin)
      setSpinning(false)
    }, SPIN_MS)
    getMyMission(gameId).then((m) => setMission(m?.[0] ?? null))
    return () => {
      clearInterval(spin)
      clearTimeout(stop)
    }
  }, [gameId])

  if (!me || keys.length === 0) return <p className="p-4">Repartiendo…</p>

  const shown = spinning ? keys[face % keys.length] : me.character_key
  const char = characters[shown]

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-aldea-accent py-2 text-center">Tu personaje</h1>

      <motion.div
        key={shown}
        animate={spinning ? { scale: 1 } : { scale: [1, 1.15, 1] }}
        transition={{ duration: 0.5 }}
        className="bg-aldea-panel flex flex-col items-center gap-3 rounded p-6 text-center"
      >
        <PixelIcon name={CHARACTER_SPRITE[shown] ?? 'interrogante'} size={72} />
        <p className="text-aldea-accent">{char?.name}</p>
        {!spinning && (
          <>
            <p className="leading-relaxed opacity-80">{char?.passive_text}</p>
            <p className="opacity-50">Camino: {char?.path}</p>
          </>
        )}
      </motion.div>

      {!spinning && (
        <>
          <Panel title="Tu misión secreta" icon="secreto">
            {mission ? (
              <>
                <p className="text-aldea-accent">{mission.name}</p>
                <p className="leading-relaxed opacity-80">{mission.description}</p>
                <p className="opacity-50">+{mission.points} puntos · nadie más la ve</p>
              </>
            ) : (
              <p className="opacity-60">Cargando…</p>
            )}
          </Panel>

          <Panel title="En la mesa">
            <ul className="flex flex-col gap-2">
              {players.map((p) => (
                <li key={p.user_id} className="bg-aldea-bg flex items-center gap-2 rounded p-2">
                  <PixelIcon name={CHARACTER_SPRITE[p.character_key] ?? 'interrogante'} size={14} />
                  <span>{p.user_id === userId ? 'Tú' : p.profiles?.nickname}</span>
                  <span className="ml-auto opacity-60">{characters[p.character_key]?.name}</span>
                </li>
              ))}
            </ul>
          </Panel>

          {/* Avisar al servidor acá y no al montar es lo que hace que el reloj
              de la ronda 1 arranque cuando entró el último, no cuando el host
              tocó "Iniciar". */}
          <Button
            full
            disabled={entrando}
            onClick={async () => {
              setEntrando(true)
              try {
                await enterGame(gameId)
              } catch {
                /* si falla, el tope del servidor cubre la ronda igual */
              }
              onDone()
            }}
          >
            A jugar
          </Button>
        </>
      )}
    </div>
  )
}
