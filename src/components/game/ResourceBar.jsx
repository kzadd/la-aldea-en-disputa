import { useState } from 'react'
import { RESOURCES } from '../../data/art.js'
import { PixelIcon } from '../PixelIcon.jsx'

// Cabecera de la partida: ronda, puntos, reloj y los cuatro recursos.
// Cada recurso explica su tope al pasar por encima o al tocarlo: en móvil no
// hay hover, así que el toque abre la misma ficha.
export function ResourceBar({ me, limit, timer, round, maxRounds }) {
  const [abierto, setAbierto] = useState(null)

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <span className="text-aldea-ink/80 flex-1 text-[13px]">
          Ronda {round}/{maxRounds}
        </span>
        <span className="font-title text-aldea-accent text-[12px]">{me.points} pts</span>
        {timer}
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {RESOURCES.map((r, i) => {
          const v = me[r.key]
          const lleno = v >= limit
          const on = abierto === r.key
          return (
            <div
              key={r.key}
              data-info
              onMouseEnter={() => setAbierto(r.key)}
              onMouseLeave={() => setAbierto(null)}
              onClick={() => setAbierto(on ? null : r.key)}
              className="relative flex items-center justify-center gap-[7px] rounded-md border py-2.5"
              style={{ background: '#241a13', borderColor: on ? '#8a6224' : '#3d2c1d' }}
            >
              <PixelIcon name={r.icon} size={20} />
              <span className="flex items-baseline">
                <span
                  className={`font-title text-[13px] ${
                    lleno ? 'text-aldea-accent' : 'text-aldea-ink'
                  }`}
                >
                  {v}
                </span>
                <span className="text-[11px]" style={{ color: '#8c7a64' }}>
                  /{limit}
                </span>
              </span>

              {on && (
                // Los de los extremos se anclan a su borde para no salirse de
                // la pantalla; los del medio van centrados.
                <div
                  className="absolute top-[calc(100%+8px)] z-20 flex w-max min-w-[150px] flex-col gap-1.5 rounded-md border p-2.5 text-left whitespace-nowrap"
                  style={{
                    background: '#1d150f',
                    borderColor: '#8a6224',
                    borderTop: '3px solid #e8a33d',
                    boxShadow: '0 8px 20px rgba(0,0,0,.55)',
                    ...(i === 0
                      ? { left: 0 }
                      : i === RESOURCES.length - 1
                        ? { right: 0 }
                        : { left: '50%', transform: 'translateX(-50%)' }),
                  }}
                >
                  <p className="font-title text-aldea-accent text-[11px]">{r.label}</p>
                  <p className="text-[12px] leading-snug">
                    {v} de {limit} · tope por recurso
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
