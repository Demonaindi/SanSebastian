import { Bus, BusFront, Van } from 'lucide-react'
import type { VehicleType } from '../types/database'

interface VehicleIconProps {
  type: VehicleType
  size?: 'sm' | 'md' | 'lg'
  variant?: 'plain' | 'boxed'
}

const icons = { combi: Van, traffic: Van, bus1: Bus, bus2: BusFront }

const sizes = {
  sm: { box: 'h-8 w-8', icon: 'h-4 w-4' },
  md: { box: 'h-11 w-11', icon: 'h-5 w-5' },
  lg: { box: 'h-14 w-14', icon: 'h-7 w-7' },
}

const typeColors = {
  combi: 'from-primary-muted to-primary/10 text-brand border-primary/20',
  traffic: 'from-sky-100 to-primary/10 text-brand border-primary/25',
  bus1: 'from-primary/15 to-brand-light/15 text-brand border-primary/25',
  bus2: 'from-brand-dark/10 to-primary/20 text-brand-dark border-brand-dark/20',
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
