import { useEffect, useState } from 'react'
import { Cabecera } from '../components/Cabecera.jsx'
import { PixelIcon } from '../components/PixelIcon.jsx'
import { Button } from '../components/ui.jsx'
import { loadLeaderboard } from '../lib/api.js'

// Ranking global completo (GAME_DESIGN §10).
export default function Ranking({ userId, characters, onBack }) {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    loadLeaderboard(20)
      .then(setRows)
      .catch(() => setRows([]))
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <Cabecera onBack={onBack}>
        <PixelIcon name="trofeo" size={15} />
        <span className="font-title text-aldea-accent text-[13px] font-bold">RANKING GLOBAL</span>
      </Cabecera>

      {!rows ? (
        <p className="text-aldea-muted p-4 text-center">Cargando…</p>
      ) : rows.length === 0 ? (
        <div className="bg-aldea-panel border-aldea-line rounded-lg border p-4">
          <p className="text-aldea-muted text-[12px] leading-relaxed">
            Todavía nadie terminó una partida. El primero que gane estrena el podio.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r, i) => (
            <li
              key={r.user_id}
              className={`bg-aldea-panel flex items-center gap-2.5 rounded-lg border p-3 ${
                r.user_id === userId ? 'border-aldea-accent' : 'border-aldea-line'
              }`}
            >
              <span
                className={`font-title w-[15px] shrink-0 text-center text-[16px] font-bold ${
                  r.user_id === userId ? 'text-aldea-accent' : 'text-aldea-dim'
                }`}
              >
                {i + 1}
              </span>
              <span className="bg-aldea-line flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                <PixelIcon name={r.avatar || 'aldeano'} size={24} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-title text-aldea-ink truncate text-[14px] font-bold">{r.nickname}</span>
                {/* El personaje más usado va como texto: a 16px el sprite pedía
                    descifrarlo y no decía de quién era. */}
                <span className="text-aldea-dim truncate text-[11px] leading-none">
                  {r.games_played} jugadas
                  {characters?.[r.favorite_character]?.name
                    ? ` · ${characters[r.favorite_character].name}`
                    : ''}
                </span>
              </div>
              <div className="text-right">
                {/* El amarillo señala tu fila, no el podio: sirve para encontrarte */}
                <div
                  className={`font-title text-[16px] font-bold ${
                    r.user_id === userId ? 'text-aldea-accent' : 'text-aldea-ink'
                  }`}
                >
                  {r.games_won}
                </div>
                <div className="text-aldea-dim mt-1 text-[11px] leading-none">{r.winrate}%</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {rows && <MiPosicion rows={rows} userId={userId} />}

      <Button full tone="quiet" onClick={onBack}>
        Volver
      </Button>
    </div>
  )
}

const ORDINAL = ['1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º', '9º', '10º']

// Cuántas victorias faltan para pasar al de arriba. El ranking ordena primero
// por partidas ganadas, así que empatado alcanza con ganar una: el desempate
// siguiente es el winrate, y ganar sube el propio y no el del rival.
function MiPosicion({ rows, userId }) {
  const i = rows.findIndex(r => r.user_id === userId)
  if (i < 0) return null

  const puesto = ORDINAL[i] ?? `${i + 1}º`
  const total = rows.length
  let texto
  if (i === 0) {
    texto =
      total === 1
        ? `Estás ${puesto} de ${total}. Por ahora la aldea es tuya.`
        : `Estás ${puesto} de ${total}. Nadie te pasa por ahora.`
  } else {
    const arriba = rows[i - 1]
    const faltan = Math.max(1, arriba.games_won - rows[i].games_won + 1)
    texto =
      `Estás ${puesto} de ${total}. Gana ${faltan === 1 ? 'una partida' : `${faltan} partidas`}` +
      ` más para pasar a ${arriba.nickname}.`
  }

  return (
    <p className="bg-aldea-panel border-aldea-line text-aldea-muted rounded-lg border p-3.5 text-[12px] leading-relaxed border-dashed">
      {texto}
    </p>
  )
}
