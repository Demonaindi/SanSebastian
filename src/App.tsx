import { useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { CotizadorView } from './components/CotizadorView'
import { FlotaView } from './components/FlotaView'
import type { TabId } from './components/TabBar'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('cotizador')

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'cotizador' ? <CotizadorView /> : <FlotaView />}
    </AppShell>
  )
}
