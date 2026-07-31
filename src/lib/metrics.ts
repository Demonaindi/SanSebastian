import { formatCurrency } from './quote'

export type MonthKey = string

export interface MonthBucket {
  key: MonthKey
  label: string
  viajes: number
  cancelados: number
  facturado: number
  cobrado: number
  pendiente: number
  km: number
  ingresosCaja: number
  egresosCaja: number
  presupuestos: number
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function toMonthKey(iso: string): MonthKey {
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

export function lastMonthKeys(count: number, from = new Date()): MonthKey[] {
  const keys: MonthKey[] = []
  const base = new Date(from.getFullYear(), from.getMonth(), 1)
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`)
  }
  return keys
}

export function monthLabel(key: MonthKey): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
}

export function monthLabelLong(key: MonthKey): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

function emptyBucket(key: MonthKey): MonthBucket {
  return {
    key,
    label: monthLabel(key),
    viajes: 0,
    cancelados: 0,
    facturado: 0,
    cobrado: 0,
    pendiente: 0,
    km: 0,
    ingresosCaja: 0,
    egresosCaja: 0,
    presupuestos: 0,
  }
}

export function buildMonthlyBuckets(input: {
  months: MonthKey[]
  viajes: {
    fecha_viaje: string
    estado_viaje: string
    estado_pago: string
    precio_total: number
    distancia_km: number
  }[]
  caja: { tipo: string; monto: number; created_at: string }[]
  presupuestos: { created_at: string }[]
}): MonthBucket[] {
  const map = new Map(input.months.map((k) => [k, emptyBucket(k)]))

  for (const v of input.viajes) {
    const key = toMonthKey(v.fecha_viaje)
    const bucket = map.get(key)
    if (!bucket) continue
    if (v.estado_viaje === 'Cancelado') {
      bucket.cancelados += 1
      continue
    }
    bucket.viajes += 1
    const total = Number(v.precio_total) || 0
    bucket.facturado += total
    bucket.km += Number(v.distancia_km) || 0
    if (v.estado_pago === 'Pagado') bucket.cobrado += total
    else bucket.pendiente += total
  }

  for (const m of input.caja) {
    const key = toMonthKey(m.created_at)
    const bucket = map.get(key)
    if (!bucket) continue
    const monto = Number(m.monto) || 0
    if (m.tipo === 'Ingreso') bucket.ingresosCaja += monto
    else bucket.egresosCaja += monto
  }

  for (const p of input.presupuestos) {
    const key = toMonthKey(p.created_at)
    const bucket = map.get(key)
    if (!bucket) continue
    bucket.presupuestos += 1
  }

  return input.months.map((k) => map.get(k)!)
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / Math.abs(previous)) * 100
}

export function formatPct(change: number | null): string {
  if (change == null) return 'Sin base'
  const rounded = Math.round(change)
  if (rounded === 0) return '0%'
  return `${rounded > 0 ? '+' : ''}${rounded}%`
}

export function formatTicket(total: number, count: number): string {
  if (count <= 0) return formatCurrency(0)
  return formatCurrency(total / count)
}
