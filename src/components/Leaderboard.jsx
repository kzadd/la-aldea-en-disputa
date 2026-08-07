import { useEffect, useState } from 'react'
import { loadLeaderboard } from '../lib/api.js'
import { CHARACTER_ICON } from '../data/art.js'
import { Panel } from './ui.jsx'

const MEDAL = ['🥇', '🥈', '🥉']

// Top 3 mientras se espera (GAME_DESIGN §10.2)
export function Leaderboard({ userId, title = 'Ranking global' }) {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    loadLeaderboard(3).then(setRows).catch(() => setRows([]))
  }, [])

  if (!rows) return null
  if (!rows.length) {
    return (
      <Panel title={title}>
        <p className="opacity-60">Todavía nadie terminó una partida.</p>
      </Panel>
    )
  }

  return (
    <Panel title={title}>
      <ul className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <li
            key={r.user_id}
            className={`bg-aldea-bg flex items-center gap-2 rounded p-2 ${
              r.user_id === userId ? 'ring-aldea-accent ring-1' : ''
            }`}
          >
            <span>{MEDAL[i]}</span>
            <span className="min-w-0 flex-1 truncate">{r.nickname}</span>
            {r.favorite_character && (
              <span title="Personaje más usado">{CHARACTER_ICON[r.favorite_character]}</span>
            )}
            <span className="text-aldea-accent">{r.games_won}🏆</span>
            <span className="opacity-60">{r.winrate}%</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
