import { useState } from 'react'
import { AlertTriangle, Lock, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Alert, Button, Card, CardBody, CardHeader, FormField, Modal, PageHeader } from './ui'

export function CuentaView() {
  const { session, profile, updatePassword, deleteAccount } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.')
      return
    }

    setPasswordLoading(true)
    try {
      await updatePassword(newPassword)
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSuccess('Contraseña actualizada correctamente.')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'ELIMINAR') {
      setDeleteError('Escribí ELIMINAR para confirmar.')
      return
    }

    setDeleteError('')
    setDeleteLoading(true)
    try {
      await deleteAccount()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'No se pudo eliminar la cuenta.')
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Mi cuenta"
        description="Administrá tu acceso y la seguridad de tu usuario."
      />

      <Card hover={false}>
        <CardHeader title="Información del perfil" subtitle="Datos asociados a tu sesión" />
        <CardBody className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-muted text-lg font-bold text-brand">
              {profile?.nombre?.slice(0, 2).toUpperCase() ?? 'SS'}
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">{profile?.nombre ?? 'Usuario'}</p>
              <p className="text-sm text-slate-500">{session?.user.email ?? '—'}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-brand">{profile?.rol ?? '—'}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card hover={false}>
        <CardHeader
          title="Cambiar contraseña"
          subtitle="Usá una contraseña segura de al menos 8 caracteres"
          trailing={<Lock className="h-5 w-5 text-slate-400" />}
        />
        <CardBody>
          <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-4">
            <FormField label="Nueva contraseña">
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </FormField>
            <FormField label="Confirmar contraseña">
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </FormField>
            {passwordError && (
              <p className="rounded-lg bg-danger-muted px-3 py-2 text-sm text-danger">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="rounded-lg bg-success-muted px-3 py-2 text-sm text-success">{passwordSuccess}</p>
            )}
            <Button type="submit" loading={passwordLoading}>
              Guardar contraseña
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card hover={false} className="border border-rose-100">
        <CardHeader
          title="Eliminar cuenta"
          subtitle="Esta acción es permanente y no se puede deshacer"
          trailing={<Trash2 className="h-5 w-5 text-danger" />}
        />
        <CardBody className="space-y-4">
          <Alert variant="danger" icon={AlertTriangle} title="Zona peligrosa">
            Al eliminar tu cuenta se cerrará tu sesión y perderás el acceso al sistema.
          </Alert>
          <Button variant="secondary" className="border-rose-200 text-danger hover:bg-danger-muted" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Eliminar mi cuenta
          </Button>
        </CardBody>
      </Card>

      <Modal
        open={deleteOpen}
        onClose={() => {
          if (!deleteLoading) {
            setDeleteOpen(false)
            setDeleteConfirm('')
            setDeleteError('')
          }
        }}
        title="Confirmar eliminación"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleteLoading}>
              Cancelar
            </Button>
            <Button
              className="bg-danger hover:bg-rose-700 border-rose-600"
              loading={deleteLoading}
              onClick={handleDeleteAccount}
            >
              Eliminar definitivamente
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Se eliminará la cuenta <strong>{session?.user.email}</strong> y todos los datos de perfil asociados.
          </p>
          <FormField label='Escribí "ELIMINAR" para confirmar'>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="input-field"
              placeholder="ELIMINAR"
              autoComplete="off"
            />
          </FormField>
          {deleteError && (
            <p className="rounded-lg bg-danger-muted px-3 py-2 text-sm text-danger">{deleteError}</p>
          )}
        </div>
      </Modal>
    </div>
  )
}
