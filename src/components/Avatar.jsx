import { AVATAR_SPRITE } from '../data/icons.js'
import { PixelIcon } from './PixelIcon.jsx'

// `nickname` ya no hace falta para pintar (cada avatar trae su paleta), pero
// las pantallas lo siguen pasando: se ignora sin romper nada.
export function Avatar({
  avatar = 'aldeano',
  size = 26,
  box = 44,
  frame = true,
  ring,
  onClick,
  title
}) {
  // Puede llegar null desde una consulta con join, no solo undefined
  const sprite = <PixelIcon name={AVATAR_SPRITE(avatar || 'aldeano')} size={size} />
  if (!frame) return sprite

  const cls =
    'bg-aldea-line flex shrink-0 items-center justify-center rounded-lg border-2 transition'
  const style = { width: box, height: box, borderColor: ring ?? '#e8a33d' }
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cls}
      style={style}
    >
      {sprite}
    </button>
  ) : (
    <div className={cls} style={style}>
      {sprite}
    </div>
  )
}
