import { useMemo, useState } from 'react'
import { Bus, Filter, Plus, Search, Truck } from 'lucide-react'
import { VEHICLES, type VehicleType } from '../data/vehicles'
import { formatCurrency } from '../lib/quote'
import { VehicleIcon } from './VehicleIcon'
import { Badge, Button, Card, CardBody, PageHeader, StatCard } from './ui'

type FilterType = 'all' | VehicleType

const filters: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'combi', label: 'Combis' },
  { id: 'bus1', label: '1 piso' },
  { id: 'bus2', label: '2 pisos' },
]

export function FlotaView() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')

  const disponibles = VEHICLES.filter((v) => v.status === 'Disponible').length
  const enViaje = VEHICLES.filter((v) => v.status === 'En viaje').length
  const utilization = Math.round((enViaje / VEHICLES.length) * 100)

  const filtered = useMemo(() => {
    return VEHICLES.filter((v) => {
      const matchesType = filter === 'all' || v.type === filter
      const q = search.toLowerCase()
      const matchesSearch =
        !q ||
        v.name.toLowerCase().includes(q) ||
        v.typeLabel.toLowerCase().includes(q)
      return matchesType && matchesSearch
    })
  }, [search, filter])

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Gestión de Flota"
        description="Monitoreá el estado de cada unidad, capacidad, tarifas por kilómetro y disponibilidad en tiempo real."
        action={
          <Button>
            <Plus className="h-4 w-4" />
            Agregar vehículo
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total flota" value={String(VEHICLES.length)} icon={Bus} />
        <StatCard
          label="Disponibles"
          value={String(disponibles)}
          icon={Truck}
          tone="success"
          trend={`${Math.round((disponibles / VEHICLES.length) * 100)}% operativos`}
        />
        <StatCard
          label="En viaje"
          value={String(enViaje)}
          icon={Bus}
          tone="danger"
          trend="Unidades asignadas"
        />
        <StatCard
          label="Utilización"
          value={`${utilization}%`}
          tone="info"
          trend="Flota en servicio"
        />
      </div>

      <Card hover={false}>
        <div className="flex flex-col gap-4 border-b border-white/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o categoría..."
              className="input-field input-field-icon w-full"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500 hidden sm:block" />
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filter === f.id
                    ? 'bg-primary text-white'
                    : 'bg-surface-800 text-slate-400 hover:text-white hover:bg-surface-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left">
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Unidad
                </th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden md:table-cell">
                  Categoría
                </th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">
                  Capacidad
                </th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right hidden sm:table-cell">
                  Tarifa/km
                </th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02] group"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <VehicleIcon type={v.type} size="sm" />
                      <div>
                        <p className="font-semibold text-white group-hover:text-primary transition-colors">
                          {v.name}
                        </p>
                        <p className="text-xs text-slate-600 md:hidden">{v.typeLabel}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-400 hidden md:table-cell">{v.typeLabel}</td>
                  <td className="px-5 py-4 text-right">
                    <span className="font-mono text-white">{v.capacity}</span>
                    <span className="text-slate-600 text-xs ml-1">pax</span>
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-slate-300 hidden sm:table-cell">
                    {formatCurrency(v.costPerKm)}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <StatusBadge status={v.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-slate-500">
              No se encontraron vehículos con esos criterios.
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((v) => (
          <Card key={v.id}>
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <VehicleIcon type={v.type} size="lg" />
                <StatusBadge status={v.status} />
              </div>
              <h3 className="mt-4 text-base font-bold text-white">{v.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{v.typeLabel}</p>

              <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-surface-950/50 p-3 border border-white/[0.04]">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Capacidad
                  </p>
                  <p className="text-lg font-bold text-white mt-1">{v.capacity}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Tarifa/km
                  </p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">
                    {formatCurrency(v.costPerKm)}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>Ocupación estimada</span>
                  <span>{v.status === 'En viaje' ? '100%' : '0%'}</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      v.status === 'En viaje' ? 'bg-rose-500 w-full' : 'bg-emerald-500 w-0'
                    }`}
                  />
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'Disponible' | 'En viaje' }) {
  const isAvailable = status === 'Disponible'
  return (
    <Badge variant={isAvailable ? 'success' : 'danger'} dot>
      {status}
    </Badge>
  )
}
