import { CHARACTER_SPRITE } from '../../data/icons.js'
import { PixelIcon } from '../PixelIcon.jsx'
import { Avatar } from '../Avatar.jsx'

// Rivales: puntos, edificios y "ya decidió" (sin revelar QUÉ decidió).
// Un toque abre su ficha: el objetivo del sabotaje se elige en su propio modal,
// así que acá el toque siempre significa "quiero ver quién es este".
export function PlayersStrip({ players, buildings, confirmed, userId, targetId, onInspect, comeback }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {players.map((p) => {
        const mine = p.user_id === userId
        const n = buildings.filter((b) => b.user_id === p.user_id).length
        return (
          <button
            key={p.user_id}
            type="button"
            data-info
            onClick={() => onInspect?.(p.user_id)}
            className={`bg-aldea-panel flex min-w-[5.5rem] shrink-0 flex-col items-center gap-1 rounded p-2 ${
              targetId === p.user_id ? 'ring-2 ring-red-400' : ''
            }`}
          >
            <span className="flex items-center gap-1">
              <Avatar
                avatar={p.profiles?.avatar}
                nickname={p.profiles?.nickname ?? ''}
                size={12}
                frame={false}
              />
              <PixelIcon name={CHARACTER_SPRITE[p.character_key] ?? 'interrogante'} size={20} />
            </span>
            <span className="max-w-[5rem] truncate">{mine ? 'Tú' : p.profiles?.nickname}</span>
            <span className="text-aldea-accent">{p.points} pts</span>
            <span className="flex items-center gap-1 opacity-60">
              <PixelIcon name="casa" size={10} />
              {n}
              <PixelIcon name="interrogante" size={8} />
            </span>
            <span className="flex h-[10px] gap-1">
              {/* Viento a favor: se muestra a quien realmente lo cobró esta
                  ronda, no a quien el cliente calcule que va último (§9.1). */}
              {comeback.includes(p.user_id) && (
                <PixelIcon name="hoja" size={10} title="Viento a favor" />
              )}
              {confirmed.includes(p.user_id) && (
                <PixelIcon name="check" size={10} title="Ya decidió" />
              )}
              {!p.connected && (
                <PixelIcon name="desconectado" size={10} title="Desconectado" />
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
