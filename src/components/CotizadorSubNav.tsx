import { Calculator, History } from 'lucide-react'
import type { TabId } from './TabBar'

interface CotizadorSubNavProps {
  active: 'cotizador' | 'cotizaciones'
  onNavigate: (tab: TabId) => void
}

export function CotizadorSubNav({ active, onNavigate }: CotizadorSubNavProps) {
  const items = [
    { id: 'cotizador' as const, label: 'Cotizar', icon: Calculator },
    { id: 'cotizaciones' as const, label: 'Historial', icon: History },
  ]

  return (
    <div className="flex gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
      {items.map((item) => {
        const Icon = item.icon
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={`tap-press flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
              isActive ? 'bg-white text-brand shadow-sm' : 'text-slate-500'
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
