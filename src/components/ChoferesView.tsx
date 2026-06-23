import { useState } from 'react'
import { Plus, Trash2, UserCog } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { createChofer, deleteChofer, updateChoferEstado } from '../services/choferes'
import type { ChoferEstado } from '../types/database'
import { Badge, Button, Card, CardBody, ErrorState, FormField, LoadingState, Modal, PageHeader } from './ui'

const ESTADOS: ChoferEstado[] = ['Disponible', 'En viaje', 'Franco', 'Licencia']

export function ChoferesView() {
  const { isAdmin } = useAuth()
  const { choferes, loading, error, refreshChoferes } = useData()
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nombre: '', licencia_categoria: 'D1' })

  const handleAdd = async () => {
    if (!form.nombre.trim()) return
    setSaving(true)
    try {
      await createChofer(form)
      setShowAdd(false)
      setForm({ nombre: '', licencia_categoria: 'D1' })
      await refreshChoferes()
    } finally {
      setSaving(false)
    }
  }

  const handleEstado = async (id: string, estado: ChoferEstado) => {
    await updateChoferEstado(id, estado)
    await refreshChoferes()
  }

  const handleDelete = async (id: string) => {
    if (!isAdmin) return
    await deleteChofer(id)
    await refreshChoferes()
  }

  if (loading && choferes.length === 0) return <LoadingState message="Cargando choferes..." />
  if (error) return <ErrorState message={error} onRetry={refreshChoferes} />

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Gestión de choferes"
        description="Administrá el personal de conducción, licencias y disponibilidad operativa."
        action={
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" />
            Agregar chofer
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {choferes.map((c) => (
          <Card key={c.id}>
            <CardBody>
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-muted text-brand">
                  <UserCog className="h-6 w-6" />
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-danger-muted hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">{c.nombre}</h3>
              <p className="text-xs text-slate-500">Licencia {c.licencia_categoria}</p>
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

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Nuevo chofer"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleAdd} loading={saving}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Nombre completo">
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input-field" />
          </FormField>
          <FormField label="Categoría de licencia">
            <input value={form.licencia_categoria} onChange={(e) => setForm({ ...form, licencia_categoria: e.target.value })} className="input-field" />
          </FormField>
        </div>
      </Modal>
    </div>
  )
}
