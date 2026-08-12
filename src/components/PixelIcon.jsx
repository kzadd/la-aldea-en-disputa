import { ICONS } from '../data/icons.js'

// Renderiza un sprite como SVG, agrupando píxeles contiguos del mismo color en
// un solo rect para no emitir 49 nodos por icono. `shapeRendering=crispEdges`
// evita el antialias que arruinaría el pixel art al escalar.
// Cada sprite trae su propia paleta; `tint` la pisa (medallas, ropa del aldeano).
export function PixelIcon({ name, size = 12, tint, className = '', title }) {
  const sprite = ICONS[name]
  if (!sprite) return null

  const { g, p } = sprite
  const palette = tint ? { ...p, ...tint } : p
  const cols = g[0].length
  const rects = []

  g.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      let run = 1
      while (x + run < row.length && row[x + run] === ch) run++
      const fill = palette[ch]
      if (fill)
        rects.push(<rect key={`${x},${y}`} x={x} y={y} width={run} height={1} fill={fill} />)
      x += run
    }
  })

  return (
    <svg
      viewBox={`0 0 ${cols} ${g.length}`}
      data-icon={name}
      width={size}
      height={(size * g.length) / cols}
      shapeRendering="crispEdges"
      className={`inline-block shrink-0 align-[-0.15em] ${className}`}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {rects}
    </svg>
  )
}
