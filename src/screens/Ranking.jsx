import { useEffect, useState } from 'react'
import { loadLeaderboard } from '../lib/api.js'
import { CHARACTER_SPRITE, MEDAL_TINT } from '../data/icons.js'
import { PixelIcon } from '../components/PixelIcon.jsx'
import { Avatar } from '../components/Avatar.jsx'
import { Button, Panel } from '../components/ui.jsx'

// Ranking global completo (GAME_DESIGN §10). El top 3 lleva medalla.
export default function Ranking({ userId, characters, onBack }) {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    loadLeaderboard(20).then(setRows).catch(() => setRows([]))
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-aldea-accent flex items-center justify-center gap-2 py-2">
        <PixelIcon name="trofeo" size={16} />
        Ranking global
      </h1>

      {!rows ? (
        <p className="p-4 text-center opacity-60">Cargando…</p>
      ) : rows.length === 0 ? (
        <Panel>
          <p className="leading-relaxed opacity-60">
            Todavía nadie terminó una partida. El primero que gane estrena el podio.
          </p>
        </Panel>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li
              key={r.user_id}
              className={`bg-aldea-panel flex flex-col gap-2 rounded p-3 ${
                r.user_id === userId ? 'ring-aldea-accent ring-1' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {i < 3 ? (
                  <PixelIcon name="medalla" size={14} tint={MEDAL_TINT[i]} title={`Puesto ${i + 1}`} />
                ) : (
                  // Dos dígitos entran justos: con menos ancho el 10 se pega al nombre
                  <span className="w-[14px] shrink-0 opacity-50">{i + 1}</span>
                )}
                <Avatar avatar={r.avatar} nickname={r.nickname} size={14} frame={false} />
                <span className="min-w-0 flex-1 truncate">{r.nickname}</span>
                <span className="text-aldea-accent flex items-center gap-1">
                  <PixelIcon name="trofeo" size={10} />
                  {r.games_won}
                </span>
                <span className="opacity-60">{r.winrate}%</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 opacity-60">
                <span>{r.games_played} jugadas</span>
                {r.favorite_character && (
                  <span className="flex items-center gap-1">
                    <PixelIcon name={CHARACTER_SPRITE[r.favorite_character]} size={10} />
                    {characters[r.favorite_character]?.name}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button full onClick={onBack}>
        Volver
      </Button>
    </div>
  )
}
