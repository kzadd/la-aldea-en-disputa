import { useEffect, useState } from 'react'
import { Avatar } from '../components/Avatar.jsx'
import { Cabecera } from '../components/Cabecera.jsx'
import { PixelIcon } from '../components/PixelIcon.jsx'
import { Button } from '../components/ui.jsx'
import { loadMyStats } from '../lib/api.js'

// Perfil personal: estadísticas completas + historial (GAME_DESIGN §10.2)
export default function Profile({ userId, profile, characters, onBack }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    loadMyStats(userId)
      .then(setData)
      .catch(() => setData({ stats: null, recent: [] }))
  }, [userId])

  if (!data) return <p className="text-aldea-muted p-4">Cargando…</p>
  const s = data.stats

  return (
    <div className="flex flex-col gap-4">
      <Cabecera onBack={onBack}>
        <Avatar avatar={profile.avatar} size={18} frame={false} />
        <span className="font-title text-aldea-ink text-[14px]">{profile.nickname}</span>
      </Cabecera>

      {!s ? (
        <div className="bg-aldea-panel border-aldea-line rounded-lg border p-4">
          <p className="text-aldea-muted text-[12px] leading-relaxed">
            Todavía no terminaste ninguna partida. Jugá una y acá vas a ver tus números.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-aldea-panel border-aldea-line flex flex-col gap-3.5 rounded-lg border p-4">
            <h2 className="font-title text-aldea-muted text-[11px] tracking-wide">TUS NÚMEROS</h2>
            <div className="grid grid-cols-3 gap-2">
              <Stat value={s.games_played} label="jugadas" />
              <Stat value={s.games_won} label="ganadas" />
              <Stat value={s.winrate ?? 0} unit="%" label="winrate" destacado />
            </div>
            <ul className="flex flex-col gap-1">
              <Line label="Más usado" value={characters[s.favorite_character]?.name ?? '—'} />
              <Line label="Mejor winrate" value={characters[s.best_character]?.name ?? '—'} />
              <Line label="Camino" value={s.most_used_path ?? '—'} />
            </ul>
          </div>

          <div className="bg-aldea-panel border-aldea-line flex flex-col gap-2.5 rounded-lg border p-4">
            <h2 className="font-title text-aldea-muted text-[11px] tracking-wide">
              PARTIDAS RECIENTES
            </h2>
            {data.recent.length === 0 ? (
              <p className="text-aldea-dim text-[12px]">Sin historial.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.recent.map(g => (
                  <li
                    key={g.game_id}
                    className={`bg-aldea-card flex items-center gap-2.5 rounded-lg p-3 ${
                      g.won ? 'border-aldea-accent-dark border' : ''
                    }`}
                  >
                    {g.won ? (
                      <PixelIcon name="trofeo" size={13} title="Victoria" />
                    ) : (
                      <span className="text-aldea-faint w-[13px] text-center">·</span>
                    )}
                    <span className="text-aldea-dim min-w-0 flex-1 truncate text-[12px]">
                      {fecha(g.finished_at)} · {g.players} jugador{g.players === 1 ? '' : 'es'}
                    </span>
                    <span
                      className={`text-[12px] ${g.won ? 'text-aldea-accent' : 'text-aldea-ink'}`}
                    >
                      {g.points} pts
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <Button full tone="quiet" onClick={onBack}>
        Volver
      </Button>
    </div>
  )
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// "Hoy" / "Ayer" y, más atrás, "6 ago 2026". La comparación es por día del
// calendario local, no por horas transcurridas: una partida de anoche a las 23
// tiene que decir "Ayer" aunque hayan pasado tres horas.
function fecha(iso) {
  const d = new Date(iso)
  const dia = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const hoy = new Date()
  const diff = Math.round((new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - dia) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

function Line({ label, value }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-aldea-dim flex items-center gap-2 text-[12px]">{label}</span>
      <span className="text-[12px]">{value}</span>
    </li>
  )
}

// `unit` va aparte y en la tipografía del cuerpo: el símbolo de porcentaje de
// Silkscreen es un borrón a este tamaño. Alineado por la línea base para que no
// quede flotando respecto del número.
function Stat({ label, value, unit, destacado }) {
  return (
    <div
      className={`bg-aldea-card flex flex-col items-center gap-2 rounded-lg py-3.5 ${
        destacado ? 'ring-aldea-accent-dark ring-1' : ''
      }`}
    >
      <span className="flex items-baseline justify-center gap-[2px]">
        <span
          className={`font-title text-[24px] leading-none ${destacado ? 'text-aldea-accent' : 'text-aldea-ink'}`}
        >
          {value}
        </span>
        {unit && (
          <span
            className={`text-[15px] leading-none font-semibold ${destacado ? 'text-aldea-accent' : 'text-aldea-ink'}`}
          >
            {unit}
          </span>
        )}
      </span>
      <span
        className={`text-[11px] leading-none ${destacado ? 'text-aldea-accent-soft' : 'text-aldea-dim'}`}
      >
        {label}
      </span>
    </div>
  )
}
