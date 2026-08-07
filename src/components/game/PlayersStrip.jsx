import { CHARACTER_ICON } from '../../data/art.js'

// Rivales: puntos, edificios y "ya decidió" (sin revelar QUÉ decidió).
export function PlayersStrip({
  players,
  buildings,
  confirmed,
  userId,
  targetId,
  onTarget,
  comeback,
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {players.map((p) => {
        const mine = p.user_id === userId
        const n = buildings.filter((b) => b.user_id === p.user_id).length
        const on = targetId === p.user_id
        return (
          <button
            key={p.user_id}
            disabled={mine || !onTarget}
            onClick={() => onTarget?.(on ? null : p.user_id)}
            className={`bg-aldea-panel flex min-w-[5.5rem] shrink-0 flex-col items-center gap-1 rounded p-2 ${
              on ? 'ring-aldea-accent ring-2' : ''
            } ${mine ? 'opacity-60' : ''}`}
          >
            <span className="text-lg">{CHARACTER_ICON[p.character_key] ?? '❓'}</span>
            <span className="max-w-[5rem] truncate">{mine ? 'Tú' : p.profiles?.nickname}</span>
            <span className="text-aldea-accent">{p.points} pts</span>
            <span className="opacity-60">🏠 {n}</span>
            <span className="flex gap-1">
              {/* Viento a favor: se muestra a quien realmente lo cobró esta
                  ronda, no a quien va último. Transparente por diseño (§9.1). */}
              {comeback.includes(p.user_id) && <span title="Viento a favor">🍃</span>}
              {confirmed.includes(p.user_id) && <span title="Ya decidió">✅</span>}
              {!p.connected && <span title="Desconectado">📴</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
