import { useState } from 'react'
import { setAvatar } from '../lib/api.js'
import { AVATARS } from '../data/icons.js'
import { Avatar } from './Avatar.jsx'
import { Button, Modal } from './ui.jsx'

// Selector de avatar. La lista válida también vive en `set_my_avatar()`: si acá
// se colara una clave inventada, la base la rechaza.
export default function AvatarPicker({ profile, onProfile, onClose }) {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)

  const elegir = async (key) => {
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
    <Modal title="Elegí tu avatar" onClose={onClose}>
      <div role="radiogroup" className="grid grid-cols-3 gap-2">
        {AVATARS.map((a) => {
          const on = a.key === profile.avatar
          return (
            <button
              key={a.key}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={busy !== null}
              onClick={() => elegir(a.key)}
              className={`flex flex-col items-center gap-2 rounded p-2 disabled:opacity-40 ${
                on ? 'bg-aldea-accent text-aldea-bg' : 'bg-aldea-bg'
              }`}
            >
              <Avatar avatar={a.key} nickname={profile.nickname} size={30} frame={false} />
              <span className="text-[8px]">{a.label}</span>
            </button>
          )
        })}
      </div>

      {error && <p className="text-red-400">{error}</p>}

      <Button full onClick={onClose}>
        Cerrar
      </Button>
    </Modal>
  )
}
