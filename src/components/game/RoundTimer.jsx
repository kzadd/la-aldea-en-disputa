import { useEffect, useState } from 'react'

// El countdown es decorativo: quien cierra la ronda es el servidor
// (ARCHITECTURE §5). Si llega a 0 y el server aún no resolvió, solo se ve 0.
// Sin icono, como en el diseño: los segundos ya dicen que es un reloj.
export function RoundTimer({ deadline }) {
  const [left, setLeft] = useState(0)

  useEffect(() => {
    const tick = () =>
      setLeft(Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [deadline])

  const urgente = left <= 10
  return (
    <span
      className="font-title rounded-[5px] border px-2.5 py-1.5 text-[12px] leading-none font-bold"
      style={{
        background: '#241a13',
        borderColor: urgente ? '#c0492e' : '#3d2c1d',
        color: urgente ? '#e07a5f' : '#f2e7d5',
      }}
    >
      {left}s
    </span>
  )
}
