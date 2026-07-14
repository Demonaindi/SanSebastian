import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useToast } from '../contexts/ToastContext'
import { formatCurrency } from '../lib/quote'
import { paymentBarColor, viajeFechaFin } from '../lib/mappers'
import { cancelarViaje, reprogramarViaje } from '../services/viajes'
import type { ViajeWithRelations } from '../types/database'
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

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(base: string, days: number): string {
  const d = new Date(base + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00').getTime()
  const b = new Date(to + 'T00:00:00').getTime()
  return Math.round((b - a) / DAY_MS)
}

function startOfWeek(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toDateKey(d)
}

export function AgendaView() {
  const { isAdmin } = useAuth()
  const { toast } = useToast()
  const { vehiculos, viajes, loading, error, refreshViajes, refreshAll } = useData()
  const [weekStart, setWeekStart] = useState(() => startOfWeek())
  const [reserve, setReserve] = useState<{ vehiculoId: string; from: string; to: string } | null>(null)
  const [editing, setEditing] = useState<ViajeWithRelations | null>(null)
  const [editForm, setEditForm] = useState({ fecha_viaje: '', fecha_hasta: '', hora_viaje: '', hora_regreso: '', vehiculo_id: '' })
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const weekEnd = days[days.length - 1]

  const activeViajes = useMemo(
    () => viajes.filter((v) => v.estado_viaje !== 'Cancelado' && v.vehiculo_id),
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

  const openReserve = (vehiculoId: string, day: string) => {
    if (!isAdmin) return
    setReserve({ vehiculoId, from: day, to: day })
  }

  const openEdit = (viaje: ViajeWithRelations) => {
    if (!isAdmin) return
    setEditing(viaje)
    setEditForm({
      fecha_viaje: viaje.fecha_viaje,
      fecha_hasta: viaje.fecha_hasta || viaje.fecha_viaje,
      hora_viaje: viaje.hora_viaje?.slice(0, 5) ?? '',
      hora_regreso: viaje.hora_regreso?.slice(0, 5) ?? '',
      vehiculo_id: viaje.vehiculo_id ?? '',
    })
    setActionError('')
  }

  const handleReprogramar = async () => {
    if (!editing) return
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
      await refreshAll()
      setEditing(null)
      toast({ title: 'Viaje reprogramado', tone: 'success' })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo reprogramar')
      toast({ title: 'No se pudo reprogramar', tone: 'danger' })
    } finally {
      setBusy(false)
    }
  }

  const handleCancelar = async () => {
    if (!editing) return
    setBusy(true)
    setActionError('')
    try {
      await cancelarViaje(editing.id)
      await refreshAll()
      setEditing(null)
      toast({ title: 'Viaje cancelado', tone: 'info' })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo cancelar')
      toast({ title: 'No se pudo cancelar', tone: 'danger' })
    } finally {
      setBusy(false)
    }
  }

  if (loading && vehiculos.length === 0) return <LoadingState message="Cargando agenda..." />
  if (error) return <ErrorState message={error} onRetry={refreshViajes} />

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Agenda de unidades"
        description="Timeline por vehículos. Amarillo/naranja = pendiente o señado. Verde = pagado. Documentación vencida no impide reservar."
        action={
          isAdmin ? (
            <Button
              onClick={() => {
                if (vehiculos[0]) openReserve(vehiculos[0].id, toDateKey(new Date()))
              }}
            >
              <Plus className="h-4 w-4" />
              Nueva reserva
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setWeekStart(startOfWeek())}>
          Hoy
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <p className="text-sm font-semibold text-brand">
          {new Date(weekStart + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
          {' — '}
          {new Date(weekEnd + 'T00:00:00').toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
        <div className="ml-auto flex flex-wrap gap-2 text-xs">
          <Badge variant="warning" dot>
            Pendiente / Señado
          </Badge>
          <Badge variant="success" dot>
            Pagado
          </Badge>
        </div>
      </div>

      <Card hover={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div
              className="grid border-b border-primary/10 bg-surface-950/80"
              style={{ gridTemplateColumns: `200px repeat(${days.length}, minmax(64px, 1fr))` }}
            >
              <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Unidad
              </div>
              {days.map((day) => {
                const d = new Date(day + 'T00:00:00')
                const isToday = day === toDateKey(new Date())
                return (
                  <div
                    key={day}
                    className={`px-1 py-3 text-center ${isToday ? 'bg-primary/10' : ''}`}
                  >
                    <p className="text-[10px] font-bold uppercase text-slate-500">
                      {d.toLocaleDateString('es-AR', { weekday: 'short' })}
                    </p>
                    <p className={`text-sm font-semibold ${isToday ? 'text-brand' : 'text-slate-800'}`}>
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
                  className="grid border-b border-primary/5 hover:bg-primary-muted/20"
                  style={{ gridTemplateColumns: `200px repeat(${days.length}, minmax(64px, 1fr))` }}
                >
                  <div className="flex items-center gap-3 px-4 py-4">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white shadow"
                      style={{ backgroundColor: vehiculo.color || '#3b82f6' }}
                      title="Color fijo de la unidad"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{vehiculo.nombre}</p>
                      <p className="text-[11px] text-slate-500">{vehiculo.capacidad} pax</p>
                    </div>
                  </div>

                  <div
                    className="relative col-span-full contents"
                    style={{ display: 'contents' }}
                  >
                    {days.map((day, dayIdx) => (
                      <button
                        key={`${vehiculo.id}-${day}`}
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => openReserve(vehiculo.id, day)}
                        className={`relative min-h-[64px] border-l border-primary/5 ${
                          isAdmin ? 'cursor-pointer hover:bg-primary/5' : 'cursor-default'
                        }`}
                        title={isAdmin ? 'Click para reservar' : 'Solo visualización'}
                      >
                        {bars
                          .filter((b) => b.startIdx === dayIdx)
                          .map(({ viaje, span }) => (
                            <button
                              key={viaje.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                openEdit(viaje)
                              }}
                              className="absolute top-2 bottom-2 z-10 overflow-hidden rounded-md px-2 py-1 text-left text-[11px] font-semibold text-white shadow-sm"
                              style={{
                                left: 4,
                                width: `calc(${span * 100}% - 8px)`,
                                backgroundColor: paymentBarColor(viaje.estado_pago),
                                borderLeft: `4px solid ${vehiculo.color || '#fff'}`,
                              }}
                              title={`${viaje.origen} → ${viaje.destino} · ${viaje.estado_pago}`}
                            >
                              <span className="block truncate">
                                {viaje.origen} → {viaje.destino}
                              </span>
                              <span className="block truncate opacity-90">
                                {formatCurrency(Number(viaje.precio_total))} · {viaje.estado_pago}
                              </span>
                            </button>
                          ))}
                      </button>
                    ))}
                  </div>
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
          <CalendarDays className="h-4 w-4" />
          Modo operador: visualización de disponibilidad. Las reservas las gestiona un administrador.
        </p>
      )}

      {reserve && (
        <DirectReserveModal
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
        onClose={() => setEditing(null)}
        title="Gestionar reserva"
        wide
        footer={
          isAdmin ? (
            <>
              <Button variant="secondary" onClick={handleCancelar} loading={busy}>
                Cancelar viaje
              </Button>
              <Button onClick={handleReprogramar} loading={busy}>
                Reprogramar
              </Button>
            </>
          ) : undefined
        }
      >
        {editing && (
          <div className="space-y-4">
            <div className="rounded-xl bg-surface-950 p-4 text-sm">
              <p className="font-semibold text-slate-900">
                {editing.origen} → {editing.destino}
              </p>
              <p className="text-slate-600 mt-1">
                {editing.clientes?.nombre_razon_social ?? 'Sin cliente'} · {editing.estado_pago} ·{' '}
                {editing.estado_viaje}
              </p>
              {editing.paradas_intermedias && (
                <p className="mt-2 text-xs text-slate-500">Itinerario: {editing.paradas_intermedias}</p>
              )}
              {editing.hora_llegada_aprox && (
                <p className="mt-1 text-xs text-slate-500">
                  Llegada aproximada: {editing.hora_llegada_aprox.slice(0, 5)}
                </p>
              )}
            </div>

            {isAdmin && (
              <>
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
                        {v.nombre}
                      </option>
                    ))}
                  </select>
                </FormField>
              </>
            )}

            {actionError && (
              <p className="rounded-lg bg-danger-muted px-3 py-2 text-sm text-danger">{actionError}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
