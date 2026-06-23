import { VEHICLES, type Vehicle } from '../data/vehicles'

export interface QuoteOption {
  vehicle: Vehicle
  price: number
}

export interface CombinationOption {
  label: string
  vehicles: Vehicle[]
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
  return `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function buildCombinationLabel(vehicles: Vehicle[]): string {
  const counts = new Map<string, number>()
  for (const v of vehicles) {
    counts.set(v.name, (counts.get(v.name) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, count]) => (count > 1 ? `${count} × ${name}` : name))
    .join(' + ')
}

function findCombinations(passengers: number, distance: number): CombinationOption[] {
  const available = VEHICLES.filter((v) => v.status === 'Disponible')
  const maxCapacity = Math.max(...VEHICLES.map((v) => v.capacity))
  if (passengers <= maxCapacity) return []

  const combos: CombinationOption[] = []
  const seen = new Set<string>()

  for (let i = 0; i < available.length; i++) {
    for (let j = i; j < available.length; j++) {
      const pair = [available[i], available[j]]
      const totalCapacity = pair[0].capacity + pair[1].capacity
      if (totalCapacity < passengers) continue

      const key = [pair[0].id, pair[1].id].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)

      combos.push({
        label: buildCombinationLabel(pair),
        vehicles: pair,
        totalCapacity,
        price: distance * pair.reduce((sum, v) => sum + v.costPerKm, 0),
      })
    }
  }

  for (const v of available) {
    const count = Math.ceil(passengers / v.capacity)
    if (count < 2 || count > 4) continue

    const totalCapacity = v.capacity * count
    if (totalCapacity < passengers) continue

    const key = `${v.id}x${count}`
    if (seen.has(key)) continue
    seen.add(key)

    combos.push({
      label: `${count} × ${v.name}`,
      vehicles: Array.from({ length: count }, () => v),
      totalCapacity,
      price: distance * v.costPerKm * count,
    })
  }

  return combos.sort((a, b) => a.price - b.price).slice(0, 4)
}

export function calculateQuote(
  origin: string,
  destination: string,
  passengers: number,
): QuoteResult | null {
  if (!origin.trim() || !destination.trim() || passengers < 1) return null

  const distance = simulateDistance(origin, destination)
  const options = VEHICLES.filter(
    (v) => v.capacity >= passengers && v.status === 'Disponible',
  )
    .map((vehicle) => ({
      vehicle,
      price: distance * vehicle.costPerKm,
    }))
    .sort((a, b) => a.price - b.price)

  const combinations = options.length === 0 ? findCombinations(passengers, distance) : []

  return { distance, options, combinations }
}
