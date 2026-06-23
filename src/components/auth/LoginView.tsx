import { useState } from 'react'
import { Bus, Lock, Mail } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Button, FormField } from '../ui'

export function LoginView() {
  const { signIn, configured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    <div className="flex min-h-screen items-center justify-center bg-surface-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/30">
            <Bus className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-brand">San Sebastián</h1>
          <p className="mt-1 text-sm text-slate-600">Sistema de gestión — Autotransporte de pasajeros</p>
        </div>

        <div className="card-elevated rounded-2xl p-6">
          {!configured && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-warning-muted px-3 py-2 text-xs text-amber-900">
              Configurá <code className="font-mono">VITE_SUPABASE_URL</code> y{' '}
              <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> en un archivo{' '}
              <code className="font-mono">.env</code> (ver <code className="font-mono">.env.example</code>).
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Email">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field input-field-icon"
                  placeholder="usuario@sansebastian.com"
                  disabled={!configured}
                />
              </div>
            </FormField>

            <FormField label="Contraseña">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field input-field-icon"
                  placeholder="••••••••"
                  disabled={!configured}
                />
              </div>
            </FormField>

            {error && (
              <p className="rounded-lg bg-danger-muted px-3 py-2 text-sm text-danger">{error}</p>
            )}

            <Button type="submit" loading={loading} className="w-full" disabled={!configured}>
              Ingresar
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
