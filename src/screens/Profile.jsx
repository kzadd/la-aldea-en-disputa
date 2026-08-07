import { useEffect, useState } from 'react'
import { loadMyStats } from '../lib/api.js'
import { CHARACTER_ICON } from '../data/art.js'
import { Button, Panel } from '../components/ui.jsx'

const PATH_ICON = {
  constructor: '🏠',
  acumulador: '📦',
  superviviente: '🛡',
  saboteador: '🏴',
}

// Perfil personal: estadísticas completas + historial (GAME_DESIGN §10.2)
export default function Profile({ userId, profile, characters, onBack }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    loadMyStats(userId).then(setData).catch(() => setData({ stats: null, recent: [] }))
  }, [userId])

  if (!data) return <p className="p-4">Cargando…</p>
  const s = data.stats

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-aldea-accent py-2 text-center">{profile.nickname}</h1>

      {!s ? (
        <Panel>
          <p className="leading-relaxed opacity-60">
            Todavía no terminaste ninguna partida. Jugá una y acá vas a ver tus números.
          </p>
        </Panel>
      ) : (
        <>
          <Panel title="Tus números">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Jugadas" value={s.games_played} />
              <Stat label="Ganadas" value={s.games_won} />
              <Stat label="Winrate" value={`${s.winrate ?? 0}%`} />
            </div>
            <ul className="flex flex-col gap-1 opacity-70">
              <li>
                Personaje más usado: {CHARACTER_ICON[s.favorite_character]}{' '}
                {characters[s.favorite_character]?.name ?? '—'}
              </li>
              <li>
                Mejor winrate con: {CHARACTER_ICON[s.best_character]}{' '}
                {characters[s.best_character]?.name ?? '—'}
              </li>
              <li>
                Camino más usado: {PATH_ICON[s.most_used_path]} {s.most_used_path ?? '—'}
              </li>
            </ul>
          </Panel>

          <Panel title="Partidas recientes">
            {data.recent.length === 0 ? (
              <p className="opacity-60">Sin historial.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.recent.map((g) => (
                  <li key={g.game_id} className="bg-aldea-bg flex items-center gap-2 rounded p-2">
                    <span>{g.won ? '🏆' : '·'}</span>
                    <span>{CHARACTER_ICON[g.character_key]}</span>
                    <span className="min-w-0 flex-1 truncate opacity-70">
                      {new Date(g.finished_at).toLocaleDateString('es', {
                        day: '2-digit',
                        month: '2-digit',
                      })}{' '}
                      · {g.players}j
                    </span>
                    <span className="text-aldea-accent">{g.points} pts</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}

      <Button full tone="ghost" onClick={onBack}>
        Volver
      </Button>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-aldea-bg flex flex-col gap-1 rounded p-2">
      <span className="text-aldea-accent text-[13px]">{value}</span>
      <span className="text-[8px] opacity-60">{label}</span>
    </div>
  )
}
