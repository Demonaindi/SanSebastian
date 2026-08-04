export type UserRole = 'Administrador' | 'Operador'

export type ChoferEstado = 'Disponible' | 'En viaje' | 'Franco' | 'Licencia'
export type VehiculoEstado = 'Disponible' | 'En viaje'
export type VehiculoCategoria = 'Combi' | '1 piso' | '2 pisos'
export type EstadoPago = 'Pendiente' | 'Señado' | 'Pagado'
export type EstadoViaje = 'Reservado' | 'Confirmado' | 'Cancelado' | 'Reprogramado' | 'Finalizado'
export type CajaTipo = 'Ingreso' | 'Egreso'

export type VehicleType = 'combi' | 'bus1' | 'bus2'

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
  telefono: string
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
  numero_interno: string | null
  categoria: VehiculoCategoria
  capacidad: number
  tarifa_km: number
  estado: VehiculoEstado
  color: string
  vtv_vencimiento: string | null
  seguro_vencimiento: string | null
  matafuegos_vencimiento: string | null
  kilometraje: number
  created_at: string
}

export interface Viaje {
  id: string
  origen: string
  destino: string
  pasajeros: number
  fecha_viaje: string
  fecha_hasta: string | null
  hora_viaje: string | null
  hora_regreso: string | null
  hora_llegada_aprox: string | null
  distancia_km: number
  precio_base_calculado: number | null
  precio_total: number
  valor_km: number | null
  precio_base: number | null
  adicionales: AdicionalLinea[]
  paradas_intermedias: string | null
  estado_pago: EstadoPago
  estado_viaje: EstadoViaje
  cliente_id: string | null
  chofer_id: string | null
  vehiculo_id: string | null
  created_at: string
}

export interface ViajeWithRelations extends Viaje {
  clientes?: Pick<Cliente, 'nombre_razon_social' | 'telefono'> | null
  choferes?: Pick<Chofer, 'nombre'> | null
  vehiculos?: Pick<Vehiculo, 'nombre' | 'numero_interno' | 'categoria' | 'color'> | null
}

export interface AdicionalCatalogo {
  id: string
  nombre: string
  activo: boolean
  created_at: string
}

export interface AdicionalLinea {
  nombre: string
  precio: number
}

export interface Presupuesto {
  id: string
  numero: number
  origen: string
  destino: string
  pasajeros: number
  fecha_viaje: string | null
  hora_viaje: string | null
  distancia_km: number
  vehiculo_nombre: string | null
  vehiculo_categoria: string | null
  precio_total: number
  valor_km: number | null
  precio_base: number | null
  adicionales: AdicionalLinea[]
  dias_validez: number
  condiciones_pago: string
  paradas_intermedias: string | null
  created_by: string | null
  created_at: string
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
  fecha_viaje: string
  fecha_hasta?: string | null
  hora_viaje?: string | null
  hora_regreso?: string | null
  hora_llegada_aprox?: string | null
  distancia_km: number
  precio_total: number
  precio_base_calculado?: number | null
  valor_km?: number | null
  precio_base?: number | null
  adicionales?: AdicionalLinea[]
  paradas_intermedias?: string | null
  estado_pago?: EstadoPago
  cliente_id: string
  chofer_id?: string | null
  vehiculo_id: string
}

export interface ReprogramarViajePayload {
  viaje_id: string
  fecha_viaje: string
  fecha_hasta?: string | null
  hora_viaje?: string | null
  hora_regreso?: string | null
  vehiculo_id?: string | null
}

export interface TariffRow {
  type: VehicleType
  label: string
  ratePerKm: number
  capacityHint: string
}

export interface NewClienteInput {
  nombre_razon_social: string
  telefono: string
  cuil_cuit_dni?: string
  email?: string
}

export interface NewChoferInput {
  nombre: string
  licencia_categoria: string
  estado?: ChoferEstado
}

export interface NewVehiculoInput {
  nombre?: string
  numero_interno: string
  categoria: VehiculoCategoria
  capacidad: number
  tarifa_km?: number
  color?: string
  vtv_vencimiento?: string | null
  seguro_vencimiento?: string | null
  matafuegos_vencimiento?: string | null
  kilometraje?: number
}

export interface NewCajaInput {
  tipo: CajaTipo
  concepto: string
  monto: number
  viaje_id?: string | null
}

export const CONDICIONES_PAGO_DEFAULT =
  'Seña del 50% para confirmar. Saldo restante 48 hs antes del viaje. Cancelaciones con menos de 72 hs: seña no reembolsable.'

export const DIAS_VALIDEZ_PRESUPUESTO_DEFAULT = 7
