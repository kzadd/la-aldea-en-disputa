import { useEffect } from 'react'
import { PixelIcon } from './PixelIcon.jsx'

// Diálogo modal. Sube desde abajo porque el pulgar está abajo: en un móvil de
// 360px lo que aparece al centro queda lejos de la mano.
export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const cerrarConEsc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', cerrarConEsc)
    return () => window.removeEventListener('keydown', cerrarConEsc)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="bg-aldea-panel flex w-full max-w-md flex-col gap-3 rounded p-3"
      >
        <h2 className="text-aldea-accent">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function Panel({ title, icon, children, className = '' }) {
  return (
    <section className={`bg-aldea-panel flex flex-col gap-3 rounded p-3 ${className}`}>
      {title && (
        <h2 className="text-aldea-accent flex items-center gap-2 opacity-90">
          {icon && <PixelIcon name={icon} size={12} />}
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}

// `as="label"` SOLO cuando el contenido es un único input: un <label> sin `for`
// activa el primer control que contiene, así que envolver un grupo de botones
// hacía que tocar el texto disparara el primer botón del grupo.
export function Field({ label, children, as = 'div' }) {
  const Tag = as
  return (
    <Tag className="flex flex-col gap-2">
      <span className="opacity-60">{label}</span>
      {children}
    </Tag>
  )
}

export function Button({ children, full, disabled, onClick, tone = 'accent', title }) {
  const tones = {
    accent: 'bg-aldea-accent text-aldea-bg',
    ghost: 'bg-aldea-bg text-aldea-ink',
    danger: 'bg-red-900 text-aldea-ink',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center justify-center gap-2 rounded px-3 py-2 leading-relaxed transition disabled:opacity-40 ${
        tones[tone]
      } ${full ? 'w-full' : ''}`}
    >
      {children}
    </button>
  )
}

// Grupo de opciones excluyentes. Es un radiogroup, no una lista de botones
// sueltos: así el teclado y los lectores de pantalla lo entienden.
export function OptionGroup({ value, onChange, options, className = '', children }) {
  return (
    <div role="radiogroup" className={className}>
      {options.map((o) => children(o, o.value === value, () => onChange(o.value)))}
    </div>
  )
}
