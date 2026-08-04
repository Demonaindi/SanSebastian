import { supabase } from '../lib/supabaseClient'
import { deriveEstadoPago } from '../lib/mappers'
import type { NewViajePagoInput, ViajePago } from '../types/database'
import { updateViajePago } from './viajes'

export async function fetchViajePagos(viajeId?: string): Promise<ViajePago[]> {
  let query = supabase
    .from('viaje_pagos')
    .select('*')
    .order('fecha_pago', { ascending: true })
    .order('created_at', { ascending: true })

  if (viajeId) query = query.eq('viaje_id', viajeId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ViajePago[]
}

export async function createViajePago(input: NewViajePagoInput): Promise<ViajePago> {
  const { data, error } = await supabase
    .from('viaje_pagos')
    .insert({
      viaje_id: input.viaje_id,
      monto: input.monto,
      fecha_pago: input.fecha_pago || new Date().toISOString().slice(0, 10),
      observaciones: input.observaciones?.trim() || null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as ViajePago
}

export async function deleteViajePago(id: string): Promise<void> {
  const { error } = await supabase.from('viaje_pagos').delete().eq('id', id)
  if (error) throw error
}

export async function syncViajeEstadoDesdePagos(
  viajeId: string,
  precioTotal: number,
): Promise<void> {
  const pagos = await fetchViajePagos(viajeId)
  const abonado = pagos.reduce((s, p) => s + Number(p.monto), 0)
  const estado = deriveEstadoPago(Number(precioTotal), abonado)
  await updateViajePago(viajeId, { estado_pago: estado, monto_sena: abonado })
}

export function sumPagos(pagos: ViajePago[]): number {
  return pagos.reduce((s, p) => s + Number(p.monto), 0)
}
