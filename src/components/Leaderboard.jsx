import { useEffect, useState } from 'react'
import { loadLeaderboard } from '../lib/api.js'
import { CHARACTER_SPRITE, MEDAL_TINT } from '../data/icons.js'
import { PixelIcon } from './PixelIcon.jsx'
import { Panel } from './ui.jsx'

// Top 3 resumido, para mostrar mientras se espera (GAME_DESIGN §10.2)
export function Leaderboard({ userId, title = 'Ranking global' }) {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    loadLeaderboard(3).then(setRows).catch(() => setRows([]))
  }, [])

  if (!rows) return null
  if (!rows.length) {
    return (
      <Panel title={title} icon="trofeo">
        <p className="opacity-60">Todavía nadie terminó una partida.</p>
      </Panel>
    )
  }

  return (
    <Panel title={title} icon="trofeo">
      <ul className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <li
            key={r.user_id}
            className={`bg-aldea-bg flex items-center gap-2 rounded p-2 ${
              r.user_id === userId ? 'ring-aldea-accent ring-1' : ''
            }`}
          >
            <PixelIcon name="medalla" size={14} tint={MEDAL_TINT[i]} title={`Puesto ${i + 1}`} />
            <span className="min-w-0 flex-1 truncate">{r.nickname}</span>
            {r.favorite_character && (
              <PixelIcon name={CHARACTER_SPRITE[r.favorite_character]} size={12} />
            )}
            <span className="text-aldea-accent">{r.games_won}</span>
            <span className="opacity-60">{r.winrate}%</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
