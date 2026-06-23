import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { LoginView } from './components/auth/LoginView'
import { AgendaView } from './components/AgendaView'
import { ChoferesView } from './components/ChoferesView'
import { CotizadorView } from './components/CotizadorView'
import { FacturacionView } from './components/FacturacionView'
import { FlotaView } from './components/FlotaView'
import { AppShell } from './components/layout/AppShell'
import type { TabId } from './components/TabBar'
import { LoadingState } from './components/ui'

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('cotizador')

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'cotizador' && <CotizadorView />}
      {activeTab === 'flota' && <FlotaView />}
      {activeTab === 'agenda' && <AgendaView />}
      {activeTab === 'choferes' && <ChoferesView />}
      {activeTab === 'facturacion' && <FacturacionView />}
    </AppShell>
  )
}

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-950">
        <LoadingState message="Iniciando sesión..." />
      </div>
    )
  }

  if (!session) {
    return <LoginView />
  }

  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  )
}
