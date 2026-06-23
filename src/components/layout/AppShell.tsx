import {
  Bus,
  Calculator,
  ChevronRight,
  LayoutDashboard,
  Menu,
  X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { TabId } from '../TabBar'

interface AppShellProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  children: ReactNode
}

const navItems: { id: TabId; label: string; icon: typeof Calculator; description: string }[] = [
  {
    id: 'cotizador',
    label: 'Cotizador',
    icon: Calculator,
    description: 'Cotizar viajes',
  },
  {
    id: 'flota',
    label: 'Flota',
    icon: Bus,
    description: 'Gestionar vehículos',
  },
]

export function AppShell({ activeTab, onTabChange, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const activeItem = navItems.find((n) => n.id === activeTab)

  return (
    <div className="flex min-h-screen">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col glass-panel transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25">
            <Bus className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">San Sebastián</p>
            <p className="truncate text-xs text-slate-500">Transporte & Logística</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
            Módulos
          </p>
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
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-150 ${
                  isActive
                    ? 'bg-primary/15 text-white shadow-inner'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'bg-white/5 text-slate-500 group-hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
                {isActive && <ChevronRight className="h-4 w-4 text-primary" />}
              </button>
            )
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-4">
          <div className="rounded-xl bg-surface-850/80 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">
                SS
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">Operador Demo</p>
                <p className="truncate text-xs text-slate-500">admin@sansebastian.com</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 glass-panel border-b border-white/[0.06]">
          <div className="flex items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-400 hover:bg-white/5 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
              <LayoutDashboard className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="text-slate-500">Panel</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              <span className="truncate font-medium text-white">{activeItem?.label}</span>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-emerald-400">
                Sistema activo
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>

        <footer className="border-t border-white/[0.04] px-6 py-4 text-center text-xs text-slate-600">
          San Sebastián Transporte · Sistema de cotización v1.0 · Datos simulados
        </footer>
      </div>
    </div>
  )
}
