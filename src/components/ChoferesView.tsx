import { useState } from 'react'
import { Pencil, Plus, Trash2, UserCog } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useToast } from '../contexts/ToastContext'
import { getExpiryLevel } from '../lib/mappers'
import { createChofer, deleteChofer, updateChofer, updateChoferEstado } from '../services/choferes'
import type { Chofer, ChoferEstado } from '../types/database'
import { Badge, Button, Card, CardBody, ErrorState, FormField, LoadingState, Modal, PageHeader } from './ui'

const ESTADOS: ChoferEstado[] = ['Disponible', 'En viaje', 'Franco', 'Licencia']

const EMPTY_FORM = {
  nombre: '',
  dni: '',
  carnet_conducir_vencimiento: '',
  libreta_trabajo_vencimiento: '',
}

export function ChoferesView() {
  const { isAdmin } = useAuth()
  const { toast } = useToast()
  const { choferes, loading, error, refreshChoferes } = useData()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Chofer | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (c: Chofer) => {
    setEditing(c)
    setForm({
      nombre: c.nombre,
      dni: c.dni ?? '',
      carnet_conducir_vencimiento: c.carnet_conducir_vencimiento ?? '',
      libreta_trabajo_vencimiento: c.libreta_trabajo_vencimiento ?? '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.nombre.trim()) return
    setSaving(true)
    try {
      const payload = {
        nombre: form.nombre.trim(),
        dni: form.dni.trim() || null,
        carnet_conducir_vencimiento: form.carnet_conducir_vencimiento || null,
        libreta_trabajo_vencimiento: form.libreta_trabajo_vencimiento || null,
      }
      if (editing) {
        await updateChofer(editing.id, payload)
        toast({ title: 'Chofer actualizado', tone: 'success' })
      } else {
        await createChofer(payload)
        toast({ title: 'Chofer agregado', tone: 'success' })
      }
      setShowForm(false)
      setEditing(null)
      setForm(EMPTY_FORM)
      await refreshChoferes()
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

  const handleEstado = async (id: string, estado: ChoferEstado) => {
    try {
      await updateChoferEstado(id, estado)
      await refreshChoferes()
      toast({ title: `Estado: ${estado}`, tone: 'success' })
    } catch (err) {
      toast({
        title: 'No se pudo actualizar',
        message: err instanceof Error ? err.message : undefined,
        tone: 'danger',
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!isAdmin) return
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      return
    }
    try {
      await deleteChofer(id)
      setConfirmDeleteId(null)
      await refreshChoferes()
      toast({ title: 'Chofer eliminado', tone: 'info' })
    } catch (err) {
      toast({
        title: 'No se pudo eliminar',
        message: err instanceof Error ? err.message : undefined,
        tone: 'danger',
      })
    }
  }

  if (loading && choferes.length === 0) return <LoadingState message="Cargando choferes..." />
  if (error) return <ErrorState message={error} onRetry={refreshChoferes} />

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Gestión de choferes"
        description="Nombre y apellido, DNI y vencimientos de carnet y libreta de trabajo."
        action={
          isAdmin ? (
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Agregar chofer
            </Button>
          ) : undefined
        }
      />

      {choferes.length === 0 ? (
        <Card hover={false}>
          <CardBody className="py-12 text-center text-sm text-slate-500">
            Todavía no hay choferes cargados.
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {choferes.map((c) => (
            <Card key={c.id}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-muted text-brand">
                    <UserCog className="h-6 w-6" />
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className={`rounded-lg p-2 ${
                          confirmDeleteId === c.id
                            ? 'bg-danger-muted text-danger'
                            : 'text-slate-400 hover:bg-danger-muted hover:text-danger'
                        }`}
                        title={confirmDeleteId === c.id ? 'Tocá de nuevo para confirmar' : 'Eliminar'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">{c.nombre}</h3>
                <p className="text-xs text-slate-500">DNI {c.dni?.trim() || '—'}</p>
                {confirmDeleteId === c.id && (
                  <p className="mt-2 text-xs text-rose-600">Tocá el ícono otra vez para confirmar.</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <ExpiryBadge label="Carnet" date={c.carnet_conducir_vencimiento} />
                  <ExpiryBadge label="Libreta" date={c.libreta_trabajo_vencimiento} />
                </div>
                <div className="mt-4">
                  <Badge
                    variant={
                      c.estado === 'Disponible'
                        ? 'success'
                        : c.estado === 'En viaje'
                          ? 'danger'
                          : 'warning'
                    }
                    dot
                  >
                    {c.estado}
                  </Badge>
                </div>
                <select
                  value={c.estado}
                  onChange={(e) => handleEstado(c.id, e.target.value as ChoferEstado)}
                  className="input-field mt-4 text-sm"
                  disabled={!isAdmin}
                >
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false)
          setEditing(null)
        }}
        title={editing ? 'Editar chofer' : 'Nuevo chofer'}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowForm(false)
                setEditing(null)
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Nombre y apellido">
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="input-field"
            />
          </FormField>
          <FormField label="DNI">
            <input
              value={form.dni}
              onChange={(e) => setForm({ ...form, dni: e.target.value })}
              className="input-field"
              inputMode="numeric"
            />
          </FormField>
          <FormField label="Venc. carnet de conducir">
            <input
              type="date"
              value={form.carnet_conducir_vencimiento}
              onChange={(e) => setForm({ ...form, carnet_conducir_vencimiento: e.target.value })}
              className="input-field"
            />
          </FormField>
          <FormField label="Venc. libreta de trabajo">
            <input
              type="date"
              value={form.libreta_trabajo_vencimiento}
              onChange={(e) => setForm({ ...form, libreta_trabajo_vencimiento: e.target.value })}
              className="input-field"
            />
          </FormField>
        </div>
      </Modal>
    </div>
  )
}

function ExpiryBadge({ label, date }: { label: string; date: string | null }) {
  const level = getExpiryLevel(date)
  const variant = level === 'danger' ? 'danger' : level === 'warning' ? 'warning' : 'success'
  const text = date
    ? `${label}: ${new Date(date + 'T00:00:00').toLocaleDateString('es-AR')}`
    : `${label}: —`

  return <Badge variant={date ? variant : 'neutral'}>{text}</Badge>
}
