import { useEffect, useMemo, useState } from 'react'
import { FileText, Image, Search } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useToast } from '../contexts/ToastContext'
import { formatPresupuestoNumero, formatVehiculoInterno, getCategoriaLabel } from '../lib/mappers'
import { formatCurrency } from '../lib/quote'
import type { QuoteExportData } from '../lib/exportQuote'
import { exportQuoteImage } from '../lib/exportQuoteImage'
import { listPresupuestos } from '../services/presupuestos'
import type { Presupuesto, Vehiculo } from '../types/database'
import { ConfirmTripModal } from './modals/ConfirmTripModal'
import type { TabId } from './TabBar'
import { CotizadorSubNav } from './CotizadorSubNav'
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

interface CotizacionesViewProps {
  onNavigate: (tab: TabId) => void
}

function matchVehiculo(presupuesto: Presupuesto, vehiculos: Vehiculo[]): Vehiculo | null {
  if (presupuesto.vehiculo_nombre) {
    const label = presupuesto.vehiculo_nombre.toLowerCase()
    const byInterno = vehiculos.find((v) => {
      const num = v.numero_interno?.trim()
      return (
        (num && `nº ${num}`.toLowerCase() === label) ||
        (num && num.toLowerCase() === label) ||
        v.nombre.toLowerCase() === label
      )
    })
    if (byInterno) return byInterno
  }
  if (presupuesto.vehiculo_categoria) {
    const byCat = vehiculos.find((v) => v.categoria === presupuesto.vehiculo_categoria)
    if (byCat) return byCat
  }
  return null
}

export function CotizacionesView({ onNavigate }: CotizacionesViewProps) {
  const { isAdmin } = useAuth()
  const { toast } = useToast()
  const { vehiculos } = useData()
  const [rows, setRows] = useState<Presupuesto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Presupuesto | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [vehiculoId, setVehiculoId] = useState('')
  const [exportingImage, setExportingImage] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listPresupuestos(100)
      setRows(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el historial')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (p) =>
        String(p.numero).includes(q) ||
        p.origen.toLowerCase().includes(q) ||
        p.destino.toLowerCase().includes(q) ||
        (p.vehiculo_nombre ?? '').toLowerCase().includes(q),
    )
  }, [rows, query])

  const matched = selected ? matchVehiculo(selected, vehiculos) : null
  const confirmVehicle =
    (vehiculoId ? vehiculos.find((v) => v.id === vehiculoId) : null) ?? matched ?? null

  const openDetail = (p: Presupuesto) => {
    setSelected(p)
    const match = matchVehiculo(p, vehiculos)
    setVehiculoId(match?.id ?? '')
    setConfirmOpen(false)
  }

  const startConfirm = () => {
    if (!selected) return
    if (!confirmVehicle) {
      toast({ title: 'Seleccioná una unidad de la flota', tone: 'danger' })
      return
    }
    setConfirmOpen(true)
  }

  const downloadImage = async () => {
    if (!selected || !confirmVehicle) {
      toast({ title: 'Seleccioná una unidad de la flota', tone: 'danger' })
      return
    }
    setExportingImage(true)
    try {
      const data: QuoteExportData = {
        origen: selected.origen,
        destino: selected.destino,
        pasajeros: selected.pasajeros,
        fecha: selected.fecha_viaje ?? undefined,
        hora: selected.hora_viaje?.slice(0, 5) ?? undefined,
        distancia: Number(selected.distancia_km) || 0,
        vehiculo: confirmVehicle,
        precioTotal: Number(selected.precio_total),
        precioBaseCalculado: Number(selected.precio_total),
        paradasIntermedias: selected.paradas_intermedias ?? undefined,
        presupuesto: selected,
      }
      await exportQuoteImage(data)
      toast({ title: 'Imagen descargada', tone: 'success' })
    } catch (err) {
      toast({
        title: 'No se pudo generar la imagen',
        message: err instanceof Error ? err.message : undefined,
        tone: 'danger',
      })
    } finally {
      setExportingImage(false)
    }
  }

  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-x-hidden animate-fade-in md:space-y-6">
      <PageHeader
        title="Historial de cotizaciones"
        description="Abrí un presupuesto y confirmalo como viaje activo en la agenda."
      />

      <CotizadorSubNav active="cotizaciones" onNavigate={onNavigate} />

      <div className="relative min-w-0">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          strokeWidth={1.75}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por N°, origen, destino o unidad..."
          className="input-field input-field-icon"
        />
      </div>

      {loading && rows.length === 0 ? (
        <LoadingState message="Cargando cotizaciones..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <Card hover={false}>
          <CardBody className="py-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-slate-300" strokeWidth={1.5} />
            <p className="mt-3 text-sm font-semibold text-slate-900">
              {query.trim() ? 'Sin resultados' : 'Todavía no hay cotizaciones'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {query.trim()
                ? 'Probá con otro criterio de búsqueda.'
                : 'Emití un presupuesto desde Cotizar para verlo acá.'}
            </p>
            {!query.trim() && (
              <button
                type="button"
                onClick={() => onNavigate('cotizador')}
                className="mt-4 text-sm font-semibold text-brand"
              >
                Ir a Cotizar →
              </button>
            )}
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => openDetail(p)}
                className="tap-press card-premium min-w-0 w-full space-y-2 p-4 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-slate-900">{formatPresupuestoNumero(p.numero)}</p>
                  <p className="shrink-0 text-base font-bold text-brand">
                    {formatCurrency(Number(p.precio_total))}
                  </p>
                </div>
                <p className="truncate text-sm text-slate-700">
                  {p.origen} → {p.destino}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <Badge variant="neutral">{p.pasajeros} pax</Badge>
                  {p.vehiculo_nombre && <Badge variant="info">{p.vehiculo_nombre}</Badge>}
                  <span>{p.distancia_km} km</span>
                </div>
              </button>
            ))}
          </div>

          <Card hover={false} className="hidden min-w-0 overflow-hidden md:block">
            <CardBody className="!p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-0 text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left">
                      <th className="px-5 py-3 text-[10px] font-bold uppercase text-slate-500">N°</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase text-slate-500">Ruta</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase text-slate-500">Unidad</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase text-slate-500">Fecha</th>
                      <th className="px-5 py-3 text-right text-[10px] font-bold uppercase text-slate-500">
                        Total
                      </th>
                      <th className="px-5 py-3 text-right text-[10px] font-bold uppercase text-slate-500">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id} className="border-b border-slate-50">
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {formatPresupuestoNumero(p.numero)}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-800">
                            {p.origen} → {p.destino}
                          </p>
                          <p className="text-xs text-slate-500">
                            {p.pasajeros} pax · {p.distancia_km} km
                          </p>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{p.vehiculo_nombre ?? '—'}</td>
                        <td className="px-5 py-4 text-slate-500">
                          {new Date(p.created_at).toLocaleString('es-AR')}
                        </td>
                        <td className="px-5 py-4 text-right font-mono font-bold text-brand">
                          {formatCurrency(Number(p.precio_total))}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button size="sm" variant="secondary" onClick={() => openDetail(p)}>
                            Abrir
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </>
      )}

      <Modal
        open={!!selected && !confirmOpen}
        onClose={() => setSelected(null)}
        title={selected ? formatPresupuestoNumero(selected.numero) : 'Cotización'}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Cerrar
            </Button>
            <Button variant="secondary" onClick={downloadImage} loading={exportingImage}>
              <Image className="h-4 w-4" /> Imagen
            </Button>
            {isAdmin && (
              <Button onClick={startConfirm} disabled={!confirmVehicle && vehiculos.length === 0}>
                Confirmar como viaje
              </Button>
            )}
          </>
        }
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">
                {selected.origen} → {selected.destino}
              </p>
              {selected.paradas_intermedias && (
                <p className="mt-1 text-xs text-slate-500">Itinerario: {selected.paradas_intermedias}</p>
              )}
              <p className="mt-2 text-slate-600">
                {selected.pasajeros} pax · {selected.distancia_km} km
                {selected.fecha_viaje ? ` · ${selected.fecha_viaje}` : ''}
                {selected.hora_viaje ? ` ${selected.hora_viaje.slice(0, 5)}` : ''}
              </p>
              <p className="mt-2 text-lg font-bold text-brand">
                {formatCurrency(Number(selected.precio_total))}
              </p>
            </div>

            <FormField label="Unidad de flota">
              <select
                value={vehiculoId}
                onChange={(e) => setVehiculoId(e.target.value)}
                className="input-field"
              >
                <option value="">Seleccionar unidad...</option>
                {vehiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {formatVehiculoInterno(v)} · {getCategoriaLabel(v.categoria)} · {v.capacidad} pax
                  </option>
                ))}
              </select>
              {matched && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Sugerida por el presupuesto: {matched.nombre}
                </p>
              )}
            </FormField>

            {!isAdmin && (
              <p className="text-xs text-slate-500">
                Solo un administrador puede pasar esta cotización a la agenda de viajes.
              </p>
            )}
          </div>
        )}
      </Modal>

      {selected && confirmVehicle && (
        <ConfirmTripModal
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onSuccess={() => {
            setConfirmOpen(false)
            setSelected(null)
            toast({
              title: 'Viaje confirmado',
              message: `${selected.origen} → ${selected.destino} ya está en la agenda`,
              tone: 'success',
            })
            onNavigate('agenda')
          }}
          title={`Confirmar · ${formatPresupuestoNumero(selected.numero)}`}
          origen={selected.origen}
          destino={selected.destino}
          pasajeros={selected.pasajeros}
          fechaViaje={selected.fecha_viaje ?? ''}
          fechaHasta={selected.fecha_viaje ?? ''}
          horaViaje={selected.hora_viaje?.slice(0, 5) ?? ''}
          horaRegreso=""
          horaLlegadaAprox=""
          distancia={Number(selected.distancia_km) || 0}
          precioTotal={Number(selected.precio_total)}
          precioBaseCalculado={Number(selected.precio_total)}
          paradasIntermedias={selected.paradas_intermedias ?? ''}
          vehiculo={confirmVehicle}
          editableSchedule
        />
      )}
    </div>
  )
}
