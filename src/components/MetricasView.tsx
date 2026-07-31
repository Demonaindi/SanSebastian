import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bus,
  Calculator,
  Minus,
  Route,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useData } from '../contexts/DataContext'
import {
  buildMonthlyBuckets,
  formatPct,
  formatTicket,
  lastMonthKeys,
  monthLabelLong,
  pctChange,
  type MonthBucket,
} from '../lib/metrics'
import { formatCurrency } from '../lib/quote'
import { listPresupuestos } from '../services/presupuestos'
import { Card, CardBody, ErrorState, LoadingState, PageHeader, StatCard } from './ui'

function deltaTone(change: number | null): 'up' | 'down' | 'flat' {
  if (change == null || change === 0) return 'flat'
  return change > 0 ? 'up' : 'down'
}

function DeltaBadge({ change, invert }: { change: number | null; invert?: boolean }) {
  const tone = deltaTone(change)
  const good = invert ? tone === 'down' : tone === 'up'
  const bad = invert ? tone === 'up' : tone === 'down'
  const Icon = tone === 'up' ? ArrowUpRight : tone === 'down' ? ArrowDownRight : Minus
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
        good
          ? 'bg-emerald-50 text-emerald-700'
          : bad
            ? 'bg-rose-50 text-rose-700'
            : 'bg-slate-100 text-slate-600'
      }`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      {formatPct(change)}
    </span>
  )
}

function BarChart({
  data,
  valueKey,
  formatValue,
}: {
  data: MonthBucket[]
  valueKey: keyof MonthBucket
  formatValue: (n: number) => string
}) {
  const values = data.map((d) => Number(d[valueKey]) || 0)
  const max = Math.max(...values, 1)
  return (
    <div className="space-y-3">
      <div className="flex h-44 items-end gap-2 sm:gap-3">
        {data.map((d, i) => {
          const value = values[i]
          const height = Math.max(4, Math.round((value / max) * 100))
          const isLast = i === data.length - 1
          return (
            <div key={d.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <p className="truncate text-[10px] font-semibold text-slate-500">
                {value > 0 ? formatValue(value) : '—'}
              </p>
              <div className="flex h-32 w-full items-end">
                <div
                  className={`w-full rounded-t-xl ${
                    isLast ? 'bg-brand' : 'bg-sky-200'
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${d.label}: ${formatValue(value)}`}
                />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {d.label}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CompareRow({
  label,
  current,
  previous,
  format,
  invert,
}: {
  label: string
  current: number
  previous: number
  format: (n: number) => string
  invert?: boolean
}) {
  const change = pctChange(current, previous)
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Anterior: {format(previous)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <p className="text-sm font-bold text-slate-900">{format(current)}</p>
        <DeltaBadge change={change} invert={invert} />
      </div>
    </div>
  )
}

export function MetricasView() {
  const { viajes, caja, loading, error, refreshAll } = useData()
  const [presupuestos, setPresupuestos] = useState<{ created_at: string }[]>([])
  const [loadingQuotes, setLoadingQuotes] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const rows = await listPresupuestos(500)
        if (alive) setPresupuestos(rows.map((r) => ({ created_at: r.created_at })))
      } catch {
        if (alive) setPresupuestos([])
      } finally {
        if (alive) setLoadingQuotes(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const months = useMemo(() => lastMonthKeys(6), [])
  const buckets = useMemo(
    () =>
      buildMonthlyBuckets({
        months,
        viajes,
        caja,
        presupuestos,
      }),
    [months, viajes, caja, presupuestos],
  )

  const current = buckets[buckets.length - 1]
  const previous = buckets[buckets.length - 2]
  const currentLabel = current ? monthLabelLong(current.key) : '—'
  const previousLabel = previous ? monthLabelLong(previous.key) : '—'

  if ((loading || loadingQuotes) && viajes.length === 0) {
    return <LoadingState message="Cargando métricas..." />
  }
  if (error) return <ErrorState message={error} onRetry={refreshAll} />

  return (
    <div className="space-y-6 animate-fade-in md:space-y-8">
      <PageHeader
        title="Números del negocio"
        description={`Comparativa mes a mes · Actual: ${currentLabel}`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Viajes del mes"
          value={String(current?.viajes ?? 0)}
          icon={Bus}
          tone="info"
          trend={formatPct(pctChange(current?.viajes ?? 0, previous?.viajes ?? 0))}
        />
        <StatCard
          label="Facturado"
          value={formatCurrency(current?.facturado ?? 0)}
          icon={Wallet}
          tone="success"
          trend={formatPct(pctChange(current?.facturado ?? 0, previous?.facturado ?? 0))}
        />
        <StatCard
          label="Cobrado"
          value={formatCurrency(current?.cobrado ?? 0)}
          icon={TrendingUp}
          tone="default"
          trend={formatPct(pctChange(current?.cobrado ?? 0, previous?.cobrado ?? 0))}
        />
        <StatCard
          label="Cotizaciones"
          value={String(current?.presupuestos ?? 0)}
          icon={Calculator}
          tone="warning"
          trend={formatPct(
            pctChange(current?.presupuestos ?? 0, previous?.presupuestos ?? 0),
          )}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card hover={false}>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-brand" strokeWidth={1.75} />
              <div>
                <p className="text-sm font-semibold text-slate-900">Facturación por mes</p>
                <p className="text-xs text-slate-500">Últimos 6 meses · viajes no cancelados</p>
              </div>
            </div>
            <BarChart data={buckets} valueKey="facturado" formatValue={formatCurrency} />
          </CardBody>
        </Card>

        <Card hover={false}>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-brand" strokeWidth={1.75} />
              <div>
                <p className="text-sm font-semibold text-slate-900">Viajes por mes</p>
                <p className="text-xs text-slate-500">Cantidad operativa mes a mes</p>
              </div>
            </div>
            <BarChart
              data={buckets}
              valueKey="viajes"
              formatValue={(n) => String(Math.round(n))}
            />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card hover={false}>
          <CardBody>
            <p className="text-sm font-semibold text-slate-900">
              {currentLabel} vs {previousLabel}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Verde = mejora · Rojo = caída (salvo pendientes/cancelados)
            </p>
            <div className="mt-2">
              <CompareRow
                label="Viajes confirmados"
                current={current?.viajes ?? 0}
                previous={previous?.viajes ?? 0}
                format={(n) => String(n)}
              />
              <CompareRow
                label="Facturado"
                current={current?.facturado ?? 0}
                previous={previous?.facturado ?? 0}
                format={formatCurrency}
              />
              <CompareRow
                label="Cobrado"
                current={current?.cobrado ?? 0}
                previous={previous?.cobrado ?? 0}
                format={formatCurrency}
              />
              <CompareRow
                label="Pendiente de cobro"
                current={current?.pendiente ?? 0}
                previous={previous?.pendiente ?? 0}
                format={formatCurrency}
                invert
              />
              <CompareRow
                label="Ticket promedio"
                current={
                  (current?.viajes ?? 0) > 0
                    ? (current?.facturado ?? 0) / (current?.viajes ?? 1)
                    : 0
                }
                previous={
                  (previous?.viajes ?? 0) > 0
                    ? (previous?.facturado ?? 0) / (previous?.viajes ?? 1)
                    : 0
                }
                format={formatCurrency}
              />
              <CompareRow
                label="Km recorridos (est.)"
                current={current?.km ?? 0}
                previous={previous?.km ?? 0}
                format={(n) => `${Math.round(n).toLocaleString('es-AR')} km`}
              />
              <CompareRow
                label="Cotizaciones emitidas"
                current={current?.presupuestos ?? 0}
                previous={previous?.presupuestos ?? 0}
                format={(n) => String(n)}
              />
              <CompareRow
                label="Cancelados"
                current={current?.cancelados ?? 0}
                previous={previous?.cancelados ?? 0}
                format={(n) => String(n)}
                invert
              />
            </div>
          </CardBody>
        </Card>

        <Card hover={false}>
          <CardBody className="space-y-4">
            <p className="text-sm font-semibold text-slate-900">Caja del mes</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  Ingresos
                </p>
                <p className="mt-1 text-lg font-bold text-emerald-900">
                  {formatCurrency(current?.ingresosCaja ?? 0)}
                </p>
                <div className="mt-2">
                  <DeltaBadge
                    change={pctChange(
                      current?.ingresosCaja ?? 0,
                      previous?.ingresosCaja ?? 0,
                    )}
                  />
                </div>
              </div>
              <div className="rounded-2xl bg-rose-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-rose-700">
                  Egresos
                </p>
                <p className="mt-1 text-lg font-bold text-rose-900">
                  {formatCurrency(current?.egresosCaja ?? 0)}
                </p>
                <div className="mt-2">
                  <DeltaBadge
                    change={pctChange(
                      current?.egresosCaja ?? 0,
                      previous?.egresosCaja ?? 0,
                    )}
                    invert
                  />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Neto caja
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {formatCurrency(
                  (current?.ingresosCaja ?? 0) - (current?.egresosCaja ?? 0),
                )}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Mes anterior:{' '}
                {formatCurrency(
                  (previous?.ingresosCaja ?? 0) - (previous?.egresosCaja ?? 0),
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Ticket promedio actual
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {formatTicket(current?.facturado ?? 0, current?.viajes ?? 0)}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
