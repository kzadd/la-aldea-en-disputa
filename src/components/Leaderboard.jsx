import { useEffect, useState } from 'react'
import { loadLeaderboard } from '../lib/api.js'
import { CHARACTER_SPRITE, MEDAL_TINT } from '../data/icons.js'
import { PixelIcon } from './PixelIcon.jsx'
import { Avatar } from './Avatar.jsx'
import CharacterModal from './CharacterModal.jsx'
import { Panel } from './ui.jsx'

// Top 3 resumido, para mostrar mientras se espera (GAME_DESIGN §10.2)
export function Leaderboard({ userId, characters, title = 'Ranking global' }) {
  const [rows, setRows] = useState(null)
  const [ficha, setFicha] = useState(null)

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
            <Avatar avatar={r.avatar} nickname={r.nickname} size={12} frame={false} />
            <span className="min-w-0 flex-1 truncate">{r.nickname}</span>
            {/* El personaje más usado: un toque explica qué hace */}
            {r.favorite_character && (
              <button
                type="button"
                data-info
                aria-label={`Habilidad de ${characters?.[r.favorite_character]?.name ?? 'su personaje'}`}
                onClick={() => setFicha(r.favorite_character)}
                className="bg-aldea-panel flex items-center gap-1 rounded px-2 py-1"
              >
                <PixelIcon name={CHARACTER_SPRITE[r.favorite_character]} size={12} />
                <PixelIcon name="interrogante" size={8} />
              </button>
            )}
            <span className="text-aldea-accent">{r.games_won}</span>
            <span className="opacity-60">{r.winrate}%</span>
          </li>
        ))}
      </ul>

      {ficha && (
        <CharacterModal character={characters?.[ficha]} onClose={() => setFicha(null)} />
      )}
    </Panel>
  )
}
