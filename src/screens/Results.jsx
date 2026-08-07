import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { CHARACTER_ICON } from '../data/art.js'
import { Button, Panel } from '../components/ui.jsx'

const MEDAL = ['🥇', '🥈', '🥉']

// Al terminar se revelan las misiones de todos (GAME_DESIGN §8.1): el momento
// de "ah, por eso hacías eso".
export default function Results({ gameId, userId, characters, onHome }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    ;(async () => {
      const [{ data: game }, { data: players }, { data: missions }] = await Promise.all([
        supabase.from('games').select('*').eq('id', gameId).maybeSingle(),
        supabase.from('game_players').select('*, profiles(nickname)').eq('game_id', gameId),
        supabase
          .from('player_missions')
          .select('user_id, completed, missions_catalog(name, description)')
          .eq('game_id', gameId),
      ])
      setData({
        game,
        players: (players ?? []).sort((a, b) => b.points - a.points),
        missions: Object.fromEntries((missions ?? []).map((m) => [m.user_id, m])),
      })
    })()
  }, [gameId])

  if (!data?.game) return <p className="p-4">Contando puntos…</p>

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-aldea-accent py-2 text-center">
        {data.game.winner_id === userId ? '🎉 ¡Ganaste!' : 'Fin de la partida'}
      </h1>

      {data.players.map((p, i) => {
        const m = data.missions[p.user_id]
        return (
          <Panel key={p.user_id} className={p.user_id === userId ? 'ring-aldea-accent ring-1' : ''}>
            <div className="flex items-center gap-2">
              <span>{MEDAL[i] ?? `${i + 1}.`}</span>
              <span>{CHARACTER_ICON[p.character_key]}</span>
              <span>{p.profiles?.nickname}</span>
              <span className="text-aldea-accent ml-auto">{p.points} pts</span>
            </div>
            <ul className="flex flex-wrap gap-x-3 opacity-60">
              <li>🏠 {p.pts_buildings}</li>
              <li>📦 {p.pts_accumulator}</li>
              <li>🛡 {p.pts_survivor}</li>
              <li>🏴 {p.pts_saboteur}</li>
              <li>🤫 {p.pts_mission}</li>
            </ul>
            {m && (
              <p className="leading-relaxed opacity-80">
                {m.completed ? '✅' : '❌'} {m.missions_catalog?.name} —{' '}
                <span className="opacity-60">{m.missions_catalog?.description}</span>
              </p>
            )}
            <p className="opacity-40">{characters[p.character_key]?.name}</p>
          </Panel>
        )
      })}

      <Button full onClick={onHome}>
        Volver al inicio
      </Button>
    </div>
  )
}
