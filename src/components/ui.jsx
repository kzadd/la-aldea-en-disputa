export function Panel({ title, children, className = '' }) {
  return (
    <section className={`bg-aldea-panel flex flex-col gap-3 rounded p-3 ${className}`}>
      {title && <h2 className="text-aldea-accent opacity-90">{title}</h2>}
      {children}
    </section>
  )
}

export function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="opacity-60">{label}</span>
      {children}
    </label>
  )
}

export function Button({ children, full, disabled, onClick, tone = 'accent' }) {
  const tones = {
    accent: 'bg-aldea-accent text-aldea-bg',
    ghost: 'bg-aldea-bg text-aldea-ink',
    danger: 'bg-red-900 text-aldea-ink',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded px-3 py-2 leading-relaxed transition active:translate-y-px disabled:opacity-40 ${
        tones[tone]
      } ${full ? 'w-full' : ''}`}
    >
      {children}
    </button>
  )
}
