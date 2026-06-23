import { supabase } from '../lib/supabaseClient'
import type {
  ConfirmarViajePayload,
  EstadoPago,
  Viaje,
  ViajeWithRelations,
} from '../types/database'

const VIAJE_RELATIONS = `
  *,
  clientes ( nombre_razon_social ),
  choferes ( nombre ),
  vehiculos ( nombre, categoria )
`

export async function fetchViajes(): Promise<ViajeWithRelations[]> {
  const { data, error } = await supabase
    .from('viajes')
    .select(VIAJE_RELATIONS)
    .order('fecha_viaje', { ascending: true, nullsFirst: false })

  if (error) throw error
  return (data ?? []) as ViajeWithRelations[]
}

export async function confirmarViaje(payload: ConfirmarViajePayload): Promise<string> {
  const { data, error } = await supabase.rpc('confirmar_viaje', {
    p_origen: payload.origen,
    p_destino: payload.destino,
    p_pasajeros: payload.pasajeros,
    p_fecha_viaje: payload.fecha_viaje,
    p_hora_viaje: payload.hora_viaje,
    p_distancia_km: payload.distancia_km,
    p_precio_total: payload.precio_total,
    p_cliente_id: payload.cliente_id,
    p_chofer_id: payload.chofer_id,
    p_vehiculo_id: payload.vehiculo_id,
  })

  if (error) throw error
  return data as string
}

export async function updateViajeEstadoPago(id: string, estado_pago: EstadoPago): Promise<Viaje> {
  const { data, error } = await supabase
    .from('viajes')
    .update({ estado_pago })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function finalizarViaje(id: string): Promise<void> {
  const { data: viaje, error: fetchError } = await supabase
    .from('viajes')
    .select('vehiculo_id, chofer_id')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  const { error: viajeError } = await supabase
    .from('viajes')
    .update({ estado_pago: 'Pagado' })
    .eq('id', id)

  if (viajeError) throw viajeError

  if (viaje.vehiculo_id) {
    await supabase.from('vehiculos').update({ estado: 'Disponible' }).eq('id', viaje.vehiculo_id)
  }
  if (viaje.chofer_id) {
    await supabase.from('choferes').update({ estado: 'Disponible' }).eq('id', viaje.chofer_id)
  }
}
