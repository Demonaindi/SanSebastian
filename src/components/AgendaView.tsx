import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useToast } from '../contexts/ToastContext'
import { formatCurrency } from '../lib/quote'
import { formatVehiculoInterno, getExpiryLevel, paymentBarColor, viajeFechaFin } from '../lib/mappers'
import { cancelarViaje, finalizarViaje, reprogramarViaje, syncChoferEstado, updateViajeChofer, updateViajePago } from '../services/viajes'
import type { EstadoPago, ViajeWithRelations } from '../types/database'
import { DirectReserveModal } from './modals/DirectReserveModal'
import {
  Badge,
  Button,
  Card,
  CardBody,
  ErrorState,
  FormField,
  LoadingState,
  Modal,
  PageHeader,
} from './ui'

const DAY_MS = 24 * 60 * 60 * 1000
const ESTADOS_PAGO: EstadoPago[] = ['Pendiente', 'Señado', 'Pagado']

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(base: string, days: number): string {
  const d = new Date(base + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T12:00:00').getTime()
  const b = new Date(to + 'T12:00:00').getTime()
  return Math.round((b - a) / DAY_MS)
}

function startOfWeek(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toDateKey(d)
}

function startOfMonth(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date()
  d.setDate(1)
  return toDateKey(d)
}

function daysInMonth(monthStart: string): number {
  const d = new Date(monthStart + 'T12:00:00')
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

function addMonths(monthStart: string, delta: number): string {
  const d = new Date(monthStart + 'T12:00:00')
  d.setMonth(d.getMonth() + delta)
  d.setDate(1)
  return toDateKey(d)
}

function formatMonthLabel(monthStart: string): string {
  return new Date(monthStart + 'T12:00:00').toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  })
}

function formatDayLabel(day: string): string {
  return new Date(day + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function AgendaView() {
  const { isAdmin } = useAuth()
  const { toast } = useToast()
  const { vehiculos, viajes, choferes, loading, error, refreshViajes, refreshAll } = useData()
  const [weekStart, setWeekStart] = useState(() => startOfWeek())
  const [daySpan, setDaySpan] = useState(7)
  const [viewMode, setViewMode] = useState<'lista' | 'semana' | 'mes'>('lista')
  const [selectedDay, setSelectedDay] = useState(() => toDateKey(new Date()))
  const [reserve, setReserve] = useState<{ vehiculoId: string; from: string; to: string } | null>(null)
  const [editing, setEditing] = useState<ViajeWithRelations | null>(null)
  const [editForm, setEditForm] = useState({
    fecha_viaje: '',
    fecha_hasta: '',
    hora_viaje: '',
    hora_regreso: '',
    vehiculo_id: '',
    chofer_id: '',
    estado_pago: 'Pendiente' as EstadoPago,
    monto_sena: '0',
  })
  const [busy, setBusy] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    if (viewMode === 'mes') return
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setDaySpan(mq.matches ? 7 : 14)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [viewMode])

  useEffect(() => {
    if (viewMode === 'mes') {
      const month = startOfMonth(selectedDay)
      setWeekStart(month)
      setDaySpan(daysInMonth(month))
    } else if (viewMode === 'semana') {
      setWeekStart(startOfWeek(selectedDay))
      setDaySpan(7)
    }
  }, [viewMode])

  const days = useMemo(
    () => Array.from({ length: daySpan }, (_, i) => addDays(weekStart, i)),
    [weekStart, daySpan],
  )
  const weekEnd = days[days.length - 1]
  const isMonthView = viewMode === 'mes'
  const colMin = isMonthView ? '28px' : '72px'

  const activeViajes = useMemo(
    () =>
      viajes.filter(
        (v) =>
          v.estado_viaje !== 'Cancelado' &&
          v.estado_viaje !== 'Finalizado' &&
          v.vehiculo_id,
      ),
    [viajes],
  )

  const barsByVehicle = useMemo(() => {
    const map = new Map<string, Array<{ viaje: ViajeWithRelations; startIdx: number; span: number }>>()
    for (const v of vehiculos) map.set(v.id, [])

    for (const viaje of activeViajes) {
      if (!viaje.vehiculo_id || !viaje.fecha_viaje) continue
      const fin = viajeFechaFin(viaje.fecha_viaje, viaje.fecha_hasta)
      if (fin < weekStart || viaje.fecha_viaje > weekEnd) continue

      const clippedStart = viaje.fecha_viaje < weekStart ? weekStart : viaje.fecha_viaje
      const clippedEnd = fin > weekEnd ? weekEnd : fin
      const startIdx = daysBetween(weekStart, clippedStart)
      const span = daysBetween(clippedStart, clippedEnd) + 1
      map.get(viaje.vehiculo_id)?.push({ viaje, startIdx, span })
    }
    return map
  }, [activeViajes, vehiculos, weekStart, weekEnd])

  const dayListViajes = useMemo(() => {
    return activeViajes
      .filter((v) => {
        const fin = viajeFechaFin(v.fecha_viaje, v.fecha_hasta)
        return v.fecha_viaje <= selectedDay && fin >= selectedDay
      })
      .sort((a, b) => (a.hora_viaje ?? '').localeCompare(b.hora_viaje ?? ''))
  }, [activeViajes, selectedDay])

  const openReserve = (vehiculoId: string, day: string) => {
    if (!isAdmin) return
    setReserve({ vehiculoId, from: day, to: day })
  }

  const openDetail = (viaje: ViajeWithRelations) => {
    setEditing(viaje)
    setConfirmCancel(false)
    setEditForm({
      fecha_viaje: viaje.fecha_viaje,
      fecha_hasta: viaje.fecha_hasta || viaje.fecha_viaje,
      hora_viaje: viaje.hora_viaje?.slice(0, 5) ?? '',
      hora_regreso: viaje.hora_regreso?.slice(0, 5) ?? '',
      vehiculo_id: viaje.vehiculo_id ?? '',
      chofer_id: viaje.chofer_id ?? '',
      estado_pago: viaje.estado_pago,
      monto_sena: String(Number(viaje.monto_sena ?? 0)),
    })
    setActionError('')
  }

  const handleReprogramar = async () => {
    if (!editing || !isAdmin) return
    setBusy(true)
    setActionError('')
    try {
      await reprogramarViaje({
        viaje_id: editing.id,
        fecha_viaje: editForm.fecha_viaje,
        fecha_hasta: editForm.fecha_hasta || editForm.fecha_viaje,
        hora_viaje: editForm.hora_viaje || null,
        hora_regreso: editForm.hora_regreso || null,
        vehiculo_id: editForm.vehiculo_id || null,
      })
      const montoSena = Number(editForm.monto_sena) || 0
      const pagoChanged =
        editForm.estado_pago !== editing.estado_pago ||
        (editForm.estado_pago === 'Señado' && montoSena !== Number(editing.monto_sena ?? 0))
      if (pagoChanged) {
        await updateViajePago(editing.id, {
          estado_pago: editForm.estado_pago,
          monto_sena: montoSena,
        })
      }
      if ((editForm.chofer_id || null) !== (editing.chofer_id || null)) {
        await updateViajeChofer(editing.id, editForm.chofer_id || null)
        await syncChoferEstado(editing.chofer_id)
        await syncChoferEstado(editForm.chofer_id || null)
      }
      await refreshAll()
      setEditing(null)
      toast({ title: 'Viaje actualizado', tone: 'success' })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo actualizar')
      toast({ title: 'No se pudo actualizar', tone: 'danger' })
    } finally {
      setBusy(false)
    }
  }

  const handleCancelar = async () => {
    if (!editing || !isAdmin) return
    if (!confirmCancel) {
      setConfirmCancel(true)
      return
    }
    setBusy(true)
    setActionError('')
    try {
      const choferId = editing.chofer_id
      await cancelarViaje(editing.id)
      await syncChoferEstado(choferId)
      await refreshAll()
      setEditing(null)
      setConfirmCancel(false)
      toast({ title: 'Viaje cancelado', tone: 'info' })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo cancelar')
      toast({ title: 'No se pudo cancelar', tone: 'danger' })
    } finally {
      setBusy(false)
    }
  }

  const handleFinalizar = async () => {
    if (!editing || !isAdmin) return
    setBusy(true)
    setActionError('')
    try {
      const choferId = editing.chofer_id
      await finalizarViaje(editing.id)
      await syncChoferEstado(choferId)
      await refreshAll()
      setEditing(null)
      toast({ title: 'Viaje finalizado', message: 'El chofer quedó Disponible si no tiene otro viaje', tone: 'success' })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo finalizar')
      toast({ title: 'No se pudo finalizar', tone: 'danger' })
    } finally {
      setBusy(false)
    }
  }

  const handlePagoOnly = async (estado_pago: EstadoPago, monto_sena?: number) => {
    if (!editing || !isAdmin) return
    setBusy(true)
    try {
      const monto =
        monto_sena !== undefined
          ? monto_sena
          : Number(editForm.monto_sena) || 0
      await updateViajePago(editing.id, { estado_pago, monto_sena: monto })
      const nextMonto =
        estado_pago === 'Pendiente' ? 0 : estado_pago === 'Señado' ? monto : Number(editing.monto_sena ?? 0)
      setEditForm((f) => ({
        ...f,
        estado_pago,
        monto_sena: String(nextMonto),
      }))
      setEditing((prev) =>
        prev ? { ...prev, estado_pago, monto_sena: nextMonto } : prev,
      )
      await refreshViajes()
      toast({ title: `Pago: ${estado_pago}`, tone: 'success' })
    } catch (err) {
      toast({
        title: 'No se pudo actualizar el pago',
        message: err instanceof Error ? err.message : undefined,
        tone: 'danger',
      })
    } finally {
      setBusy(false)
    }
  }

  if (loading && vehiculos.length === 0) return <LoadingState message="Cargando agenda..." />
  if (error) return <ErrorState message={error} onRetry={refreshViajes} />

  const editingVehicle = vehiculos.find((v) => v.id === (editing?.vehiculo_id ?? editForm.vehiculo_id))
  const docWarning =
    editingVehicle &&
    [editingVehicle.vtv_vencimiento, editingVehicle.seguro_vencimiento, editingVehicle.matafuegos_vencimiento].some(
      (d) => getExpiryLevel(d) === 'danger',
    )

  return (
    <div className="space-y-5 animate-fade-in md:space-y-6">
      <PageHeader
        title="Agenda de unidades"
        description="Disponibilidad por vehículo. Amarillo = Pendiente · Azul = Señado · Verde = Pagado."
        action={
          isAdmin ? (
            <Button onClick={() => vehiculos[0] && openReserve(vehiculos[0].id, toDateKey(new Date()))}>
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Nueva reserva
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            if (isMonthView) {
              const prev = addMonths(weekStart, -1)
              setWeekStart(prev)
              setDaySpan(daysInMonth(prev))
              setSelectedDay(prev)
            } else {
              setWeekStart(addDays(weekStart, -daySpan))
              setSelectedDay(addDays(selectedDay, -1))
            }
          }}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const today = toDateKey(new Date())
            setSelectedDay(today)
            if (isMonthView) {
              const month = startOfMonth(today)
              setWeekStart(month)
              setDaySpan(daysInMonth(month))
            } else {
              setWeekStart(startOfWeek(today))
            }
          }}
        >
          Hoy
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            if (isMonthView) {
              const next = addMonths(weekStart, 1)
              setWeekStart(next)
              setDaySpan(daysInMonth(next))
              setSelectedDay(next)
            } else {
              setWeekStart(addDays(weekStart, daySpan))
              setSelectedDay(addDays(selectedDay, 1))
            }
          }}
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        </Button>
        <p className="text-sm font-semibold capitalize text-slate-900">
          {isMonthView
            ? formatMonthLabel(weekStart)
            : `${formatDayLabel(weekStart)} — ${formatDayLabel(weekEnd)}`}
        </p>
        <div className="ml-auto flex flex-wrap gap-2">
          <Badge variant="warning" dot>
            Pendiente
          </Badge>
          <Badge variant="info" className="!bg-blue-50 !text-blue-700 !border-blue-100" dot>
            Señado
          </Badge>
          <Badge variant="success" dot>
            Pagado
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setViewMode('lista')}
          className={`tap-press rounded-2xl border px-3 py-2 text-xs font-semibold lg:hidden ${
            viewMode === 'lista' ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-600'
          }`}
        >
          Lista del día
        </button>
        <button
          type="button"
          onClick={() => setViewMode('semana')}
          className={`tap-press rounded-2xl border px-3 py-2 text-xs font-semibold ${
            viewMode === 'semana' ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-600'
          }`}
        >
          Semana
        </button>
        <button
          type="button"
          onClick={() => setViewMode('mes')}
          className={`tap-press rounded-2xl border px-3 py-2 text-xs font-semibold ${
            viewMode === 'mes' ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-600'
          }`}
        >
          Mes completo
        </button>
      </div>

      {/* Mobile day list */}
      <div className={`space-y-3 ${viewMode === 'lista' ? 'lg:hidden' : 'hidden'}`}>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
          {days.map((day) => {
            const active = day === selectedDay
            const count = activeViajes.filter((v) => {
              const fin = viajeFechaFin(v.fecha_viaje, v.fecha_hasta)
              return v.fecha_viaje <= day && fin >= day
            }).length
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`tap-press shrink-0 rounded-2xl border px-3 py-2 text-center ${
                  active ? 'border-brand bg-primary-muted' : 'border-slate-200 bg-white'
                }`}
              >
                <p className="text-[10px] font-bold uppercase text-slate-500">
                  {new Date(day + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short' })}
                </p>
                <p className={`text-sm font-bold ${active ? 'text-brand' : 'text-slate-900'}`}>
                  {new Date(day + 'T12:00:00').getDate()}
                </p>
                {count > 0 && <p className="text-[10px] text-slate-400">{count} viaje(s)</p>}
              </button>
            )
          })}
        </div>

        {dayListViajes.length === 0 ? (
          <Card hover={false}>
            <CardBody className="py-10 text-center text-sm text-slate-500">
              Sin viajes este día.
              {isAdmin && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    onClick={() => vehiculos[0] && openReserve(vehiculos[0].id, selectedDay)}
                  >
                    Reservar unidad
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        ) : (
          dayListViajes.map((viaje) => {
            const unit = vehiculos.find((v) => v.id === viaje.vehiculo_id)
            return (
              <button
                key={viaje.id}
                type="button"
                onClick={() => openDetail(viaje)}
                className="tap-press card-premium flex w-full gap-3 p-3 text-left"
              >
                <div
                  className="w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: paymentBarColor(viaje.estado_pago) }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-bold text-slate-900">
                      {viaje.origen} → {viaje.destino}
                    </p>
                    <Badge
                      variant={
                        viaje.estado_pago === 'Pagado'
                          ? 'success'
                          : viaje.estado_pago === 'Señado'
                            ? 'info'
                            : 'warning'
                      }
                      className={
                        viaje.estado_pago === 'Señado'
                          ? '!bg-blue-50 !text-blue-700 !border-blue-100'
                          : undefined
                      }
                    >
                      {viaje.estado_pago}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    <span
                      className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
                      style={{ backgroundColor: unit?.color || '#3b82f6' }}
                    />
                    {unit ? formatVehiculoInterno(unit) : 'Sin unidad'} ·{' '}
                    {viaje.clientes?.nombre_razon_social ?? 'Sin cliente'}
                  </p>
                  <div className="mt-2 flex items-end justify-between">
                    <p className="text-xs text-slate-400">
                      {viaje.hora_viaje?.slice(0, 5) ?? 'Sin hora'}
                      {viaje.fecha_hasta && viaje.fecha_hasta !== viaje.fecha_viaje
                        ? ` · hasta ${viaje.fecha_hasta}`
                        : ''}
                    </p>
                    <p className="text-base font-semibold text-brand">
                      {formatCurrency(Number(viaje.precio_total))}
                    </p>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Timeline: semana / mes */}
      <Card
        hover={false}
        className={`overflow-hidden ${
          viewMode === 'semana' || viewMode === 'mes' ? 'block' : 'hidden lg:block'
        }`}
      >
        <div className="overflow-x-auto">
          <div
            className={isMonthView ? 'min-w-[980px]' : 'min-w-[720px] lg:min-w-[980px]'}
          >
            <div
              className="grid border-b border-slate-100 bg-slate-50"
              style={{ gridTemplateColumns: `140px repeat(${days.length}, minmax(${colMin}, 1fr))` }}
            >
              <div className="sticky left-0 z-20 bg-slate-50 px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Unidad
              </div>
              {days.map((day) => {
                const d = new Date(day + 'T12:00:00')
                const isToday = day === toDateKey(new Date())
                return (
                  <div key={day} className={`px-0.5 py-2 text-center ${isToday ? 'bg-primary/10' : ''}`}>
                    {!isMonthView && (
                      <p className="text-[10px] font-bold uppercase text-slate-500">
                        {d.toLocaleDateString('es-AR', { weekday: 'short' })}
                      </p>
                    )}
                    <p className={`text-xs font-semibold ${isToday ? 'text-brand' : 'text-slate-800'} ${isMonthView ? 'text-[11px]' : 'text-sm'}`}>
                      {d.getDate()}
                    </p>
                  </div>
                )
              })}
            </div>

            {vehiculos.map((vehiculo) => {
              const bars = barsByVehicle.get(vehiculo.id) ?? []
              return (
                <div
                  key={vehiculo.id}
                  className="grid border-b border-slate-50"
                  style={{ gridTemplateColumns: `140px repeat(${days.length}, minmax(${colMin}, 1fr))` }}
                >
                  <div className="sticky left-0 z-20 flex items-center gap-2 border-r border-slate-100 bg-white px-3 py-3">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: vehiculo.color || '#3b82f6' }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900">
                        {formatVehiculoInterno(vehiculo)}
                      </p>
                      <p className="text-[10px] text-slate-400">{vehiculo.capacidad} pax</p>
                    </div>
                  </div>

                  {days.map((day, dayIdx) => (
                    <div
                      key={`${vehiculo.id}-${day}`}
                      role={isAdmin ? 'button' : undefined}
                      tabIndex={isAdmin ? 0 : undefined}
                      onClick={() => openReserve(vehiculo.id, day)}
                      onKeyDown={(e) => {
                        if (isAdmin && (e.key === 'Enter' || e.key === ' ')) openReserve(vehiculo.id, day)
                      }}
                      className={`relative min-h-[48px] border-l border-slate-50 ${
                        isAdmin ? 'cursor-pointer hover:bg-primary/5' : ''
                      } ${isMonthView ? 'min-h-[40px]' : 'min-h-[56px]'}`}
                    >
                      {bars
                        .filter((b) => b.startIdx === dayIdx)
                        .map(({ viaje, span }) => (
                          <div
                            key={viaje.id}
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation()
                              openDetail(viaje)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation()
                                openDetail(viaje)
                              }
                            }}
                            className={`absolute top-1 bottom-1 z-10 overflow-hidden rounded-md text-left font-semibold text-white ${
                              isMonthView ? 'px-0.5 py-0.5 text-[9px]' : 'top-1.5 bottom-1.5 rounded-lg px-2 py-1 text-[10px]'
                            }`}
                            style={{
                              left: 2,
                              width: `calc(${span * 100}% - 4px)`,
                              backgroundColor: paymentBarColor(viaje.estado_pago),
                              borderLeft: `3px solid ${vehiculo.color || '#fff'}`,
                            }}
                            title={`${viaje.origen} → ${viaje.destino}`}
                          >
                            {!isMonthView && (
                              <span className="block truncate">
                                {viaje.origen} → {viaje.destino}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
        {vehiculos.length === 0 && (
          <CardBody className="py-12 text-center text-slate-500">No hay unidades cargadas.</CardBody>
        )}
      </Card>

      {!isAdmin && (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
          Modo operador: podés ver disponibilidad y detalle. Las reservas las gestiona un administrador.
        </p>
      )}

      {reserve && (
        <DirectReserveModal
          key={`${reserve.vehiculoId}-${reserve.from}-${reserve.to}`}
          open={!!reserve}
          onClose={() => setReserve(null)}
          onSuccess={() => setReserve(null)}
          vehiculoId={reserve.vehiculoId}
          fechaInicio={reserve.from}
          fechaFin={reserve.to}
        />
      )}

      <Modal
        open={!!editing}
        onClose={() => {
          setEditing(null)
          setConfirmCancel(false)
        }}
        title={isAdmin ? 'Gestionar reserva' : 'Detalle del viaje'}
        wide
        footer={
          isAdmin ? (
            <>
              <Button variant="secondary" onClick={handleCancelar} loading={busy}>
                {confirmCancel ? 'Confirmar cancelación' : 'Cancelar viaje'}
              </Button>
              {editing && editing.estado_viaje !== 'Finalizado' && (
                <Button variant="secondary" onClick={handleFinalizar} loading={busy}>
                  Finalizar viaje
                </Button>
              )}
              <Button onClick={handleReprogramar} loading={busy}>
                Guardar cambios
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cerrar
            </Button>
          )
        }
      >
        {editing && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-900">
                {editing.origen} → {editing.destino}
              </p>
              <p className="mt-1 text-slate-600">
                {editing.clientes?.nombre_razon_social ?? 'Sin cliente'} · {editing.estado_viaje}
              </p>
              {editing.paradas_intermedias && (
                <p className="mt-2 text-xs text-slate-500">Itinerario: {editing.paradas_intermedias}</p>
              )}
              {editing.hora_llegada_aprox && (
                <p className="mt-1 text-xs text-slate-500">
                  Llegada aproximada: {editing.hora_llegada_aprox.slice(0, 5)}
                </p>
              )}
              <p className="mt-2 text-lg font-bold text-brand">
                {formatCurrency(Number(editing.precio_total))}
              </p>
            </div>

            {docWarning && (
              <p className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Esta unidad tiene documentación vencida o crítica. Se permite reservar, pero conviene
                habilitarla antes del servicio.
              </p>
            )}

            {isAdmin ? (
              <>
                <FormField label="Estado de pago">
                  <select
                    value={editForm.estado_pago}
                    onChange={(e) => {
                      const next = e.target.value as EstadoPago
                      const nextForm = {
                        ...editForm,
                        estado_pago: next,
                        monto_sena: next === 'Pendiente' ? '0' : editForm.monto_sena,
                      }
                      setEditForm(nextForm)
                      void handlePagoOnly(next, Number(nextForm.monto_sena) || 0)
                    }}
                    className="input-field"
                  >
                    {ESTADOS_PAGO.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </FormField>
                {editForm.estado_pago === 'Señado' && (
                  <FormField label="Monto señado ($)">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={editForm.monto_sena}
                      onChange={(e) => setEditForm({ ...editForm, monto_sena: e.target.value })}
                      onBlur={() => {
                        void handlePagoOnly('Señado', Number(editForm.monto_sena) || 0)
                      }}
                      className="input-field"
                    />
                  </FormField>
                )}
                {editForm.estado_pago === 'Pagado' && Number(editing.monto_sena ?? 0) > 0 && (
                  <p className="text-xs text-slate-500">
                    Seña registrada: {formatCurrency(Number(editing.monto_sena))}
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Fecha desde">
                    <input
                      type="date"
                      value={editForm.fecha_viaje}
                      onChange={(e) => setEditForm({ ...editForm, fecha_viaje: e.target.value })}
                      className="input-field"
                    />
                  </FormField>
                  <FormField label="Fecha hasta">
                    <input
                      type="date"
                      value={editForm.fecha_hasta}
                      min={editForm.fecha_viaje}
                      onChange={(e) => setEditForm({ ...editForm, fecha_hasta: e.target.value })}
                      className="input-field"
                    />
                  </FormField>
                  <FormField label="Hora salida">
                    <input
                      type="time"
                      value={editForm.hora_viaje}
                      onChange={(e) => setEditForm({ ...editForm, hora_viaje: e.target.value })}
                      className="input-field"
                    />
                  </FormField>
                  <FormField label="Hora regreso">
                    <input
                      type="time"
                      value={editForm.hora_regreso}
                      onChange={(e) => setEditForm({ ...editForm, hora_regreso: e.target.value })}
                      className="input-field"
                    />
                  </FormField>
                </div>
                <FormField label="Unidad">
                  <select
                    value={editForm.vehiculo_id}
                    onChange={(e) => setEditForm({ ...editForm, vehiculo_id: e.target.value })}
                    className="input-field"
                  >
                    {vehiculos.map((v) => (
                      <option key={v.id} value={v.id}>
                        {formatVehiculoInterno(v)}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Chofer">
                  <select
                    value={editForm.chofer_id}
                    onChange={(e) => setEditForm({ ...editForm, chofer_id: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Sin asignar</option>
                    {choferes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} · {c.estado}
                      </option>
                    ))}
                  </select>
                </FormField>
                {confirmCancel && (
                  <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    ¿Seguro que querés cancelar este viaje? Tocá otra vez para confirmar.
                  </p>
                )}
              </>
            ) : (
              <div className="grid gap-2 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-800">Pago:</span> {editing.estado_pago}
                  {editing.estado_pago === 'Señado'
                    ? ` · seña ${formatCurrency(Number(editing.monto_sena ?? 0))}`
                    : ''}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Fechas:</span> {editing.fecha_viaje}
                  {editing.fecha_hasta && editing.fecha_hasta !== editing.fecha_viaje
                    ? ` → ${editing.fecha_hasta}`
                    : ''}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Unidad:</span>{' '}
                  {editing.vehiculos ? formatVehiculoInterno(editing.vehiculos) : '—'}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Chofer:</span>{' '}
                  {editing.choferes?.nombre ?? '—'}
                </p>
              </div>
            )}

            {actionError && (
              <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{actionError}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
