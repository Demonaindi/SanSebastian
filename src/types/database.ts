export type UserRole = 'Administrador' | 'Operador'

export type ChoferEstado = 'Disponible' | 'En viaje' | 'Franco' | 'Licencia'
export type VehiculoEstado = 'Disponible' | 'En viaje'
export type VehiculoCategoria = 'Combi' | 'Traffic' | '1 piso' | '2 pisos'
export type EstadoPago = 'Pendiente' | 'Señado' | 'Pagado'
export type CajaTipo = 'Ingreso' | 'Egreso'

export type VehicleType = 'combi' | 'traffic' | 'bus1' | 'bus2'

export interface Profile {
  id: string
  email: string | null
  nombre: string | null
  rol: UserRole
  created_at: string
}

export interface Cliente {
  id: string
  nombre_razon_social: string
  cuil_cuit_dni: string | null
  telefono: string | null
  email: string | null
  created_at: string
}

export interface Chofer {
  id: string
  nombre: string
  licencia_categoria: string
  estado: ChoferEstado
  created_at: string
}

export interface Vehiculo {
  id: string
  nombre: string
  categoria: VehiculoCategoria
  capacidad: number
  tarifa_km: number
  estado: VehiculoEstado
  vtv_vencimiento: string | null
  seguro_vencimiento: string | null
  kilometraje: number
  created_at: string
}

export interface Viaje {
  id: string
  origen: string
  destino: string
  pasajeros: number
  fecha_viaje: string | null
  hora_viaje: string | null
  distancia_km: number
  precio_total: number
  estado_pago: EstadoPago
  cliente_id: string | null
  chofer_id: string | null
  vehiculo_id: string | null
  created_at: string
}

export interface ViajeWithRelations extends Viaje {
  clientes?: Pick<Cliente, 'nombre_razon_social'> | null
  choferes?: Pick<Chofer, 'nombre'> | null
  vehiculos?: Pick<Vehiculo, 'nombre' | 'categoria'> | null
}

export interface CajaMovimiento {
  id: string
  tipo: CajaTipo
  concepto: string
  monto: number
  viaje_id: string | null
  created_at: string
}

export interface ConfirmarViajePayload {
  origen: string
  destino: string
  pasajeros: number
  fecha_viaje: string | null
  hora_viaje: string | null
  distancia_km: number
  precio_total: number
  cliente_id: string
  chofer_id: string
  vehiculo_id: string
}

export interface TariffRow {
  type: VehicleType
  label: string
  ratePerKm: number
  capacityHint: string
}

export interface NewClienteInput {
  nombre_razon_social: string
  cuil_cuit_dni?: string
  telefono?: string
  email?: string
}

export interface NewChoferInput {
  nombre: string
  licencia_categoria: string
  estado?: ChoferEstado
}

export interface NewVehiculoInput {
  nombre: string
  categoria: VehiculoCategoria
  capacidad: number
  tarifa_km: number
  vtv_vencimiento?: string | null
  seguro_vencimiento?: string | null
  kilometraje?: number
}

export interface NewCajaInput {
  tipo: CajaTipo
  concepto: string
  monto: number
  viaje_id?: string | null
}
