import { useMemo, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useToast } from '../contexts/ToastContext'
import { createCajaMovimiento } from '../services/caja'
import { updateViajeEstadoPago } from '../services/viajes'
import { formatCurrency } from '../lib/quote'
import type { CajaTipo, EstadoPago } from '../types/database'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  FormField,
  LoadingState,
  PageHeader,
  StatCard,
} from './ui'

const ESTADOS_PAGO: EstadoPago[] = ['Pendiente', 'Señado', 'Pagado']

export function FacturacionView() {
  const { isAdmin } = useAuth()
  const { toast } = useToast()
  const { viajes, caja, loading, error, refreshViajes, refreshCaja } = useData()
  const [form, setForm] = useState({ tipo: 'Egreso' as CajaTipo, concepto: '', monto: '' })
  const [saving, setSaving] = useState(false)

  const totales = useMemo(() => {
    const ingresos = caja.filter((m) => m.tipo === 'Ingreso').reduce((s, m) => s + Number(m.monto), 0)
    const egresos = caja.filter((m) => m.tipo === 'Egreso').reduce((s, m) => s + Number(m.monto), 0)
    const cobrado = viajes
      .filter((v) => v.estado_pago === 'Pagado')
      .reduce((s, v) => s + Number(v.precio_total), 0)
    const pendiente = viajes
      .filter((v) => v.estado_pago !== 'Pagado')
      .reduce((s, v) => s + Number(v.precio_total), 0)
    return { ingresos, egresos, saldo: ingresos - egresos, cobrado, pendiente }
  }, [caja, viajes])

  const handlePagoChange = async (id: string, estado_pago: EstadoPago) => {
    if (!isAdmin && estado_pago === 'Pagado') return
    try {
      await updateViajeEstadoPago(id, estado_pago)
      await refreshViajes()
      toast({ title: `Pago: ${estado_pago}`, tone: 'success' })
    } catch (err) {
      toast({
        title: 'No se pudo actualizar',
        message: err instanceof Error ? err.message : undefined,
        tone: 'danger',
      })
    }
  }

  const handleCajaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const monto = parseFloat(form.monto)
    if (!form.concepto.trim() || !monto) return
    setSaving(true)
    try {
      await createCajaMovimiento({ tipo: form.tipo, concepto: form.concepto, monto })
      setForm({ tipo: 'Egreso', concepto: '', monto: '' })
      await refreshCaja()
      toast({ title: 'Movimiento registrado', tone: 'success' })
    } catch (err) {
      toast({
        title: 'Error en caja',
        message: err instanceof Error ? err.message : undefined,
        tone: 'danger',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading && viajes.length === 0) return <LoadingState message="Cargando facturación..." />
  if (error)
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          refreshViajes()
          refreshCaja()
        }}
      />
    )

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Facturación y caja chica"
        description="Auditá cobros de viajes y registrá movimientos de caja diaria."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Cobrado" value={formatCurrency(totales.cobrado)} icon={Wallet} tone="success" />
        <StatCard label="Pendiente" value={formatCurrency(totales.pendiente)} tone="warning" />
        <StatCard
          label="Ingresos caja"
          value={formatCurrency(totales.ingresos)}
          icon={ArrowUpCircle}
          tone="info"
        />
        <StatCard
          label="Egresos caja"
          value={formatCurrency(totales.egresos)}
          icon={ArrowDownCircle}
          tone="danger"
          trend={`Saldo: ${formatCurrency(totales.saldo)}`}
        />
      </div>

      <div className="space-y-3 md:hidden">
        <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Cobros</p>
        {viajes.length === 0 ? (
          <Card hover={false}>
            <CardBody className="py-10 text-center text-sm text-slate-500">
              Sin viajes registrados
            </CardBody>
          </Card>
        ) : (
          viajes.map((v) => (
            <div key={v.id} className="card-premium space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900">
                    {v.origen} → {v.destino}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {v.clientes?.nombre_razon_social ?? '—'} · {v.fecha_viaje ?? 'Sin fecha'}
                  </p>
                </div>
                <p className="shrink-0 font-mono font-bold text-brand">
                  {formatCurrency(Number(v.precio_total))}
                </p>
              </div>
              {isAdmin ? (
                <select
                  value={v.estado_pago}
                  onChange={(e) => handlePagoChange(v.id, e.target.value as EstadoPago)}
                  className="input-field text-sm"
                >
                  {ESTADOS_PAGO.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              ) : (
                <Badge
                  variant={
                    v.estado_pago === 'Pagado'
                      ? 'success'
                      : v.estado_pago === 'Señado'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {v.estado_pago}
                </Badge>
              )}
            </div>
          ))
        )}
      </div>

      <Card hover={false} className="hidden md:block">
        <CardHeader
          title="Cobros de viajes"
          subtitle={
            isAdmin
              ? 'Gestioná el estado de pago de cada servicio'
              : 'Vista de cobros (edición limitada para operadores)'
          }
        />
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary/10 bg-surface-950/80 text-left">
                  <th className="px-5 py-3 text-[10px] font-bold uppercase text-slate-500">Viaje</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase text-slate-500">Cliente</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase text-slate-500">
                    Monto
                  </th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold uppercase text-slate-500">
                    Estado pago
                  </th>
                </tr>
              </thead>
              <tbody>
                {viajes.map((v) => (
                  <tr key={v.id} className="border-b border-primary/5">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">
                        {v.origen} → {v.destino}
                      </p>
                      <p className="text-xs text-slate-500">{v.fecha_viaje ?? 'Sin fecha'}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {v.clientes?.nombre_razon_social ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-semibold text-brand">
                      {formatCurrency(Number(v.precio_total))}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {isAdmin ? (
                        <select
                          value={v.estado_pago}
                          onChange={(e) => handlePagoChange(v.id, e.target.value as EstadoPago)}
                          className="input-field py-1.5 text-xs"
                        >
                          {ESTADOS_PAGO.map((e) => (
                            <option key={e} value={e}>
                              {e}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge
                          variant={
                            v.estado_pago === 'Pagado'
                              ? 'success'
                              : v.estado_pago === 'Señado'
                                ? 'warning'
                                : 'neutral'
                          }
                        >
                          {v.estado_pago}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {viajes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-slate-500">
                      Sin viajes registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card hover={false}>
          <CardHeader title="Registrar movimiento" subtitle="Combustible, peajes, cobros extras" />
          <CardBody>
            <form onSubmit={handleCajaSubmit} className="space-y-4">
              <FormField label="Tipo">
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value as CajaTipo })}
                  className="input-field"
                >
                  <option value="Egreso">Egreso</option>
                  <option value="Ingreso">Ingreso</option>
                </select>
              </FormField>
              <FormField label="Concepto">
                <input
                  value={form.concepto}
                  onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                  className="input-field"
                  placeholder="Ej: Combustible ruta MDQ"
                />
              </FormField>
              <FormField label="Monto (ARS)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: e.target.value })}
                  className="input-field"
                />
              </FormField>
              <Button type="submit" loading={saving} className="w-full">
                Registrar en caja
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card hover={false}>
          <CardHeader title="Movimientos recientes" />
          <CardBody className="max-h-80 overflow-y-auto p-0">
            {caja.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">Sin movimientos registrados.</p>
            ) : (
              <ul className="divide-y divide-primary/5">
                {caja.map((m) => (
                  <li key={m.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{m.concepto}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(m.created_at).toLocaleString('es-AR')} · {m.tipo}
                      </p>
                    </div>
                    <span
                      className={`font-mono font-bold ${m.tipo === 'Ingreso' ? 'text-success' : 'text-danger'}`}
                    >
                      {m.tipo === 'Ingreso' ? '+' : '-'}
                      {formatCurrency(Number(m.monto))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
