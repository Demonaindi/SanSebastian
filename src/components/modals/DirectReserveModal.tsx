import { useEffect, useMemo, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import { createCliente } from '../../services/clientes'
import { confirmarViaje, syncChoferEstado } from '../../services/viajes'
import { formatVehiculoInterno, getVehiculoDocLevel } from '../../lib/mappers'
import { Button, FormField, Modal } from '../ui'

interface DirectReserveModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  vehiculoId: string
  fechaInicio: string
  fechaFin: string
}

export function DirectReserveModal({
  open,
  onClose,
  onSuccess,
  vehiculoId,
  fechaInicio,
  fechaFin,
}: DirectReserveModalProps) {
  const { vehiculos, clientes, choferes, refreshAll } = useData()
  const vehiculo = vehiculos.find((v) => v.id === vehiculoId)

  const [origen, setOrigen] = useState('')
  const [destino, setDestino] = useState('')
  const [pasajeros, setPasajeros] = useState('1')
  const [fechaDesde, setFechaDesde] = useState(fechaInicio)
  const [fechaHasta, setFechaHasta] = useState(fechaFin || fechaInicio)
  const [horaSalida, setHoraSalida] = useState('')
  const [horaLlegada, setHoraLlegada] = useState('')
  const [horaRegreso, setHoraRegreso] = useState('')
  const [precio, setPrecio] = useState('')
  const [paradas, setParadas] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [choferId, setChoferId] = useState('')
  const [showNewCliente, setShowNewCliente] = useState(false)
  const [newNombre, setNewNombre] = useState('')
  const [newTelefono, setNewTelefono] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setFechaDesde(fechaInicio)
    setFechaHasta(fechaFin || fechaInicio)
  }, [open, fechaInicio, fechaFin])

  const choferesOpts = useMemo(() => choferes, [choferes])

  const docWarning = useMemo(() => {
    if (!vehiculo) return null
    const level = getVehiculoDocLevel(vehiculo)
    return level === 'ok' ? null : level
  }, [vehiculo])

  const handleCreateCliente = async () => {
    if (!newNombre.trim() || !newTelefono.trim()) {
      setError('Nombre y teléfono son obligatorios.')
      return
    }
    setLoading(true)
    try {
      const created = await createCliente({
        nombre_razon_social: newNombre.trim(),
        telefono: newTelefono.trim(),
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

  const handleSave = async () => {
    if (!vehiculo) return
    if (!origen.trim() || !destino.trim()) {
      setError('Completá origen y destino.')
      return
    }
    if (!clienteId) {
      setError('Seleccioná un cliente.')
      return
    }
    const pax = parseInt(pasajeros, 10)
    const monto = parseFloat(precio)
    if (!pax || pax < 1) {
      setError('Pasajeros inválidos.')
      return
    }
    if (Number.isNaN(monto) || monto < 0) {
      setError('Ingresá un precio (puede ser 0 para servicios especiales).')
      return
    }

    const hasta = fechaHasta || fechaDesde
    setLoading(true)
    setError('')
    try {
      await confirmarViaje({
        origen: origen.trim(),
        destino: destino.trim(),
        pasajeros: pax,
        fecha_viaje: fechaDesde,
        fecha_hasta: hasta,
        hora_viaje: horaSalida || null,
        hora_regreso: horaRegreso || null,
        hora_llegada_aprox: horaLlegada || null,
        distancia_km: 0,
        precio_total: monto,
        precio_base_calculado: monto,
        paradas_intermedias: paradas.trim() || null,
        cliente_id: clienteId,
        chofer_id: choferId || null,
        vehiculo_id: vehiculo.id,
      })
      await syncChoferEstado(choferId || null)
      await refreshAll()
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la reserva')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Reserva directa — ${vehiculo ? formatVehiculoInterno(vehiculo) : 'Unidad'}`}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={loading}>
            Guardar reserva
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Ideal para clubes y servicios especiales no tarifados. El precio es libre. Si la unidad ya
          tiene otro viaje el mismo día, cargá horarios para que no se solapen.
        </p>

        {docWarning === 'danger' && (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            Esta unidad tiene documentación o matafuegos vencidos/críticos. Se puede crear el viaje
            igual; avisá al área operativa antes del servicio.
          </p>
        )}
        {docWarning === 'warning' && (
          <p className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Documentación próxima a vencer (≤15 días). Se puede reservar igual; revisá VTV, seguro o
            matafuegos.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Origen *">
            <input value={origen} onChange={(e) => setOrigen(e.target.value)} className="input-field" />
          </FormField>
          <FormField label="Destino *">
            <input value={destino} onChange={(e) => setDestino(e.target.value)} className="input-field" />
          </FormField>
        </div>

        <FormField label="Paradas / itinerario (texto)">
          <textarea
            value={paradas}
            onChange={(e) => setParadas(e.target.value)}
            className="input-field min-h-[72px]"
            placeholder="Ej: Club → Predio rugby → Hotel"
          />
        </FormField>

        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Fecha desde *">
            <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="input-field" />
          </FormField>
          <FormField label="Fecha hasta *">
            <input
              type="date"
              value={fechaHasta}
              min={fechaDesde}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="input-field"
            />
          </FormField>
          <FormField label="Pasajeros *">
            <input type="number" min={1} value={pasajeros} onChange={(e) => setPasajeros(e.target.value)} className="input-field" />
          </FormField>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Hora salida">
            <input type="time" value={horaSalida} onChange={(e) => setHoraSalida(e.target.value)} className="input-field" />
          </FormField>
          <FormField label="Hora llegada (aprox.)">
            <input type="time" value={horaLlegada} onChange={(e) => setHoraLlegada(e.target.value)} className="input-field" />
          </FormField>
          <FormField label="Hora regreso">
            <input type="time" value={horaRegreso} onChange={(e) => setHoraRegreso(e.target.value)} className="input-field" />
          </FormField>
        </div>

        <FormField label="Precio total (ARS)">
          <input type="number" min={0} value={precio} onChange={(e) => setPrecio(e.target.value)} className="input-field" placeholder="0" />
        </FormField>

        {!showNewCliente ? (
          <FormField label="Cliente *">
            <div className="flex gap-2">
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="input-field flex-1">
                <option value="">Seleccionar...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_razon_social} — {c.telefono}
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
            <FormField label="Nombre *">
              <input value={newNombre} onChange={(e) => setNewNombre(e.target.value)} className="input-field" />
            </FormField>
            <FormField label="Teléfono *">
              <input value={newTelefono} onChange={(e) => setNewTelefono(e.target.value)} className="input-field" />
            </FormField>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreateCliente} loading={loading}>
                Guardar
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
            {choferesOpts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </FormField>

        {error && <p className="rounded-lg bg-danger-muted px-3 py-2 text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  )
}
