import { supabase } from '../lib/supabaseClient'
import {
  CONDICIONES_PAGO_DEFAULT,
  DIAS_VALIDEZ_PRESUPUESTO_DEFAULT,
  type AdicionalLinea,
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
  valor_km?: number | null
  precio_base?: number | null
  adicionales?: AdicionalLinea[]
  dias_validez?: number
  paradas_intermedias?: string | null
}

function normalizePresupuesto(row: Presupuesto): Presupuesto {
  return {
    ...row,
    condiciones_pago: row.condiciones_pago || CONDICIONES_PAGO_DEFAULT,
    adicionales: Array.isArray(row.adicionales) ? row.adicionales : [],
    valor_km: row.valor_km ?? null,
    precio_base: row.precio_base ?? null,
  }
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
    p_valor_km: input.valor_km ?? null,
    p_precio_base: input.precio_base ?? null,
    p_adicionales: input.adicionales ?? [],
  })

  if (error) throw error
  return normalizePresupuesto(data as Presupuesto)
}

export async function listPresupuestos(limit = 20): Promise<Presupuesto[]> {
  const { data, error } = await supabase
    .from('presupuestos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []).map((row) => normalizePresupuesto(row as Presupuesto))
}
