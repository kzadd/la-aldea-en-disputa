import { useEffect, useState } from 'react'
import { leaveRoom, setReady, startGame } from '../lib/api.js'
import { useRoom } from '../hooks/useRoom.js'
import { Button, Panel } from '../components/ui.jsx'
import { Leaderboard } from '../components/Leaderboard.jsx'
import { PixelIcon } from '../components/PixelIcon.jsx'
import { Avatar } from '../components/Avatar.jsx'

export default function Lobby({ roomId, userId, characters, onGame, onLeave }) {
  const { room, players, gameId, reload } = useRoom(roomId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [confirmarArranque, setConfirmarArranque] = useState(false)

  const copiar = async () => {
    if (!room) return
    await copiarAlPortapapeles(room.code)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1800)
  }

  // El host inicia y todos navegan por realtime (ARCHITECTURE §5)
  useEffect(() => {
    if (gameId) onGame(gameId)
  }, [gameId, onGame])

  if (!room) return <p className="p-4">Cargando sala…</p>

  const isHost = room.host_id === userId
  const yaListo = !!players.find((p) => p.user_id === userId)?.ready
  const listos = players.filter((p) => p.ready).length
  const todosListos = players.length >= 2 && listos === players.length
  const faltanJugadores = players.length < room.max_players

  return (
    <div className="flex flex-col gap-4">
      <Panel className="items-center text-center">
        <p className="opacity-60">Código de sala</p>
        <p className="text-aldea-accent text-2xl tracking-[0.3em]">{room.code}</p>
        <div className="grid w-full grid-cols-2 gap-2">
          <Button tone="ghost" onClick={copiar}>
            <PixelIcon name="copiar" size={14} />
            {copiado ? '¡Copiado!' : 'Copiar'}
          </Button>
          <Button tone="ghost" onClick={() => compartirWhatsApp(room.code)}>
            <PixelIcon name="whatsapp" size={14} />
            WhatsApp
          </Button>
        </div>
      </Panel>

      <Panel title={`Jugadores (${players.length}/${room.max_players})`}>
        <ul className="flex flex-col gap-2">
          {players.map((p) => (
            <li key={p.user_id} className="bg-aldea-bg flex items-center gap-2 rounded p-2">
              {/* Cuadrado, no círculo: en pixel art un círculo de 8px es una mancha */}
              <span
                title={p.ready ? 'Listo' : 'Todavía no está listo'}
                className="h-[10px] w-[10px] shrink-0"
                style={{ background: p.ready ? '#7ab84a' : '#c0483a' }}
              />
              <Avatar
                avatar={p.profiles?.avatar}
                nickname={p.profiles?.nickname ?? ''}
                size={14}
                frame={false}
              />
              <span className="min-w-0 flex-1 truncate">{p.profiles?.nickname ?? '—'}</span>
              {p.user_id === room.host_id && <span className="opacity-60">host</span>}
            </li>
          ))}
        </ul>

        <Button
          full
          tone={yaListo ? 'ghost' : 'accent'}
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            setError(null)
            try {
              await setReady(roomId, !yaListo)
              await reload()
            } catch (e) {
              setError(e.message)
            } finally {
              setBusy(false)
            }
          }}
        >
          <PixelIcon name={yaListo ? 'check' : 'reloj'} size={12} />
          {yaListo ? 'Ya no estoy listo' : 'Estoy listo'}
        </Button>
      </Panel>

      {/* Se muestra mientras se llena la sala (GAME_DESIGN §10.2) */}
      <Leaderboard userId={userId} characters={characters} title="Mientras esperan…" />

      <Panel title="Configuración">
        <ul className="flex flex-col gap-1 opacity-70">
          <li>Meta: {room.target_points} puntos</li>
          <li>Máximo: {room.max_rounds} rondas</li>
          <li>Decisión: {room.decision_timer_seconds}s por ronda</li>
        </ul>
      </Panel>

      {error && <p className="text-center text-red-400">{error}</p>}

      {isHost ? (
        // La sala a medio llenar se puede arrancar igual, pero avisando: empezar
        // sin querer con la mitad de la gente es lo que pasaba antes.
        <Button
          full
          tone={faltanJugadores && confirmarArranque ? 'danger' : 'accent'}
          disabled={busy || !todosListos}
          onClick={async () => {
            if (faltanJugadores && !confirmarArranque) return setConfirmarArranque(true)
            setBusy(true)
            setError(null)
            try {
              onGame(await startGame(roomId))
            } catch (e) {
              setError(e.message)
              setBusy(false)
              setConfirmarArranque(false)
            }
          }}
        >
          {players.length < 2
            ? 'Faltan jugadores'
            : !todosListos
              ? `Iniciar partida (${listos}/${players.length} listos)`
              : faltanJugadores
                ? confirmarArranque
                  ? `Sí, empezar con ${players.length} de ${room.max_players}`
                  : `Empezar sin llenar la sala (${players.length}/${room.max_players})`
                : 'Iniciar partida'}
        </Button>
      ) : (
        <p className="text-center opacity-60">
          {todosListos ? 'Esperando al host…' : `Listos: ${listos}/${players.length}`}
        </p>
      )}

      <Button
        tone="ghost"
        full
        onClick={async () => {
          await leaveRoom(roomId)
          onLeave()
        }}
      >
        Salir
      </Button>
    </div>
  )
}

// `navigator.clipboard` solo existe en contexto seguro (https o localhost). Al
// probar por IP en la red local no está, así que hace falta el plan B.
async function copiarAlPortapapeles(texto) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto)
      return true
    }
  } catch {
    /* cae al plan B */
  }
  const ta = document.createElement('textarea')
  ta.value = texto
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand('copy')
    return true
  } finally {
    document.body.removeChild(ta)
  }
}

function compartirWhatsApp(code) {
  const texto =
    `Entrá a mi sala en La Aldea en Disputa\n` +
    `Código: ${code}\n` +
    `${window.location.origin}`
  // wa.me abre la app instalada en móvil y WhatsApp Web en escritorio
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener')
}
