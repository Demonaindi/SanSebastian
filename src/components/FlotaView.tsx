import { useMemo, useState } from 'react'
import { AlertTriangle, Bus, Filter, Plus, Search, Shield, Truck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import {
  buildTariffTable,
  categoriaToVehicleType,
  getCategoriaLabel,
  getExpiryLevel,
  getRateForVehiculo,
} from '../lib/mappers'
import { formatRatePerKm } from '../lib/quote'
import { createVehiculo } from '../services/vehiculos'
import type { VehiculoCategoria } from '../types/database'
import { TariffTable } from './TariffTable'
import { VehicleIcon } from './VehicleIcon'
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
  StatCard,
} from './ui'

type FilterType = 'all' | VehiculoCategoria

const filters: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'Combi', label: 'Combis' },
  { id: 'Traffic', label: 'Traffic' },
  { id: '1 piso', label: '1 piso' },
  { id: '2 pisos', label: '2 pisos' },
]

export function FlotaView() {
  const { isAdmin } = useAuth()
  const { vehiculos, loading, error, refreshVehiculos } = useData()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    categoria: 'Combi' as VehiculoCategoria,
    capacidad: '',
    tarifa_km: '',
  })

  const tariffs = useMemo(() => buildTariffTable(vehiculos), [vehiculos])
  const disponibles = vehiculos.filter((v) => v.estado === 'Disponible').length
  const enViaje = vehiculos.filter((v) => v.estado === 'En viaje').length
  const utilization = vehiculos.length ? Math.round((enViaje / vehiculos.length) * 100) : 0

  const alertas = useMemo(() => {
    let vtvCritico = 0
    let seguroCritico = 0
    let vtvProximo = 0
    let seguroProximo = 0
    for (const v of vehiculos) {
      const vtv = getExpiryLevel(v.vtv_vencimiento)
      const seg = getExpiryLevel(v.seguro_vencimiento)
      if (vtv === 'danger') vtvCritico++
      else if (vtv === 'warning') vtvProximo++
      if (seg === 'danger') seguroCritico++
      else if (seg === 'warning') seguroProximo++
    }
    return { vtvCritico, seguroCritico, vtvProximo, seguroProximo }
  }, [vehiculos])

  const filtered = useMemo(() => {
    return vehiculos.filter((v) => {
      const matchesType = filter === 'all' || v.categoria === filter
      const q = search.toLowerCase()
      return (
        matchesType &&
        (!q || v.nombre.toLowerCase().includes(q) || getCategoriaLabel(v.categoria).toLowerCase().includes(q))
      )
    })
  }, [vehiculos, search, filter])

  const handleAdd = async () => {
    setSaving(true)
    try {
      await createVehiculo({
        nombre: form.nombre,
        categoria: form.categoria,
        capacidad: parseInt(form.capacidad, 10),
        tarifa_km: parseFloat(form.tarifa_km),
      })
      setShowAdd(false)
      setForm({ nombre: '', categoria: 'Combi', capacidad: '', tarifa_km: '' })
      await refreshVehiculos()
    } finally {
      setSaving(false)
    }
  }

  if (loading && vehiculos.length === 0) return <LoadingState message="Cargando flota..." />
  if (error) return <ErrorState message={error} onRetry={refreshVehiculos} />

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Gestión de Flota"
        description="Monitoreá el estado de cada unidad, capacidad, tarifas por kilómetro y alertas de vencimiento."
        action={
          isAdmin ? (
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" />
              Agregar vehículo
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total flota" value={String(vehiculos.length)} icon={Bus} />
        <StatCard
          label="Disponibles"
          value={String(disponibles)}
          icon={Truck}
          tone="success"
          trend={vehiculos.length ? `${Math.round((disponibles / vehiculos.length) * 100)}% operativos` : undefined}
        />
        <StatCard label="En viaje" value={String(enViaje)} icon={Bus} tone="danger" trend="Unidades asignadas" />
        <StatCard label="Utilización" value={`${utilization}%`} tone="info" trend="Flota en servicio" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AlertCard
          title="VTV vencida"
          count={alertas.vtvCritico}
          level="danger"
          icon={AlertTriangle}
        />
        <AlertCard title="VTV próxima" count={alertas.vtvProximo} level="warning" icon={AlertTriangle} />
        <AlertCard title="Seguro vencido" count={alertas.seguroCritico} level="danger" icon={Shield} />
        <AlertCard title="Seguro próximo" count={alertas.seguroProximo} level="warning" icon={Shield} />
      </div>

      <TariffTable tariffs={tariffs} />

      <Card hover={false}>
        <div className="flex flex-col gap-4 border-b border-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
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
                    : 'bg-surface-800 text-slate-600 hover:text-brand hover:bg-primary-muted'
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
              <tr className="border-b border-primary/10 text-left">
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Unidad</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden md:table-cell">Categoría</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Capacidad</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right hidden sm:table-cell">Tarifa/km</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center hidden lg:table-cell">VTV / Seguro</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-b border-primary/5 hover:bg-primary-muted/40 group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <VehicleIcon type={categoriaToVehicleType(v.categoria)} size="sm" />
                      <div>
                        <p className="font-semibold text-slate-900 group-hover:text-brand">{v.nombre}</p>
                        <p className="text-xs text-slate-500 md:hidden">{getCategoriaLabel(v.categoria)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600 hidden md:table-cell">{getCategoriaLabel(v.categoria)}</td>
                  <td className="px-5 py-4 text-right">
                    <span className="font-mono text-slate-900">{v.capacidad}</span>
                    <span className="text-slate-500 text-xs ml-1">pax</span>
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-slate-700 hidden sm:table-cell">
                    {formatRatePerKm(getRateForVehiculo(v))}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <div className="flex justify-center gap-2">
                      <ExpiryBadge label="VTV" date={v.vtv_vencimiento} />
                      <ExpiryBadge label="Seg." date={v.seguro_vencimiento} />
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <Badge variant={v.estado === 'Disponible' ? 'success' : 'danger'} dot>
                      {v.estado}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-slate-500">No se encontraron vehículos.</div>
          )}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((v) => (
          <Card key={v.id}>
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <VehicleIcon type={categoriaToVehicleType(v.categoria)} size="lg" />
                <Badge variant={v.estado === 'Disponible' ? 'success' : 'danger'} dot>
                  {v.estado}
                </Badge>
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">{v.nombre}</h3>
              <p className="text-xs text-slate-500">{getCategoriaLabel(v.categoria)} · {v.kilometraje.toLocaleString('es-AR')} km</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <ExpiryBadge label="VTV" date={v.vtv_vencimiento} />
                <ExpiryBadge label="Seguro" date={v.seguro_vencimiento} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-surface-950/80 p-3 border border-primary/10">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Capacidad</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{v.capacidad}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tarifa/km</p>
                  <p className="text-lg font-bold text-brand mt-1">{formatRatePerKm(getRateForVehiculo(v))}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Agregar vehículo"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleAdd} loading={saving}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Nombre">
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input-field" />
          </FormField>
          <FormField label="Categoría">
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as VehiculoCategoria })} className="input-field">
              <option value="Combi">Combi</option>
              <option value="Traffic">Traffic</option>
              <option value="1 piso">Colectivo 1 piso</option>
              <option value="2 pisos">Colectivo 2 pisos</option>
            </select>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Capacidad">
              <input type="number" value={form.capacidad} onChange={(e) => setForm({ ...form, capacidad: e.target.value })} className="input-field" />
            </FormField>
            <FormField label="Tarifa/km (ARS)">
              <input type="number" value={form.tarifa_km} onChange={(e) => setForm({ ...form, tarifa_km: e.target.value })} className="input-field" />
            </FormField>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function AlertCard({
  title,
  count,
  level,
  icon: Icon,
}: {
  title: string
  count: number
  level: 'ok' | 'warning' | 'danger'
  icon: typeof AlertTriangle
}) {
  const styles = {
    ok: 'border-emerald-200 bg-success-muted text-success',
    warning: 'border-amber-200 bg-warning-muted text-warning',
    danger: 'border-rose-200 bg-danger-muted text-danger',
  }
  const activeStyle = count > 0 ? styles[level] : styles.ok

  return (
    <div className={`rounded-xl border p-4 ${activeStyle}`}>
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 opacity-80" />
        <span className="text-2xl font-bold">{count}</span>
      </div>
      <p className="mt-2 text-sm font-semibold">{title}</p>
      <p className="text-xs opacity-75 mt-0.5">{count === 0 ? 'Sin alertas' : 'Requiere atención'}</p>
    </div>
  )
}

function ExpiryBadge({ label, date }: { label: string; date: string | null }) {
  const level = getExpiryLevel(date)
  const variant = level === 'danger' ? 'danger' : level === 'warning' ? 'warning' : 'success'
  const text = date
    ? `${label}: ${new Date(date + 'T00:00:00').toLocaleDateString('es-AR')}`
    : `${label}: —`

  return <Badge variant={variant}>{text}</Badge>
}
