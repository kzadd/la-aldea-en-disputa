import { useEffect, useState } from 'react'
import { PixelIcon } from '../components/PixelIcon.jsx'
import { Button } from '../components/ui.jsx'
import { tinte } from '../data/colores.js'
import { CHARACTER_SPRITE, MEDAL_TINT } from '../data/icons.js'
import { supabase } from '../lib/supabase.js'

// De dónde salió cada punto (GAME_DESIGN §7). El hover explica el camino:
// los nombres solos no dicen nada a quien juega su primera partida.
const CAMINOS = [
  {
    key: 'pts_buildings',
    icon: 'casa',
    label: 'Constructor',
    texto: 'Puntos de los edificios que levantaste (1 a 5 según el nivel).',
  },
  {
    key: 'pts_accumulator',
    icon: 'caja',
    label: 'Acumulador',
    texto: '1 punto por cada 3 recursos que te quedaron guardados al final.',
  },
  {
    key: 'pts_survivor',
    icon: 'escudo',
    label: 'Superviviente',
    texto: '1 punto por ronda con sabotajes en la mesa en la que no te tocó ninguno.',
  },
  {
    key: 'pts_saboteur',
    icon: 'sabotaje',
    label: 'Saboteador',
    texto: '1 punto por cada sabotaje que te salió bien.',
  },
  {
    key: 'pts_mission',
    icon: 'secreto',
    label: 'Misión',
    texto: 'Los puntos de tu misión secreta, si la cumpliste.',
  },
]

// Al terminar se revelan las misiones de todos (GAME_DESIGN §8.1): el momento
// de "ah, por eso hacías eso".
export default function Results({ gameId, userId, characters, onHome }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    ;(async () => {
      const [{ data: game }, { data: players }, { data: missions }] = await Promise.all([
        supabase.from('games').select('*').eq('id', gameId).maybeSingle(),
        supabase.from('game_players').select('*, profiles(nickname, avatar)').eq('game_id', gameId),
        supabase
          .from('player_missions')
          .select('user_id, completed, missions_catalog(name, description)')
          .eq('game_id', gameId)
      ])
      setData({
        game,
        players: (players ?? []).sort((a, b) => b.points - a.points),
        missions: Object.fromEntries((missions ?? []).map(m => [m.user_id, m]))
      })
    })()
  }, [gameId])

  if (!data?.game) return <p className="text-aldea-muted p-4">Contando puntos…</p>

  // Cancelada por el host: no hay resultado que mostrar. Enseñar una tabla de
  // puntos daría a entender que alguien ganó, y no cuenta para nadie.
  if (data.game.status === 'cancelled') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-title text-aldea-accent flex items-center justify-center gap-2 py-2 text-[14px]">
          <PixelIcon name="bloqueo" size={15} />
          PARTIDA CANCELADA
        </h1>
        <div className="bg-aldea-panel border-aldea-line flex flex-col gap-2 rounded-lg border p-4">
          <p className="text-[13px] leading-relaxed">El host cortó la partida antes de tiempo.</p>
          <p className="text-aldea-dim text-[12px] leading-relaxed">
            No hay ganador y no cuenta para las estadísticas ni para el ranking.
          </p>
        </div>
        <Button full onClick={onHome}>
          VOLVER AL INICIO
        </Button>
      </div>
    )
  }

  const ganador = data.players.find(p => p.user_id === data.game.winner_id)

  return (
    <div className="flex flex-col gap-3.5">
      <h1 className="font-title text-aldea-accent flex items-center justify-center gap-2.5 py-2 text-[16px] font-bold">
        <PixelIcon name="trofeo" size={20} />
        {/* Al que pierde también hay que decirle quién ganó, no solo "fin" */}
        {data.game.winner_id === userId
          ? '¡GANASTE!'
          : `GANÓ ${(ganador?.profiles?.nickname ?? '—').toUpperCase()}`}
      </h1>

      {data.players.map((p, i) => {
        const m = data.missions[p.user_id]
        return (
          <div
            key={p.user_id}
            className="flex flex-col gap-2.5 rounded-lg border p-3.5"
            style={{ background: '#241a13', borderColor: i === 0 ? '#8a6224' : '#3d2c1d' }}
          >
            <div className="flex items-center gap-2.5">
              {/* Mismo aro de color que llevó en la sala y en la partida: con
                  avatares repetidos es lo único que distingue a cada uno. */}
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border"
                style={{ background: '#17110d', borderColor: tinte(i) }}
              >
                <PixelIcon name={p.profiles?.avatar || 'aldeano'} size={21} />
              </span>
              <PixelIcon name={CHARACTER_SPRITE[p.character_key]} size={21} />
              <span className="font-title text-aldea-ink min-w-0 flex-1 truncate text-[14px] font-bold">
                {p.user_id === userId ? 'Tú' : p.profiles?.nickname}
              </span>
              {/* Trofeo del metal que le tocó: el podio se lee de un vistazo */}
              {i < 3 && (
                <PixelIcon name="trofeo" size={20} tint={MEDAL_TINT[i]} title={`Puesto ${i + 1}`} />
              )}
              <span
                className={`font-title text-[14px] font-bold ${
                  i === 0 ? 'text-aldea-accent' : 'text-aldea-ink'
                }`}
              >
                {p.points} pts
              </span>
            </div>

            <Caminos jugador={p} />

            {m && (
              <div className="flex items-start gap-2.5 pt-[2px]">
                {/* El visto y la cruz se quedan: son lo primero que se mira al
                    ver la misión de un rival por fin destapada. */}
                <PixelIcon
                  name={m.completed ? 'check' : 'cruz'}
                  size={15}
                  className="mt-[2px]"
                  title={m.completed ? 'Cumplida' : 'No cumplida'}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                  <p
                    className="font-title text-[13px] leading-[1.4] font-bold"
                    style={{ color: m.completed ? '#f2bd63' : '#9d8b74' }}
                  >
                    {m.missions_catalog?.name}
                  </p>
                  <p
                    className="text-[12px] leading-[1.5]"
                    style={{ color: m.completed ? '#f2e7d5' : '#8c7a64' }}
                  >
                    {m.missions_catalog?.description}
                  </p>
                </div>
              </div>
            )}

            <p className="text-aldea-dim text-[12px]">{characters[p.character_key]?.name}</p>
          </div>
        )
      })}

      <Button full onClick={onHome}>
        VOLVER AL INICIO
      </Button>
    </div>
  )
}

// De dónde salieron los puntos. El detalle se abre al pasar por encima o al
// tocar: en móvil no hay hover, y un `title` del navegador no se ve nunca ahí.
function Caminos({ jugador }) {
  const [abierto, setAbierto] = useState(null)
  const c = CAMINOS.find(x => x.key === abierto)
  const valor = c ? (jugador[c.key] ?? 0) : 0

  return (
    // La ficha se ancla al ancho de la fila, no al icono: colgada del icono,
    // los dos últimos caminos quedan tan a la derecha que el globo se salía
    // de la tarjeta por la izquierda.
    <div className="relative flex flex-wrap gap-x-3.5 gap-y-2">
      {CAMINOS.map(x => (
        <span
          key={x.key}
          data-info
          onMouseEnter={() => setAbierto(x.key)}
          onMouseLeave={() => setAbierto(null)}
          onClick={() => setAbierto(abierto === x.key ? null : x.key)}
          className="flex cursor-help items-center gap-[5px]"
        >
          <PixelIcon name={x.icon} size={15} />
          <span
            className="text-[12px]"
            style={{ color: abierto === x.key ? '#f2e7d5' : '#a08e78' }}
          >
            {jugador[x.key] ?? 0}
          </span>
        </span>
      ))}

      {c && (
        <div
          className="absolute top-[calc(100%+8px)] right-0 left-0 z-20 flex flex-col gap-1.5 rounded-md border p-2.5 text-left"
          style={{
            background: '#1d150f',
            borderColor: '#8a6224',
            borderTop: '3px solid #e8a33d',
            boxShadow: '0 8px 20px rgba(0,0,0,.55)',
          }}
        >
          <p className="font-title text-aldea-accent text-[11px] font-bold">
            {c.label} · {valor} {valor === 1 ? 'punto' : 'puntos'}
          </p>
          <p className="text-[12px] leading-snug">{c.texto}</p>
        </div>
      )}
    </div>
  )
}
