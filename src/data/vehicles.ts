export type VehicleType = 'combi' | 'bus1' | 'bus2'
export type VehicleStatus = 'Disponible' | 'En viaje'

export interface Vehicle {
  id: string
  name: string
  type: VehicleType
  typeLabel: string
  capacity: number
  costPerKm: number
  status: VehicleStatus
}

export const VEHICLES: Vehicle[] = [
  {
    id: 'v1',
    name: 'Renault Trafic',
    type: 'combi',
    typeLabel: 'Combi / Trafic',
    capacity: 19,
    costPerKm: 1.5,
    status: 'Disponible',
  },
  {
    id: 'v2',
    name: 'VW Crafter',
    type: 'combi',
    typeLabel: 'Combi / Trafic',
    capacity: 16,
    costPerKm: 1.3,
    status: 'Disponible',
  },
  {
    id: 'v3',
    name: 'Ford Transit',
    type: 'combi',
    typeLabel: 'Combi / Trafic',
    capacity: 12,
    costPerKm: 1.2,
    status: 'En viaje',
  },
  {
    id: 'v4',
    name: 'Mercedes-Benz O500',
    type: 'bus1',
    typeLabel: 'Colectivo 1 piso',
    capacity: 40,
    costPerKm: 2.5,
    status: 'Disponible',
  },
  {
    id: 'v5',
    name: 'Scania K310',
    type: 'bus1',
    typeLabel: 'Colectivo 1 piso',
    capacity: 36,
    costPerKm: 2.3,
    status: 'Disponible',
  },
  {
    id: 'v6',
    name: 'Volvo B9R',
    type: 'bus1',
    typeLabel: 'Colectivo 1 piso',
    capacity: 28,
    costPerKm: 2.2,
    status: 'En viaje',
  },
  {
    id: 'v7',
    name: 'Scania K410 Doble',
    type: 'bus2',
    typeLabel: 'Colectivo 2 pisos',
    capacity: 60,
    costPerKm: 4.0,
    status: 'Disponible',
  },
  {
    id: 'v8',
    name: 'Mercedes Citaro G',
    type: 'bus2',
    typeLabel: 'Colectivo 2 pisos',
    capacity: 55,
    costPerKm: 3.9,
    status: 'Disponible',
  },
  {
    id: 'v9',
    name: 'Setra S431 DT',
    type: 'bus2',
    typeLabel: 'Colectivo 2 pisos',
    capacity: 50,
    costPerKm: 3.8,
    status: 'En viaje',
  },
]
