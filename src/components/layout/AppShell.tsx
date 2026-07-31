import {
  BarChart3,
  Bus,
  Calculator,
  CalendarDays,
  ChevronRight,
  Contact,
  History,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  User,
  UserCog,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
  { id: 'home', label: 'Inicio', icon: Home, description: 'Accesos rápidos' },
  { id: 'cotizador', label: 'Cotizar', icon: Calculator, description: 'Nueva cotización' },
  {
    id: 'cotizaciones',
    label: 'Cotizaciones',
    icon: History,
    description: 'Historial de presupuestos',
  },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays, description: 'Disponibilidad por unidad' },
  {
    id: 'metricas',
    label: 'Números',
    icon: BarChart3,
    description: 'Comparativa mes a mes',
    adminOnly: true,
  },
  { id: 'flota', label: 'Flota', icon: Bus, description: 'Gestionar vehículos', adminOnly: true },
  { id: 'clientes', label: 'Clientes', icon: Contact, description: 'CRM de clientes', adminOnly: true },
  { id: 'choferes', label: 'Choferes', icon: UserCog, description: 'Personal de conducción', adminOnly: true },
  { id: 'facturacion', label: 'Facturación', icon: Wallet, description: 'Cobros y caja', adminOnly: true },
]

const accountNavItem = {
  id: 'cuenta' as TabId,
  label: 'Mi cuenta',
  description: 'Configuración de usuario',
}

const mobilePrimary: TabId[] = ['home', 'cotizador', 'agenda', 'cuenta']

function isCotizadorGroup(tab: TabId) {
  return tab === 'cotizador' || tab === 'cotizaciones'
}

export function AppShell({ activeTab, onTabChange, children }: AppShellProps) {
  const { profile, isAdmin, signOut, profileError, reloadProfile } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = useMemo(
    () => allNavItems.filter((item) => item.id === 'home' || !item.adminOnly || isAdmin),
    [isAdmin],
  )

  const desktopNav = useMemo(() => navItems, [navItems])

  const activeItem =
    activeTab === 'cuenta'
      ? accountNavItem
      : activeTab === 'cotizaciones'
        ? {
            id: 'cotizaciones' as TabId,
            label: 'Cotizaciones',
            description: 'Historial de presupuestos',
          }
        : (navItems.find((n) => n.id === activeTab) ?? navItems[0])

  useEffect(() => {
    const allowed = new Set<TabId>([...navItems.map((n) => n.id), 'cuenta'])
    if (!allowed.has(activeTab)) onTabChange('cotizador')
  }, [activeTab, navItems, onTabChange])

  const mobileTabs = mobilePrimary.map((id) => {
    if (id === 'cuenta') {
      return { id, label: 'Cuenta', icon: User }
    }
    const found = navItems.find((n) => n.id === id)
    return found
      ? {
          id: found.id,
          label: found.id === 'cotizador' ? 'Cotizar' : found.label,
          icon: found.icon,
        }
      : { id, label: id, icon: Home }
  })

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-brand-dark/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 hidden h-screen w-72 flex-col glass-panel-dark shadow-xl shadow-brand-dark/20 transition-transform duration-300 lg:flex ${
          sidebarOpen ? 'translate-x-0' : ''
        }`}
      >
        <div className="shrink-0 border-b border-white/10 px-5 py-5">
          <div className="rounded-lg bg-white px-3 py-3 shadow-sm">
            <img src="/logo.png" alt="San Sebastián" className="h-36 w-full object-contain object-left" />
          </div>
          <div className="brand-speed-lines mt-4 rounded-full" />
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/40">Módulos</p>
          {desktopNav.map((item) => {
            const Icon = item.icon
            const isActive =
              activeTab === item.id ||
              (item.id === 'cotizador' && isCotizadorGroup(activeTab) && activeTab === 'cotizador') ||
              (item.id === 'cotizaciones' && activeTab === 'cotizaciones')
            const indent = item.id === 'cotizaciones'
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                  indent ? 'ml-2 w-[calc(100%-0.5rem)]' : ''
                } ${
                  isActive ? 'bg-white/15 text-white shadow-inner' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isActive ? 'bg-white text-brand' : 'bg-white/10 text-white/80'}`}>
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
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

        <div className="shrink-0 space-y-2 border-t border-white/10 p-4">
          <button
            type="button"
            onClick={() => onTabChange('cuenta')}
            className={`w-full rounded-xl p-3 text-left transition-all ${
              activeTab === 'cuenta' ? 'bg-white/15 ring-1 ring-white/20' : 'bg-white/10 hover:bg-white/15'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-bold text-brand">SS</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{profile?.nombre ?? 'Usuario'}</p>
                <p className="truncate text-xs text-white/50">{profile?.rol ?? '—'}</p>
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => signOut()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/15"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile drawer (admin modules) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-col bg-white shadow-2xl transition-transform duration-300 lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <p className="font-bold text-slate-900">Menú</p>
          <button type="button" className="rounded-full p-2 text-slate-400" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
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
                className={`tap-press flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left ${
                  isActive ? 'bg-primary-muted text-brand' : 'text-slate-600'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.6} />
                <span className="text-sm font-semibold">{item.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="safe-bottom border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={() => signOut()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-700"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:ml-72">
        <header className="z-30 shrink-0 border-b border-slate-100 bg-white/80 backdrop-blur-md lg:glass-panel lg:border-primary/10">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <button
              type="button"
              className="tap-press rounded-full p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-slate-900 lg:hidden">{activeItem.label}</p>
              <div className="hidden items-center gap-2 text-sm lg:flex">
                <LayoutDashboard className="h-4 w-4 shrink-0 text-primary/60" strokeWidth={1.75} />
                <span className="text-slate-500">Panel</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate font-semibold text-brand">{activeItem.label}</span>
              </div>
            </div>
            <img src="/logo.png" alt="" className="h-16 w-auto object-contain lg:hidden" />
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-8 lg:pb-6 lg:py-6">
          <div className="mx-auto w-full min-w-0 max-w-6xl space-y-4">
            {profileError && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p>Perfil incompleto: {profileError}</p>
                <button
                  type="button"
                  onClick={() => void reloadProfile()}
                  className="font-semibold text-brand underline"
                >
                  Reintentar
                </button>
              </div>
            )}
            {children}
          </div>
        </main>

        <footer className="hidden shrink-0 border-t border-primary/10 px-6 py-4 text-center text-xs text-slate-500 lg:block">
          San Sebastián · Autotransporte de pasajeros · Mobile-first premium
        </footer>
      </div>

      <nav
        className="app-bottom-nav safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-md lg:hidden"
        aria-label="Navegación principal"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-2">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id || (tab.id === 'home' && activeTab === 'home')
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`tap-press flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 transition-all ${
                  isActive || (tab.id === 'cotizador' && isCotizadorGroup(activeTab))
                    ? 'text-brand'
                    : 'text-slate-400'
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-2xl transition-all ${
                    isActive || (tab.id === 'cotizador' && isCotizadorGroup(activeTab))
                      ? 'bg-primary-muted scale-105'
                      : 'bg-transparent'
                  }`}
                >
                  <Icon
                    className="h-5 w-5"
                    strokeWidth={
                      isActive || (tab.id === 'cotizador' && isCotizadorGroup(activeTab)) ? 2 : 1.6
                    }
                  />
                </span>
                <span className="text-[10px] font-semibold tracking-wide">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
