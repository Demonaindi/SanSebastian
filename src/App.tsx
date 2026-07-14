import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { ToastProvider } from './contexts/ToastContext'
import { LoginView } from './components/auth/LoginView'
import { AgendaView } from './components/AgendaView'
import { ChoferesView } from './components/ChoferesView'
import { ClientesView } from './components/ClientesView'
import { CotizadorView } from './components/CotizadorView'
import { CuentaView } from './components/CuentaView'
import { FacturacionView } from './components/FacturacionView'
import { FlotaView } from './components/FlotaView'
import { HomeView } from './components/HomeView'
import { AppShell } from './components/layout/AppShell'
import type { TabId } from './components/TabBar'
import { LoadingState } from './components/ui'

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('home')

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'home' && <HomeView onNavigate={setActiveTab} />}
      {activeTab === 'cotizador' && <CotizadorView />}
      {activeTab === 'agenda' && <AgendaView />}
      {activeTab === 'flota' && <FlotaView />}
      {activeTab === 'clientes' && <ClientesView />}
      {activeTab === 'choferes' && <ChoferesView />}
      {activeTab === 'facturacion' && <FacturacionView />}
      {activeTab === 'cuenta' && <CuentaView />}
    </AppShell>
  )
}

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-950 px-4">
        <LoadingState message="Iniciando sesión..." />
      </div>
    )
  }

  if (!session) {
    return (
      <ToastProvider>
        <LoginView />
      </ToastProvider>
    )
  }

  return (
    <ToastProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </ToastProvider>
  )
}
