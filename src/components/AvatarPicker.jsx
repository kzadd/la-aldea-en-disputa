import { useState } from 'react'
import { AVATARS } from '../data/icons.js'
import { setAvatar } from '../lib/api.js'
import { PixelIcon } from './PixelIcon.jsx'
import { Button, Modal } from './ui.jsx'

// Selector de avatar. La lista válida también vive en `set_my_avatar()`: si acá
// se colara una clave inventada, la base la rechaza.
export default function AvatarPicker({ profile, onProfile, onClose }) {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)

  const elegir = async key => {
    if (key === profile.avatar) return onClose()
    setBusy(key)
    setError(null)
    try {
      onProfile({ ...profile, avatar: await setAvatar(key) })
      onClose()
    } catch (e) {
      setError(e.message)
      setBusy(null)
    }
  }

  return (
    <Modal title="ELEGÍ TU AVATAR" onClose={onClose}>
      <div role="radiogroup" className="grid grid-cols-3 gap-2">
        {AVATARS.map(a => {
          const on = a.key === profile.avatar
          return (
            <button
              key={a.key}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={busy !== null}
              onClick={() => elegir(a.key)}
              className={`flex flex-col items-center gap-2 rounded-lg border p-3 disabled:opacity-40 ${
                on ? 'border-aldea-accent bg-aldea-accent' : 'border-aldea-line bg-aldea-card'
              }`}
            >
              {/* El retrato conserva su fondo oscuro también cuando la ficha se
                  pinta de amarillo: los sprites están dibujados para leerse
                  sobre oscuro. */}
              {/* 35 = 5 px por celda del sprite de 7×7, la medida del diseño */}
              <span className="bg-aldea-card flex items-center justify-center rounded-[5px] p-[7px]">
                <PixelIcon name={a.key} size={35} />
              </span>
              <span
                className={`text-[12px] leading-none ${on ? 'text-aldea-card font-bold' : 'text-aldea-ink'}`}
              >
                {a.label}
              </span>
            </button>
          )
        })}
      </div>

      {error && <p className="text-aldea-warm text-[12px]">{error}</p>}

      <Button full onClick={onClose}>
        CERRAR
      </Button>
    </Modal>
  )
}
