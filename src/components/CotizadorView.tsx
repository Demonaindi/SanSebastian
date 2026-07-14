import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Calculator,
  CheckCircle2,
  Clock,
  FileDown,
  MapPin,
  MessageCircle,
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
  getCategoriaLabel,
  getRateForVehiculo,
} from '../lib/mappers'
import {
  buildWhatsAppUrl,
  exportQuotePdf,
  printQuote,
  type QuoteExportData,
} from '../lib/exportQuote'
import { getDrivingRouteDistance } from '../lib/routing'
import {
  calculateQuote,
  formatCurrency,
  formatRatePerKm,
  type QuoteResult,
} from '../lib/quote'
import { generarPresupuesto } from '../services/presupuestos'
import type { Vehiculo } from '../types/database'
import { ConfirmTripModal } from './modals/ConfirmTripModal'
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
  PageHeader,
  SkeletonCard,
  StatCard,
} from './ui'

export function CotizadorView() {
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
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({})
  const [formError, setFormError] = useState('')
  const [resultKey, setResultKey] = useState(0)
  const [calculating, setCalculating] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedOption, setSelectedOption] = useState<{ vehiculo: Vehiculo; price: number; base: number } | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [exportingId, setExportingId] = useState<string | null>(null)

  const tariffs = useMemo(() => buildTariffTable(vehiculos), [vehiculos])

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
    setFormError('')
    setSuccessMsg('')
    setCalculating(true)
    setQuote(null)
    setEditedPrices({})

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
      setQuote(result)
      const prices: Record<string, number> = {}
      for (const opt of result.options) prices[opt.vehiculo.id] = opt.price
      setEditedPrices(prices)
      setResultKey((k) => k + 1)
      if (!tripDateUntil && tripDate) setTripDateUntil(tripDate)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al calcular la ruta.')
    } finally {
      setCalculating(false)
    }
  }

  const getPrice = (vehiculoId: string, base: number) => editedPrices[vehiculoId] ?? base

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
      distancia_km: quote?.distance ?? 0,
      vehiculo_nombre: vehiculo.nombre,
      vehiculo_categoria: vehiculo.categoria,
      precio_total: precioTotal,
      paradas_intermedias: stops.trim() || null,
    })

    return {
      origen: quote?.originResolved ?? origin,
      destino: quote?.destinationResolved ?? destination,
      pasajeros: parseInt(passengers, 10),
      fecha: tripDate,
      hora: tripTime,
      distancia: quote?.distance ?? 0,
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
    mode: 'pdf' | 'print' | 'wa',
  ) => {
    setExportingId(vehiculo.id)
    try {
      const data = await buildExportPayload(vehiculo, basePrice)
      if (mode === 'pdf') exportQuotePdf(data)
      else if (mode === 'print') printQuote(data)
      else window.open(buildWhatsAppUrl(data), '_blank')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo generar el presupuesto')
    } finally {
      setExportingId(null)
    }
  }

  if (loading && vehiculos.length === 0) return <LoadingState message="Cargando flota..." />
  if (error) return <ErrorState message={error} onRetry={refreshVehiculos} />

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Cotizador Rápido"
        description="El precio se calcula por ruta lineal Origen → Destino. Las paradas intermedias se cargan como texto del itinerario y no suman kilómetros automáticamente."
      />

      {successMsg && (
        <Alert title="Reserva registrada" variant="info" icon={CheckCircle2}>
          {successMsg}
        </Alert>
      )}

      <TariffTable tariffs={tariffs} compact />

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <Card hover={false}>
            <CardHeader title="Datos del viaje" subtitle="Origen, destino y pasajeros obligatorios" />
            <CardBody className="space-y-5">
              <FormField label="Punto de partida">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
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
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-muted border border-primary/20">
                  <ArrowRight className="h-4 w-4 rotate-90 text-brand xl:rotate-0" />
                </div>
              </div>

              <FormField label="Punto de destino">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
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
                  className="input-field min-h-[80px]"
                  placeholder="Ej: Parada club / Predio hockey / Hotel. No suman km al cálculo."
                />
              </FormField>

              <FormField label="Cantidad de pasajeros">
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="number"
                    min={1}
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                    placeholder="Ej: 35"
                    className="input-field input-field-icon"
                  />
                </div>
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Fecha desde">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="date"
                      value={tripDate}
                      onChange={(e) => {
                        setTripDate(e.target.value)
                        if (!tripDateUntil || tripDateUntil < e.target.value) {
                          setTripDateUntil(e.target.value)
                        }
                      }}
                      className="input-field input-field-icon"
                    />
                  </div>
                </FormField>
                <FormField label="Fecha hasta">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="date"
                      value={tripDateUntil || tripDate}
                      min={tripDate || undefined}
                      onChange={(e) => setTripDateUntil(e.target.value)}
                      className="input-field input-field-icon"
                    />
                  </div>
                </FormField>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <FormField label="Hora salida">
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input type="time" value={tripTime} onChange={(e) => setTripTime(e.target.value)} className="input-field input-field-icon" />
                  </div>
                </FormField>
                <FormField label="Llegada (aprox.)">
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} className="input-field input-field-icon" />
                  </div>
                </FormField>
                <FormField label="Hora regreso">
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} className="input-field input-field-icon" />
                  </div>
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

        <div className="xl:col-span-3">
          {calculating && (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <p className="text-center text-xs text-slate-400">Calculando ruta origen → destino...</p>
            </div>
          )}

          {!calculating && !quote && (
            <Card hover={false} className="min-h-[320px]">
              <CardBody className="flex flex-col items-center justify-center text-center min-h-[280px] py-12">
                <Route className="h-12 w-12 text-brand mb-4" />
                <h3 className="text-lg font-semibold text-slate-900">Listo para cotizar</h3>
                <p className="mt-2 max-w-sm text-sm text-slate-500">
                  Completá el formulario. El administrador puede editar el total antes de emitir el presupuesto.
                </p>
              </CardBody>
            </Card>
          )}

          {!calculating && quote && (
            <div key={resultKey} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  label="Distancia lineal"
                  value={`${quote.distance} km`}
                  icon={Route}
                  tone="info"
                  trend={quote.durationMinutes ? `~${quote.durationMinutes} min` : 'Origen → Destino'}
                />
                <StatCard label="Opciones" value={String(quote.options.length)} icon={Sparkles} tone={quote.options.length > 0 ? 'success' : 'warning'} />
                <StatCard label="Combinaciones" value={String(quote.combinations.length)} icon={Users} tone={quote.combinations.length > 0 ? 'warning' : 'default'} />
              </div>

              {(quote.originResolved || quote.destinationResolved) && (
                <div className="card-elevated rounded-xl px-5 py-4 flex flex-wrap items-center gap-3">
                  <Badge variant="info">{quote.originResolved ?? origin}</Badge>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                  <Badge variant="info">{quote.destinationResolved ?? destination}</Badge>
                  <span className="text-xs text-slate-500 ml-auto">
                    {passengers} pax · {quote.distance} km
                  </span>
                </div>
              )}

              {stops.trim() && (
                <Alert title="Itinerario de paradas (sin km extra)" variant="info">
                  {stops}
                </Alert>
              )}

              {quote.options.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                    Vehículos recomendados
                  </h3>
                  {quote.options.map((opt, index) => (
                    <QuoteOptionCard
                      key={opt.vehiculo.id}
                      option={opt}
                      distance={quote.distance}
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
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                    Combinaciones sugeridas
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {quote.combinations.map((combo, index) => (
                      <article key={`${combo.label}-${index}`} className="card-elevated rounded-xl p-5 space-y-3">
                        <div className="flex justify-between gap-2">
                          <Badge variant="warning">Combinación</Badge>
                          <p className="text-xl font-bold text-warning">{formatCurrency(combo.price)}</p>
                        </div>
                        <p className="font-semibold text-slate-900">{combo.label}</p>
                        <p className="text-xs text-slate-500">
                          {combo.totalCapacity} pax · {quote.distance} km
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
            setSuccessMsg(`Reserva registrada: ${origin} → ${destination} con ${selectedOption.vehiculo.nombre}.`)
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
          distancia={quote.distance}
          precioTotal={selectedOption.price}
          precioBaseCalculado={selectedOption.base}
          paradasIntermedias={stops}
          vehiculo={selectedOption.vehiculo}
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
  onPrint: () => void
  onWhatsApp: () => void
}) {
  const { vehiculo, price } = option

  return (
    <article
      className="animate-result card-elevated rounded-xl overflow-hidden"
      style={{ animationDelay: `${index * 70}ms`, opacity: 0 }}
    >
      <div className="flex flex-col lg:flex-row">
        <div className="flex items-center gap-4 border-b lg:border-b-0 lg:border-r border-primary/10 p-5 lg:w-56 shrink-0">
          <VehicleIcon type={categoriaToVehicleType(vehiculo.categoria)} size="lg" />
          <div>
            <p className="font-semibold text-slate-900">{vehiculo.nombre}</p>
            <p className="text-xs text-slate-500">{getCategoriaLabel(vehiculo.categoria)}</p>
            {featured && (
              <Badge variant="info" className="mt-2">
                Mejor precio base
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500">Capacidad</p>
              <p className="text-sm font-semibold text-slate-900">{vehiculo.capacidad} pax</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500">Tarifa/km</p>
              <p className="text-sm font-semibold text-slate-700">
                {formatRatePerKm(getRateForVehiculo(vehiculo))}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-[10px] font-bold uppercase text-slate-500">Cálculo base</p>
              <p className="text-xs text-slate-500">
                {distance} km × {formatRatePerKm(getRateForVehiculo(vehiculo))} = {formatCurrency(price)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-primary/10 pt-4">
            <div className="min-w-[180px]">
              <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">
                Precio final {canEditPrice ? '(editable)' : '(solo admin)'}
              </p>
              {canEditPrice ? (
                <input
                  type="number"
                  min={0}
                  value={editedPrice}
                  onChange={(e) => onPriceChange(parseFloat(e.target.value) || 0)}
                  className="input-field font-bold text-lg text-brand"
                />
              ) : (
                <p className="text-2xl font-bold text-brand">{formatCurrency(editedPrice)}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={onExportPdf} loading={exporting}>
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
          </div>
        </div>
      </div>
    </article>
  )
}
