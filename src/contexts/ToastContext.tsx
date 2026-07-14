import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, Info, XCircle } from 'lucide-react'

type ToastTone = 'success' | 'danger' | 'info'

interface ToastItem {
  id: number
  title: string
  message?: string
  tone: ToastTone
}

interface ToastContextValue {
  toast: (opts: { title: string; message?: string; tone?: ToastTone }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback(({ title, message, tone = 'info' }: { title: string; message?: string; tone?: ToastTone }) => {
    const id = Date.now() + Math.random()
    setItems((prev) => [...prev, { id, title, message, tone }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex flex-col items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] md:top-4 md:items-end md:px-6">
        {items.map((item) => {
          const Icon = item.tone === 'success' ? CheckCircle2 : item.tone === 'danger' ? XCircle : Info
          const styles =
            item.tone === 'success'
              ? 'border-emerald-200 bg-white text-emerald-800'
              : item.tone === 'danger'
                ? 'border-rose-200 bg-white text-rose-800'
                : 'border-slate-200 bg-white text-slate-800'
          return (
            <div
              key={item.id}
              className={`animate-toast pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg shadow-slate-900/10 ${styles}`}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.message && <p className="mt-0.5 text-xs opacity-80">{item.message}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}
