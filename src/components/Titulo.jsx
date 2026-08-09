// Cabecera del juego. La sombra dura de 2px es la del prototipo: le da el
// relieve de rótulo de arcade sin usar imágenes.
export function Titulo({ size = 17 }) {
  return (
    <h1
      className="font-title text-aldea-accent py-1 text-center leading-[1.6] tracking-wide"
      style={{ fontSize: size, textShadow: '0 2px 0 #3d2c1d', fontWeight: 600 }}
    >
      LA ALDEA
      <br />
      EN DISPUTA
    </h1>
  )
}
