import { CHARACTER_SPRITE } from '../data/icons.js'
import { PATH_ICON } from '../data/art.js'
import { PixelIcon } from './PixelIcon.jsx'
import { Avatar } from './Avatar.jsx'
import { Button, Modal } from './ui.jsx'

// Ficha de personaje. Se abre tocando el retrato de cualquier jugador: la
// habilidad es lo que más se olvida a mitad de partida y no vive en ningún lado.
export default function CharacterModal({ character, jugador, extra, onClose }) {
  if (!character) {
    return (
      <Modal title="Personaje" onClose={onClose}>
        <p className="opacity-60">Todavía no se sorteó.</p>
        <Button full onClick={onClose}>
          Cerrar
        </Button>
      </Modal>
    )
  }

  return (
    <Modal title={jugador?.nickname ?? character.name} onClose={onClose}>
      <div className="bg-aldea-bg flex items-center gap-3 rounded p-3">
        <PixelIcon name={CHARACTER_SPRITE[character.key] ?? 'interrogante'} size={40} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-aldea-accent">{character.name}</span>
          {jugador && (
            <span className="flex items-center gap-1 opacity-60">
              <Avatar avatar={jugador.avatar} nickname={jugador.nickname ?? ''} size={12} frame={false} />
              {jugador.nickname}
            </span>
          )}
        </div>
      </div>

      <p className="leading-relaxed">{character.passive_text}</p>

      <ul className="flex flex-col gap-2 opacity-70">
        <li className="flex items-center gap-2">
          <PixelIcon name={PATH_ICON[character.path] ?? 'casa'} size={12} />
          Camino: {character.path}
        </li>
        <li className="flex items-center gap-2">
          <PixelIcon name="caja" size={12} />
          Tope de almacén: {character.storage_limit}
        </li>
        {extra}
      </ul>

      <Button full onClick={onClose}>
        Cerrar
      </Button>
    </Modal>
  )
}
