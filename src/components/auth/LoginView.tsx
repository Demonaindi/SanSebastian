import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Button, FormField } from '../ui'

export function LoginView() {
  const { signIn, configured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-shell min-h-screen lg:grid lg:grid-cols-2">
      <section className="login-hero relative flex min-h-[280px] flex-col justify-between overflow-hidden px-6 py-8 sm:min-h-[340px] sm:px-10 sm:py-10 lg:min-h-screen lg:px-12 lg:py-12">
        <div className="login-hero-glow pointer-events-none absolute inset-0" aria-hidden />
        <div className="login-hero-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm">
            <ShieldCheck className="h-3.5 w-3.5" />
            Acceso seguro
          </div>
        </div>

        <div className="relative z-10 my-6 flex flex-1 flex-col justify-center gap-6 sm:gap-8 lg:my-0">
          <div className="login-logo-box rounded-2xl bg-white shadow-2xl shadow-black/20">
            <img
              src="/logo.png"
              alt="San Sebastián — Autotransporte de pasajeros"
              className="login-logo-img"
            />
          </div>

          <div className="hidden max-w-md lg:block">
            <img
              src="/quote-banner.png"
              alt=""
              className="w-full rounded-2xl border border-white/15 shadow-2xl shadow-black/25"
            />
          </div>

          <div className="max-w-md space-y-3 text-white">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Sistema de gestión operativa
            </h1>
            <p className="text-sm leading-relaxed text-white/75 sm:text-base">
              Cotizaciones, agenda, flota y facturación en un solo panel para San Sebastián
              Transporte.
            </p>
            <div className="brand-speed-lines max-w-xs rounded-full bg-white/20" />
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/50">
          San Sebastián · Autotransporte de pasajeros
        </p>
      </section>

      <section className="login-form-panel flex items-center justify-center px-4 py-10 sm:px-8 lg:px-12 lg:py-12">
        <div className="login-form-card w-full max-w-md animate-fade-in">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-primary/70">Bienvenido</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-brand sm:text-3xl">
              Iniciar sesión
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Ingresá con tu cuenta corporativa para acceder al panel.
            </p>
          </div>

          {!configured && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-warning-muted px-4 py-3 text-xs text-amber-900">
              Configurá <code className="font-mono">VITE_SUPABASE_URL</code> y{' '}
              <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> en un archivo{' '}
              <code className="font-mono">.env</code> (ver <code className="font-mono">.env.example</code>).
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <FormField label="Correo electrónico">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field input-field-icon login-input"
                  placeholder="tu@correo.com"
                  disabled={!configured}
                />
              </div>
            </FormField>

            <FormField label="Contraseña">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field input-field-icon pr-11 login-input"
                  placeholder="••••••••"
                  disabled={!configured}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:bg-surface-800 hover:text-slate-600"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-danger-muted px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              className="login-submit w-full"
              size="lg"
              disabled={!configured}
            >
              Ingresar al panel
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-500">
            Uso exclusivo del personal autorizado de San Sebastián Transporte.
          </p>
        </div>
      </section>
    </div>
  )
}
