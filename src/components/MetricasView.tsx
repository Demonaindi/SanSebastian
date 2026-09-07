import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bus,
  Minus,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useToast } from '../contexts/ToastContext'
import {
  buildMonthlyBuckets,
  formatPct,
  lastMonthKeys,
  monthLabelLong,
  pctChange,
  type MonthBucket,
} from '../lib/metrics'
import { faltanteAPagar, formatVehiculoInterno, viajeFechaFin } from '../lib/mappers'
import { formatCurrency } from '../lib/quote'
import { createCajaMovimiento } from '../services/caja'
import { listPresupuestos } from '../services/presupuestos'
import type { CajaTipo } from '../types/database'
import {
  Button,
  Card,
  CardBody,
  ErrorState,
  FormField,
  LoadingState,
  PageHeader,
  StatCard,
} from './ui'

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
                className={`w-full rounded-t-xl ${isLast ? 'bg-brand' : 'bg-sky-200'}`}
                style={{ height: `${height}%` }}
                title={`${d.label}: ${formatValue(value)}`}
              />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{d.label}</p>
          </div>
        )
      })}
    </div>
  )
}

function CompareLine({
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
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">Mes anterior: {format(previous)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <p className="text-sm font-bold text-slate-900">{format(current)}</p>
        <DeltaBadge change={pctChange(current, previous)} invert={invert} />
      </div>
    </div>
  )
}

export function MetricasView() {
  const { isAdmin } = useAuth()
  const { toast } = useToast()
  const { viajes, caja, viajePagos, vehiculos, loading, error, refreshAll, refreshCaja } = useData()
  const [presupuestos, setPresupuestos] = useState<{ created_at: string }[]>([])
  const [loadingQuotes, setLoadingQuotes] = useState(true)
  const [cajaForm, setCajaForm] = useState({ tipo: 'Egreso' as CajaTipo, concepto: '', monto: '' })
  const [savingCaja, setSavingCaja] = useState(false)

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

  const abonadoByViaje = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of viajePagos) {
      map.set(p.viaje_id, (map.get(p.viaje_id) ?? 0) + Number(p.monto))
    }
    return map
  }, [viajePagos])

  const months = useMemo(() => lastMonthKeys(6), [])
  const buckets = useMemo(
    () =>
      buildMonthlyBuckets({
        months,
        viajes: viajes.map((v) => ({
          id: v.id,
          fecha_viaje: v.fecha_viaje,
          estado_viaje: v.estado_viaje,
          estado_pago: v.estado_pago,
          precio_total: Number(v.precio_total),
          distancia_km: Number(v.distancia_km),
        })),
        caja,
        presupuestos,
        abonadoByViaje,
      }),
    [months, viajes, caja, presupuestos, abonadoByViaje],
  )

  const current = buckets[buckets.length - 1]
  const previous = buckets[buckets.length - 2]
  const currentLabel = current ? monthLabelLong(current.key) : '—'

  const pendientes = useMemo(() => {
    return viajes
      .filter((v) => v.estado_viaje !== 'Cancelado' && v.estado_viaje !== 'Finalizado')
      .map((v) => {
        const abonado = abonadoByViaje.get(v.id) ?? 0
        const faltante = faltanteAPagar(Number(v.precio_total), abonado)
        return { v, faltante }
      })
      .filter((x) => x.faltante > 0)
      .sort((a, b) => b.faltante - a.faltante)
      .slice(0, 6)
  }, [viajes, abonadoByViaje])

  const handleCajaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin) return
    const monto = parseFloat(cajaForm.monto)
    if (!cajaForm.concepto.trim() || !monto) return
    setSavingCaja(true)
    try {
      await createCajaMovimiento({
        tipo: cajaForm.tipo,
        concepto: cajaForm.concepto.trim(),
        monto,
      })
      setCajaForm({ tipo: 'Egreso', concepto: '', monto: '' })
      await refreshCaja()
      toast({ title: 'Movimiento registrado', tone: 'success' })
    } catch (err) {
      toast({
        title: 'Error en caja',
        message: err instanceof Error ? err.message : undefined,
        tone: 'danger',
      })
    } finally {
      setSavingCaja(false)
    }
  }

  if ((loading || loadingQuotes) && viajes.length === 0) {
    return <LoadingState message="Cargando números..." />
  }
  if (error) return <ErrorState message={error} onRetry={refreshAll} />

  const netoCaja = (current?.ingresosCaja ?? 0) - (current?.egresosCaja ?? 0)
  const netoPrev = (previous?.ingresosCaja ?? 0) - (previous?.egresosCaja ?? 0)

  return (
    <div className="space-y-5 animate-fade-in md:space-y-6">
      <PageHeader
        title="Números"
        description={`Resumen de ganancias y actividad · ${currentLabel}`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Cobrado este mes"
          value={formatCurrency(current?.cobrado ?? 0)}
          icon={Wallet}
          tone="success"
          trend={formatPct(pctChange(current?.cobrado ?? 0, previous?.cobrado ?? 0))}
        />
        <StatCard
          label="Por cobrar"
          value={formatCurrency(current?.pendiente ?? 0)}
          icon={TrendingUp}
          tone="warning"
          trend={formatPct(pctChange(current?.pendiente ?? 0, previous?.pendiente ?? 0))}
        />
        <StatCard
          label="Viajes del mes"
          value={String(current?.viajes ?? 0)}
          icon={Bus}
          tone="info"
          trend={formatPct(pctChange(current?.viajes ?? 0, previous?.viajes ?? 0))}
        />
        <StatCard
          label="Neto caja"
          value={formatCurrency(netoCaja)}
          icon={BarChart3}
          tone="default"
          trend={formatPct(pctChange(netoCaja, netoPrev))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card hover={false}>
          <CardBody className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Cobrado mes a mes</p>
              <p className="text-xs text-slate-500">Últimos 6 meses (señas + pagos)</p>
            </div>
            <BarChart data={buckets} valueKey="cobrado" formatValue={formatCurrency} />
          </CardBody>
        </Card>

        <Card hover={false}>
          <CardBody className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Viajes mes a mes</p>
              <p className="text-xs text-slate-500">Cantidad de servicios (sin cancelados)</p>
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
            <p className="text-sm font-semibold text-slate-900">Comparativa con el mes anterior</p>
            <div className="mt-1">
              <CompareLine
                label="Cobrado"
                current={current?.cobrado ?? 0}
                previous={previous?.cobrado ?? 0}
                format={formatCurrency}
              />
              <CompareLine
                label="Facturado (valor viajes)"
                current={current?.facturado ?? 0}
                previous={previous?.facturado ?? 0}
                format={formatCurrency}
              />
              <CompareLine
                label="Viajes"
                current={current?.viajes ?? 0}
                previous={previous?.viajes ?? 0}
                format={(n) => String(n)}
              />
              <CompareLine
                label="Por cobrar"
                current={current?.pendiente ?? 0}
                previous={previous?.pendiente ?? 0}
                format={formatCurrency}
                invert
              />
              <CompareLine
                label="Cotizaciones emitidas"
                current={current?.presupuestos ?? 0}
                previous={previous?.presupuestos ?? 0}
                format={(n) => String(n)}
              />
              <CompareLine
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
          <CardBody className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">A cobrar (prioridad)</p>
              <p className="text-xs text-slate-500">
                Viajes con saldo pendiente · cobros se cargan en Agenda
              </p>
            </div>
            {pendientes.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No hay saldos pendientes.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {pendientes.map(({ v, faltante }) => {
                  const unit = vehiculos.find((u) => u.id === v.vehiculo_id)
                  return (
                    <li key={v.id} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {v.origen} → {v.destino}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {v.clientes?.nombre_razon_social ?? 'Sin cliente'}
                          {' · '}
                          {unit ? formatVehiculoInterno(unit) : 'Sin unidad'}
                          {' · '}
                          {viajeFechaFin(v.fecha_viaje, v.fecha_hasta)}
                        </p>
                      </div>
                      <p className="shrink-0 font-mono text-sm font-bold text-amber-700">
                        {formatCurrency(faltante)}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {isAdmin && (
        <Card hover={false}>
          <CardBody>
            <p className="text-sm font-semibold text-slate-900">Caja rápida</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Combustible, peajes u otros movimientos del mes
            </p>
            <form onSubmit={handleCajaSubmit} className="mt-4 grid gap-3 sm:grid-cols-4">
              <FormField label="Tipo">
                <select
                  value={cajaForm.tipo}
                  onChange={(e) =>
                    setCajaForm({ ...cajaForm, tipo: e.target.value as CajaTipo })
                  }
                  className="input-field"
                >
                  <option value="Egreso">Egreso</option>
                  <option value="Ingreso">Ingreso</option>
                </select>
              </FormField>
              <FormField label="Concepto">
                <input
                  value={cajaForm.concepto}
                  onChange={(e) => setCajaForm({ ...cajaForm, concepto: e.target.value })}
                  className="input-field"
                  placeholder="Ej: Combustible"
                />
              </FormField>
              <FormField label="Monto">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cajaForm.monto}
                  onChange={(e) => setCajaForm({ ...cajaForm, monto: e.target.value })}
                  className="input-field"
                />
              </FormField>
              <div className="flex items-end">
                <Button type="submit" loading={savingCaja} className="w-full">
                  Registrar
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
