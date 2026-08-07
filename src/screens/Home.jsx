import { useState } from 'react'
import { createRoom, joinRoom, setNickname } from '../lib/api.js'
import { Button, Field, Panel } from '../components/ui.jsx'
import { Leaderboard } from '../components/Leaderboard.jsx'

export default function Home({ profile, onProfile, onRoom, onOpenProfile }) {
  const [nick, setNick] = useState(profile.nickname)
  const [code, setCode] = useState('')
  const [cfg, setCfg] = useState({ ...PRESETS[1].cfg, maxPlayers: 4 })
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
      if (nick.trim() && nick.trim() !== profile.nickname) {
        await setNickname(profile.id, nick.trim())
        onProfile({ ...profile, nickname: nick.trim() })
      }
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

      <Panel>
        <Field label="Tu nombre">
          <div className="flex gap-2">
            <input
              value={nick}
              onChange={(e) => setNick(e.target.value.slice(0, 16))}
              className="bg-aldea-bg w-full min-w-0 rounded px-2 py-2 outline-none"
            />
            <Button tone="ghost" onClick={onOpenProfile}>
              📊
            </Button>
          </div>
        </Field>
      </Panel>

      <Panel title="Unirse a una sala">
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="CODIGO"
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
          <Options
            value={cfg.maxPlayers}
            onChange={(v) => setCfg({ ...cfg, maxPlayers: v })}
            options={[2, 3, 4, 5, 6, 7, 8]}
          />
        </Field>
        <Field label="Duración">
          <div className="flex flex-col gap-1">
            {PRESETS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => applyPreset(i)}
                className={`flex flex-col gap-1 rounded px-2 py-2 text-left ${
                  i === preset ? 'bg-aldea-accent text-aldea-bg' : 'bg-aldea-bg'
                }`}
              >
                <span>{p.label}</span>
                <span className="text-[8px] opacity-70">{p.hint}</span>
              </button>
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

      <Leaderboard userId={profile.id} />
    </div>
  )
}

// Sesiones de 20-40 min (GAME_DESIGN §1). El último abre los controles finos.
const PRESETS = [
  { label: 'Rápida', hint: '20 pts · 10 rondas · 30s', cfg: { targetPoints: 20, maxRounds: 10, timer: 30 } },
  { label: 'Normal', hint: '30 pts · 15 rondas · 45s', cfg: { targetPoints: 30, maxRounds: 15, timer: 45 } },
  { label: 'Larga', hint: '40 pts · 20 rondas · 60s', cfg: { targetPoints: 40, maxRounds: 20, timer: 60 } },
  { label: 'Personalizada', hint: 'a tu medida', cfg: null },
]

function Options({ value, onChange, options, suffix = '' }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`rounded px-2 py-1 ${
            o === value ? 'bg-aldea-accent text-aldea-bg' : 'bg-aldea-bg'
          }`}
        >
          {o}
          {suffix}
        </button>
      ))}
    </div>
  )
}
