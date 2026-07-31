import { useMemo } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Bus,
  Calculator,
  CalendarDays,
  Contact,
  History,
  UserCog,
  Wallet,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { formatVehiculoInterno, getExpiryLevel, viajeFechaFin } from '../lib/mappers'
import { formatCurrency } from '../lib/quote'
import type { TabId } from './TabBar'
import { Badge, Card, CardBody, StatCard } from './ui'

interface HomeViewProps {
  onNavigate: (tab: TabId) => void
}

function todayKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function HomeView({ onNavigate }: HomeViewProps) {
  const { profile, isAdmin } = useAuth()
  const { vehiculos, viajes, clientes, choferes } = useData()
  const firstName = profile?.nombre?.split(' ')[0] ?? 'equipo'
  const today = todayKey()

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
      description: 'Nueva cotización',
      icon: Calculator,
      tone: 'from-sky-100 to-blue-200 text-sky-700',
    },
    {
      id: 'cotizaciones',
      label: 'Historial',
      description: 'Cotizaciones',
      icon: History,
      tone: 'from-indigo-100 to-sky-200 text-indigo-700',
    },
    {
      id: 'agenda',
      label: 'Agenda',
      description: 'Disponibilidad',
      icon: CalendarDays,
      tone: 'from-violet-100 to-purple-200 text-violet-700',
    },
    {
      id: 'metricas',
      label: 'Números',
      description: 'Mes a mes',
      icon: BarChart3,
      tone: 'from-sky-100 to-cyan-200 text-sky-800',
      adminOnly: true,
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

  const docAlerts = useMemo(() => {
    const items: { id: string; nombre: string; label: string; level: 'warning' | 'danger' }[] = []
    for (const v of vehiculos) {
      const checks: { label: string; date: string | null }[] = [
        { label: 'VTV', date: v.vtv_vencimiento },
        { label: 'Seguro', date: v.seguro_vencimiento },
        { label: 'Matafuegos', date: v.matafuegos_vencimiento },
      ]
      for (const c of checks) {
        const level = getExpiryLevel(c.date)
        if (level === 'warning' || level === 'danger') {
          items.push({
            id: `${v.id}-${c.label}`,
            nombre: formatVehiculoInterno(v),
            label: c.label,
            level,
          })
        }
      }
    }
    return items.sort((a, b) => (a.level === 'danger' ? -1 : 1) - (b.level === 'danger' ? -1 : 1))
  }, [vehiculos])

  const kpis = useMemo(() => {
    const activos = viajes.filter((v) => v.estado_viaje !== 'Cancelado')
    const hoy = activos.filter((v) => {
      const fin = viajeFechaFin(v.fecha_viaje, v.fecha_hasta)
      return v.fecha_viaje <= today && fin >= today
    })
    const pendiente = activos
      .filter((v) => v.estado_pago !== 'Pagado')
      .reduce((s, v) => s + Number(v.precio_total), 0)
    const cobrado = activos
      .filter((v) => v.estado_pago === 'Pagado')
      .reduce((s, v) => s + Number(v.precio_total), 0)
    return {
      viajesHoy: hoy.length,
      unidades: vehiculos.length,
      clientes: clientes.length,
      choferes: choferes.filter((c) => c.estado === 'Disponible').length,
      pendiente,
      cobrado,
    }
  }, [viajes, vehiculos, clientes, choferes, today])

  const alertsBlock =
    isAdmin && docAlerts.length > 0 ? (
      <Card hover={false}>
        <CardBody className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" strokeWidth={1.75} />
            <p className="text-sm font-semibold text-slate-900">Alertas de documentación</p>
          </div>
          <ul className="space-y-2">
            {docAlerts.slice(0, 6).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-slate-700">
                  {a.nombre} · {a.label}
                </span>
                <Badge variant={a.level === 'danger' ? 'danger' : 'warning'}>
                  {a.level === 'danger' ? 'Crítico' : '≤15 días'}
                </Badge>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => onNavigate('flota')}
            className="text-sm font-semibold text-brand"
          >
            Ir a flota →
          </button>
        </CardBody>
      </Card>
    ) : null

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">San Sebastián</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Hola, {firstName}
          </h1>
        </div>
        <span className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
          {profile?.rol === 'Administrador' ? 'Admin' : 'Operador'}
        </span>
      </div>

      <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Viajes hoy" value={String(kpis.viajesHoy)} icon={CalendarDays} tone="info" />
        <StatCard label="Unidades" value={String(kpis.unidades)} icon={Bus} tone="default" />
        <StatCard
          label="Pendiente cobro"
          value={formatCurrency(kpis.pendiente)}
          icon={Wallet}
          tone="warning"
        />
        <StatCard
          label="Cobrado"
          value={formatCurrency(kpis.cobrado)}
          icon={Wallet}
          tone="success"
        />
      </div>

      <div className="grid grid-cols-3 gap-3 md:hidden">
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

      <div className="card-premium hidden p-5 md:block">
        <p className="text-sm font-semibold text-slate-900">Accesos rápidos</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((mod) => {
            const Icon = mod.icon
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onNavigate(mod.id)}
                className="tap-press flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left hover:border-brand/30"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${mod.tone}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.6} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{mod.label}</p>
                  <p className="text-xs text-slate-400">{mod.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {alertsBlock}

      <div className="card-premium p-4 md:hidden">
        <p className="text-sm font-semibold text-slate-900">Operación del día</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {kpis.viajesHoy} viaje(s) hoy · {kpis.choferes} chofer(es) disponible(s)
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
