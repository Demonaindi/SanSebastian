import { useEffect, useMemo, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import { createCliente } from '../../services/clientes'
import { confirmarViaje, syncChoferEstado } from '../../services/viajes'
import { formatCurrency } from '../../lib/quote'
import { getCategoriaLabel, formatVehiculoInterno, getExpiryLevel } from '../../lib/mappers'
import type { Vehiculo } from '../../types/database'
import { Button, FormField, Modal } from '../ui'

interface ConfirmTripModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  origen: string
  destino: string
  pasajeros: number
  fechaViaje: string
  fechaHasta: string
  horaViaje: string
  horaRegreso: string
  horaLlegadaAprox: string
  distancia: number
  precioTotal: number
  precioBaseCalculado: number
  paradasIntermedias: string
  vehiculo: Vehiculo
  editableSchedule?: boolean
  title?: string
}

export function ConfirmTripModal({
  open,
  onClose,
  onSuccess,
  origen,
  destino,
  pasajeros,
  fechaViaje,
  fechaHasta,
  horaViaje,
  horaRegreso,
  horaLlegadaAprox,
  distancia,
  precioTotal,
  precioBaseCalculado,
  paradasIntermedias,
  vehiculo,
  editableSchedule = false,
  title = 'Confirmar reserva',
}: ConfirmTripModalProps) {
  const { isAdmin } = useAuth()
  const { clientes, choferes, refreshAll } = useData()
  const [clienteId, setClienteId] = useState('')
  const [choferId, setChoferId] = useState('')
  const [fecha, setFecha] = useState(fechaViaje)
  const [hasta, setHasta] = useState(fechaHasta || fechaViaje)
  const [horaSalida, setHoraSalida] = useState(horaViaje)
  const [horaLlegada, setHoraLlegada] = useState(horaLlegadaAprox)
  const [horaVuelta, setHoraVuelta] = useState(horaRegreso)
  const [showNewCliente, setShowNewCliente] = useState(false)
  const [newNombre, setNewNombre] = useState('')
  const [newTelefono, setNewTelefono] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newCuit, setNewCuit] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setFecha(fechaViaje)
    setHasta(fechaHasta || fechaViaje)
    setHoraSalida(horaViaje)
    setHoraLlegada(horaLlegadaAprox)
    setHoraVuelta(horaRegreso)
    setClienteId('')
    setChoferId('')
    setShowNewCliente(false)
    setError('')
  }, [open, fechaViaje, fechaHasta, horaViaje, horaLlegadaAprox, horaRegreso])

  const choferesDisponibles = useMemo(
    () => choferes.filter((c) => c.estado === 'Disponible' || c.estado === 'En viaje'),
    [choferes],
  )

  const docWarning = useMemo(() => {
    const levels = [
      getExpiryLevel(vehiculo.vtv_vencimiento),
      getExpiryLevel(vehiculo.seguro_vencimiento),
      getExpiryLevel(vehiculo.matafuegos_vencimiento),
    ]
    if (levels.includes('danger')) return 'danger' as const
    if (levels.includes('warning')) return 'warning' as const
    return null
  }, [vehiculo])

  const handleCreateCliente = async () => {
    if (!newNombre.trim() || !newTelefono.trim()) {
      setError('Nombre y teléfono son obligatorios.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const created = await createCliente({
        nombre_razon_social: newNombre.trim(),
        telefono: newTelefono.trim(),
        email: newEmail || undefined,
        cuil_cuit_dni: newCuit || undefined,
      })
      setClienteId(created.id)
      setShowNewCliente(false)
      await refreshAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear cliente')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!isAdmin) {
      setError('Solo un administrador puede confirmar reservas.')
      return
    }
    if (!clienteId) {
      setError('Seleccioná un cliente.')
      return
    }
    const fechaFinal = editableSchedule ? fecha : fechaViaje
    if (!fechaFinal) {
      setError('La fecha de salida es obligatoria.')
      return
    }
    setLoading(true)
    setError('')

    const hastaFinal = editableSchedule ? hasta || fechaFinal : fechaHasta || fechaViaje
    const horaFinal = editableSchedule ? horaSalida : horaViaje
    const llegadaFinal = editableSchedule ? horaLlegada : horaLlegadaAprox
    const regresoFinal = editableSchedule ? horaVuelta : horaRegreso

    try {
      await confirmarViaje({
        origen,
        destino,
        pasajeros,
        fecha_viaje: fechaFinal,
        fecha_hasta: hastaFinal || fechaFinal,
        hora_viaje: horaFinal || null,
        hora_regreso: regresoFinal || null,
        hora_llegada_aprox: llegadaFinal || null,
        distancia_km: distancia,
        precio_total: precioTotal,
        precio_base_calculado: precioBaseCalculado,
        paradas_intermedias: paradasIntermedias || null,
        cliente_id: clienteId,
        chofer_id: choferId || null,
        vehiculo_id: vehiculo.id,
      })
      await syncChoferEstado(choferId || null)
      await refreshAll()
      onSuccess()
      onClose()
    } catch (err) {
      await refreshAll()
      setError(err instanceof Error ? err.message : 'Error al confirmar viaje')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} loading={loading} disabled={!isAdmin}>
            Confirmar viaje
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl bg-primary-muted p-4 text-sm">
          <p className="font-semibold text-brand">
            {origen} → {destino}
          </p>
          <p className="mt-1 text-slate-600">
            {formatVehiculoInterno(vehiculo)} · {getCategoriaLabel(vehiculo.categoria)} · {pasajeros} pax
            {distancia > 0 ? ` · ${distancia} km` : ''}
          </p>
          {!editableSchedule && (
            <p className="mt-1 text-slate-600">
              {fechaViaje}
              {fechaHasta && fechaHasta !== fechaViaje ? ` → ${fechaHasta}` : ' (mismo día)'}
              {horaViaje ? ` · Salida ${horaViaje}` : ''}
              {horaLlegadaAprox ? ` · Llegada aprox. ${horaLlegadaAprox}` : ''}
              {horaRegreso ? ` · Regreso ${horaRegreso}` : ''}
            </p>
          )}
          {paradasIntermedias && (
            <p className="mt-1 text-xs text-slate-500">Itinerario: {paradasIntermedias}</p>
          )}
          <p className="mt-2 text-lg font-bold text-brand">{formatCurrency(precioTotal)}</p>
        </div>

        {editableSchedule && (
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Fecha desde *">
              <input
                type="date"
                value={fecha}
                onChange={(e) => {
                  setFecha(e.target.value)
                  if (!hasta || hasta < e.target.value) setHasta(e.target.value)
                }}
                className="input-field"
              />
            </FormField>
            <FormField label="Fecha hasta *">
              <input
                type="date"
                value={hasta || fecha}
                min={fecha || undefined}
                onChange={(e) => setHasta(e.target.value)}
                className="input-field"
              />
            </FormField>
            <FormField label="Hora salida">
              <input
                type="time"
                value={horaSalida}
                onChange={(e) => setHoraSalida(e.target.value)}
                className="input-field"
              />
            </FormField>
            <FormField label="Hora regreso">
              <input
                type="time"
                value={horaVuelta}
                onChange={(e) => setHoraVuelta(e.target.value)}
                className="input-field"
              />
            </FormField>
          </div>
        )}

        {docWarning === 'danger' && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Esta unidad tiene documentación vencida o crítica (≤7 días). Se puede reservar igual; avisá al
            cliente y planificá la habilitación antes del servicio.
          </p>
        )}
        {docWarning === 'warning' && (
          <p className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2 text-xs text-amber-800">
            Documentación próxima a vencer (≤15 días). Revisá VTV, seguro o matafuegos.
          </p>
        )}

        {!showNewCliente ? (
          <FormField label="Cliente *">
            <div className="flex gap-2">
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="input-field flex-1"
              >
                <option value="">Seleccionar cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_razon_social} — {c.telefono}
                  </option>
                ))}
              </select>
              {isAdmin && (
                <Button variant="secondary" size="sm" onClick={() => setShowNewCliente(true)}>
                  <UserPlus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </FormField>
        ) : (
          <div className="space-y-3 rounded-xl border border-primary/15 p-4">
            <p className="text-sm font-semibold text-brand">Nuevo cliente</p>
            <FormField label="Nombre / Razón social *">
              <input value={newNombre} onChange={(e) => setNewNombre(e.target.value)} className="input-field" />
            </FormField>
            <FormField label="Teléfono *">
              <input value={newTelefono} onChange={(e) => setNewTelefono(e.target.value)} className="input-field" />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="CUIT / DNI (opcional)">
                <input value={newCuit} onChange={(e) => setNewCuit(e.target.value)} className="input-field" />
              </FormField>
              <FormField label="Email (opcional)">
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="input-field" />
              </FormField>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreateCliente} loading={loading}>
                Guardar cliente
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNewCliente(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <FormField label="Chofer (opcional)">
          <select value={choferId} onChange={(e) => setChoferId(e.target.value)} className="input-field">
            <option value="">Asignar después...</option>
            {choferesDisponibles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} — Lic. {c.licencia_categoria}
                {c.estado === 'En viaje' ? ' (en viaje)' : ''}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-slate-400">
            Al asignarlo queda En viaje automáticamente; al finalizar el viaje vuelve a Disponible.
          </p>
        </FormField>

        {error && <p className="rounded-lg bg-danger-muted px-3 py-2 text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  )
}
