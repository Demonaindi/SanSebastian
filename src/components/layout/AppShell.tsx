import {
  Bus,
  Calculator,
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCog,
  Wallet,
  X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import type { TabId } from '../TabBar'

interface AppShellProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  children: ReactNode
}

const allNavItems: {
  id: TabId
  label: string
  icon: typeof Calculator
  description: string
  adminOnly?: boolean
}[] = [
  { id: 'cotizador', label: 'Cotizador', icon: Calculator, description: 'Cotizar viajes' },
  { id: 'flota', label: 'Flota', icon: Bus, description: 'Gestionar vehículos' },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays, description: 'Calendario de viajes' },
  { id: 'choferes', label: 'Choferes', icon: UserCog, description: 'Personal de conducción' },
  { id: 'facturacion', label: 'Facturación', icon: Wallet, description: 'Cobros y caja', adminOnly: true },
]

export function AppShell({ activeTab, onTabChange, children }: AppShellProps) {
  const { profile, isAdmin, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = allNavItems.filter((item) => !item.adminOnly || isAdmin)
  const activeItem = navItems.find((n) => n.id === activeTab) ?? navItems[0]

  return (
    <div className="flex min-h-screen">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-brand-dark/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col glass-panel-dark shadow-xl shadow-brand-dark/20 transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="flex-1 rounded-lg bg-white px-3 py-2 shadow-sm">
              <img src="/logo.png" alt="San Sebastián" className="h-12 w-full object-contain object-left" />
            </div>
            <button type="button" className="ml-auto rounded-lg p-1.5 text-white/70 hover:bg-white/10 lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="brand-speed-lines mt-4 rounded-full" />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/40">Módulos</p>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onTabChange(item.id)
                  setSidebarOpen(false)
                }}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                  isActive ? 'bg-white/15 text-white shadow-inner' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isActive ? 'bg-white text-brand' : 'bg-white/10 text-white/80'}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-white/50">{item.description}</p>
                </div>
                {isActive && <ChevronRight className="h-4 w-4 text-white/80" />}
              </button>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4 space-y-2">
          <div className="rounded-xl bg-white/10 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-bold text-brand">SS</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{profile?.nombre ?? 'Usuario'}</p>
                <p className="truncate text-xs text-white/50">{profile?.rol ?? '—'}</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/15"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 glass-panel border-b border-primary/10">
          <div className="flex items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-primary-muted lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
              <LayoutDashboard className="h-4 w-4 shrink-0 text-primary/60" />
              <span className="text-slate-500">Panel</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate font-semibold text-brand">{activeItem.label}</span>
            </div>
            <span className="hidden rounded-full bg-success-muted px-2.5 py-1 text-xs font-medium text-success sm:inline">Sistema activo</span>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>

        <footer className="border-t border-primary/10 px-6 py-4 text-center text-xs text-slate-500">
          San Sebastián · Autotransporte de pasajeros · Beta v2.0 · Supabase
        </footer>
      </div>
    </div>
  )
}
