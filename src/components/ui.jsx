import { useEffect } from 'react'
import { PixelIcon } from './PixelIcon.jsx'

// Panel: caja de contenido. El título va en Silkscreen, chico y espaciado.
export function Panel({ title, icon, children, className = '', accent }) {
  return (
    <section
      className={`bg-aldea-panel border-aldea-line flex flex-col gap-3 rounded-lg border p-4 ${className}`}
    >
      {title && (
        <h2
          className={`font-title flex items-center gap-2 text-[11px] tracking-wide ${
            accent ? 'text-aldea-accent' : 'text-aldea-muted'
          }`}
        >
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
//
// Aun con un solo input, tocar el rótulo no debe enfocar nada: en móvil abría
// el teclado sin querer y encendía el borde amarillo como si se hubiera tocado
// el campo. `preventDefault` cancela esa activación sin perder el <label>, que
// es lo que asocia texto y campo para los lectores de pantalla.
export function Field({ label, children, as = 'div', hint }) {
  const Tag = as
  return (
    <Tag className="flex flex-col gap-1">
      <span
        className="text-aldea-muted text-[12px]"
        onClick={e => e.preventDefault()}
        onMouseDown={e => e.preventDefault()}
      >
        {label}
      </span>
      {children}
      {hint && <span className="text-aldea-warm text-[11px] leading-snug">{hint}</span>}
    </Tag>
  )
}

export function Input({ className = '', error, ...props }) {
  return (
    <input
      {...props}
      className={`bg-aldea-card w-full min-w-0 rounded-lg border px-3 py-3 text-[14px] outline-none ${
        error ? 'border-aldea-danger' : 'border-aldea-line focus:border-aldea-accent'
      } ${className}`}
    />
  )
}

const TONOS = {
  // Principal: fondo acento y relieve duro de 3px
  accent: 'bg-aldea-accent text-aldea-card font-title text-[13px] btn-solid',
  // Secundario: solo contorno
  ghost:
    'border border-aldea-line text-aldea-ink text-[13px] hover:border-aldea-accent hover:text-aldea-accent',
  // Terciario: como el ghost pero apagado
  quiet:
    'border border-aldea-line text-aldea-muted text-[12px] hover:border-aldea-accent hover:text-aldea-accent',
  danger: 'border border-aldea-danger text-aldea-warm text-[12px]',
  // Como el principal pero sin relieve ni Silkscreen: para acciones dentro de un
  // panel, donde el botón grande de la pantalla ya se lleva el protagonismo.
  plano: 'bg-aldea-accent text-aldea-card text-[13px]',
  // Descartar algo: neutro en reposo, rojo recién al apuntarlo.
  cancelar:
    'border border-aldea-line text-aldea-ink text-[13px] hover:border-aldea-danger hover:text-aldea-warm',
  // Confirmado: verde de contorno. Es el único verde de la interfaz y significa
  // siempre lo mismo —"este jugador ya dijo que sí"—.
  listo: 'bg-aldea-panel border-aldea-green text-aldea-green font-title border text-[12px]',
  // Acción todavía no disponible: se ve como una caja apagada y no como un
  // botón amarillo desvaído. El texto explica qué falta.
  inactivo: 'bg-aldea-panel border border-aldea-line text-aldea-dim text-[12px]',
  // Relleno apagado: la versión "todavía no" de un botón que se vuelve amarillo
  // cuando la acción está disponible.
  apagado: 'bg-aldea-line text-aldea-muted text-[13px]',
  // Igual que `cancelar` pero apagado: para salidas que no deben pedir atención.
  salir:
    'border border-aldea-line text-aldea-muted text-[12px] hover:border-aldea-danger hover:text-aldea-warm'
}

export function Button({
  children,
  full,
  disabled,
  onClick,
  tone = 'accent',
  title,
  className = '',
  type = 'button'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3.5 leading-none transition disabled:opacity-40 font-bold ${
        TONOS[tone]
      } ${full ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  )
}

// Diálogo modal. Centrado y con scroll propio: en un móvil de 360px el
// contenido puede pasarse de alto y el fondo no tiene que moverse.
export function Modal({ title, icon, onClose, children, extra }) {
  useEffect(() => {
    const cerrarConEsc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', cerrarConEsc)
    return () => window.removeEventListener('keydown', cerrarConEsc)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-5"
      style={{ background: 'rgba(8,5,3,.78)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
        className="bg-aldea-panel border-aldea-line m-auto flex w-full max-w-[352px] flex-col gap-3 rounded-xl border-2 p-4"
      >
        <div className="flex items-center gap-2">
          {icon && <PixelIcon name={icon} size={14} />}
          <h2 className="font-title text-aldea-accent flex-1 text-[13px]">{title}</h2>
          {extra}
        </div>
        {children}
      </div>
    </div>
  )
}

// Grupo de opciones excluyentes. Es un radiogroup, no una lista de botones
// sueltos: así el teclado y los lectores de pantalla lo entienden.
export function OptionGroup({ value, onChange, options, className = '', children }) {
  return (
    <div role="radiogroup" className={className}>
      {options.map(o => children(o, o.value === value, () => onChange(o.value)))}
    </div>
  )
}

// Chip de opción: la píldora de "2 3 4 5…" y de las duraciones.
// `apagado` es el fondo del estado sin elegir: cambia según sobre qué caja va,
// porque un chip del color de su contenedor no se ve. No se puede pasar por
// `className` —competiría con el amarillo del elegido y el orden lo decide el
// CSS generado, no el atributo—.
export function Chip({ on, onClick, children, className = '', apagado = 'bg-aldea-card' }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={`flex-1 rounded-lg px-2 py-2.5 text-[13px] leading-none transition ${
        on ? 'bg-aldea-accent text-aldea-card' : `${apagado} text-aldea-muted`
      } ${className}`}
    >
      {children}
    </button>
  )
}
