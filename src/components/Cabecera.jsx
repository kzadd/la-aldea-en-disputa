import { PixelIcon } from './PixelIcon.jsx'

// Cabecera de pantalla interior: flecha de volver + título.
export function Cabecera({ onBack, children }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <button
        type="button"
        onClick={onBack}
        aria-label="Volver"
        className="bg-aldea-panel border-aldea-line hover:border-aldea-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
      >
        <PixelIcon name="flecha_izq" size={13} />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
    </div>
  )
}
