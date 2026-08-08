import { AVATAR_SPRITE } from '../data/icons.js'
import { PixelIcon } from './PixelIcon.jsx'

// El aldeano por defecto es igual para todos, así que se le tiñe el gorro según
// el nombre: el mismo jugador ve siempre el mismo color. Los demás avatares ya
// traen su paleta.
const GORROS =['#d9a441', '#7ab84a', '#4a7fbf', '#c0483a', '#8a6bb0', '#cfd6dd', '#9c6b3c', '#e07b39']

const hash = (s) => {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.codePointAt(0)) % 100000
  return h
}

export function Avatar({
  avatar = 'aldeano',
  nickname = '',
  size = 26,
  box = 52,
  frame = true,
  onClick,
  title,
}) {
  // Puede llegar null desde una consulta con join, no solo undefined
  const key = avatar || 'aldeano'
  const tint = key === 'aldeano' ? { a: GORROS[hash(nickname) % GORROS.length] } : undefined
  const sprite = <PixelIcon name={AVATAR_SPRITE(key)} size={size} tint={tint} />
  if (!frame) return sprite

  const cls = 'bg-aldea-bg flex shrink-0 items-center justify-center rounded'
  const style = { width: box, height: box, boxShadow: 'inset 0 0 0 2px #d9a441' }
  return onClick ? (
    <button type="button" onClick={onClick} title={title} aria-label={title} className={cls} style={style}>
      {sprite}
    </button>
  ) : (
    <div className={cls} style={style}>
      {sprite}
    </div>
  )
}
