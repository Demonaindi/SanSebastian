import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Image,
  FileDown,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Printer,
  Route,
  Sparkles,
  Users,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useToast } from '../contexts/ToastContext'
import {
  buildTariffTable,
  categoriaToVehicleType,
  formatPresupuestoNumero,
  formatVehiculoInterno,
  getCategoriaLabel,
  getRateForVehiculo,
} from '../lib/mappers'
import {
  buildWhatsAppUrl,
  exportQuotePdf,
  printQuote,
  type QuoteExportData,
} from '../lib/exportQuote'
import { exportQuoteImage } from '../lib/exportQuoteImage'
import { getDrivingRouteDistance } from '../lib/routing'
import {
  calculateQuote,
  formatCurrency,
  formatDurationHours,
  formatRatePerKm,
  type QuoteResult,
} from '../lib/quote'
import { generarPresupuesto } from '../services/presupuestos'
import type { Vehiculo } from '../types/database'
import { ConfirmTripModal } from './modals/ConfirmTripModal'
import { CotizadorSubNav } from './CotizadorSubNav'
import { RouteMap } from './RouteMap'
import type { TabId } from './TabBar'
import { TariffTable } from './TariffTable'
import { VehicleIcon } from './VehicleIcon'
import {
  Alert,
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
  SkeletonCard,
  StatCard,
} from './ui'

interface CotizadorViewProps {
  onNavigate: (tab: TabId) => void
}

export function CotizadorView({ onNavigate }: CotizadorViewProps) {
  const { isAdmin } = useAuth()
  const { toast } = useToast()
  const { vehiculos, loading, error, refreshVehiculos } = useData()
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [stops, setStops] = useState('')
  const [passengers, setPassengers] = useState('')
  const [tripDate, setTripDate] = useState('')
  const [tripDateUntil, setTripDateUntil] = useState('')
  const [tripTime, setTripTime] = useState('')
  const [arrivalTime, setArrivalTime] = useState('')
  const [returnTime, setReturnTime] = useState('')
  const [quote, setQuote] = useState<QuoteResult | null>(null)
  const [editedDistance, setEditedDistance] = useState('')
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({})
  const [formError, setFormError] = useState('')
  const [resultKey, setResultKey] = useState(0)
  const [calculating, setCalculating] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedOption, setSelectedOption] = useState<{
    vehiculo: Vehiculo
    price: number
    base: number
  } | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [exportingId, setExportingId] = useState<string | null>(null)

  const tariffs = useMemo(() => buildTariffTable(vehiculos), [vehiculos])

  const applyQuoteResult = (result: QuoteResult) => {
    setQuote(result)
    setEditedDistance(String(result.distance))
    const prices: Record<string, number> = {}
    for (const opt of result.options) prices[opt.vehiculo.id] = opt.price
    setEditedPrices(prices)
    setResultKey((k) => k + 1)
  }

  const handleCalculate = async () => {
    const pax = parseInt(passengers, 10)
    if (!origin.trim() || !destination.trim()) {
      setFormError('Completá origen y destino para calcular la cotización.')
      setQuote(null)
      return
    }
    if (!pax || pax < 1) {
      setFormError('Ingresá una cantidad válida de pasajeros.')
      setQuote(null)
      return
    }
    if (vehiculos.length === 0) {
      setFormError('No hay vehículos en Flota. Cargá al menos una unidad para poder cotizar.')
      setQuote(null)
      return
    }
    setFormError('')
    setSuccessMsg('')
    setCalculating(true)
    setQuote(null)
    setEditedPrices({})
    setEditedDistance('')

    try {
      const route = await getDrivingRouteDistance(origin, destination)
      const result = calculateQuote(pax, vehiculos, route.distanceKm, {
        durationMinutes: route.durationMinutes,
        originResolved: route.originResolved,
        destinationResolved: route.destinationResolved,
        originPoint: route.origin,
        destinationPoint: route.destination,
        routePath: route.path,
      })
      if (!result) {
        setFormError('No se pudo armar la cotización con los datos ingresados.')
        return
      }
      applyQuoteResult(result)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al calcular la ruta.')
    } finally {
      setCalculating(false)
    }
  }

  const handleDistanceChange = (raw: string) => {
    setEditedDistance(raw)
    if (!quote) return
    const nextDistance = parseFloat(raw.replace(',', '.'))
    if (!Number.isFinite(nextDistance) || nextDistance <= 0) return

    const pax = parseInt(passengers, 10) || quote.options[0]?.vehiculo.capacidad || 1
    const result = calculateQuote(pax, vehiculos, nextDistance, {
      durationMinutes: quote.durationMinutes,
      originResolved: quote.originResolved,
      destinationResolved: quote.destinationResolved,
      originPoint: quote.originPoint,
      destinationPoint: quote.destinationPoint,
      routePath: quote.routePath,
    })
    if (!result) return

    setQuote(result)
    const prices: Record<string, number> = {}
    for (const opt of result.options) prices[opt.vehiculo.id] = opt.price
    setEditedPrices(prices)
  }

  const getPrice = (vehiculoId: string, base: number) => editedPrices[vehiculoId] ?? base
  const activeDistance = quote
    ? parseFloat(editedDistance.replace(',', '.')) || quote.distance
    : 0

  const openConfirm = (option: { vehiculo: Vehiculo; price: number }) => {
    if (!isAdmin) return
    setSelectedOption({
      vehiculo: option.vehiculo,
      price: getPrice(option.vehiculo.id, option.price),
      base: option.price,
    })
    setConfirmOpen(true)
  }

  const buildExportPayload = async (vehiculo: Vehiculo, basePrice: number): Promise<QuoteExportData> => {
    const precioTotal = getPrice(vehiculo.id, basePrice)
    const presupuesto = await generarPresupuesto({
      origen: quote?.originResolved ?? origin,
      destino: quote?.destinationResolved ?? destination,
      pasajeros: parseInt(passengers, 10),
      fecha_viaje: tripDate || null,
      hora_viaje: tripTime || null,
      distancia_km: activeDistance,
      vehiculo_nombre: vehiculo.nombre,
      vehiculo_categoria: vehiculo.categoria,
      precio_total: precioTotal,
      paradas_intermedias: stops.trim() || null,
    })

    return {
      origen: quote?.originResolved ?? origin,
      destino: quote?.destinationResolved ?? destination,
      pasajeros: parseInt(passengers, 10),
      fecha: tripDate || undefined,
      fechaHasta: tripDateUntil || undefined,
      hora: tripTime || undefined,
      distancia: activeDistance,
      duracionMinutos: quote?.durationMinutes,
      vehiculo,
      precioTotal,
      precioBaseCalculado: basePrice,
      paradasIntermedias: stops.trim() || undefined,
      presupuesto,
    }
  }

  const handleExport = async (
    vehiculo: Vehiculo,
    basePrice: number,
    mode: 'pdf' | 'print' | 'wa' | 'image',
  ) => {
    setExportingId(vehiculo.id)
    try {
      const data = await buildExportPayload(vehiculo, basePrice)
      if (mode === 'pdf') exportQuotePdf(data)
      else if (mode === 'print') printQuote(data)
      else if (mode === 'image') await exportQuoteImage(data)
      else window.open(buildWhatsAppUrl(data), '_blank')
      toast({
        title:
          mode === 'wa'
            ? 'WhatsApp listo'
            : mode === 'image'
              ? 'Imagen descargada'
              : 'Presupuesto generado',
        message: data.presupuesto ? formatPresupuestoNumero(data.presupuesto.numero) : undefined,
        tone: 'success',
      })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo generar el presupuesto')
    } finally {
      setExportingId(null)
    }
  }

  if (loading && vehiculos.length === 0) return <LoadingState message="Cargando flota..." />
  if (error) return <ErrorState message={error} onRetry={refreshVehiculos} />

  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-x-hidden animate-fade-in md:space-y-8">
      <PageHeader
        title="Cotizador Rápido"
        description="El precio se calcula por ruta lineal Origen → Destino. Las paradas intermedias se cargan como texto del itinerario y no suman kilómetros automáticamente."
      />

      <CotizadorSubNav active="cotizador" onNavigate={onNavigate} />

      {successMsg && (
        <Alert title="Reserva registrada" variant="info" icon={CheckCircle2}>
          {successMsg}
        </Alert>
      )}

      <TariffTable tariffs={tariffs} compact />

      <div className="grid min-w-0 gap-5 xl:grid-cols-5 xl:gap-6">
        <div className="min-w-0 xl:col-span-2">
          <Card hover={false} className="min-w-0 overflow-hidden">
            <CardHeader
              title="Datos del viaje"
              subtitle="Origen, destino y pasajeros son obligatorios. Fecha y horario son opcionales."
            />
            <CardBody className="space-y-4 md:space-y-5">
              {vehiculos.length === 0 && (
                <Alert title="Sin flota cargada" variant="warning" icon={AlertTriangle}>
                  No hay vehículos. Cargá unidades en Flota para poder cotizar.
                </Alert>
              )}

              <FormField label="Punto de partida">
                <div className="relative min-w-0">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="Ej: Buenos Aires, CABA"
                    className="input-field input-field-icon"
                  />
                </div>
              </FormField>

              <div className="flex justify-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary-muted">
                  <ArrowRight className="h-4 w-4 rotate-90 text-brand xl:rotate-0" />
                </div>
              </div>

              <FormField label="Punto de destino">
                <div className="relative min-w-0">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Ej: Mar del Plata, BA"
                    className="input-field input-field-icon"
                  />
                </div>
              </FormField>

              <FormField label="Paradas intermedias (itinerario en texto)">
                <textarea
                  value={stops}
                  onChange={(e) => setStops(e.target.value)}
                  className="input-field min-h-[72px] resize-y"
                  placeholder="Ej: Club / Predio / Hotel. No suman km."
                />
              </FormField>

              <FormField label="Cantidad de pasajeros">
                <div className="relative min-w-0">
                  <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                    placeholder="Ej: 35"
                    className="input-field input-field-icon"
                  />
                </div>
              </FormField>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Fecha desde (opcional)">
                  <input
                    type="date"
                    value={tripDate}
                    onChange={(e) => {
                      setTripDate(e.target.value)
                      if (e.target.value && tripDateUntil && tripDateUntil < e.target.value) {
                        setTripDateUntil(e.target.value)
                      }
                      if (!e.target.value) setTripDateUntil('')
                    }}
                    className="input-field"
                  />
                </FormField>
                <FormField label="Fecha hasta (opcional)">
                  <input
                    type="date"
                    value={tripDateUntil}
                    min={tripDate || undefined}
                    onChange={(e) => setTripDateUntil(e.target.value)}
                    className="input-field"
                    disabled={!tripDate}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label="Hora salida (opcional)">
                  <input
                    type="time"
                    value={tripTime}
                    onChange={(e) => setTripTime(e.target.value)}
                    className="input-field"
                  />
                </FormField>
                <FormField label="Llegada aprox. (opcional)">
                  <input
                    type="time"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    className="input-field"
                  />
                </FormField>
                <FormField label="Hora regreso (opcional)">
                  <input
                    type="time"
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                    className="input-field"
                  />
                </FormField>
              </div>

              {formError && (
                <Alert title="Revisá los datos" variant="danger">
                  {formError}
                </Alert>
              )}

              <Button onClick={handleCalculate} loading={calculating} size="lg" className="w-full">
                <Calculator className="h-4 w-4" />
                Calcular Cotización
              </Button>
            </CardBody>
          </Card>
        </div>

        <div className="min-w-0 xl:col-span-3">
          {calculating && (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <p className="text-center text-xs text-slate-400">Calculando ruta origen → destino...</p>
            </div>
          )}

          {!calculating && !quote && (
            <Card hover={false} className="hidden min-h-[280px] xl:block">
              <CardBody className="flex min-h-[280px] flex-col items-center justify-center py-12 text-center">
                <Route className="mb-4 h-12 w-12 text-brand" />
                <h3 className="text-lg font-semibold text-slate-900">Listo para cotizar</h3>
                <p className="mt-2 max-w-sm text-sm text-slate-500">
                  Completá el formulario. El administrador puede editar el total antes de emitir el
                  presupuesto.
                </p>
              </CardBody>
            </Card>
          )}

          {!calculating && quote && (
            <div key={resultKey} className="min-w-0 space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                <div className="card-elevated rounded-xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        Kilómetros
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          min={0.1}
                          step={0.1}
                          inputMode="decimal"
                          value={editedDistance}
                          onChange={(e) => handleDistanceChange(e.target.value)}
                          className="input-field max-w-[8.5rem] text-2xl font-bold tracking-tight text-brand"
                        />
                        <span className="text-sm font-semibold text-slate-500">km</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDurationHours(quote.durationMinutes) ?? 'Editable · recalcula precios'}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-muted text-brand">
                      <Route className="h-5 w-5" />
                    </div>
                  </div>
                </div>
                <StatCard
                  label="Opciones"
                  value={String(quote.options.length)}
                  icon={Sparkles}
                  tone={quote.options.length > 0 ? 'success' : 'warning'}
                />
                <StatCard
                  label="Combinaciones"
                  value={String(quote.combinations.length)}
                  icon={Users}
                  tone={quote.combinations.length > 0 ? 'warning' : 'default'}
                />
              </div>

              {quote.originPoint && quote.destinationPoint && quote.routePath && (
                <RouteMap
                  origin={quote.originPoint}
                  destination={quote.destinationPoint}
                  path={quote.routePath}
                />
              )}

              {(quote.originResolved || quote.destinationResolved) && (
                <div className="card-elevated flex min-w-0 flex-col gap-2 rounded-xl px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:px-5 sm:py-4">
                  <Badge variant="info" className="max-w-full truncate">
                    {quote.originResolved ?? origin}
                  </Badge>
                  <ArrowRight className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" />
                  <Badge variant="info" className="max-w-full truncate">
                    {quote.destinationResolved ?? destination}
                  </Badge>
                  <span className="text-xs text-slate-500 sm:ml-auto">
                    {passengers} pax · {activeDistance} km
                  </span>
                </div>
              )}

              {stops.trim() && (
                <Alert title="Itinerario de paradas (sin km extra)" variant="info">
                  {stops}
                </Alert>
              )}

              {quote.options.length > 0 && (
                <div className="min-w-0 space-y-3 md:space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                    Vehículos recomendados
                  </h3>
                  {quote.options.map((opt, index) => (
                    <QuoteOptionCard
                      key={opt.vehiculo.id}
                      option={opt}
                      distance={activeDistance}
                      index={index}
                      featured={index === 0}
                      editedPrice={getPrice(opt.vehiculo.id, opt.price)}
                      canEditPrice={isAdmin}
                      exporting={exportingId === opt.vehiculo.id}
                      onPriceChange={(value) =>
                        setEditedPrices((prev) => ({ ...prev, [opt.vehiculo.id]: value }))
                      }
                      onConfirm={() => openConfirm(opt)}
                      canConfirm={isAdmin}
                      onExportPdf={() => handleExport(opt.vehiculo, opt.price, 'pdf')}
                      onExportImage={() => handleExport(opt.vehiculo, opt.price, 'image')}
                      onPrint={() => handleExport(opt.vehiculo, opt.price, 'print')}
                      onWhatsApp={() => handleExport(opt.vehiculo, opt.price, 'wa')}
                    />
                  ))}
                </div>
              )}

              {quote.options.length === 0 && quote.combinations.length > 0 && (
                <Alert title="Se requiere combinación" variant="warning" icon={AlertTriangle}>
                  Ningún vehículo individual cubre {passengers} pasajeros.
                </Alert>
              )}

              {quote.combinations.length > 0 && (
                <div className="min-w-0 space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                    Combinaciones sugeridas
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {quote.combinations.map((combo, index) => (
                      <article
                        key={`${combo.label}-${index}`}
                        className="card-elevated min-w-0 space-y-3 rounded-xl p-4 sm:p-5"
                      >
                        <div className="flex justify-between gap-2">
                          <Badge variant="warning">Combinación</Badge>
                          <p className="text-xl font-bold text-warning">{formatCurrency(combo.price)}</p>
                        </div>
                        <p className="break-words font-semibold text-slate-900">{combo.label}</p>
                        <p className="text-xs text-slate-500">
                          {combo.totalCapacity} pax · {activeDistance} km
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedOption && quote && (
        <ConfirmTripModal
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onSuccess={() => {
            setSuccessMsg(
              `Reserva registrada: ${origin} → ${destination} con ${selectedOption.vehiculo.nombre}.`,
            )
            toast({
              title: 'Viaje asignado con éxito',
              message: `${selectedOption.vehiculo.nombre} · ${origin} → ${destination}`,
              tone: 'success',
            })
            setConfirmOpen(false)
          }}
          origen={origin}
          destino={destination}
          pasajeros={parseInt(passengers, 10)}
          fechaViaje={tripDate}
          fechaHasta={tripDateUntil || tripDate}
          horaViaje={tripTime}
          horaRegreso={returnTime}
          horaLlegadaAprox={arrivalTime}
          distancia={activeDistance}
          precioTotal={selectedOption.price}
          precioBaseCalculado={selectedOption.base}
          paradasIntermedias={stops}
          vehiculo={selectedOption.vehiculo}
          editableSchedule
        />
      )}
    </div>
  )
}

function QuoteOptionCard({
  option,
  distance,
  index,
  featured,
  editedPrice,
  canEditPrice,
  exporting,
  onPriceChange,
  onConfirm,
  canConfirm,
  onExportPdf,
  onExportImage,
  onPrint,
  onWhatsApp,
}: {
  option: { vehiculo: Vehiculo; price: number }
  distance: number
  index: number
  featured?: boolean
  editedPrice: number
  canEditPrice: boolean
  exporting: boolean
  onPriceChange: (value: number) => void
  onConfirm: () => void
  canConfirm: boolean
  onExportPdf: () => void
  onExportImage: () => void
  onPrint: () => void
  onWhatsApp: () => void
}) {
  const { vehiculo, price } = option
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <article
      className="animate-result card-elevated min-w-0 overflow-hidden rounded-xl"
      style={{ animationDelay: `${index * 70}ms`, opacity: 0 }}
    >
      <div className="flex min-w-0 flex-col lg:flex-row">
        <div className="flex min-w-0 items-center gap-3 border-b border-primary/10 p-4 sm:gap-4 sm:p-5 lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r">
          <VehicleIcon type={categoriaToVehicleType(vehiculo.categoria)} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">
              {formatVehiculoInterno(vehiculo)}
            </p>
            <p className="truncate text-xs text-slate-500">{getCategoriaLabel(vehiculo.categoria)}</p>
            {featured && (
              <Badge variant="info" className="mt-2">
                Mejor precio base
              </Badge>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase text-slate-500">Capacidad</p>
              <p className="text-sm font-semibold text-slate-900">{vehiculo.capacidad} pax</p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase text-slate-500">Tarifa/km</p>
              <p className="truncate text-sm font-semibold text-slate-700">
                {formatRatePerKm(getRateForVehiculo(vehiculo))}
              </p>
            </div>
            <div className="col-span-2 min-w-0 sm:col-span-1">
              <p className="text-[10px] font-bold uppercase text-slate-500">Cálculo base</p>
              <p className="break-words text-xs text-slate-500">
                {distance} km × {formatRatePerKm(getRateForVehiculo(vehiculo))} ={' '}
                {formatCurrency(price)}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3 border-t border-primary/10 pt-4">
            <div className="min-w-0 w-full">
              <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">
                Precio final {canEditPrice ? '(editable)' : '(solo admin)'}
              </p>
              {canEditPrice ? (
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={editedPrice}
                  onChange={(e) => onPriceChange(parseFloat(e.target.value) || 0)}
                  className="input-field text-lg font-bold text-brand"
                />
              ) : (
                <p className="text-2xl font-bold text-brand">{formatCurrency(editedPrice)}</p>
              )}
            </div>

            <div className="hidden flex-wrap gap-2 sm:flex">
              <Button size="sm" variant="secondary" onClick={onExportImage} loading={exporting}>
                <Image className="h-4 w-4" /> Imagen
              </Button>
              <Button size="sm" variant="secondary" onClick={onExportPdf} disabled={exporting}>
                <FileDown className="h-4 w-4" /> PDF
              </Button>
              <Button size="sm" variant="secondary" onClick={onPrint} disabled={exporting}>
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
              <Button size="sm" variant="secondary" onClick={onWhatsApp} disabled={exporting}>
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </Button>
              {canConfirm && (
                <Button size="sm" onClick={onConfirm}>
                  <CheckCircle2 className="h-4 w-4" /> Reservar
                </Button>
              )}
            </div>

            <div className="flex w-full min-w-0 gap-2 sm:hidden">
              {canConfirm && (
                <Button size="sm" className="min-w-0 flex-1" onClick={onConfirm}>
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> Reservar
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                className="min-w-0 flex-1"
                onClick={() => setSheetOpen(true)}
              >
                <MoreHorizontal className="h-4 w-4 shrink-0" /> Acciones
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={`Acciones · ${formatVehiculoInterno(vehiculo)}`}
        sheetSize="half"
        footer={
          <Button variant="secondary" className="w-full" onClick={() => setSheetOpen(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="space-y-2">
          <Button
            className="w-full"
            variant="secondary"
            loading={exporting}
            onClick={() => {
              onExportImage()
              setSheetOpen(false)
            }}
          >
            <Image className="h-4 w-4" /> Descargar imagen llamativa
          </Button>
          <Button
            className="w-full"
            variant="secondary"
            disabled={exporting}
            onClick={() => {
              onExportPdf()
              setSheetOpen(false)
            }}
          >
            <FileDown className="h-4 w-4" /> Exportar PDF / imprimir
          </Button>
          <Button
            className="w-full"
            variant="secondary"
            disabled={exporting}
            onClick={() => {
              onPrint()
              setSheetOpen(false)
            }}
          >
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
          <Button
            className="w-full"
            variant="secondary"
            disabled={exporting}
            onClick={() => {
              onWhatsApp()
              setSheetOpen(false)
            }}
          >
            <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
          </Button>
        </div>
      </Modal>
    </article>
  )
}
