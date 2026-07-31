import { X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-brand sm:text-2xl">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500 max-w-2xl hidden sm:block">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
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
      className={`card-elevated min-w-0 overflow-hidden rounded-2xl transition-all duration-200 ${
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
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {trailing}
    </div>
  )
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`min-w-0 p-4 sm:p-5 ${className}`}>{children}</div>
}

interface BadgeProps {
  children: ReactNode
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral'
  dot?: boolean
  className?: string
}

export function Badge({ children, variant = 'neutral', dot, className = '' }: BadgeProps) {
  const styles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    danger: 'bg-rose-50 text-rose-700 border-rose-100',
    warning: 'bg-amber-50 text-amber-700 border-amber-100',
    info: 'bg-sky-50 text-sky-700 border-sky-100',
    neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  }

  const dotColors = {
    success: 'bg-emerald-500',
    danger: 'bg-rose-500',
    warning: 'bg-amber-500',
    info: 'bg-sky-500',
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
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    danger: 'text-rose-700',
    info: 'text-brand',
  }

  const iconBg = {
    default: 'bg-slate-100 text-slate-500',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-rose-50 text-rose-600',
    info: 'bg-primary-muted text-brand',
  }

  return (
    <div className="card-premium p-4 md:rounded-xl md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className={`mt-1.5 text-xl font-bold tracking-tight md:text-2xl ${valueColors[tone]}`}>{value}</p>
          {trend && <p className="mt-1 text-xs text-slate-500">{trend}</p>}
        </div>
        {Icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${iconBg[tone]}`}>
            <Icon className="h-5 w-5" strokeWidth={1.75} />
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
    danger: 'border-rose-100 bg-rose-50 text-rose-800',
    warning: 'border-amber-100 bg-amber-50 text-amber-900',
    info: 'border-sky-100 bg-sky-50 text-slate-800',
  }

  const iconColors = {
    danger: 'text-rose-500',
    warning: 'text-amber-500',
    info: 'text-brand',
  }

  return (
    <div className={`flex gap-3 rounded-2xl border px-4 py-3.5 text-sm ${styles[variant]}`}>
      {Icon && <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColors[variant]}`} strokeWidth={1.75} />}
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
      'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200',
    ghost: 'text-slate-600 hover:text-brand hover:bg-primary-muted',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3.5 text-sm gap-2',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`tap-press inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
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
    <label className="block min-w-0 space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="min-w-0">{children}</div>
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
  /** 'half' | 'tall' controlan altura del bottom sheet en mobile */
  sheetSize?: 'half' | 'tall'
}

export function Modal({ open, onClose, title, children, footer, wide, sheetSize = 'tall' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.dataset.modalOpen = 'true'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      delete document.body.dataset.modalOpen
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const sheetHeight = sheetSize === 'half' ? 'max-h-[55vh]' : 'max-h-[88vh]'

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center md:items-center md:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Cerrar diálogo"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`animate-sheet relative z-10 flex w-full flex-col rounded-t-3xl bg-white shadow-2xl md:animate-fade-in md:rounded-3xl ${
          wide ? 'md:max-w-2xl' : 'md:max-w-lg'
        } ${sheetHeight} md:max-h-[90vh]`}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-slate-200 md:hidden" aria-hidden />
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 id="modal-title" className="min-w-0 truncate text-lg font-bold text-slate-900">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="tap-press shrink-0 rounded-full p-2 text-slate-400 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && (
          <div className="safe-bottom flex shrink-0 flex-wrap gap-2 border-t border-slate-100 bg-white px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export function FilterPills({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
      {options.map((opt) => {
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`tap-press shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all ${
              active
                ? 'border-brand bg-brand text-white shadow-sm shadow-brand/20'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/80 ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="card-premium overflow-hidden">
      <div className="flex gap-3 p-3">
        <Skeleton className="h-24 w-24 shrink-0 rounded-xl" />
        <div className="flex flex-1 flex-col gap-2 py-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="mt-auto h-6 w-20" />
        </div>
      </div>
    </div>
  )
}

export function LoadingState({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="space-y-3 py-2 animate-fade-in">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <p className="pt-2 text-center text-xs text-slate-400">{message}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-6 text-center">
      <p className="text-sm text-rose-700">{message}</p>
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
