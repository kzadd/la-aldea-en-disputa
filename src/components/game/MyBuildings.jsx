import { useState } from 'react'
import { RESOURCES } from '../../data/art.js'
import { PixelIcon } from '../PixelIcon.jsx'

// Lo que ya construiste y qué te rinde cada ronda. Se despliega igual que la
// misión secreta: la cabecera resume (cuántas, cuánto producen) y el detalle
// queda a un toque, para no comerle sitio al mercado.
export function MyBuildings({ mias, catalogo, round }) {
  const [abierto, setAbierto] = useState(false)

  // Mismo criterio que el servidor al repartir producción: no produce mientras
  // `paused_until_round >= ronda actual`. Con `>` se veía sana justo en la
  // ronda en la que el daño hacía efecto, que es cuando más importa.
  const dañada = b => b.paused_until_round != null && b.paused_until_round >= round
  const total = { wood: 0, stone: 0, gold: 0, food: 0 }
  mias.forEach(b => {
    if (dañada(b)) return
    const c = catalogo[b.building_key]
    if (c) RESOURCES.forEach(r => (total[r.key] += c[`prod_${r.key}`] ?? 0))
  })
  const produce = RESOURCES.filter(r => total[r.key] > 0)
  const rotas = mias.filter(dañada).length

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(v => !v)}
        className="border-aldea-line hover:border-aldea-accent-dark flex items-center gap-2.5 rounded-md border p-3 text-left"
        style={{ background: '#241a13' }}
      >
        <PixelIcon name="casa" size={15} />
        {/* "TUS CONSTRUCCIONES" partía en dos renglones a 390px: Silkscreen es
            ancha y el resumen de producción ya ocupa la mitad de la fila. */}
        <span className="font-title text-aldea-ink flex-1 truncate text-[12px] font-bold">
          CONSTRUCCIONES · {mias.length}
        </span>
        {/* El resumen de producción se ve sin abrir: es el dato que se mira
            cada ronda para decidir qué comprar. */}
        {produce.length > 0 && (
          <span className="flex items-center gap-1.5">
            {produce.map(r => (
              <span key={r.key} className="flex items-center gap-[3px] text-[12px] leading-none">
                <span className="text-aldea-accent">+{total[r.key]}</span>
                <PixelIcon name={r.icon} size={13} title={r.label} />
              </span>
            ))}
          </span>
        )}
        {rotas > 0 && <PixelIcon name="danio" size={13} title="Tenés una construcción dañada" />}
        <PixelIcon name={abierto ? 'flecha_arriba' : 'flecha_abajo'} size={10} />
      </button>

      {abierto && (
        <div
          className="flex flex-col gap-1.5 rounded-md border p-[13px]"
          style={{ background: '#1d150f', borderColor: '#8a6224' }}
        >
          {mias.length === 0 ? (
            <p className="text-aldea-dim text-[12px]">
              Todavía no construiste nada. Lo que compres aparece acá.
            </p>
          ) : (
            mias.map(b => {
              const c = catalogo[b.building_key]
              const rota = dañada(b)
              const suProd = RESOURCES.filter(r => (c?.[`prod_${r.key}`] ?? 0) > 0)
              return (
                <div
                  key={b.id}
                  className="flex items-start gap-2.5 rounded-md border p-2.5"
                  style={{
                    background: '#17110d',
                    borderColor: rota ? '#c0492e' : '#3d2c1d',
                    opacity: rota ? 0.75 : 1,
                  }}
                >
                  <PixelIcon name={rota ? 'danio' : 'casa'} size={15} className="mt-[2px]" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <span
                        className={`font-title text-[12px] font-bold ${
                          rota ? 'text-aldea-warm' : 'text-aldea-accent'
                        }`}
                      >
                        {c?.name ?? b.building_key}
                      </span>
                      <span className="text-aldea-dim text-[11px]">
                        {c?.points} {c?.points === 1 ? 'punto' : 'puntos'}
                      </span>
                    </span>
                    {/* Si produce, la línea de iconos ya lo dice: repetir la
                        descripción del catálogo era decir dos veces lo mismo.
                        Las que no producen (Muralla, Castillo…) sí la
                        necesitan, porque su efecto solo está en el texto. */}
                    {suProd.length === 0 && (
                      <span className="text-[12px] leading-snug">{c?.description}</span>
                    )}
                    {rota ? (
                      <span className="text-aldea-warm text-[11px]">
                        Dañada: no produce; vuelve en la ronda {b.paused_until_round + 1}
                      </span>
                    ) : (
                      suProd.length > 0 && (
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
                          {suProd.map(r => (
                            <span key={r.key} className="flex items-center gap-[4px]">
                              <span className="text-aldea-accent">+{c[`prod_${r.key}`]}</span>
                              <PixelIcon name={r.icon} size={13} title={r.label} />
                            </span>
                          ))}
                          <span className="text-aldea-dim">por ronda</span>
                        </span>
                      )
                    )}
                  </div>
                  {b.shield_charges > 0 && (
                    <PixelIcon name="escudo" size={13} title="Le queda una defensa" />
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </>
  )
}
