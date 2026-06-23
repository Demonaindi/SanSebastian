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
        <h2 className="text-xl font-bold tracking-tight text-brand sm:text-2xl">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">{description}</p>
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
        featured ? 'ring-1 ring-primary/30' : ''
      } ${hover ? 'hover:shadow-lg hover:shadow-primary/10' : ''} ${className}`}
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
    <div className="flex items-center justify-between gap-3 border-b border-primary/10 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
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
    success: 'bg-success-muted text-success border-emerald-200',
    danger: 'bg-danger-muted text-danger border-rose-200',
    warning: 'bg-warning-muted text-warning border-amber-200',
    info: 'bg-primary-muted text-brand border-primary/20',
    neutral: 'bg-surface-800 text-slate-600 border-slate-200',
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
    default: 'text-slate-900',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    info: 'text-brand',
  }

  const iconBg = {
    default: 'bg-surface-800 text-slate-500',
    success: 'bg-success-muted text-success',
    warning: 'bg-warning-muted text-warning',
    danger: 'bg-danger-muted text-danger',
    info: 'bg-primary-muted text-brand',
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
    danger: 'border-rose-200 bg-danger-muted text-rose-800',
    warning: 'border-amber-200 bg-warning-muted text-amber-900',
    info: 'border-primary/20 bg-primary-muted text-brand-dark',
  }

  const iconColors = {
    danger: 'text-danger',
    warning: 'text-warning',
    info: 'text-brand',
  }

  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3.5 text-sm ${styles[variant]}`}>
      {Icon && <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColors[variant]}`} />}
      <div>
        <strong className="block font-semibold">{title}</strong>
        <div className="mt-0.5 opacity-90">{children}</div>
      </div>
    </div>
  )
}

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
  loading?: boolean
}

export function Button({
  children,
  onClick,
  type = 'button',
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
      'bg-white text-slate-700 hover:bg-surface-800 border border-slate-200',
    ghost: 'text-slate-600 hover:text-brand hover:bg-primary-muted',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-sm gap-2',
  }

  return (
    <button
      type={type}
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
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export function InputIcon({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        {children}
      </div>
    </div>
  )
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export function Modal({ open, onClose, title, children, footer, wide }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-brand-dark/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Cerrar"
      />
      <div
        className={`relative z-10 flex max-h-[90vh] w-full flex-col rounded-2xl bg-white shadow-2xl ${
          wide ? 'max-w-2xl' : 'max-w-lg'
        }`}
      >
        <div className="flex items-center justify-between border-b border-primary/10 px-5 py-4">
          <h3 className="text-lg font-bold text-brand">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-surface-800"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap gap-2 border-t border-primary/10 px-5 py-4">{footer}</div>
        )}
      </div>
    </div>
  )
}

export function LoadingState({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      <p className="mt-4 text-sm text-slate-600">{message}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-danger-muted px-4 py-6 text-center">
      <p className="text-sm text-danger">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 text-sm font-semibold text-brand hover:underline"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}

