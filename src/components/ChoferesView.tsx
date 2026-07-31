import { useState } from 'react'
import { Plus, Trash2, UserCog } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useToast } from '../contexts/ToastContext'
import { createChofer, deleteChofer, updateChoferEstado } from '../services/choferes'
import type { ChoferEstado } from '../types/database'
import { Badge, Button, Card, CardBody, ErrorState, FormField, LoadingState, Modal, PageHeader } from './ui'

const ESTADOS: ChoferEstado[] = ['Disponible', 'En viaje', 'Franco', 'Licencia']

export function ChoferesView() {
  const { isAdmin } = useAuth()
  const { toast } = useToast()
  const { choferes, loading, error, refreshChoferes } = useData()
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nombre: '', licencia_categoria: 'D1' })
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!form.nombre.trim()) return
    setSaving(true)
    try {
      await createChofer(form)
      setShowAdd(false)
      setForm({ nombre: '', licencia_categoria: 'D1' })
      await refreshChoferes()
      toast({ title: 'Chofer agregado', tone: 'success' })
    } catch (err) {
      toast({
        title: 'No se pudo agregar',
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
        description="Administrá el personal de conducción, licencias y disponibilidad operativa."
        action={
          isAdmin ? (
            <Button onClick={() => setShowAdd(true)}>
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
                  )}
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">{c.nombre}</h3>
                <p className="text-xs text-slate-500">Licencia {c.licencia_categoria}</p>
                {confirmDeleteId === c.id && (
                  <p className="mt-2 text-xs text-rose-600">Tocá el ícono otra vez para confirmar.</p>
                )}
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
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Nuevo chofer"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdd} loading={saving}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Nombre completo">
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="input-field"
            />
          </FormField>
          <FormField label="Categoría de licencia">
            <input
              value={form.licencia_categoria}
              onChange={(e) => setForm({ ...form, licencia_categoria: e.target.value })}
              className="input-field"
            />
          </FormField>
        </div>
      </Modal>
    </div>
  )
}
