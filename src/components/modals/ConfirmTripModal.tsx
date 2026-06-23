import { useMemo, useState } from 'react'
import { UserPlus } from 'lucide-react'
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
  horaViaje: string
  distancia: number
  precioTotal: number
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
  horaViaje,
  distancia,
  precioTotal,
  vehiculo,
}: ConfirmTripModalProps) {
  const { clientes, choferes, refreshAll, setVehiculosOptimistic, setChoferesOptimistic } =
    useData()
  const [clienteId, setClienteId] = useState('')
  const [choferId, setChoferId] = useState('')
  const [showNewCliente, setShowNewCliente] = useState(false)
  const [newNombre, setNewNombre] = useState('')
  const [newTelefono, setNewTelefono] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const choferesDisponibles = useMemo(
    () => choferes.filter((c) => c.estado === 'Disponible'),
    [choferes],
  )

  const handleCreateCliente = async () => {
    if (!newNombre.trim()) return
    setLoading(true)
    setError('')
    try {
      const created = await createCliente({
        nombre_razon_social: newNombre.trim(),
        telefono: newTelefono || undefined,
        email: newEmail || undefined,
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
    if (!clienteId || !choferId) {
      setError('Seleccioná cliente y chofer disponible.')
      return
    }
    setLoading(true)
    setError('')

    setVehiculosOptimistic((prev) =>
      prev.map((v) => (v.id === vehiculo.id ? { ...v, estado: 'En viaje' } : v)),
    )
    setChoferesOptimistic((prev) =>
      prev.map((c) => (c.id === choferId ? { ...c, estado: 'En viaje' } : c)),
    )

    try {
      await confirmarViaje({
        origen,
        destino,
        pasajeros,
        fecha_viaje: fechaViaje || null,
        hora_viaje: horaViaje || null,
        distancia_km: distancia,
        precio_total: precioTotal,
        cliente_id: clienteId,
        chofer_id: choferId,
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
      title="Confirmar viaje"
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} loading={loading}>
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
            {vehiculo.nombre} · {getCategoriaLabel(vehiculo.categoria)} · {pasajeros} pax ·{' '}
            {distancia} km
          </p>
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
                    {c.nombre_razon_social}
                  </option>
                ))}
              </select>
              <Button variant="secondary" size="sm" onClick={() => setShowNewCliente(true)}>
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </FormField>
        ) : (
          <div className="space-y-3 rounded-xl border border-primary/15 p-4">
            <p className="text-sm font-semibold text-brand">Nuevo cliente</p>
            <FormField label="Nombre / Razón social">
              <input
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                className="input-field"
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Teléfono">
                <input
                  value={newTelefono}
                  onChange={(e) => setNewTelefono(e.target.value)}
                  className="input-field"
                />
              </FormField>
              <FormField label="Email">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="input-field"
                />
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

        <FormField label="Chofer disponible">
          <select
            value={choferId}
            onChange={(e) => setChoferId(e.target.value)}
            className="input-field"
          >
            <option value="">Seleccionar chofer...</option>
            {choferesDisponibles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} — Lic. {c.licencia_categoria}
              </option>
            ))}
          </select>
          {choferesDisponibles.length === 0 && (
            <p className="text-xs text-warning">No hay choferes disponibles en este momento.</p>
          )}
        </FormField>

        {error && (
          <p className="rounded-lg bg-danger-muted px-3 py-2 text-sm text-danger">{error}</p>
        )}
      </div>
    </Modal>
  )
}
