import { supabase } from '../lib/supabaseClient'
import type {
  ConfirmarViajePayload,
  EstadoPago,
  EstadoViaje,
  ReprogramarViajePayload,
  Viaje,
  ViajeWithRelations,
} from '../types/database'

const VIAJE_RELATIONS = `
  *,
  clientes ( nombre_razon_social, telefono ),
  choferes ( nombre ),
  vehiculos ( nombre, numero_interno, categoria, color )
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
  const fechaHasta = payload.fecha_hasta || payload.fecha_viaje

  const { data, error } = await supabase.rpc('confirmar_viaje', {
    p_origen: payload.origen,
    p_destino: payload.destino,
    p_pasajeros: payload.pasajeros,
    p_fecha_viaje: payload.fecha_viaje,
    p_hora_viaje: payload.hora_viaje ?? null,
    p_distancia_km: payload.distancia_km,
    p_precio_total: payload.precio_total,
    p_cliente_id: payload.cliente_id,
    p_chofer_id: payload.chofer_id ?? null,
    p_vehiculo_id: payload.vehiculo_id,
    p_fecha_hasta: fechaHasta,
    p_hora_regreso: payload.hora_regreso ?? null,
    p_hora_llegada_aprox: payload.hora_llegada_aprox ?? null,
    p_paradas_intermedias: payload.paradas_intermedias ?? null,
    p_precio_base_calculado: payload.precio_base_calculado ?? null,
    p_estado_pago: payload.estado_pago ?? 'Pendiente',
    p_valor_km: payload.valor_km ?? null,
    p_precio_base: payload.precio_base ?? payload.precio_base_calculado ?? null,
    p_adicionales: payload.adicionales ?? [],
  })

  if (error) throw error
  return data as string
}

export async function reprogramarViaje(payload: ReprogramarViajePayload): Promise<string> {
  const { data, error } = await supabase.rpc('reprogramar_viaje', {
    p_viaje_id: payload.viaje_id,
    p_fecha_viaje: payload.fecha_viaje,
    p_fecha_hasta: payload.fecha_hasta ?? payload.fecha_viaje,
    p_hora_viaje: payload.hora_viaje ?? null,
    p_hora_regreso: payload.hora_regreso ?? null,
    p_vehiculo_id: payload.vehiculo_id ?? null,
  })

  if (error) throw error
  return data as string
}

export async function cancelarViaje(id: string): Promise<void> {
  const { error } = await supabase.rpc('cancelar_viaje', { p_viaje_id: id })
  if (error) throw error
}

export async function updateViajePago(
  id: string,
  opts: { estado_pago: EstadoPago; monto_sena?: number },
): Promise<Viaje> {
  const patch: { estado_pago: EstadoPago; monto_sena?: number } = {
    estado_pago: opts.estado_pago,
  }
  if (opts.estado_pago === 'Pendiente') {
    patch.monto_sena = 0
  } else if (opts.monto_sena !== undefined) {
    const n = Number(opts.monto_sena)
    patch.monto_sena = Number.isFinite(n) && n >= 0 ? n : 0
  }

  const { data, error } = await supabase
    .from('viajes')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateViajeEstadoPago(id: string, estado_pago: EstadoPago): Promise<Viaje> {
  return updateViajePago(id, { estado_pago })
}

export async function updateViajePrecio(id: string, precio_total: number): Promise<Viaje> {
  const { data, error } = await supabase
    .from('viajes')
    .update({ precio_total })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateViajeEstado(id: string, estado_viaje: EstadoViaje): Promise<Viaje> {
  const { data, error } = await supabase
    .from('viajes')
    .update({ estado_viaje })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateViajeChofer(id: string, chofer_id: string | null): Promise<Viaje> {
  const { data, error } = await supabase
    .from('viajes')
    .update({ chofer_id })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function finalizarViaje(id: string): Promise<void> {
  const { error } = await supabase.rpc('finalizar_viaje', { p_viaje_id: id })
  if (error) {
    const { error: fallbackError } = await supabase
      .from('viajes')
      .update({ estado_viaje: 'Finalizado' })
      .eq('id', id)
    if (fallbackError) throw error
  }
}

export async function syncChoferEstado(choferId: string | null | undefined): Promise<void> {
  if (!choferId) return
  const { error } = await supabase.rpc('sync_chofer_estado_from_viajes', {
    p_chofer_id: choferId,
  })
  if (error) {
    // Si aún no corrieron la migración SQL, no bloqueamos la operación principal.
  }
}
