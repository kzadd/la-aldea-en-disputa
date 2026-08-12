import { useState } from 'react'
import { Avatar } from '../components/Avatar.jsx'
import AvatarPicker from '../components/AvatarPicker.jsx'
import { PixelIcon } from '../components/PixelIcon.jsx'
import { Titulo } from '../components/Titulo.jsx'
import { Button, Chip, Field, Input } from '../components/ui.jsx'
import { createRoom, joinRoom, setNickname } from '../lib/api.js'

// Sesiones de 20-40 min (GAME_DESIGN §1). El último abre los controles finos.
const PRESETS = [
  {
    label: 'Rápida',
    hint: '20 pts · 10 rondas · 30s',
    cfg: { targetPoints: 20, maxRounds: 10, timer: 30 }
  },
  {
    label: 'Normal',
    hint: '30 pts · 15 rondas · 45s',
    cfg: { targetPoints: 30, maxRounds: 15, timer: 45 }
  },
  {
    label: 'Larga',
    hint: '40 pts · 20 rondas · 60s',
    cfg: { targetPoints: 40, maxRounds: 20, timer: 60 }
  },
  { label: 'Personalizada', hint: 'a tu medida', cfg: null }
]

export default function Home({ profile, onProfile, onRoom, onOpenProfile, onOpenRanking, onSignOut }) {
  const [code, setCode] = useState('')
  const [cfg, setCfg] = useState({ ...PRESETS[1].cfg, maxPlayers: 3 })
  const [preset, setPreset] = useState(1)
  const [busy, setBusy] = useState(false)
  // Dos errores distintos: el de unirse pertenece a su panel —"esa sala no
  // existe" al pie de la pantalla obligaba a buscar de qué hablaba—.
  const [errorUnirse, setErrorUnirse] = useState(null)
  const [errorCrear, setErrorCrear] = useState(null)

  const applyPreset = i => {
    setPreset(i)
    if (PRESETS[i].cfg) setCfg({ ...cfg, ...PRESETS[i].cfg })
  }

  const run = (setError) => async fn => {
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
  const alUnirse = run(setErrorUnirse)
  const alCrear = run(setErrorCrear)

  return (
    <div className="flex flex-col gap-4">
      <Titulo size={16} />

      <Bienvenida profile={profile} onProfile={onProfile} />

      <div className="grid grid-cols-3 gap-2">
        <Button tone="ghost" onClick={onOpenProfile} className="bg-aldea-panel !py-3 !text-[12px]">
          Perfil
        </Button>
        <Button tone="ghost" onClick={onOpenRanking} className="bg-aldea-panel !py-3 !text-[12px]">
          Ranking
        </Button>
        <Button tone="salir" onClick={onSignOut} className="bg-aldea-panel !py-3 !text-[12px]">
          Salir
        </Button>
      </div>

      <div className="bg-aldea-panel border-aldea-line flex flex-col gap-2.5 rounded-lg border p-4">
        <h2 className="font-title text-aldea-muted text-[11px] tracking-wide">UNIRSE A UNA SALA</h2>
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={e => {
              setCode(e.target.value.toUpperCase().slice(0, 6))
              setErrorUnirse(null) // el código cambió: el error ya no aplica
            }}
            error={!!errorUnirse}
            placeholder="CODIGO"
            aria-label="Código de sala"
            className="flex-1 tracking-[4px] uppercase"
          />
          {/* Como en el diseño: relleno apagado mientras el código está
              incompleto y amarillo lleno cuando ya se puede entrar. Sigue
              deshabilitado, pero sin el velo del 40%: el propio color ya dice
              que no está listo. */}
          <Button
            tone={code.length >= 4 ? 'plano' : 'apagado'}
            disabled={busy || code.length < 4}
            onClick={() => alUnirse(async () => onRoom((await joinRoom(code)).id))}
            className="!px-5 !text-[13px] disabled:!opacity-100"
          >
            Entrar
          </Button>
        </div>
        {errorUnirse && (
          <p
            className="border-aldea-danger text-aldea-warm flex items-center gap-2 rounded-lg border p-3 text-[12px] leading-snug"
            style={{ background: 'rgba(192,73,46,.12)' }}
          >
            <span className="bg-aldea-warm inline-block h-2 w-2 shrink-0" />
            {errorUnirse}
          </p>
        )}
      </div>

      <div className="bg-aldea-panel border-aldea-line flex flex-col gap-3.5 rounded-lg border p-4">
        <h2 className="font-title text-aldea-accent text-[11px] tracking-wide">CREAR SALA</h2>

        <Field label="Jugadores">
          <div role="radiogroup" className="flex gap-1.5">
            {[2, 3, 4, 5, 6, 7, 8].map(o => (
              <Chip
                key={o}
                on={o === cfg.maxPlayers}
                onClick={() => setCfg({ ...cfg, maxPlayers: o })}
                className="!px-0"
              >
                {o}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Duración">
          <div role="radiogroup" className="flex flex-col gap-1.5">
            {PRESETS.map((p, i) => (
              // Elegida = contorno amarillo y fondo apenas teñido, no relleno:
              // así el bloque no se convierte en una mancha amarilla.
              <button
                key={p.label}
                type="button"
                role="radio"
                aria-checked={i === preset}
                onClick={() => applyPreset(i)}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                  i === preset ? 'border-aldea-accent' : 'bg-aldea-card border-transparent'
                }`}
                style={i === preset ? { background: 'rgba(232,163,61,.1)' } : undefined}
              >
                <span
                  className={`text-[13px] leading-none ${
                    i === preset ? 'text-aldea-accent' : 'text-aldea-ink'
                  }`}
                >
                  {p.label}
                </span>
                <span
                  className={`text-[11px] leading-none ${
                    i === preset ? 'text-aldea-accent-soft' : 'text-aldea-dim'
                  }`}
                >
                  {p.hint}
                </span>
              </button>
            ))}
          </div>
        </Field>

        {!PRESETS[preset].cfg && (
          <div className="bg-aldea-card flex flex-col gap-3 rounded-lg p-3">
            <Field label="Puntos objetivo">
              <Options
                value={cfg.targetPoints}
                onChange={v => setCfg({ ...cfg, targetPoints: v })}
                options={[20, 30, 40]}
              />
            </Field>
            <Field label="Límite de rondas">
              <Options
                value={cfg.maxRounds}
                onChange={v => setCfg({ ...cfg, maxRounds: v })}
                options={[10, 15, 20]}
              />
            </Field>
            <Field label="Tiempo de decisión">
              <Options
                value={cfg.timer}
                onChange={v => setCfg({ ...cfg, timer: v })}
                options={[30, 45, 60]}
                suffix="s"
              />
            </Field>
          </div>
        )}

        <Button
          full
          disabled={busy}
          onClick={() => alCrear(async () => onRoom((await createRoom(cfg)).id))}
        >
          CREAR
        </Button>

        {errorCrear && (
          <p
            className="border-aldea-danger text-aldea-warm flex items-center gap-2 rounded-lg border p-3 text-[12px] leading-snug"
            style={{ background: 'rgba(192,73,46,.12)' }}
          >
            <span className="bg-aldea-warm inline-block h-2 w-2 shrink-0" />
            {errorCrear}
          </p>
        )}
      </div>
    </div>
  )
}

// Cabecera de la casa: avatar + nombre. El nombre es un rótulo, no un input:
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

  return (
    <>
      <div className="bg-aldea-panel border-aldea-line flex items-center gap-3 rounded-lg border p-3">
        {/* 52 de caja con el retrato a 35: 5 px por celda del sprite de 7×7, que
            es lo que lo mantiene nítido. Con medidas que no dan entero se ven
            costuras entre los píxeles. */}
        <Avatar
          avatar={profile.avatar}
          nickname={profile.nickname}
          box={52}
          size={35}
          onClick={() => setEligiendo(true)}
          title="Cambiar avatar"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-title text-aldea-muted text-[10px] tracking-[1.5px]">
            BIENVENIDO
          </span>
          <span
            className="font-title text-aldea-ink truncate leading-none"
            style={{ fontSize: profile.nickname.length > 10 ? 14 : 16 }}
          >
            {profile.nickname}
          </span>
        </div>
        <button
          type="button"
          onClick={abrir}
          title="Cambiar nombre"
          aria-label="Cambiar nombre"
          className="bg-aldea-card border-aldea-line hover:border-aldea-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
        >
          <PixelIcon name="lapiz" size={13} />
        </button>
      </div>

      {editando && (
        <div
          className="bg-aldea-panel flex flex-col gap-2.5 rounded-lg border border-dashed p-3"
          style={{ borderColor: '#8a6224' }}
        >
          {/* Un único input: acá el <label> sí corresponde */}
          <h2 className="font-title text-aldea-muted text-[11px] tracking-wide">
            TU NOMBRE
          </h2>
            <Input
              value={nick}
              autoFocus
              maxLength={16}
              error={!!error}
              placeholder="2-16 caracteres"
              onChange={e => setNick(e.target.value.slice(0, 16))}
            />
          <div className="grid grid-cols-2 gap-2">
            <Button tone="plano" disabled={busy || nick.trim().length < 2} onClick={guardar}>
              Guardar
            </Button>
            <Button tone="cancelar" disabled={busy} onClick={() => setEditando(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {eligiendo && (
        <AvatarPicker profile={profile} onProfile={onProfile} onClose={() => setEligiendo(false)} />
      )}
    </>
  )
}

function Options({ value, onChange, options, suffix = '' }) {
  return (
    <div role="radiogroup" className="flex gap-1.5">
      {options.map(o => (
        <Chip
          key={o}
          on={o === value}
          onClick={() => onChange(o)}
          apagado="bg-aldea-panel"
          className="!text-[12px]"
        >
          {o}
          {suffix}
        </Chip>
      ))}
    </div>
  )
}
