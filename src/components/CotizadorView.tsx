import { useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Calculator,
  Clock,
  MapPin,
  Route,
  Sparkles,
  Users,
} from 'lucide-react'
import { calculateQuote, formatCurrency, type QuoteResult } from '../lib/quote'
import { VehicleIcon } from './VehicleIcon'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  FormField,
  PageHeader,
  StatCard,
} from './ui'

export function CotizadorView() {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [passengers, setPassengers] = useState('')
  const [tripDate, setTripDate] = useState('')
  const [tripTime, setTripTime] = useState('')
  const [quote, setQuote] = useState<QuoteResult | null>(null)
  const [formError, setFormError] = useState('')
  const [resultKey, setResultKey] = useState(0)
  const [loading, setLoading] = useState(false)

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
    setLoading(true)
    setQuote(null)

    setTimeout(() => {
      setQuote(calculateQuote(origin, destination, pax))
      setResultKey((k) => k + 1)
      setLoading(false)
    }, 600)
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Cotizador Rápido"
        description="Ingresá los datos del viaje para obtener opciones de vehículos, precios estimados y combinaciones sugeridas en segundos."
      />

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <Card hover={false}>
            <CardHeader title="Datos del viaje" subtitle="Todos los campos son obligatorios" />
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
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-800 border border-white/10">
                  <ArrowRight className="h-4 w-4 rotate-90 text-slate-500 xl:rotate-0" />
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
                    <input
                      type="date"
                      value={tripDate}
                      onChange={(e) => setTripDate(e.target.value)}
                      className="input-field input-field-icon"
                    />
                  </div>
                </FormField>
                <FormField label="Hora">
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="time"
                      value={tripTime}
                      onChange={(e) => setTripTime(e.target.value)}
                      className="input-field input-field-icon"
                    />
                  </div>
                </FormField>
              </div>

              {tripDate && tripTime && (
                <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-xs text-blue-300">
                  Salida programada: <strong>{tripDate}</strong> a las <strong>{tripTime}</strong>
                </div>
              )}

              {formError && (
                <Alert title="Revisá los datos" variant="danger">
                  {formError}
                </Alert>
              )}

              <Button
                onClick={handleCalculate}
                loading={loading}
                size="lg"
                className="w-full"
              >
                <Calculator className="h-4 w-4" />
                Calcular Cotización
              </Button>
            </CardBody>
          </Card>
        </div>

        <div className="xl:col-span-3">
          {loading && (
            <Card hover={false} className="h-full min-h-[320px] flex items-center justify-center">
              <CardBody className="text-center space-y-4">
                <div className="mx-auto h-12 w-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <div>
                  <p className="font-semibold text-white">Calculando ruta y precios...</p>
                  <p className="text-sm text-slate-500 mt-1">Analizando flota disponible</p>
                </div>
              </CardBody>
            </Card>
          )}

          {!loading && !quote && (
            <Card hover={false} className="h-full min-h-[320px]">
              <CardBody className="flex flex-col items-center justify-center text-center h-full min-h-[280px] py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-800 border border-white/10 mb-5">
                  <Route className="h-8 w-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-semibold text-white">Listo para cotizar</h3>
                <p className="mt-2 max-w-sm text-sm text-slate-500">
                  Completá el formulario y presioná calcular para ver vehículos recomendados,
                  desglose de precios y combinaciones.
                </p>
              </CardBody>
            </Card>
          )}

          {!loading && quote && (
            <div key={resultKey} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  label="Distancia"
                  value={`${quote.distance} km`}
                  icon={Route}
                  tone="info"
                  trend="Estimación por ruta"
                />
                <StatCard
                  label="Opciones"
                  value={String(quote.options.length)}
                  icon={Sparkles}
                  tone={quote.options.length > 0 ? 'success' : 'warning'}
                  trend="Vehículos directos"
                />
                <StatCard
                  label="Combinaciones"
                  value={String(quote.combinations.length)}
                  icon={Users}
                  tone={quote.combinations.length > 0 ? 'warning' : 'default'}
                  trend="Si se requiere más capacidad"
                />
              </div>

              {origin && destination && (
                <div className="card-elevated rounded-xl px-5 py-4 flex flex-wrap items-center gap-3">
                  <Badge variant="info">{origin}</Badge>
                  <ArrowRight className="h-4 w-4 text-slate-600" />
                  <Badge variant="info">{destination}</Badge>
                  <span className="text-xs text-slate-500 ml-auto">
                    {passengers} pasajeros · {quote.distance} km
                  </span>
                </div>
              )}

              {quote.options.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                    Vehículos recomendados
                  </h3>
                  <div className="space-y-3">
                    {quote.options.map((opt, index) => (
                      <QuoteOptionCard
                        key={opt.vehicle.id}
                        option={opt}
                        distance={quote.distance}
                        index={index}
                        featured={index === 0}
                      />
                    ))}
                  </div>
                </div>
              )}

              {quote.options.length === 0 && quote.combinations.length > 0 && (
                <Alert
                  title="Se requiere combinación de vehículos"
                  variant="warning"
                  icon={AlertTriangle}
                >
                  Ningún vehículo individual cubre {passengers} pasajeros. Estas son las mejores
                  alternativas:
                </Alert>
              )}

              {quote.combinations.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                    Combinaciones sugeridas
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {quote.combinations.map((combo, index) => (
                      <CombinationCard
                        key={`${combo.label}-${index}`}
                        combo={combo}
                        distance={quote.distance}
                        index={quote.options.length + index}
                      />
                    ))}
                  </div>
                </div>
              )}

              {quote.options.length === 0 && quote.combinations.length === 0 && (
                <Alert title="Sin disponibilidad" variant="danger">
                  No hay vehículos disponibles que cubran la demanda. Revisá la flota o ajustá la
                  cantidad de pasajeros.
                </Alert>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function QuoteOptionCard({
  option,
  distance,
  index,
  featured,
}: {
  option: { vehicle: (typeof import('../data/vehicles').VEHICLES)[0]; price: number }
  distance: number
  index: number
  featured?: boolean
}) {
  const { vehicle, price } = option

  return (
    <article
      className="animate-result card-elevated rounded-xl overflow-hidden"
      style={{ animationDelay: `${index * 70}ms`, opacity: 0 }}
    >
      <div className="flex flex-col sm:flex-row">
        <div className="flex items-center gap-4 border-b sm:border-b-0 sm:border-r border-white/[0.06] p-5 sm:w-56 shrink-0">
          <VehicleIcon type={vehicle.type} size="lg" />
          <div>
            <p className="font-semibold text-white">{vehicle.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{vehicle.typeLabel}</p>
            <Badge variant="success" dot className="mt-2">
              Disponible
            </Badge>
          </div>
        </div>

        <div className="flex flex-1 flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Capacidad</p>
              <p className="text-sm font-semibold text-white mt-1">{vehicle.capacity} pax</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Costo/km</p>
              <p className="text-sm font-semibold text-slate-300 mt-1">
                {formatCurrency(vehicle.costPerKm)}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Cálculo</p>
              <p className="text-xs text-slate-500 mt-1">
                {distance} km × {formatCurrency(vehicle.costPerKm)}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0">
            {featured && (
              <Badge variant="info" className="mb-2">
                Mejor precio
              </Badge>
            )}
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(price)}</p>
            <p className="text-xs text-slate-500">Total estimado</p>
          </div>
        </div>
      </div>
    </article>
  )
}

function CombinationCard({
  combo,
  distance,
  index,
}: {
  combo: import('../lib/quote').CombinationOption
  distance: number
  index: number
}) {
  return (
    <article
      className="animate-result card-elevated rounded-xl p-5 space-y-4"
      style={{ animationDelay: `${index * 70}ms`, opacity: 0 }}
    >
      <div className="flex items-start justify-between gap-2">
        <Badge variant="warning">Combinación</Badge>
        <p className="text-xl font-bold text-amber-400">{formatCurrency(combo.price)}</p>
      </div>
      <p className="font-semibold text-white leading-snug">{combo.label}</p>
      <p className="text-xs text-slate-500">
        {combo.totalCapacity} pasajeros · {distance} km estimados
      </p>
      <div className="flex gap-2">
        {combo.vehicles.map((v, i) => (
          <VehicleIcon key={`${v.id}-${i}`} type={v.type} size="sm" />
        ))}
      </div>
    </article>
  )
}
