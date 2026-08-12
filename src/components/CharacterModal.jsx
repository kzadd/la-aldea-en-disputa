import { CHARACTER_SPRITE } from '../data/icons.js'
import { PixelIcon } from './PixelIcon.jsx'
import { Button, Modal } from './ui.jsx'

// Ficha de personaje. Se abre tocando el retrato de cualquier jugador: la
// habilidad es lo que más se olvida a mitad de partida y no vive en ningún lado.
export default function CharacterModal({ character, jugador, extra, onClose }) {
  if (!character) {
    return (
      <Modal title="PERSONAJE" onClose={onClose}>
        <p className="text-aldea-muted text-[12px]">Todavía no se sorteó.</p>
        <Button full onClick={onClose}>
          CERRAR
        </Button>
      </Modal>
    )
  }

  return (
    <Modal title={(jugador?.nickname ?? character.name).toUpperCase()} onClose={onClose}>
      <div className="bg-aldea-card flex items-center gap-3 rounded-lg p-3">
        <span className="bg-aldea-line flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
          <PixelIcon name={CHARACTER_SPRITE[character.key] ?? 'interrogante'} size={34} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="font-title text-aldea-accent text-[13px]">{character.name}</span>
          {jugador && (
            <span className="text-aldea-dim flex items-center gap-1.5 text-[11px]">
              <PixelIcon name={jugador.avatar || 'aldeano'} size={12} />
              {jugador.nickname}
            </span>
          )}
        </div>
      </div>

      <p className="text-[12px] leading-relaxed">{character.passive_text}</p>

      <ul className="text-aldea-dim flex flex-col gap-2 text-[12px]">
        <li className="flex items-center justify-between">
          <span>Camino</span>
          <span className="text-aldea-ink">{character.path}</span>
        </li>
        <li className="flex items-center justify-between">
          <span>Tope de almacén</span>
          <span className="text-aldea-ink">{character.storage_limit}</span>
        </li>
        {extra}
      </ul>

      <Button full onClick={onClose}>
        CERRAR
      </Button>
    </Modal>
  )
}
