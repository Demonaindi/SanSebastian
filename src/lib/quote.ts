import type { Vehiculo } from '../types/database'
import { getRateForVehiculo } from '../lib/mappers'

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
  options: QuoteOption[]
  combinations: CombinationOption[]
}

function hashSeed(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function simulateDistance(origin: string, destination: string): number {
  const seed = hashSeed(`${origin.trim().toLowerCase()}|${destination.trim().toLowerCase()}`)
  return 50 + (seed % 451)
}

export function formatCurrency(value: number): string {
  return `$ ${value.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function formatRatePerKm(value: number): string {
  return `${formatCurrency(value)}/km`
}

function buildCombinationLabel(vehiculos: Vehiculo[]): string {
  const counts = new Map<string, number>()
  for (const v of vehiculos) {
    counts.set(v.nombre, (counts.get(v.nombre) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, count]) => (count > 1 ? `${count} × ${name}` : name))
    .join(' + ')
}

function findCombinations(
  passengers: number,
  distance: number,
  vehiculos: Vehiculo[],
): CombinationOption[] {
  const available = vehiculos.filter((v) => v.estado === 'Disponible')
  const maxCapacity = Math.max(...vehiculos.map((v) => v.capacidad), 0)
  if (passengers <= maxCapacity) return []

  const combos: CombinationOption[] = []
  const seen = new Set<string>()

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
        price: distance * pair.reduce((sum, v) => sum + getRateForVehiculo(v), 0),
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
      label: `${count} × ${v.nombre}`,
      vehiculos: Array.from({ length: count }, () => v),
      totalCapacity,
      price: distance * getRateForVehiculo(v) * count,
    })
  }

  return combos.sort((a, b) => a.price - b.price).slice(0, 4)
}

export function calculateQuote(
  origin: string,
  destination: string,
  passengers: number,
  vehiculos: Vehiculo[],
): QuoteResult | null {
  if (!origin.trim() || !destination.trim() || passengers < 1 || vehiculos.length === 0) {
    return null
  }

  const distance = simulateDistance(origin, destination)
  const options = vehiculos
    .filter((v) => v.capacidad >= passengers && v.estado === 'Disponible')
    .map((vehiculo) => ({
      vehiculo,
      price: distance * getRateForVehiculo(vehiculo),
    }))
    .sort((a, b) => a.price - b.price)

  const combinations = options.length === 0 ? findCombinations(passengers, distance, vehiculos) : []

  return { distance, options, combinations }
}
