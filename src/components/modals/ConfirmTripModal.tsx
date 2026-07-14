import { useMemo, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import { createCliente } from '../../services/clientes'
import { confirmarViaje } from '../../services/viajes'
import { formatCurrency } from '../../lib/quote'
import { getCategoriaLabel } from '../../lib/mappers'
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
}: ConfirmTripModalProps) {
  const { isAdmin } = useAuth()
  const { clientes, choferes, refreshAll } = useData()
  const [clienteId, setClienteId] = useState('')
  const [choferId, setChoferId] = useState('')
  const [showNewCliente, setShowNewCliente] = useState(false)
  const [newNombre, setNewNombre] = useState('')
  const [newTelefono, setNewTelefono] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newCuit, setNewCuit] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const choferesDisponibles = useMemo(
    () => choferes.filter((c) => c.estado === 'Disponible' || c.estado === 'En viaje'),
    [choferes],
  )

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
    if (!fechaViaje) {
      setError('La fecha de salida es obligatoria.')
      return
    }
    setLoading(true)
    setError('')

    try {
      await confirmarViaje({
        origen,
        destino,
        pasajeros,
        fecha_viaje: fechaViaje,
        fecha_hasta: fechaHasta || fechaViaje,
        hora_viaje: horaViaje || null,
        hora_regreso: horaRegreso || null,
        hora_llegada_aprox: horaLlegadaAprox || null,
        distancia_km: distancia,
        precio_total: precioTotal,
        precio_base_calculado: precioBaseCalculado,
        paradas_intermedias: paradasIntermedias || null,
        cliente_id: clienteId,
        chofer_id: choferId || null,
        vehiculo_id: vehiculo.id,
      })
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
      title="Confirmar reserva"
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} loading={loading} disabled={!isAdmin}>
            Confirmar reserva
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
            {vehiculo.nombre} · {getCategoriaLabel(vehiculo.categoria)} · {pasajeros} pax
            {distancia > 0 ? ` · ${distancia} km` : ''}
          </p>
          <p className="mt-1 text-slate-600">
            {fechaViaje}
            {fechaHasta && fechaHasta !== fechaViaje ? ` → ${fechaHasta}` : ' (mismo día)'}
            {horaViaje ? ` · Salida ${horaViaje}` : ''}
            {horaLlegadaAprox ? ` · Llegada aprox. ${horaLlegadaAprox}` : ''}
            {horaRegreso ? ` · Regreso ${horaRegreso}` : ''}
          </p>
          {paradasIntermedias && (
            <p className="mt-1 text-xs text-slate-500">Itinerario: {paradasIntermedias}</p>
          )}
          <p className="mt-2 text-lg font-bold text-brand">{formatCurrency(precioTotal)}</p>
        </div>

        {!showNewCliente ? (
          <FormField label="Cliente">
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
              </option>
            ))}
          </select>
        </FormField>

        {error && <p className="rounded-lg bg-danger-muted px-3 py-2 text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  )
}
