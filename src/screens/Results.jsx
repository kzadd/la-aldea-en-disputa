import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { PATH_ICON } from '../data/art.js'
import { CHARACTER_SPRITE, MEDAL_TINT } from '../data/icons.js'
import { PixelIcon } from '../components/PixelIcon.jsx'
import { Button, Panel } from '../components/ui.jsx'

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
      <h1 className="text-aldea-accent flex items-center justify-center gap-2 py-2">
        {data.game.winner_id === userId && <PixelIcon name="trofeo" size={16} />}
        {data.game.winner_id === userId ? '¡Ganaste!' : 'Fin de la partida'}
      </h1>

      {data.players.map((p, i) => {
        const m = data.missions[p.user_id]
        return (
          <Panel key={p.user_id} className={p.user_id === userId ? 'ring-aldea-accent ring-1' : ''}>
            <div className="flex items-center gap-2">
              {i < 3 ? (
                <PixelIcon name="medalla" size={14} tint={MEDAL_TINT[i]} title={`Puesto ${i + 1}`} />
              ) : (
                <span className="w-[14px] text-center opacity-50">{i + 1}</span>
              )}
              <PixelIcon name={CHARACTER_SPRITE[p.character_key]} size={14} />
              <span className="min-w-0 flex-1 truncate">{p.profiles?.nickname}</span>
              <span className="text-aldea-accent">{p.points} pts</span>
            </div>

            <ul className="flex flex-wrap gap-x-3 gap-y-1 opacity-60">
              <Score icon={PATH_ICON.constructor} label="Construcción" value={p.pts_buildings} />
              <Score icon={PATH_ICON.acumulador} label="Acumulador" value={p.pts_accumulator} />
              <Score icon={PATH_ICON.superviviente} label="Superviviente" value={p.pts_survivor} />
              <Score icon={PATH_ICON.saboteador} label="Saboteador" value={p.pts_saboteur} />
              <Score icon="secreto" label="Misión" value={p.pts_mission} />
            </ul>

            {m && (
              <p className="flex items-start gap-2 leading-relaxed">
                <PixelIcon
                  name={m.completed ? 'check' : 'bloqueo'}
                  size={12}
                  className="mt-[2px]"
                  title={m.completed ? 'Cumplida' : 'No cumplida'}
                />
                <span>
                  {m.missions_catalog?.name} —{' '}
                  <span className="opacity-60">{m.missions_catalog?.description}</span>
                </span>
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

function Score({ icon, label, value }) {
  return (
    <li className="flex items-center gap-1" title={label}>
      <PixelIcon name={icon} size={10} />
      {value}
    </li>
  )
}
