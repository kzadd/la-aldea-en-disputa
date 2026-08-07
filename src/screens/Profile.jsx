import { useEffect, useState } from 'react'
import { Avatar } from '../components/Avatar.jsx'
import { PixelIcon } from '../components/PixelIcon.jsx'
import { Button, Panel } from '../components/ui.jsx'
import { PATH_ICON } from '../data/art.js'
import { CHARACTER_SPRITE } from '../data/icons.js'
import { loadMyStats } from '../lib/api.js'

// Perfil personal: estadísticas completas + historial (GAME_DESIGN §10.2)
export default function Profile({ userId, profile, characters, onBack }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    loadMyStats(userId)
      .then(setData)
      .catch(() => setData({ stats: null, recent: [] }))
  }, [userId])

  if (!data) return <p className="p-4">Cargando…</p>
  const s = data.stats

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-aldea-accent flex items-center justify-center gap-2 py-2 leading-[normal]">
        <Avatar avatar={profile.avatar} nickname={profile.nickname} size={20} frame={false} />
        {profile.nickname}
      </h1>

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
            <ul className="flex flex-col gap-2 opacity-70">
              <Line
                icon={CHARACTER_SPRITE[s.favorite_character]}
                label="Más usado"
                value={characters[s.favorite_character]?.name ?? '—'}
              />
              <Line
                icon={CHARACTER_SPRITE[s.best_character]}
                label="Mejor winrate"
                value={characters[s.best_character]?.name ?? '—'}
              />
              <Line
                icon={PATH_ICON[s.most_used_path]}
                label="Camino"
                value={s.most_used_path ?? '—'}
              />
            </ul>
          </Panel>

          <Panel title="Partidas recientes">
            {data.recent.length === 0 ? (
              <p className="opacity-60">Sin historial.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.recent.map(g => (
                  <li key={g.game_id} className="bg-aldea-bg flex items-center gap-2 rounded p-2">
                    {g.won ? (
                      <PixelIcon name="trofeo" size={12} title="Victoria" />
                    ) : (
                      <span className="w-[12px] text-center opacity-40">·</span>
                    )}
                    <PixelIcon name={CHARACTER_SPRITE[g.character_key]} size={12} />
                    <span className="min-w-0 flex-1 truncate opacity-70">
                      {new Date(g.finished_at).toLocaleDateString('es', {
                        day: '2-digit',
                        month: '2-digit'
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

      <Button full onClick={onBack}>
        Volver
      </Button>
    </div>
  )
}

function Line({ icon, label, value }) {
  return (
    <li className="flex items-center gap-2">
      {icon && <PixelIcon name={icon} size={12} />}
      <span className="opacity-60">{label}:</span>
      <span>{value}</span>
    </li>
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
