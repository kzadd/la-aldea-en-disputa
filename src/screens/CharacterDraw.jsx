import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { PixelIcon } from '../components/PixelIcon.jsx'
import { Button } from '../components/ui.jsx'
import { tinte } from '../data/colores.js'
import { CHARACTER_SPRITE } from '../data/icons.js'
import { enterGame, getMyMission } from '../lib/api.js'

// La ruleta arranca rápida y frena de a poco, como en el diseño: 26 pasos con
// una espera que crece con el cuadrado del paso. Va hacia atrás desde el
// personaje que tocó, así que el último salto cae siempre en el correcto —el
// resultado ya lo decidió el servidor, esto solo lo cuenta.
const PASOS = 26
const espera = (i) => 40 + i * i * 0.55

// Sorteo en vivo (GAME_DESIGN §2.3): el personaje es público, la misión no.
export default function CharacterDraw({ gameId, userId, players, characters, onDone }) {
  const [entrando, setEntrando] = useState(false)
  const [paso, setPaso] = useState(0)
  const [mission, setMission] = useState(null)
  const [ficha, setFicha] = useState(null)
  const keys = Object.keys(characters)
  const me = players.find(p => p.user_id === userId)
  const spinning = paso < PASOS

  useEffect(() => {
    getMyMission(gameId).then(m => setMission(m?.[0] ?? null))
  }, [gameId])

  useEffect(() => {
    if (paso >= PASOS) return
    const t = setTimeout(() => setPaso(p => p + 1), espera(paso))
    return () => clearTimeout(t)
  }, [paso])

  if (!me || keys.length === 0) return <p className="text-aldea-muted p-4">Repartiendo…</p>

  // Vos primero y el resto detrás, sin perder el color que a cada uno le tocó
  // por orden de llegada.
  const mesa = players
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (a.p.user_id === userId ? -1 : b.p.user_id === userId ? 1 : 0))

  const destino = Math.max(0, keys.indexOf(me.character_key))
  const n = keys.length
  const shown = spinning ? keys[(((destino - (PASOS - paso)) % n) + n) % n] : me.character_key
  const char = characters[shown]

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-title text-aldea-accent py-1 text-center text-[13px] font-bold">
        TU PERSONAJE
      </h1>

      <motion.div
        key={shown}
        animate={spinning ? { scale: 1 } : { scale: [1, 1.12, 1] }}
        transition={{ duration: 0.5 }}
        className="bg-aldea-panel border-aldea-line flex flex-col items-center gap-3.5 rounded-lg border px-4 py-6 text-center"
      >
        {/* La habilidad y el camino se ven también mientras gira: el sorteo
            enseña los ocho personajes de paso, no solo sus caras. */}
        <PixelIcon name={CHARACTER_SPRITE[shown] ?? 'interrogante'} size={70} />
        <p className="font-title text-aldea-accent text-[15px] font-bold">{char?.name}</p>
        <p className="text-[13px] leading-[1.7]">{char?.passive_text}</p>
        <p className="text-aldea-dim text-[12px]">Camino: {char?.path}</p>
      </motion.div>

      {spinning ? (
        <p className="text-aldea-faint py-3 text-center text-[12px]">repartiendo personajes…</p>
      ) : (
        <>
          <div className="bg-aldea-panel border-aldea-line flex flex-col gap-1.5 rounded-lg border p-4">
            <h2 className="font-title text-aldea-accent flex items-center gap-2 text-[12px] font-bold">
              <PixelIcon name="bloqueo" size={15} />
              TU MISIÓN SECRETA
            </h2>
            {mission ? (
              <>
                <p className="font-title text-aldea-accent-soft text-[15px] font-bold">
                  {mission.name}
                </p>
                <p className="text-[13px] leading-relaxed">{mission.description}</p>
                <p className="text-aldea-dim text-[12px]">
                  +{mission.points} puntos · nadie más la ve
                </p>
              </>
            ) : (
              <p className="text-aldea-muted text-[12px]">Cargando…</p>
            )}
          </div>

          <div className="bg-aldea-panel border-aldea-line flex flex-col gap-2.5 rounded-lg border p-4">
            <h2 className="font-title text-aldea-muted text-[11px] tracking-wide">EN LA MESA</h2>
            {/* Mismo color por jugador que en la sala, y el "?" solo en los
                rivales: la propia habilidad ya está arriba, en grande. */}
            <ul className="flex flex-col gap-2.5">
              {mesa.map(({ p, i }) => {
                const soyYo = p.user_id === userId
                const abierta = ficha === p.user_id
                const suyo = characters[p.character_key]
                return (
                  <li key={p.user_id} className="relative">
                    <button
                      type="button"
                      data-info={soyYo ? undefined : true}
                      disabled={soyYo}
                      onClick={() => setFicha(abierta ? null : p.user_id)}
                      onMouseEnter={() => !soyYo && setFicha(p.user_id)}
                      onMouseLeave={() => !soyYo && setFicha(null)}
                      className="bg-aldea-card flex w-full items-center gap-2.5 rounded-md border p-3"
                      style={{ borderColor: tinte(i) }}
                    >
                      <span
                        className="bg-aldea-panel flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[5px] border-2"
                        style={{ borderColor: tinte(i) }}
                      >
                        <PixelIcon name={p.profiles?.avatar || 'aldeano'} size={24} />
                      </span>
                      <span
                        className={`font-title min-w-0 flex-1 truncate text-left text-[12px] font-bold ${
                          soyYo ? 'text-aldea-ink' : 'text-aldea-muted'
                        }`}
                      >
                        {soyYo ? 'TÚ' : p.profiles?.nickname}
                      </span>
                      <span className="text-aldea-dim max-w-[45%] shrink truncate text-[12px]">
                        {characters[p.character_key]?.name}
                      </span>
                      {!soyYo && (
                        <span className="border-aldea-line flex h-[26px] w-[24px] shrink-0 items-center justify-center rounded-[3px] border">
                          <PixelIcon name="interrogante" size={15} />
                        </span>
                      )}
                    </button>

                    {/* La ficha del rival, colgando de su fila. Se abre al tocar
                        (móvil) o al pasar por encima (escritorio). */}
                    {abierta && !soyYo && (
                      <div
                        className="absolute top-[calc(100%+8px)] right-0 left-0 z-20 flex items-start gap-2.5 rounded-md border p-3"
                        style={{
                          background: '#1d150f',
                          borderColor: '#8a6224',
                          borderTop: '3px solid #e8a33d',
                          boxShadow: '0 8px 20px rgba(0,0,0,.55)',
                        }}
                      >
                        <PixelIcon
                          name={CHARACTER_SPRITE[p.character_key] ?? 'interrogante'}
                          size={28}
                        />
                        <div className="flex flex-1 flex-col gap-1.5 text-left">
                          <p className="font-title text-aldea-accent text-[12px] font-bold">
                            {suyo?.name}
                          </p>
                          <p className="text-[12px] leading-relaxed">{suyo?.passive_text}</p>
                          <p className="text-aldea-dim text-[11px]">Camino: {suyo?.path}</p>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

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
            A JUGAR
          </Button>
        </>
      )}
    </div>
  )
}
