import { useMemo, useState } from 'react'
import { Pencil, Phone, Plus, Search, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useToast } from '../contexts/ToastContext'
import { createCliente, updateCliente } from '../services/clientes'
import type { Cliente } from '../types/database'
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

const emptyForm = {
  nombre_razon_social: '',
  telefono: '',
  cuil_cuit_dni: '',
  email: '',
}

export function ClientesView() {
  const { isAdmin } = useAuth()
  const { toast } = useToast()
  const { clientes, loading, error, refreshClientes } = useData()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clientes
    return clientes.filter(
      (c) =>
        c.nombre_razon_social.toLowerCase().includes(q) ||
        (c.telefono ?? '').toLowerCase().includes(q) ||
        (c.cuil_cuit_dni ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q),
    )
  }, [clientes, query])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setOpen(true)
  }

  const openEdit = (cliente: Cliente) => {
    setEditing(cliente)
    setForm({
      nombre_razon_social: cliente.nombre_razon_social,
      telefono: cliente.telefono ?? '',
      cuil_cuit_dni: cliente.cuil_cuit_dni ?? '',
      email: cliente.email ?? '',
    })
    setFormError('')
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.nombre_razon_social.trim() || !form.telefono.trim()) {
      setFormError('Nombre y teléfono son obligatorios. CUIT/DNI es opcional.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        nombre_razon_social: form.nombre_razon_social.trim(),
        telefono: form.telefono.trim(),
        cuil_cuit_dni: form.cuil_cuit_dni || undefined,
        email: form.email || undefined,
      }
      if (editing) await updateCliente(editing.id, payload)
      else await createCliente(payload)
      setOpen(false)
      await refreshClientes()
      toast({ title: editing ? 'Cliente actualizado' : 'Cliente creado', tone: 'success' })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) {
    return (
      <Card hover={false}>
        <CardBody className="py-16 text-center text-slate-500">
          El módulo de clientes está disponible solo para administradores.
        </CardBody>
      </Card>
    )
  }

  if (loading && clientes.length === 0) return <LoadingState message="Cargando clientes..." />
  if (error) return <ErrorState message={error} onRetry={refreshClientes} />

  return (
    <div className="space-y-6 animate-fade-in md:space-y-8">
      <PageHeader
        title="Clientes"
        description="Nombre y teléfono obligatorios. Siempre editables."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Nuevo
          </Button>
        }
      />

      <StatCard label="Clientes activos" value={String(clientes.length)} icon={Users} tone="info" />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, teléfono o CUIT..."
          className="input-field input-field-icon"
        />
      </div>

      <div className="space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <Card hover={false}>
            <CardBody className="py-10 text-center text-sm text-slate-500">
              {query.trim() ? 'Sin resultados para esa búsqueda.' : 'Todavía no hay clientes.'}
            </CardBody>
          </Card>
        ) : (
          filtered.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => openEdit(c)}
            className="tap-press card-premium flex w-full items-center gap-3 p-4 text-left"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-200 text-sm font-bold text-amber-800">
              {c.nombre_razon_social.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-slate-900">{c.nombre_razon_social}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                <Phone className="h-3 w-3" strokeWidth={1.75} />
                {c.telefono}
              </p>
              <div className="mt-2">
                {c.cuil_cuit_dni ? (
                  <Badge variant="neutral">{c.cuil_cuit_dni}</Badge>
                ) : (
                  <Badge variant="info">Sin CUIT</Badge>
                )}
              </div>
            </div>
            <Pencil className="h-4 w-4 shrink-0 text-slate-300" strokeWidth={1.75} />
          </button>
          ))
        )}
      </div>

      <Card hover={false} className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary/10 text-left">
                <th className="px-5 py-3 text-[10px] font-bold uppercase text-slate-500">Nombre</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase text-slate-500">Teléfono</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase text-slate-500">CUIT / DNI</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase text-slate-500">Email</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase text-slate-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                    {query.trim() ? 'Sin resultados para esa búsqueda.' : 'Todavía no hay clientes.'}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                <tr key={c.id} className="border-b border-primary/5 hover:bg-primary-muted/30">
                  <td className="px-5 py-4 font-semibold text-slate-900">{c.nombre_razon_social}</td>
                  <td className="px-5 py-4 text-slate-700">{c.telefono}</td>
                  <td className="px-5 py-4 text-slate-500">
                    {c.cuil_cuit_dni || <Badge variant="neutral">Sin CUIT</Badge>}
                  </td>
                  <td className="px-5 py-4 text-slate-500">{c.email || '—'}</td>
                  <td className="px-5 py-4 text-right">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Editar
                    </Button>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar cliente' : 'Nuevo cliente'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Nombre / Razón social *">
            <input
              value={form.nombre_razon_social}
              onChange={(e) => setForm({ ...form, nombre_razon_social: e.target.value })}
              className="input-field"
            />
          </FormField>
          <FormField label="Teléfono *">
            <input
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="input-field"
            />
          </FormField>
          <FormField label="CUIT / DNI (opcional)">
            <input
              value={form.cuil_cuit_dni}
              onChange={(e) => setForm({ ...form, cuil_cuit_dni: e.target.value })}
              className="input-field"
            />
          </FormField>
          <FormField label="Email (opcional)">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
            />
          </FormField>
          {formError && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p>}
        </div>
      </Modal>
    </div>
  )
}
