import { RESOURCES } from '../../data/art.js'

export function ResourceBar({ me, limit, timer, round, maxRounds }) {
  return (
    <div className="bg-aldea-panel flex flex-col gap-2 rounded p-2">
      <div className="flex items-center gap-2">
        <span className="opacity-60">
          Ronda {round}/{maxRounds}
        </span>
        <span className="ml-auto text-aldea-accent">{me.points} pts</span>
        {timer}
      </div>
      <div className="grid grid-cols-4 gap-1">
        {RESOURCES.map((r) => {
          const v = me[r.key]
          return (
            <div
              key={r.key}
              className={`bg-aldea-bg flex items-center justify-center gap-1 rounded py-2 ${
                v >= limit ? 'text-amber-400' : ''
              }`}
              title={`${r.label} — tope ${limit}`}
            >
              <span>{r.icon}</span>
              <span>{v}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
