import type { Vehiculo } from '../types/database'
import { getCategoriaLabel } from '../lib/mappers'
import type { MapPoint } from './routing'

export interface QuoteOption {
  vehiculo: Vehiculo
  price: number
}

export interface CombinationOption {
  label: string
  vehiculos: Vehiculo[]
  totalCapacity: number
  price: number
}

export interface QuoteResult {
  distance: number
  durationMinutes?: number
  originResolved?: string
  destinationResolved?: string
  originPoint?: MapPoint
  destinationPoint?: MapPoint
  routePath?: [number, number][]
  options: QuoteOption[]
  combinations: CombinationOption[]
}

export function formatCurrency(value: number): string {
  return `$ ${value.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function formatRatePerKm(value: number): string {
  return `${formatCurrency(value)}/km`
}

export function formatDurationHours(minutes?: number | null): string | undefined {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return undefined
  const hours = minutes / 60
  const decimals = hours < 10 ? 1 : 0
  const formatted = hours.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `~${formatted} h`
}

function buildCombinationLabel(vehiculos: Vehiculo[]): string {
  const counts = new Map<string, number>()
  for (const v of vehiculos) {
    const key = v.numero_interno?.trim()
      ? `Nº ${v.numero_interno.trim()}`
      : getCategoriaLabel(v.categoria)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, count]) => (count > 1 ? `${count} × ${name}` : name))
    .join(' + ')
}

function findCombinations(
  passengers: number,
  distance: number,
  ratePerKm: number,
  vehiculos: Vehiculo[],
): CombinationOption[] {
  const available = vehiculos
  const maxCapacity = Math.max(...vehiculos.map((v) => v.capacidad), 0)
  if (passengers <= maxCapacity) return []

  const combos: CombinationOption[] = []
  const seen = new Set<string>()
  const unitPrice = distance * ratePerKm

  for (let i = 0; i < available.length; i++) {
    for (let j = i; j < available.length; j++) {
      const pair = [available[i], available[j]]
      const totalCapacity = pair[0].capacidad + pair[1].capacidad
      if (totalCapacity < passengers) continue

      const key = [pair[0].id, pair[1].id].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)

      combos.push({
        label: buildCombinationLabel(pair),
        vehiculos: pair,
        totalCapacity,
        price: unitPrice * 2,
      })
    }
  }

  for (const v of available) {
    const count = Math.ceil(passengers / v.capacidad)
    if (count < 2 || count > 4) continue

    const totalCapacity = v.capacidad * count
    if (totalCapacity < passengers) continue

    const key = `${v.id}x${count}`
    if (seen.has(key)) continue
    seen.add(key)

    combos.push({
      label: `${count} × ${v.numero_interno?.trim() ? `Nº ${v.numero_interno.trim()}` : getCategoriaLabel(v.categoria)}`,
      vehiculos: Array.from({ length: count }, () => v),
      totalCapacity,
      price: unitPrice * count,
    })
  }

  return combos.sort((a, b) => a.price - b.price).slice(0, 4)
}

export function calculateQuote(
  passengers: number,
  vehiculos: Vehiculo[],
  distance: number,
  ratePerKm: number,
  routeMeta?: Pick<
    QuoteResult,
    'durationMinutes' | 'originResolved' | 'destinationResolved' | 'originPoint' | 'destinationPoint' | 'routePath'
  >,
): QuoteResult | null {
  if (passengers < 1 || vehiculos.length === 0 || distance <= 0 || ratePerKm < 0) {
    return null
  }

  const basePrice = distance * ratePerKm

  const options = vehiculos
    .filter((v) => v.capacidad >= passengers)
    .map((vehiculo) => ({
      vehiculo,
      price: basePrice,
    }))
    .sort((a, b) => a.vehiculo.capacidad - b.vehiculo.capacidad)

  const combinations =
    options.length === 0 ? findCombinations(passengers, distance, ratePerKm, vehiculos) : []

  return {
    distance,
    durationMinutes: routeMeta?.durationMinutes,
    originResolved: routeMeta?.originResolved,
    destinationResolved: routeMeta?.destinationResolved,
    originPoint: routeMeta?.originPoint,
    destinationPoint: routeMeta?.destinationPoint,
    routePath: routeMeta?.routePath,
    options,
    combinations,
  }
}
