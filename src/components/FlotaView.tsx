import { useMemo, useState } from 'react'
import { AlertTriangle, Bus, Flame, Plus, Search, Shield, Truck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useToast } from '../contexts/ToastContext'
import {
  categoriaToVehicleType,
  formatVehiculoInterno,
  getCategoriaLabel,
  getExpiryLevel,
  VEHICLE_COLOR_PRESETS,
} from '../lib/mappers'
import { createVehiculo, updateVehiculo } from '../services/vehiculos'
import type { Vehiculo, VehiculoCategoria } from '../types/database'
import { VehicleIcon } from './VehicleIcon'
import {
  Badge,
  Button,
  Card,
  ErrorState,
  FilterPills,
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

const emptyForm = {
  numero_interno: '',
  categoria: 'Combi' as VehiculoCategoria,
  capacidad: '',
  color: '#3b82f6',
  vtv_vencimiento: '',
  seguro_vencimiento: '',
  matafuegos_vencimiento: '',
}

const visualByType: Record<string, string> = {
  combi: 'vehicle-visual-combi',
  traffic: 'vehicle-visual-traffic',
  bus1: 'vehicle-visual-bus1',
  bus2: 'vehicle-visual-bus2',
}

export function FlotaView() {
  const { isAdmin } = useAuth()
  const { toast } = useToast()
  const { vehiculos, loading, error, refreshVehiculos } = useData()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Vehiculo | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const disponibles = vehiculos.filter((v) => v.estado === 'Disponible').length
  const enViaje = vehiculos.filter((v) => v.estado === 'En viaje').length
  const utilization = vehiculos.length ? Math.round((enViaje / vehiculos.length) * 100) : 0

  const alertas = useMemo(() => {
    let critico = 0
    let alerta = 0
    for (const v of vehiculos) {
      const levels = [
        getExpiryLevel(v.vtv_vencimiento),
        getExpiryLevel(v.seguro_vencimiento),
        getExpiryLevel(v.matafuegos_vencimiento),
      ]
      if (levels.includes('danger')) critico++
      else if (levels.includes('warning')) alerta++
    }
    return { critico, alerta }
  }, [vehiculos])

  const filtered = useMemo(() => {
    return vehiculos.filter((v) => {
      const matchesType = filter === 'all' || v.categoria === filter
      const q = search.toLowerCase()
      return (
        matchesType &&
        (!q ||
          (v.numero_interno ?? '').toLowerCase().includes(q) ||
          getCategoriaLabel(v.categoria).toLowerCase().includes(q))
      )
    })
  }, [vehiculos, search, filter])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowAdd(true)
  }

  const openEdit = (v: Vehiculo) => {
    if (!isAdmin) return
    setEditing(v)
    setForm({
      numero_interno: v.numero_interno ?? '',
      categoria: v.categoria,
      capacidad: String(v.capacidad),
      color: v.color || '#3b82f6',
      vtv_vencimiento: v.vtv_vencimiento ?? '',
      seguro_vencimiento: v.seguro_vencimiento ?? '',
      matafuegos_vencimiento: v.matafuegos_vencimiento ?? '',
    })
    setShowAdd(true)
  }

  const handleSave = async () => {
    const interno = form.numero_interno.trim()
    if (!interno) {
      toast({ title: 'El Nº interno es obligatorio', tone: 'danger' })
      return
    }
    const capacidad = parseInt(form.capacidad, 10)
    if (!capacidad || capacidad < 1) {
      toast({ title: 'Ingresá una capacidad válida', tone: 'danger' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        numero_interno: interno,
        nombre: `Unidad ${interno}`,
        categoria: form.categoria,
        capacidad,
        tarifa_km: 0,
        color: form.color,
        vtv_vencimiento: form.vtv_vencimiento || null,
        seguro_vencimiento: form.seguro_vencimiento || null,
        matafuegos_vencimiento: form.matafuegos_vencimiento || null,
      }
      if (editing) await updateVehiculo(editing.id, payload)
      else await createVehiculo(payload)
      setShowAdd(false)
      setEditing(null)
      setForm(emptyForm)
      await refreshVehiculos()
      toast({ title: editing ? 'Unidad actualizada' : 'Unidad creada', tone: 'success' })
    } catch (err) {
      toast({
        title: 'No se pudo guardar',
        message: err instanceof Error ? err.message : undefined,
        tone: 'danger',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading && vehiculos.length === 0) return <LoadingState message="Cargando flota..." />
  if (error) return <ErrorState message={error} onRetry={refreshVehiculos} />

  return (
    <div className="space-y-6 animate-fade-in md:space-y-8">
      <PageHeader
        title="Gestión de Flota"
        description="Identificá cada unidad por Nº interno. Alertas: ≤15 días amarillo · ≤7 días o vencido rojo."
        action={
          isAdmin ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Agregar
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total flota" value={String(vehiculos.length)} icon={Bus} />
        <StatCard label="Disponibles" value={String(disponibles)} icon={Truck} tone="success" />
        <StatCard label="Alertas" value={String(alertas.alerta)} tone="warning" icon={AlertTriangle} />
        <StatCard label="Críticos" value={String(alertas.critico)} tone="danger" icon={Shield} trend={`${utilization}% en servicio`} />
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por Nº interno..."
            className="input-field input-field-icon"
          />
        </div>
        <FilterPills
          options={filters.map((f) => ({ id: f.id, label: f.label }))}
          value={filter}
          onChange={(id) => setFilter(id as FilterType)}
        />
      </div>

      <div className="space-y-3 md:hidden">
        {filtered.map((v) => {
          const type = categoriaToVehicleType(v.categoria)
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => openEdit(v)}
              className="tap-press card-premium flex w-full gap-3 overflow-hidden p-2.5 text-left"
            >
              <div className={`relative flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl ${visualByType[type]}`}>
                <span
                  className="absolute left-2 top-2 h-2.5 w-2.5 rounded-full ring-2 ring-white"
                  style={{ backgroundColor: v.color || '#3b82f6' }}
                />
                <VehicleIcon type={type} size="lg" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col py-1 pr-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold text-slate-900">
                      {formatVehiculoInterno(v)}
                    </p>
                    <p className="text-xs text-slate-500">{getCategoriaLabel(v.categoria)}</p>
                  </div>
                  <Badge variant={v.estado === 'Disponible' ? 'success' : 'danger'} dot>
                    {v.estado}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {v.capacidad} pax · {v.kilometraje.toLocaleString('es-AR')} km
                </p>
                <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                  <div className="flex flex-wrap gap-1">
                    <ExpiryBadge label="VTV" date={v.vtv_vencimiento} compact />
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <Card hover={false} className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary/10 text-left">
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Nº interno</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Categoría</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Capacidad</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Docs</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr
                  key={v.id}
                  className={`border-b border-primary/5 hover:bg-primary-muted/40 ${isAdmin ? 'cursor-pointer' : ''}`}
                  onClick={() => openEdit(v)}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: v.color || '#3b82f6' }} />
                      <VehicleIcon type={categoriaToVehicleType(v.categoria)} size="sm" />
                      <p className="font-semibold text-slate-900">{formatVehiculoInterno(v)}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{getCategoriaLabel(v.categoria)}</td>
                  <td className="px-5 py-4 text-right font-mono">{v.capacidad}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-center flex-wrap gap-2">
                      <ExpiryBadge label="VTV" date={v.vtv_vencimiento} />
                      <ExpiryBadge label="Seg." date={v.seguro_vencimiento} />
                      <ExpiryBadge label="Mat." date={v.matafuegos_vencimiento} />
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
        </div>
      </Card>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title={editing ? 'Editar unidad' : 'Agregar unidad'}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Nº interno">
            <input
              value={form.numero_interno}
              onChange={(e) => setForm({ ...form, numero_interno: e.target.value })}
              className="input-field"
              placeholder="Ej: 101"
              required
            />
          </FormField>
          <FormField label="Categoría">
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as VehiculoCategoria })} className="input-field">
              <option value="Combi">Combi</option>
              <option value="Traffic">Traffic</option>
              <option value="1 piso">Colectivo 1 piso</option>
              <option value="2 pisos">Colectivo 2 pisos</option>
            </select>
          </FormField>
          <FormField label="Capacidad">
            <input type="number" value={form.capacidad} onChange={(e) => setForm({ ...form, capacidad: e.target.value })} className="input-field" />
          </FormField>
          <FormField label="Color fijo">
            <div className="flex flex-wrap items-center gap-2">
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-14 cursor-pointer rounded-xl border border-slate-200" />
              {VEHICLE_COLOR_PRESETS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} className={`h-7 w-7 rounded-full ring-2 ${form.color === c ? 'ring-brand' : 'ring-transparent'}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="VTV">
              <input type="date" value={form.vtv_vencimiento} onChange={(e) => setForm({ ...form, vtv_vencimiento: e.target.value })} className="input-field" />
            </FormField>
            <FormField label="Seguro">
              <input type="date" value={form.seguro_vencimiento} onChange={(e) => setForm({ ...form, seguro_vencimiento: e.target.value })} className="input-field" />
            </FormField>
            <FormField label="Matafuegos">
              <input type="date" value={form.matafuegos_vencimiento} onChange={(e) => setForm({ ...form, matafuegos_vencimiento: e.target.value })} className="input-field" />
            </FormField>
          </div>
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Flame className="h-3.5 w-3.5" strokeWidth={1.75} />
            Docs vencidos no bloquean reserva futura.
          </p>
        </div>
      </Modal>
    </div>
  )
}

function ExpiryBadge({
  label,
  date,
  compact,
}: {
  label: string
  date: string | null
  compact?: boolean
}) {
  const level = getExpiryLevel(date)
  const variant = level === 'danger' ? 'danger' : level === 'warning' ? 'warning' : 'success'
  const text = date
    ? compact
      ? label
      : `${label}: ${new Date(date + 'T00:00:00').toLocaleDateString('es-AR')}`
    : `${label}: —`

  return <Badge variant={variant}>{text}</Badge>
}
