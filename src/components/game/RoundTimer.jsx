import { useEffect, useState } from 'react'

// El countdown es decorativo: quien cierra la ronda es el servidor
// (ARCHITECTURE §5). Si llega a 0 y el server aún no resolvió, solo se ve 0.
export function RoundTimer({ deadline }) {
  const [left, setLeft] = useState(0)

  useEffect(() => {
    const tick = () =>
      setLeft(Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [deadline])

  return (
    <span className={`rounded px-2 py-1 ${left <= 5 ? 'bg-red-900' : 'bg-aldea-bg'}`}>
      ⏱ {left}s
    </span>
  )
}
