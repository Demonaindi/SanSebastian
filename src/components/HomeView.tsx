import {
  Bus,
  Calculator,
  CalendarDays,
  Contact,
  UserCog,
  Wallet,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import type { TabId } from './TabBar'

interface HomeViewProps {
  onNavigate: (tab: TabId) => void
}

export function HomeView({ onNavigate }: HomeViewProps) {
  const { profile, isAdmin } = useAuth()
  const firstName = profile?.nombre?.split(' ')[0] ?? 'equipo'

  const modules: {
    id: TabId
    label: string
    description: string
    icon: typeof Calculator
    tone: string
    adminOnly?: boolean
  }[] = [
    {
      id: 'cotizador',
      label: 'Cotizar',
      description: 'Presupuestos',
      icon: Calculator,
      tone: 'from-sky-100 to-blue-200 text-sky-700',
    },
    {
      id: 'agenda',
      label: 'Agenda',
      description: 'Disponibilidad',
      icon: CalendarDays,
      tone: 'from-violet-100 to-purple-200 text-violet-700',
    },
    {
      id: 'flota',
      label: 'Flota',
      description: 'Unidades',
      icon: Bus,
      tone: 'from-cyan-100 to-teal-200 text-teal-700',
      adminOnly: true,
    },
    {
      id: 'clientes',
      label: 'Clientes',
      description: 'CRM',
      icon: Contact,
      tone: 'from-amber-100 to-orange-200 text-amber-700',
      adminOnly: true,
    },
    {
      id: 'choferes',
      label: 'Choferes',
      description: 'Personal',
      icon: UserCog,
      tone: 'from-emerald-100 to-green-200 text-emerald-700',
      adminOnly: true,
    },
    {
      id: 'facturacion',
      label: 'Caja',
      description: 'Cobros',
      icon: Wallet,
      tone: 'from-rose-100 to-pink-200 text-rose-700',
      adminOnly: true,
    },
  ]

  const visible = modules.filter((m) => !m.adminOnly || isAdmin)

  return (
    <div className="space-y-6 animate-fade-in md:hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">San Sebastián</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Hola, {firstName}
          </h1>
        </div>
        <span className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
          {profile?.rol === 'Administrador' ? 'Admin' : 'Operador'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {visible.map((mod) => {
          const Icon = mod.icon
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => onNavigate(mod.id)}
              className="tap-press card-premium flex flex-col items-center gap-2 px-2 py-4 text-center"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${mod.tone}`}
              >
                <Icon className="h-6 w-6" strokeWidth={1.6} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">{mod.label}</p>
                <p className="text-[10px] text-slate-400">{mod.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="card-premium p-4">
        <p className="text-sm font-semibold text-slate-900">Operación del día</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Cotizá rutas, mirá disponibilidad por unidad y gestioná reservas con la
          experiencia mobile-first de San Sebastián.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('cotizador')}
          className="mt-3 text-sm font-semibold text-brand"
        >
          Ir al cotizador →
        </button>
      </div>
    </div>
  )
}
