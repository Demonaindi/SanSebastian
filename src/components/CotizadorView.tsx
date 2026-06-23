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
import { useData } from '../contexts/DataContext'
import { buildTariffTable, categoriaToVehicleType, getCategoriaLabel, getRateForVehiculo } from '../lib/mappers'
import {
  buildWhatsAppUrl,
  exportQuotePdf,
  printQuote,
  type QuoteExportData,
} from '../lib/exportQuote'
import {
  calculateQuote,
  formatCurrency,
  formatRatePerKm,
  type QuoteResult,
} from '../lib/quote'
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
  StatCard,
} from './ui'

export function CotizadorView() {
  const { vehiculos, loading, error, refreshVehiculos } = useData()
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [passengers, setPassengers] = useState('')
  const [tripDate, setTripDate] = useState('')
  const [tripTime, setTripTime] = useState('')
  const [quote, setQuote] = useState<QuoteResult | null>(null)
  const [formError, setFormError] = useState('')
  const [resultKey, setResultKey] = useState(0)
  const [calculating, setCalculating] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedOption, setSelectedOption] = useState<{ vehiculo: Vehiculo; price: number } | null>(
    null,
  )
  const [successMsg, setSuccessMsg] = useState('')

  const tariffs = useMemo(() => buildTariffTable(vehiculos), [vehiculos])

  const handleCalculate = () => {
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

    setTimeout(() => {
      setQuote(calculateQuote(origin, destination, pax, vehiculos))
      setResultKey((k) => k + 1)
      setCalculating(false)
    }, 400)
  }

  const openConfirm = (option: { vehiculo: Vehiculo; price: number }) => {
    setSelectedOption(option)
    setConfirmOpen(true)
  }

  const getExportData = (vehiculo: Vehiculo, price: number): QuoteExportData => ({
    origen: origin,
    destino: destination,
    pasajeros: parseInt(passengers, 10),
    fecha: tripDate,
    hora: tripTime,
    distancia: quote?.distance ?? 0,
    vehiculo,
    precioTotal: price,
  })

  if (loading && vehiculos.length === 0) return <LoadingState message="Cargando flota..." />
  if (error) return <ErrorState message={error} onRetry={refreshVehiculos} />

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Cotizador Rápido"
        description="Cotizá viajes, exportá presupuestos y confirmá servicios reales en la base de datos."
      />

      {successMsg && (
        <Alert title="Viaje confirmado" variant="info" icon={CheckCircle2}>
          {successMsg}
        </Alert>
      )}

      <TariffTable tariffs={tariffs} compact />

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <Card hover={false}>
            <CardHeader title="Datos del viaje" subtitle="Origen, destino y pasajeros son obligatorios" />
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
                <FormField label="Fecha">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input type="date" value={tripDate} onChange={(e) => setTripDate(e.target.value)} className="input-field input-field-icon" />
                  </div>
                </FormField>
                <FormField label="Hora">
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input type="time" value={tripTime} onChange={(e) => setTripTime(e.target.value)} className="input-field input-field-icon" />
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
            <Card hover={false} className="min-h-[320px] flex items-center justify-center">
              <CardBody className="text-center">
                <div className="mx-auto h-12 w-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <p className="mt-4 font-semibold text-slate-900">Calculando ruta y precios...</p>
              </CardBody>
            </Card>
          )}

          {!calculating && !quote && (
            <Card hover={false} className="min-h-[320px]">
              <CardBody className="flex flex-col items-center justify-center text-center min-h-[280px] py-12">
                <Route className="h-12 w-12 text-brand mb-4" />
                <h3 className="text-lg font-semibold text-slate-900">Listo para cotizar</h3>
                <p className="mt-2 max-w-sm text-sm text-slate-500">
                  Completá el formulario para ver opciones, exportar presupuesto o confirmar un viaje real.
                </p>
              </CardBody>
            </Card>
          )}

          {!calculating && quote && (
            <div key={resultKey} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Distancia" value={`${quote.distance} km`} icon={Route} tone="info" trend="Estimación por ruta" />
                <StatCard label="Opciones" value={String(quote.options.length)} icon={Sparkles} tone={quote.options.length > 0 ? 'success' : 'warning'} trend="Vehículos directos" />
                <StatCard label="Combinaciones" value={String(quote.combinations.length)} icon={Users} tone={quote.combinations.length > 0 ? 'warning' : 'default'} trend="Mayor capacidad" />
              </div>

              {quote.options.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Vehículos recomendados</h3>
                  {quote.options.map((opt, index) => (
                    <QuoteOptionCard
                      key={opt.vehiculo.id}
                      option={opt}
                      distance={quote.distance}
                      index={index}
                      featured={index === 0}
                      onConfirm={() => openConfirm(opt)}
                      onExportPdf={() => exportQuotePdf(getExportData(opt.vehiculo, opt.price))}
                      onPrint={() => printQuote(getExportData(opt.vehiculo, opt.price))}
                      onWhatsApp={() => window.open(buildWhatsAppUrl(getExportData(opt.vehiculo, opt.price)), '_blank')}
                    />
                  ))}
                </div>
              )}

              {quote.options.length === 0 && quote.combinations.length > 0 && (
                <Alert title="Se requiere combinación" variant="warning" icon={AlertTriangle}>
                  Ningún vehículo individual cubre {passengers} pasajeros. Confirmá cada unidad por separado.
                </Alert>
              )}

              {quote.combinations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Combinaciones sugeridas</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {quote.combinations.map((combo, index) => (
                      <article key={`${combo.label}-${index}`} className="card-elevated rounded-xl p-5 space-y-3">
                        <div className="flex justify-between gap-2">
                          <Badge variant="warning">Combinación</Badge>
                          <p className="text-xl font-bold text-warning">{formatCurrency(combo.price)}</p>
                        </div>
                        <p className="font-semibold text-slate-900">{combo.label}</p>
                        <p className="text-xs text-slate-500">{combo.totalCapacity} pax · {quote.distance} km</p>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {quote.options.length === 0 && quote.combinations.length === 0 && (
                <Alert title="Sin disponibilidad" variant="danger">
                  No hay vehículos disponibles. Revisá la flota o ajustá los pasajeros.
                </Alert>
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
            setSuccessMsg(`Viaje registrado: ${origin} → ${destination} con ${selectedOption.vehiculo.nombre}.`)
            setConfirmOpen(false)
          }}
          origen={origin}
          destino={destination}
          pasajeros={parseInt(passengers, 10)}
          fechaViaje={tripDate}
          horaViaje={tripTime}
          distancia={quote.distance}
          precioTotal={selectedOption.price}
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
  onConfirm,
  onExportPdf,
  onPrint,
  onWhatsApp,
}: {
  option: { vehiculo: Vehiculo; price: number }
  distance: number
  index: number
  featured?: boolean
  onConfirm: () => void
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
                Mejor precio
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
              <p className="text-sm font-semibold text-slate-700">{formatRatePerKm(getRateForVehiculo(vehiculo))}</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-[10px] font-bold uppercase text-slate-500">Cálculo</p>
              <p className="text-xs text-slate-500">{distance} km × {formatRatePerKm(getRateForVehiculo(vehiculo))}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-primary/10 pt-4">
            <div>
              <p className="text-2xl font-bold text-brand">{formatCurrency(price)}</p>
              <p className="text-xs text-slate-500">Total estimado</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={onExportPdf}>
                <FileDown className="h-4 w-4" /> PDF
              </Button>
              <Button size="sm" variant="secondary" onClick={onPrint}>
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
              <Button size="sm" variant="secondary" onClick={onWhatsApp}>
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </Button>
              <Button size="sm" onClick={onConfirm}>
                <CheckCircle2 className="h-4 w-4" /> Confirmar viaje
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
