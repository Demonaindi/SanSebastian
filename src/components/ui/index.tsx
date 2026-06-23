import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-400 max-w-2xl">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

interface CardProps {
  children: ReactNode
  className?: string
  featured?: boolean
  hover?: boolean
}

export function Card({ children, className = '', featured, hover = true }: CardProps) {
  return (
    <div
      className={`card-elevated rounded-2xl overflow-hidden transition-all duration-200 ${
        featured ? 'ring-1 ring-primary/40' : ''
      } ${hover ? 'hover:shadow-lg hover:shadow-black/20' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string
  subtitle?: string
  trailing?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {trailing}
    </div>
  )
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-5 ${className}`}>{children}</div>
}

interface BadgeProps {
  children: ReactNode
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral'
  dot?: boolean
  className?: string
}

export function Badge({ children, variant = 'neutral', dot, className = '' }: BadgeProps) {
  const styles = {
    success: 'bg-success/15 text-emerald-400 border-emerald-500/20',
    danger: 'bg-danger/15 text-rose-400 border-rose-500/20',
    warning: 'bg-warning/15 text-amber-400 border-amber-500/20',
    info: 'bg-primary/15 text-blue-400 border-blue-500/20',
    neutral: 'bg-white/5 text-slate-300 border-white/10',
  }

  const dotColors = {
    success: 'bg-success',
    danger: 'bg-danger',
    warning: 'bg-warning',
    info: 'bg-primary',
    neutral: 'bg-slate-400',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${styles[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  )
}

interface StatCardProps {
  label: string
  value: string
  icon?: LucideIcon
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  trend?: string
}

export function StatCard({ label, value, icon: Icon, tone = 'default', trend }: StatCardProps) {
  const valueColors = {
    default: 'text-white',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-rose-400',
    info: 'text-sky-400',
  }

  const iconBg = {
    default: 'bg-white/5 text-slate-400',
    success: 'bg-success/15 text-emerald-400',
    warning: 'bg-warning/15 text-amber-400',
    danger: 'bg-danger/15 text-rose-400',
    info: 'bg-primary/15 text-blue-400',
  }

  return (
    <div className="card-elevated rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className={`mt-2 text-2xl font-bold tracking-tight ${valueColors[tone]}`}>{value}</p>
          {trend && <p className="mt-1 text-xs text-slate-500">{trend}</p>}
        </div>
        {Icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  )
}

interface AlertProps {
  title: string
  children: ReactNode
  variant?: 'danger' | 'warning' | 'info'
  icon?: LucideIcon
}

export function Alert({ title, children, variant = 'info', icon: Icon }: AlertProps) {
  const styles = {
    danger: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
  }

  const iconColors = {
    danger: 'text-rose-400',
    warning: 'text-amber-400',
    info: 'text-blue-400',
  }

  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3.5 text-sm ${styles[variant]}`}>
      {Icon && <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColors[variant]}`} />}
      <div>
        <strong className="block font-semibold text-white/90">{title}</strong>
        <div className="mt-0.5 opacity-90">{children}</div>
      </div>
    </div>
  )
}

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
  loading?: boolean
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  loading,
}: ButtonProps) {
  const variants = {
    primary:
      'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20 border border-primary/50',
    secondary:
      'bg-surface-800 text-slate-200 hover:bg-surface-700 border border-white/10',
    ghost: 'text-slate-400 hover:text-white hover:bg-white/5',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-sm gap-2',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}

interface FormFieldProps {
  label: string
  children: ReactNode
  hint?: string
}

export function FormField({ label, children, hint }: FormFieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-600">{hint}</span>}
    </label>
  )
}

export function InputIcon({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
        {children}
      </div>
    </div>
  )
}
