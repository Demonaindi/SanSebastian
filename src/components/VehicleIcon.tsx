import { Bus, BusFront, Van } from 'lucide-react'
import type { VehicleType } from '../data/vehicles'

interface VehicleIconProps {
  type: VehicleType
  size?: 'sm' | 'md' | 'lg'
  variant?: 'plain' | 'boxed'
}

const icons = { combi: Van, bus1: Bus, bus2: BusFront }

const sizes = {
  sm: { box: 'h-8 w-8', icon: 'h-4 w-4' },
  md: { box: 'h-11 w-11', icon: 'h-5 w-5' },
  lg: { box: 'h-14 w-14', icon: 'h-7 w-7' },
}

const typeColors = {
  combi: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/20',
  bus1: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/20',
  bus2: 'from-violet-500/20 to-purple-500/20 text-violet-400 border-violet-500/20',
}

export function VehicleIcon({ type, size = 'md', variant = 'boxed' }: VehicleIconProps) {
  const Icon = icons[type]
  const s = sizes[size]

  if (variant === 'plain') {
    return <Icon className={`${s.icon} text-slate-400`} aria-hidden />
  }

  return (
    <div
      className={`flex items-center justify-center rounded-xl border bg-gradient-to-br ${typeColors[type]} ${s.box}`}
    >
      <Icon className={s.icon} aria-hidden />
    </div>
  )
}

export function getTypeLabel(type: VehicleType): string {
  if (type === 'combi') return 'Combi'
  if (type === 'bus1') return '1 piso'
  return '2 pisos'
}
