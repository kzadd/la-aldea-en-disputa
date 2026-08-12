import { useState } from 'react'
import { PixelIcon } from '../components/PixelIcon.jsx'
import { Titulo } from '../components/Titulo.jsx'
import { Button, Field, Input } from '../components/ui.jsx'
import { signIn, signUp } from '../lib/api.js'

const VACIO = { inviteCode: '', nickname: '', email: '', password: '' }

export default function Auth({ onSession }) {
  const [modo, setModo] = useState('entrar') // 'entrar' | 'registro'
  const [form, setForm] = useState(VACIO)
  const [verPass, setVerPass] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [malos, setMalos] = useState([]) // campos marcados en rojo
  const [aviso, setAviso] = useState(null)

  const registro = modo === 'registro'

  // Escribir en un campo marcado borra el error entero —mensaje y bordes—:
  // ya no describe lo que hay en pantalla.
  const cambiar = (k, v) => {
    setForm({ ...form, [k]: v })
    if (malos.includes(k)) {
      setMalos([])
      setError(null)
    }
  }
  const set = k => e => cambiar(k, e.target.value)

  // Cada pestaña arranca de cero: lo escrito en una no se arrastra a la otra.
  const cambiarModo = k => {
    if (k === modo) return
    setModo(k)
    setForm(VACIO)
    setVerPass(false)
    setError(null)
    setMalos([])
    setAviso(null)
  }

  const enviar = async () => {
    setBusy(true)
    setError(null)
    setMalos([])
    setAviso(null)
    try {
      if (registro) {
        const { session, needsConfirmation } = await signUp(form)
        if (needsConfirmation) {
          setAviso('Cuenta creada. Revisá tu correo para confirmarla y después entrá.')
          // Le dejamos el correo puesto para que solo tenga que escribir la clave.
          setModo('entrar')
          setForm({ ...VACIO, email: form.email })
          setVerPass(false)
        } else {
          onSession(session)
        }
      } else {
        onSession(await signIn(form.email, form.password))
      }
    } catch (e) {
      setError(e.message)
      setMalos(e.campos ?? [])
    } finally {
      setBusy(false)
    }
  }

  const completo = registro
    ? form.inviteCode && form.nickname && form.email && form.password
    : form.email && form.password

  return (
    <div className="flex flex-col gap-4">
      <Titulo />

      <div
        role="radiogroup"
        className="bg-aldea-panel border-aldea-line flex gap-1 rounded-lg border p-1"
      >
        {[
          ['entrar', 'ENTRAR'],
          ['registro', 'CREAR CUENTA']
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={modo === k}
            onClick={() => cambiarModo(k)}
            className={`font-title flex-1 rounded-lg px-2 py-3 text-[11px] leading-none ${
              modo === k ? 'bg-aldea-accent text-aldea-card' : 'text-aldea-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-aldea-panel border-aldea-line flex flex-col gap-3.5 rounded-lg border p-4">
        {registro && (
          <>
            <Field as="label" label="Código de invitación">
              <Input
                value={form.inviteCode}
                onChange={e => cambiar('inviteCode', e.target.value.toUpperCase())}
                error={malos.includes('inviteCode')}
                autoCapitalize="characters"
                placeholder="ALDEA-0000"
                className="tracking-[2px]"
              />
            </Field>
            <Field as="label" label="Tu nombre en el juego">
              <Input
                value={form.nickname}
                onChange={e => cambiar('nickname', e.target.value.slice(0, 16))}
                error={malos.includes('nickname')}
                placeholder="2-16 caracteres"
              />
            </Field>
          </>
        )}

        <Field as="label" label="Correo">
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="tu@correo.com"
            value={form.email}
            onChange={set('email')}
            error={malos.includes('email')}
          />
        </Field>

        {/* Un <div>, no un <label>: el rótulo comparte fila con el botón de
            mostrar/ocultar, y un <label> adopta como suyo el primer control que
            contiene —que sería ese botón, no el campo—. El vínculo con el input
            lo hace `aria-label`. */}
        <div className="flex flex-col gap-1">
          <span className="flex items-baseline justify-between">
            <span className="text-aldea-muted text-[12px]">Contraseña</span>
            {/* Al crear cuenta se ve siempre: se está eligiendo, no recordando. */}
            {!registro && (
              <button
                type="button"
                onClick={() => setVerPass(v => !v)}
                className="text-aldea-accent text-[12px]"
              >
                {verPass ? 'ocultar' : 'mostrar'}
              </button>
            )}
          </span>
          <Input
            type={registro || verPass ? 'text' : 'password'}
            aria-label="Contraseña"
            autoComplete={registro ? 'new-password' : 'current-password'}
            placeholder="mínimo 6 caracteres"
            value={form.password}
            onChange={set('password')}
            error={malos.includes('password')}
            onKeyDown={e => e.key === 'Enter' && completo && !busy && enviar()}
          />
        </div>

        {error && (
          <p
            className="border-aldea-danger text-aldea-warm flex items-center gap-2 rounded-lg border p-3 text-[12px] leading-snug"
            style={{ background: 'rgba(192,73,46,.12)' }}
          >
            <span className="bg-aldea-warm inline-block h-2 w-2 shrink-0" />
            {error}
          </p>
        )}

        <Button full disabled={busy || !completo} onClick={enviar}>
          {busy ? '…' : registro ? 'CREAR CUENTA' : 'ENTRAR'}
        </Button>
      </div>

      {aviso && (
        <p className="bg-aldea-panel border-aldea-line flex items-start gap-2 rounded-lg border p-3 text-[12px] leading-relaxed">
          <PixelIcon name="check" size={12} className="mt-[2px]" />
          <span>{aviso}</span>
        </p>
      )}
    </div>
  )
}
