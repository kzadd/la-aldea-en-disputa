import { useState } from 'react'
import { PixelIcon } from '../components/PixelIcon.jsx'
import { Button, Field, Panel } from '../components/ui.jsx'
import { signIn, signUp } from '../lib/api.js'

export default function Auth({ onSession }) {
  const [modo, setModo] = useState('entrar') // 'entrar' | 'registro'
  const [form, setForm] = useState({ inviteCode: '', nickname: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)

  const set = k => e => setForm({ ...form, [k]: e.target.value })
  const registro = modo === 'registro'

  const enviar = async () => {
    setBusy(true)
    setError(null)
    setAviso(null)
    try {
      if (registro) {
        const { session, needsConfirmation } = await signUp(form)
        if (needsConfirmation) {
          setAviso('Cuenta creada. Revisá tu correo para confirmarla y después entrá.')
          setModo('entrar')
        } else {
          onSession(session)
        }
      } else {
        onSession(await signIn(form.email, form.password))
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const completo = registro
    ? form.inviteCode && form.nickname && form.email && form.password
    : form.email && form.password

  return (
    <div className="flex flex-col gap-4">
      <header className="py-2 text-center">
        <h1 className="text-aldea-accent text-[13px] leading-loose">
          La Aldea
          <br />
          en Disputa
        </h1>
      </header>

      <div role="radiogroup" className="grid grid-cols-2 gap-1">
        {[
          ['entrar', 'Entrar'],
          ['registro', 'Crear cuenta']
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={modo === k}
            onClick={() => {
              setModo(k)
              setError(null)
            }}
            className={`rounded px-3 py-2 ${
              modo === k ? 'bg-aldea-accent text-aldea-bg' : 'bg-aldea-panel'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Panel>
        {registro && (
          <>
            <Field as="label" label="Código de invitación">
              <input
                value={form.inviteCode}
                onChange={e => setForm({ ...form, inviteCode: e.target.value.toUpperCase() })}
                autoCapitalize="characters"
                className="bg-aldea-bg w-full min-w-0 rounded px-2 py-2 tracking-wider outline-none"
              />
            </Field>
            <Field as="label" label="Tu nombre en el juego">
              <input
                value={form.nickname}
                onChange={e => setForm({ ...form, nickname: e.target.value.slice(0, 16) })}
                placeholder="2-16 caracteres"
                className="bg-aldea-bg w-full min-w-0 rounded px-2 py-2 outline-none"
              />
            </Field>
          </>
        )}

        <Field as="label" label="Correo">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            value={form.email}
            onChange={set('email')}
            className="bg-aldea-bg w-full min-w-0 rounded px-2 py-2 outline-none"
          />
        </Field>

        <Field as="label" label="Contraseña">
          <input
            type="password"
            autoComplete={registro ? 'new-password' : 'current-password'}
            value={form.password}
            onChange={set('password')}
            onKeyDown={e => e.key === 'Enter' && completo && !busy && enviar()}
            className="bg-aldea-bg w-full min-w-0 rounded px-2 py-2 outline-none"
          />
        </Field>

        <Button full disabled={busy || !completo} onClick={enviar}>
          {busy ? '…' : registro ? 'Crear cuenta' : 'Entrar'}
        </Button>
      </Panel>

      {error && <p className="text-center leading-relaxed text-red-400">{error}</p>}
      {aviso && (
        <p className="bg-aldea-panel flex items-start gap-2 rounded p-3 leading-relaxed">
          <PixelIcon name="check" size={12} className="mt-[2px]" />
          <span>{aviso}</span>
        </p>
      )}
    </div>
  )
}
