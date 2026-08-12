import { useState } from 'react'
import { tinte } from '../../data/colores.js'
import { CHARACTER_SPRITE } from '../../data/icons.js'
import { PixelIcon } from '../PixelIcon.jsx'

// Rivales: puntos, edificios y "ya decidió" (sin revelar QUÉ decidió).
// Cada uno conserva el color que le tocó en la sala, y su ficha —habilidad y
// camino— se abre al pasar por encima o al tocar, como en el diseño.
export function PlayersStrip({
  players,
  buildings,
  confirmed,
  userId,
  targetId,
  characters,
  comeback,
  round,
}) {
  const [abierta, setAbierta] = useState(null)

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(78px,1fr))] gap-1.5">
      {players.map((p, i) => {
        const mine = p.user_id === userId
        const n = buildings.filter(b => b.user_id === p.user_id).length
        const on = abierta === p.user_id
        const suyo = characters?.[p.character_key]
        return (
          <div
            key={p.user_id}
            data-info
            onMouseEnter={() => setAbierta(p.user_id)}
            onMouseLeave={() => setAbierta(null)}
            onClick={() => setAbierta(on ? null : p.user_id)}
            className="relative flex min-w-0 flex-col items-center gap-1.5 rounded-lg border px-1.5 py-2.5"
            style={{
              background: '#17110d',
              borderColor: targetId === p.user_id ? '#c0492e' : tinte(i),
            }}
          >
            {/* El visto va arriba, en chico y levantado sobre el personaje:
                es el estado del jugador, no una estadística más. */}
            <span className="flex items-start gap-[5px]">
              <PixelIcon name={p.profiles?.avatar || 'aldeano'} size={21} />
              <PixelIcon name={CHARACTER_SPRITE[p.character_key] ?? 'interrogante'} size={21} />
              {confirmed.includes(p.user_id) && (
                <PixelIcon name="check" size={9} title="Ya decidió" />
              )}
            </span>
            <span className="font-title text-aldea-ink max-w-full truncate text-[12px]">
              {mine ? 'Tú' : p.profiles?.nickname}
            </span>
            <span className="text-aldea-accent text-[12px] leading-none">{p.points} pts</span>
            {/* Todo en la misma línea que las construcciones: en su propio
                renglón, los avisos rompían el alto de la tarjeta cuando solo
                los tenía uno de los jugadores.
                Viento a favor se muestra a quien realmente lo cobró esta ronda,
                no a quien el cliente calcule que va último (§9.1). */}
            <span className="flex items-center gap-[5px] text-[12px] leading-none">
              <PixelIcon name="casa" size={15} />
              <span style={{ color: '#d8cbb8' }}>{n}</span>
              {comeback.includes(p.user_id) && (
                <PixelIcon name="viento" size={13} title="Viento a favor" />
              )}
              {/* Los sabotajes son públicos (§5.3): el daño se ve en la
                  tarjeta del afectado, no solo en su propio panel. */}
              {buildings.some(b => b.user_id === p.user_id && b.paused_until_round >= round) && (
                <PixelIcon name="danio" size={13} title="Tiene una construcción dañada" />
              )}
              {/* El Nómada es inmune, así que su bloqueo no se muestra */}
              {p.blocked_next_round && p.character_key !== 'nomada' && (
                <PixelIcon name="bloqueo" size={13} title="Bloqueado: no puede construir" />
              )}
              {!p.connected && <PixelIcon name="desconectado" size={13} title="Desconectado" />}
            </span>

            {on && suyo && (
              <div
                className="absolute top-[calc(100%+8px)] z-20 flex w-[268px] max-w-[86vw] items-start gap-2.5 rounded-md border p-3 text-left"
                style={{
                  background: '#1d150f',
                  borderColor: '#8a6224',
                  borderTop: '3px solid #e8a33d',
                  boxShadow: '0 8px 20px rgba(0,0,0,.55)',
                  // Anclada al borde en los extremos para que no se salga de
                  // la pantalla; centrada en los del medio.
                  ...(i === 0
                    ? { left: 0 }
                    : i === players.length - 1
                      ? { right: 0 }
                      : { left: '50%', transform: 'translateX(-50%)' }),
                }}
              >
                <PixelIcon name={CHARACTER_SPRITE[p.character_key] ?? 'interrogante'} size={28} />
                <div className="flex flex-1 flex-col gap-1.5">
                  <p className="font-title text-aldea-accent text-[12px]">{suyo.name}</p>
                  <p className="text-[12px] leading-[1.55]">{suyo.passive_text}</p>
                  <p className="text-aldea-dim text-[11px]">Camino: {suyo.path}</p>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
