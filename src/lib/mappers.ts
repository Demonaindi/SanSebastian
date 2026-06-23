import type { TariffRow, VehicleType, Vehiculo, VehiculoCategoria } from '../types/database'

const CATEGORIA_TO_TYPE: Record<VehiculoCategoria, VehicleType> = {
  Combi: 'combi',
  Traffic: 'traffic',
  '1 piso': 'bus1',
  '2 pisos': 'bus2',
}

const TYPE_TO_CATEGORIA: Record<VehicleType, VehiculoCategoria> = {
  combi: 'Combi',
  traffic: 'Traffic',
  bus1: '1 piso',
  bus2: '2 pisos',
}

const CATEGORIA_LABELS: Record<VehiculoCategoria, string> = {
  Combi: 'Combi',
  Traffic: 'Traffic',
  '1 piso': 'Colectivo 1 piso',
  '2 pisos': 'Colectivo 2 pisos',
}

export function categoriaToVehicleType(categoria: VehiculoCategoria): VehicleType {
  return CATEGORIA_TO_TYPE[categoria]
}

export function vehicleTypeToCategoria(type: VehicleType): VehiculoCategoria {
  return TYPE_TO_CATEGORIA[type]
}

export function getCategoriaLabel(categoria: VehiculoCategoria): string {
  return CATEGORIA_LABELS[categoria]
}

export function buildTariffTable(vehiculos: Vehiculo[]): TariffRow[] {
  const order: VehiculoCategoria[] = ['Combi', 'Traffic', '1 piso', '2 pisos']
  const hints: Record<VehiculoCategoria, string> = {
    Combi: '12 a 16 pasajeros',
    Traffic: '16 a 19 pasajeros',
    '1 piso': '28 a 40 pasajeros',
    '2 pisos': '50 a 60 pasajeros',
  }

  return order
    .map((cat) => {
      const units = vehiculos.filter((v) => v.categoria === cat)
      if (units.length === 0) return null
      const avgRate = Math.round(
        units.reduce((s, v) => s + Number(v.tarifa_km), 0) / units.length,
      )
      return {
        type: categoriaToVehicleType(cat),
        label: CATEGORIA_LABELS[cat],
        ratePerKm: avgRate,
        capacityHint: hints[cat],
      }
    })
    .filter((row): row is TariffRow => row !== null)
}

export function getRateForVehiculo(vehiculo: Vehiculo): number {
  return Number(vehiculo.tarifa_km)
}

export type ExpiryLevel = 'ok' | 'warning' | 'danger'

export function getExpiryLevel(dateStr: string | null, warningDays = 30): ExpiryLevel {
  if (!dateStr) return 'ok'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'danger'
  if (diffDays <= warningDays) return 'warning'
  return 'ok'
}
