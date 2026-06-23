import { useMemo } from 'react'
import { CalendarDays, User } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { formatCurrency } from '../lib/quote'
import { Badge, Card, CardBody, ErrorState, LoadingState, PageHeader } from './ui'

export function AgendaView() {
  const { viajes, loading, error, refreshViajes } = useData()

  const grouped = useMemo(() => {
    const map = new Map<string, typeof viajes>()
    for (const v of viajes) {
      const key = v.fecha_viaje ?? 'Sin fecha'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(v)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [viajes])

  if (loading && viajes.length === 0) return <LoadingState message="Cargando agenda..." />
  if (error) return <ErrorState message={error} onRetry={refreshViajes} />

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Agenda de viajes"
        description="Línea de tiempo de servicios programados con vehículo, chofer y estado de pago."
      />

      {viajes.length === 0 ? (
        <Card hover={false}>
          <CardBody className="py-16 text-center text-slate-500">
            No hay viajes registrados. Confirmá un servicio desde el Cotizador.
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-8">
          {grouped.map(([fecha, items]) => (
            <section key={fecha}>
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-brand" />
                <h3 className="text-lg font-bold text-brand">
                  {fecha === 'Sin fecha'
                    ? 'Sin fecha asignada'
                    : new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                </h3>
                <Badge variant="neutral">{items.length} viaje(s)</Badge>
              </div>

              <div className="relative space-y-3 border-l-2 border-primary/20 pl-6 ml-2">
                {items.map((viaje) => (
                  <article
                    key={viaje.id}
                    className="card-elevated relative rounded-xl p-5 before:absolute before:-left-[31px] before:top-6 before:h-3 before:w-3 before:rounded-full before:bg-primary before:ring-4 before:ring-primary-muted"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="font-bold text-slate-900">
                          {viaje.origen} → {viaje.destino}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          {viaje.pasajeros} pasajeros · {viaje.distancia_km} km
                          {viaje.hora_viaje ? ` · ${viaje.hora_viaje.slice(0, 5)} hs` : ''}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-surface-800 px-2 py-1">
                            🚌 {viaje.vehiculos?.nombre ?? '—'}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-surface-800 px-2 py-1">
                            <User className="h-3 w-3" /> {viaje.choferes?.nombre ?? '—'}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-surface-800 px-2 py-1">
                            {viaje.clientes?.nombre_razon_social ?? 'Cliente —'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-brand">{formatCurrency(Number(viaje.precio_total))}</p>
                        <Badge
                          variant={
                            viaje.estado_pago === 'Pagado'
                              ? 'success'
                              : viaje.estado_pago === 'Señado'
                                ? 'warning'
                                : 'neutral'
                          }
                          className="mt-2"
                        >
                          {viaje.estado_pago}
                        </Badge>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
