import { useEffect, useState } from 'react'
import { PixelIcon } from '../components/PixelIcon.jsx'
import { Button } from '../components/ui.jsx'
import { useRoom } from '../hooks/useRoom.js'
import { tinte } from '../data/colores.js'
import { leaveRoom, setReady, startGame } from '../lib/api.js'

export default function Lobby({ roomId, userId, onGame, onLeave }) {
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

  if (!room) return <p className="text-aldea-muted p-4">Cargando sala…</p>

  const isHost = room.host_id === userId
  const yaListo = !!players.find(p => p.user_id === userId)?.ready
  const listos = players.filter(p => p.ready).length
  const todosListos = players.length >= 2 && listos === players.length
  const faltanJugadores = players.length < room.max_players
  const puedeArrancar = todosListos
  const libres = room.max_players - players.length

  const marcarListo = async () => {
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
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-aldea-panel border-aldea-line flex flex-col items-center gap-3 rounded-lg border px-4 py-4 text-center">
        <span className="font-title text-aldea-muted text-[10px] tracking-[2px]">
          CÓDIGO DE SALA
        </span>
        <span
          className="font-title text-aldea-accent text-[28px] leading-none tracking-[6px] font-bold"
          style={{ textShadow: '0 3px 0 #3d2c1d' }}
        >
          {room.code}
        </span>
        <div className="grid w-full grid-cols-2 gap-2">
          {/* Los dos van de contorno, como en el diseño. Copiado no se rellena
              de amarillo: solo se enciende el borde y el texto. */}
          <Button
            tone="ghost"
            onClick={copiar}
            className={`!py-3 !text-[12px] ${
              copiado ? '!border-aldea-accent !text-aldea-accent' : ''
            }`}
          >
            {copiado ? 'Copiado' : 'Copiar'}
          </Button>
          <Button
            tone="ghost"
            onClick={() => compartirWhatsApp(room.code)}
            className="!py-3 !text-[12px]"
          >
            WhatsApp
          </Button>
        </div>
      </div>

      <div className="bg-aldea-panel border-aldea-line flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-title text-aldea-muted text-[11px] tracking-wide">JUGADORES</h2>
          <span className="text-aldea-accent text-[12px]">
            {players.length}/{room.max_players}
          </span>
        </div>

        {/* Barra de asientos: se llena a medida que entra gente */}
        <div className="bg-aldea-card h-[5px] overflow-hidden rounded-full">
          <div
            className="bg-aldea-accent h-full transition-[width] duration-300"
            style={{ width: `${Math.round((100 * players.length) / room.max_players)}%` }}
          />
        </div>

        <ul className="flex flex-col gap-3">
          {players.map((p, i) => (
            <li
              key={p.user_id}
              className="bg-aldea-card flex items-center gap-3 rounded-md border p-3"
              style={{ borderColor: tinte(i) }}
            >
              {/* 28 = 4 px por celda, el tamaño que el diseño usa cuando el
                  retrato es el protagonista de la fila */}
              <span
                className="bg-aldea-panel flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[5px] border-2"
                style={{ borderColor: tinte(i) }}
              >
                <PixelIcon name={p.profiles?.avatar || 'aldeano'} size={28} />
              </span>
              <span className="text-aldea-ink min-w-0 flex-1 truncate text-[12px]">
                {p.profiles?.nickname ?? '—'}
              </span>
              {p.user_id === room.host_id && (
                <span className="text-aldea-dim text-[11px]">host</span>
              )}
              {/* El estado es una píldora, no texto suelto: así se lee de un
                  vistazo quién falta cuando la sala está llena */}
              <span
                className="flex shrink-0 items-center gap-1.5 rounded-[5px] px-2 py-1.5 text-[11px]"
                style={{
                  background: p.ready ? 'rgba(127,176,105,.14)' : '#241a13',
                  color: p.ready ? '#8fc178' : '#9d8b74',
                }}
              >
                {/* Cuadrado, no círculo: en pixel art un círculo de 8px es una mancha */}
                <span
                  className="h-2 w-2"
                  style={{ background: p.ready ? '#7fb069' : '#5a4c3e' }}
                  title={p.ready ? 'Listo' : 'Todavía no está listo'}
                />
                {p.ready ? 'listo' : 'sin confirmar'}
              </span>
            </li>
          ))}

          {libres > 0 &&
            Array.from({ length: libres }).map((_, i) => (
              <li
                key={`libre-${i}`}
                className="border-aldea-line flex items-center gap-3 rounded-md border border-dashed p-3 text-[12px]"
                style={{ color: '#b3a189' }}
              >
                <span className="h-[9px] w-[9px] shrink-0" style={{ background: '#3d2c1d' }} />
                Esperando jugador {players.length + i + 1}…
              </li>
            ))}
        </ul>

        <Button
          full
          tone={yaListo ? 'listo' : 'accent'}
          disabled={busy}
          onClick={marcarListo}
        >
          {yaListo ? 'YA NO ESTOY LISTO' : 'ESTOY LISTO'}
        </Button>
      </div>

      <div className="bg-aldea-panel border-aldea-line flex flex-col gap-2.5 rounded-lg border p-4">
        <h2 className="font-title text-aldea-muted text-[11px] tracking-wide">CONFIGURACIÓN</h2>
        <div className="flex gap-1.5">
          <Dato value={room.target_points} label="puntos" />
          <Dato value={room.max_rounds} label="rondas" />
          <Dato value={`${room.decision_timer_seconds}s`} label="decisión" />
        </div>
      </div>


      {error && <p className="text-aldea-warm text-center text-[12px]">{error}</p>}

      {isHost ? (
        // La sala a medio llenar se puede arrancar igual, pero avisando: empezar
        // sin querer con la mitad de la gente es lo que pasaba antes.
        <Button
          full
          // Mientras no se pueda arrancar va apagado, como en el diseño: un
          // amarillo al 40% parecía un botón roto.
          tone={
            !puedeArrancar
              ? 'inactivo'
              : faltanJugadores && confirmarArranque
                ? 'danger'
                : 'accent'
          }
          className={puedeArrancar ? '' : 'disabled:!opacity-100'}
          disabled={busy || !puedeArrancar}
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
              ? `Faltan confirmaciones (${listos}/${players.length})`
              : faltanJugadores
                ? confirmarArranque
                  ? `Sí, empezar con ${players.length} de ${room.max_players}`
                  : `Empezar sin llenar la sala (${players.length}/${room.max_players})`
                : 'EMPEZAR PARTIDA'}
        </Button>
      ) : (
        <p className="text-aldea-dim text-center text-[12px]">
          {todosListos ? 'Esperando al host…' : `Listos: ${listos}/${players.length}`}
        </p>
      )}

      <button
        type="button"
        // Si el servidor rechaza la salida hay que decirlo: antes la promesa
        // fallaba, `onLeave()` no llegaba a correr y el botón parecía muerto.
        onClick={async () => {
          try {
            await leaveRoom(roomId)
            onLeave()
          } catch (e) {
            setError(e.message)
          }
        }}
        className="text-aldea-dim hover:text-aldea-warm py-1 text-center text-[12px]"
      >
        Salir de la sala
      </button>
    </div>
  )
}

function Dato({ value, label }) {
  return (
    <div className="bg-aldea-card flex flex-1 flex-col items-center gap-1.5 rounded-lg py-3">
      <span className="font-title text-aldea-ink text-[14px] leading-none">{value}</span>
      <span className="text-aldea-dim text-[11px] leading-none">{label}</span>
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
    `Entrá a mi sala en La Aldea en Disputa\n` + `Código: ${code}\n` + `${window.location.origin}`
  // wa.me abre la app instalada en móvil y WhatsApp Web en escritorio
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener')
}
