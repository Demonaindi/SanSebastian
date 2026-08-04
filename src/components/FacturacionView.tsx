import { useMemo, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useToast } from '../contexts/ToastContext'
import { createCajaMovimiento } from '../services/caja'
import { updateViajeEstadoPago, updateViajePrecio } from '../services/viajes'
import {
  createViajePago,
  sumPagos,
  syncViajeEstadoDesdePagos,
} from '../services/viajePagos'
import { faltanteAPagar } from '../lib/mappers'
import { formatCurrency } from '../lib/quote'
import type { CajaTipo, EstadoPago, ViajeWithRelations } from '../types/database'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  FormField,
  LoadingState,
  Modal,
  PageHeader,
  StatCard,
} from './ui'

const ESTADOS_PAGO: EstadoPago[] = ['Pendiente', 'Señado', 'Pagado']

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function FacturacionView() {
  const { isAdmin } = useAuth()
  const { toast } = useToast()
  const {
    viajes,
    caja,
    viajePagos,
    loading,
    error,
    refreshViajes,
    refreshCaja,
    refreshViajePagos,
  } = useData()
  const [form, setForm] = useState({ tipo: 'Egreso' as CajaTipo, concepto: '', monto: '' })
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<ViajeWithRelations | null>(null)
  const [precioEdit, setPrecioEdit] = useState('')
  const [señaForm, setSeñaForm] = useState({ monto: '', fecha_pago: todayKey(), observaciones: '' })
  const [busy, setBusy] = useState(false)

  const abonadoByViaje = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of viajePagos) {
      map.set(p.viaje_id, (map.get(p.viaje_id) ?? 0) + Number(p.monto))
    }
    return map
  }, [viajePagos])

  const totales = useMemo(() => {
    const ingresos = caja.filter((m) => m.tipo === 'Ingreso').reduce((s, m) => s + Number(m.monto), 0)
    const egresos = caja.filter((m) => m.tipo === 'Egreso').reduce((s, m) => s + Number(m.monto), 0)
    const activos = viajes.filter((v) => v.estado_viaje !== 'Cancelado')
    const cobrado = activos.reduce(
      (s, v) => s + (abonadoByViaje.get(v.id) ?? 0),
      0,
    )
    const pendiente = activos.reduce((s, v) => {
      const abonado = abonadoByViaje.get(v.id) ?? 0
      return s + faltanteAPagar(Number(v.precio_total), abonado)
    }, 0)
    return { ingresos, egresos, saldo: ingresos - egresos, cobrado, pendiente }
  }, [caja, viajes, abonadoByViaje])

  const selectedPagos = useMemo(() => {
    if (!selected) return []
    return viajePagos.filter((p) => p.viaje_id === selected.id)
  }, [selected, viajePagos])

  const selectedAbonado = sumPagos(selectedPagos)
  const selectedPrecio = Number(precioEdit) || Number(selected?.precio_total) || 0
  const selectedFaltante = faltanteAPagar(selectedPrecio, selectedAbonado)

  const openViaje = (v: ViajeWithRelations) => {
    setSelected(v)
    setPrecioEdit(String(Number(v.precio_total)))
    setSeñaForm({ monto: '', fecha_pago: todayKey(), observaciones: '' })
  }

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

  const handleSavePrecio = async () => {
    if (!selected || !isAdmin) return
    const precio = parseFloat(precioEdit)
    if (Number.isNaN(precio) || precio < 0) {
      toast({ title: 'Precio inválido', tone: 'danger' })
      return
    }
    setBusy(true)
    try {
      await updateViajePrecio(selected.id, precio)
      await syncViajeEstadoDesdePagos(selected.id, precio)
      await Promise.all([refreshViajes(), refreshViajePagos()])
      setSelected({ ...selected, precio_total: precio })
      toast({ title: 'Precio actualizado', tone: 'success' })
    } catch (err) {
      toast({
        title: 'No se pudo actualizar el precio',
        message: err instanceof Error ? err.message : undefined,
        tone: 'danger',
      })
    } finally {
      setBusy(false)
    }
  }

  const handleAddSeña = async () => {
    if (!selected || !isAdmin) return
    const monto = parseFloat(señaForm.monto)
    if (Number.isNaN(monto) || monto <= 0) {
      toast({ title: 'Monto de seña inválido', tone: 'danger' })
      return
    }
    setBusy(true)
    try {
      await createViajePago({
        viaje_id: selected.id,
        monto,
        fecha_pago: señaForm.fecha_pago || todayKey(),
        observaciones: señaForm.observaciones.trim() || null,
      })
      const precio = Number(precioEdit) || Number(selected.precio_total)
      await syncViajeEstadoDesdePagos(selected.id, precio)
      setSeñaForm({ monto: '', fecha_pago: todayKey(), observaciones: '' })
      await Promise.all([refreshViajes(), refreshViajePagos()])
      toast({ title: 'Seña registrada', tone: 'success' })
    } catch (err) {
      toast({
        title: 'No se pudo registrar la seña',
        message: err instanceof Error ? err.message : undefined,
        tone: 'danger',
      })
    } finally {
      setBusy(false)
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
          refreshViajePagos()
        }}
      />
    )

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Facturación y caja chica"
        description="Cobros, señas acumuladas, faltante a pagar y caja diaria."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Cobrado (señas)" value={formatCurrency(totales.cobrado)} icon={Wallet} tone="success" />
        <StatCard label="Faltante a pagar" value={formatCurrency(totales.pendiente)} tone="warning" />
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
          viajes.map((v) => {
            const abonado = abonadoByViaje.get(v.id) ?? 0
            const faltante = faltanteAPagar(Number(v.precio_total), abonado)
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => openViaje(v)}
                className="card-premium w-full space-y-3 p-4 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">
                      {v.origen} → {v.destino}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {v.clientes?.nombre_razon_social ?? '—'} · {v.fecha_viaje ?? 'Sin fecha'}
                    </p>
                  </div>
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
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">Precio</p>
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(Number(v.precio_total))}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Abonado</p>
                    <p className="font-semibold text-emerald-700">{formatCurrency(abonado)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Faltante</p>
                    <p className="font-semibold text-amber-700">{formatCurrency(faltante)}</p>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      <Card hover={false} className="hidden md:block">
        <CardHeader
          title="Cobros de viajes"
          subtitle="Tocá un viaje para editar precio o cargar señas"
        />
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary/10 bg-surface-950/80 text-left">
                  <th className="px-5 py-3 text-[10px] font-bold uppercase text-slate-500">Viaje</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase text-slate-500">Cliente</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase text-slate-500">
                    Precio
                  </th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase text-slate-500">
                    Abonado
                  </th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase text-slate-500">
                    Faltante
                  </th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold uppercase text-slate-500">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {viajes.map((v) => {
                  const abonado = abonadoByViaje.get(v.id) ?? 0
                  const faltante = faltanteAPagar(Number(v.precio_total), abonado)
                  return (
                    <tr
                      key={v.id}
                      className="cursor-pointer border-b border-primary/5 hover:bg-primary-muted/30"
                      onClick={() => openViaje(v)}
                    >
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
                      <td className="px-5 py-4 text-right font-mono text-emerald-700">
                        {formatCurrency(abonado)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-amber-700">
                        {formatCurrency(faltante)}
                      </td>
                      <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {isAdmin ? (
                          <select
                            value={v.estado_pago}
                            onChange={(e) =>
                              handlePagoChange(v.id, e.target.value as EstadoPago)
                            }
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
                  )
                })}
                {viajes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                      Sin viajes registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card hover={false}>
        <CardHeader title="Caja chica" subtitle="Ingresos y egresos operativos" />
        <CardBody>
          {isAdmin && (
            <form onSubmit={handleCajaSubmit} className="mb-6 grid gap-3 sm:grid-cols-4">
              <FormField label="Tipo">
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value as CajaTipo })}
                  className="input-field"
                >
                  <option value="Ingreso">Ingreso</option>
                  <option value="Egreso">Egreso</option>
                </select>
              </FormField>
              <FormField label="Concepto">
                <input
                  value={form.concepto}
                  onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                  className="input-field"
                />
              </FormField>
              <FormField label="Monto">
                <input
                  type="number"
                  value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: e.target.value })}
                  className="input-field"
                />
              </FormField>
              <div className="flex items-end">
                <Button type="submit" loading={saving} className="w-full">
                  Registrar
                </Button>
              </div>
            </form>
          )}
          <div className="space-y-2">
            {caja.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">Sin movimientos</p>
            ) : (
              caja.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{m.concepto}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(m.created_at).toLocaleString('es-AR')}
                    </p>
                  </div>
                  <p
                    className={`font-mono font-bold ${
                      m.tipo === 'Ingreso' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {m.tipo === 'Ingreso' ? '+' : '-'}
                    {formatCurrency(Number(m.monto))}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardBody>
      </Card>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Cobro del viaje"
        wide
        footer={
          <Button variant="secondary" onClick={() => setSelected(null)}>
            Cerrar
          </Button>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-900">
                {selected.origen} → {selected.destino}
              </p>
              <p className="mt-1 text-slate-600">
                {selected.clientes?.nombre_razon_social ?? 'Sin cliente'}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500">Precio</p>
                  <p className="text-lg font-bold text-brand">
                    {formatCurrency(selectedPrecio)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500">Abonado</p>
                  <p className="text-lg font-bold text-emerald-700">
                    {formatCurrency(selectedAbonado)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500">Faltante a pagar</p>
                  <p className="text-lg font-bold text-amber-700">
                    {formatCurrency(selectedFaltante)}
                  </p>
                </div>
              </div>
            </div>

            {isAdmin && (
              <>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[160px] flex-1">
                    <FormField label="Modificar precio">
                      <input
                        type="number"
                        min={0}
                        value={precioEdit}
                        onChange={(e) => setPrecioEdit(e.target.value)}
                        className="input-field"
                      />
                    </FormField>
                  </div>
                  <Button onClick={() => void handleSavePrecio()} loading={busy}>
                    Guardar precio
                  </Button>
                </div>

                <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-900">Agregar seña</p>
                  {selectedPagos.length > 0 && (
                    <ul className="space-y-2">
                      {selectedPagos.map((p) => (
                        <li key={p.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                          <p className="font-semibold text-slate-900">
                            {formatCurrency(Number(p.monto))}
                            <span className="ml-2 text-xs font-normal text-slate-500">
                              {p.fecha_pago}
                            </span>
                          </p>
                          {p.observaciones && (
                            <p className="text-xs text-slate-500">{p.observaciones}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Monto">
                      <input
                        type="number"
                        min={0}
                        value={señaForm.monto}
                        onChange={(e) => setSeñaForm({ ...señaForm, monto: e.target.value })}
                        className="input-field"
                      />
                    </FormField>
                    <FormField label="Fecha">
                      <input
                        type="date"
                        value={señaForm.fecha_pago}
                        onChange={(e) =>
                          setSeñaForm({ ...señaForm, fecha_pago: e.target.value })
                        }
                        className="input-field"
                      />
                    </FormField>
                  </div>
                  <FormField label="Observaciones">
                    <input
                      value={señaForm.observaciones}
                      onChange={(e) =>
                        setSeñaForm({ ...señaForm, observaciones: e.target.value })
                      }
                      className="input-field"
                      placeholder="Transferencia, efectivo, etc."
                    />
                  </FormField>
                  <Button size="sm" onClick={() => void handleAddSeña()} loading={busy}>
                    Agregar seña
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
