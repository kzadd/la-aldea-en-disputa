import { useState } from 'react'
import { createRoom, joinRoom, setNickname } from '../lib/api.js'
import { Button, Field, Panel } from '../components/ui.jsx'
import { PixelIcon } from '../components/PixelIcon.jsx'
import { Avatar } from '../components/Avatar.jsx'
import AvatarPicker from '../components/AvatarPicker.jsx'

// Sesiones de 20-40 min (GAME_DESIGN §1). El último abre los controles finos.
const PRESETS = [
  { label: 'Rápida', hint: '20 pts · 10 rondas · 30s', cfg: { targetPoints: 20, maxRounds: 10, timer: 30 } },
  { label: 'Normal', hint: '30 pts · 15 rondas · 45s', cfg: { targetPoints: 30, maxRounds: 15, timer: 45 } },
  { label: 'Larga', hint: '40 pts · 20 rondas · 60s', cfg: { targetPoints: 40, maxRounds: 20, timer: 60 } },
  { label: 'Personalizada', hint: 'a tu medida', cfg: null },
]

// Cinta de píxeles: el remate decorativo de la tarjeta, sin imágenes.
const CINTA = {
  backgroundImage: 'repeating-linear-gradient(90deg, #d9a441 0 4px, transparent 4px 8px)',
}

export default function Home({
  profile,
  onProfile,
  onRoom,
  onOpenProfile,
  onOpenRanking,
  onSignOut,
}) {
  const [code, setCode] = useState('')
  const [cfg, setCfg] = useState({ ...PRESETS[1].cfg, maxPlayers: 3 })
  const [preset, setPreset] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const applyPreset = (i) => {
    setPreset(i)
    if (PRESETS[i].cfg) setCfg({ ...cfg, ...PRESETS[i].cfg })
  }

  const run = async (fn) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="py-2 text-center">
        <h1 className="text-aldea-accent text-[13px] leading-loose">
          La Aldea
          <br />
          en Disputa
        </h1>
      </header>

      <Panel className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[3px]" style={CINTA} />
        <Bienvenida profile={profile} onProfile={onProfile} />
        <div className="h-[2px] w-full opacity-40" style={CINTA} />
        <div className="grid grid-cols-3 gap-2">
          <Button tone="ghost" onClick={onOpenProfile} title="Tus estadísticas">
            <PixelIcon name="stats" size={14} />
            Perfil
          </Button>
          <Button tone="ghost" onClick={onOpenRanking} title="Ranking global">
            <PixelIcon name="trofeo" size={14} />
            Ranking
          </Button>
          <Button tone="ghost" onClick={onSignOut} title="Cerrar sesión">
            <PixelIcon name="salir" size={14} />
            Salir
          </Button>
        </div>
      </Panel>

      <Panel title="Unirse a una sala">
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="CODIGO"
            aria-label="Código de sala"
            className="bg-aldea-bg w-full min-w-0 rounded px-2 py-2 tracking-widest outline-none"
          />
          <Button
            disabled={busy || code.length < 4}
            onClick={() => run(async () => onRoom((await joinRoom(code)).id))}
          >
            Entrar
          </Button>
        </div>
      </Panel>

      <Panel title="Crear sala">
        <Field label="Jugadores">
          <div role="radiogroup" className="flex flex-wrap gap-1">
            {[2, 3, 4, 5, 6, 7, 8].map((o) => (
              <Choice
                key={o}
                on={o === cfg.maxPlayers}
                onClick={() => setCfg({ ...cfg, maxPlayers: o })}
              >
                {o}
              </Choice>
            ))}
          </div>
        </Field>

        <Field label="Duración">
          <div role="radiogroup" className="flex flex-col gap-1">
            {PRESETS.map((p, i) => (
              <Choice key={p.label} on={i === preset} onClick={() => applyPreset(i)} block>
                <span>{p.label}</span>
                <span className="text-[8px] opacity-70">{p.hint}</span>
              </Choice>
            ))}
          </div>
        </Field>

        {!PRESETS[preset].cfg && (
          <>
            <Field label="Puntos objetivo">
              <Options
                value={cfg.targetPoints}
                onChange={(v) => setCfg({ ...cfg, targetPoints: v })}
                options={[20, 30, 40]}
              />
            </Field>
            <Field label="Límite de rondas">
              <Options
                value={cfg.maxRounds}
                onChange={(v) => setCfg({ ...cfg, maxRounds: v })}
                options={[10, 15, 20]}
              />
            </Field>
            <Field label="Tiempo de decisión">
              <Options
                value={cfg.timer}
                onChange={(v) => setCfg({ ...cfg, timer: v })}
                options={[30, 45, 60]}
                suffix="s"
              />
            </Field>
          </>
        )}

        <Button
          full
          disabled={busy}
          onClick={() => run(async () => onRoom((await createRoom(cfg)).id))}
        >
          Crear
        </Button>
      </Panel>

      {error && <p className="text-center text-red-400">{error}</p>}
    </div>
  )
}

// Cabecera de la casa: avatar + nombre. El nombre ya no es un input suelto
// (parecía roto: se veía editable pero estaba deshabilitado); es un rótulo y
// se cambia entrando explícitamente en modo edición.
function Bienvenida({ profile, onProfile }) {
  const [editando, setEditando] = useState(false)
  const [eligiendo, setEligiendo] = useState(false)
  const [nick, setNick] = useState(profile.nickname)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const abrir = () => {
    setNick(profile.nickname)
    setError(null)
    setEditando(true)
  }

  const guardar = async () => {
    setBusy(true)
    setError(null)
    try {
      onProfile({ ...profile, nickname: await setNickname(nick.trim()) })
      setEditando(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (editando) {
    return (
      <div className="flex flex-col gap-2">
        {/* Un único input: acá el <label> sí corresponde */}
        <Field as="label" label="Tu nombre">
          <input
            value={nick}
            autoFocus
            maxLength={16}
            onChange={(e) => setNick(e.target.value.slice(0, 16))}
            className="bg-aldea-bg w-full min-w-0 rounded px-2 py-2 outline-none"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Button disabled={busy || nick.trim().length < 2} onClick={guardar}>
            Guardar
          </Button>
          <Button tone="ghost" disabled={busy} onClick={() => setEditando(false)}>
            Cancelar
          </Button>
        </div>
        {error && <p className="text-red-400">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar
        avatar={profile.avatar}
        nickname={profile.nickname}
        onClick={() => setEligiendo(true)}
        title="Cambiar avatar"
      />
      {eligiendo && (
        <AvatarPicker
          profile={profile}
          onProfile={onProfile}
          onClose={() => setEligiendo(false)}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[8px] tracking-[0.25em] opacity-50">BIENVENIDO</p>
        <p
          title={profile.nickname}
          className={`text-aldea-accent mt-1 truncate leading-loose ${
            profile.nickname.length > 10 ? 'text-[11px]' : 'text-[13px]'
          }`}
        >
          {profile.nickname}
        </p>
      </div>
      <button
        type="button"
        onClick={abrir}
        title="Cambiar nombre"
        aria-label="Cambiar nombre"
        className="bg-aldea-bg flex h-9 w-9 shrink-0 items-center justify-center rounded"
      >
        <PixelIcon name="lapiz" size={14} />
      </button>
    </div>
  )
}

function Choice({ on, onClick, children, block }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={`rounded px-2 py-2 ${block ? 'flex flex-col gap-1 text-left' : 'px-3'} ${
        on ? 'bg-aldea-accent text-aldea-bg' : 'bg-aldea-bg'
      }`}
    >
      {children}
    </button>
  )
}

function Options({ value, onChange, options, suffix = '' }) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-1">
      {options.map((o) => (
        <Choice key={o} on={o === value} onClick={() => onChange(o)}>
          {o}
          {suffix}
        </Choice>
      ))}
    </div>
  )
}
