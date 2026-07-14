import { supabase } from '../lib/supabaseClient'
import {
  CONDICIONES_PAGO_DEFAULT,
  DIAS_VALIDEZ_PRESUPUESTO_DEFAULT,
  type Presupuesto,
} from '../types/database'

export interface GenerarPresupuestoInput {
  origen: string
  destino: string
  pasajeros: number
  fecha_viaje?: string | null
  hora_viaje?: string | null
  distancia_km: number
  vehiculo_nombre: string
  vehiculo_categoria: string
  precio_total: number
  dias_validez?: number
  paradas_intermedias?: string | null
}

export async function generarPresupuesto(input: GenerarPresupuestoInput): Promise<Presupuesto> {
  const { data, error } = await supabase.rpc('generar_presupuesto', {
    p_origen: input.origen,
    p_destino: input.destino,
    p_pasajeros: input.pasajeros,
    p_fecha_viaje: input.fecha_viaje ?? null,
    p_hora_viaje: input.hora_viaje ?? null,
    p_distancia_km: input.distancia_km,
    p_vehiculo_nombre: input.vehiculo_nombre,
    p_vehiculo_categoria: input.vehiculo_categoria,
    p_precio_total: input.precio_total,
    p_dias_validez: input.dias_validez ?? DIAS_VALIDEZ_PRESUPUESTO_DEFAULT,
    p_paradas_intermedias: input.paradas_intermedias ?? null,
  })

  if (error) throw error
  return {
    ...data,
    condiciones_pago: data.condiciones_pago || CONDICIONES_PAGO_DEFAULT,
  } as Presupuesto
}
