import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { ToastProvider } from './contexts/ToastContext'
import { LoginView } from './components/auth/LoginView'
import { AgendaView } from './components/AgendaView'
import { ChoferesView } from './components/ChoferesView'
import { ClientesView } from './components/ClientesView'
import { CotizacionesView } from './components/CotizacionesView'
import { CotizadorView } from './components/CotizadorView'
import { CuentaView } from './components/CuentaView'
import { FlotaView } from './components/FlotaView'
import { HomeView } from './components/HomeView'
import { MetricasView } from './components/MetricasView'
import { AppShell } from './components/layout/AppShell'
import type { TabId } from './components/TabBar'
import { LoadingState } from './components/ui'

const VALID_TABS: TabId[] = [
  'home',
  'cotizador',
  'cotizaciones',
  'agenda',
  'metricas',
  'flota',
  'clientes',
  'choferes',
  'cuenta',
]

function tabFromHash(): TabId {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0]
  if (raw === 'facturacion') return 'metricas'
  return VALID_TABS.includes(raw as TabId) ? (raw as TabId) : 'home'
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>(() => tabFromHash())

  const onTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab)
    const next = `#/${tab}`
    if (window.location.hash !== next) {
      window.history.replaceState(null, '', next)
    }
  }, [])

  useEffect(() => {
    const onHash = () => {
      const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0]
      if (raw === 'facturacion') {
        window.history.replaceState(null, '', '#/metricas')
        setActiveTab('metricas')
        return
      }
      setActiveTab(tabFromHash())
    }
    window.addEventListener('hashchange', onHash)
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#/home')
    } else if (window.location.hash.replace(/^#\/?/, '').split('?')[0] === 'facturacion') {
      window.history.replaceState(null, '', '#/metricas')
      setActiveTab('metricas')
    }
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <AppShell activeTab={activeTab} onTabChange={onTabChange}>
      {activeTab === 'home' && <HomeView onNavigate={onTabChange} />}
      {activeTab === 'cotizador' && <CotizadorView onNavigate={onTabChange} />}
      {activeTab === 'cotizaciones' && <CotizacionesView onNavigate={onTabChange} />}
      {activeTab === 'agenda' && <AgendaView />}
      {activeTab === 'metricas' && <MetricasView />}
      {activeTab === 'flota' && <FlotaView />}
      {activeTab === 'clientes' && <ClientesView />}
      {activeTab === 'choferes' && <ChoferesView />}
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
