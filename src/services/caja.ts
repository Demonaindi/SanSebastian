import { supabase } from '../lib/supabaseClient'
import type { CajaMovimiento, NewCajaInput } from '../types/database'

export async function fetchCajaMovimientos(): Promise<CajaMovimiento[]> {
  const { data, error } = await supabase
    .from('caja_diaria')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function createCajaMovimiento(input: NewCajaInput): Promise<CajaMovimiento> {
  const { data, error } = await supabase
    .from('caja_diaria')
    .insert({
      tipo: input.tipo,
      concepto: input.concepto,
      monto: input.monto,
      viaje_id: input.viaje_id ?? null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteCajaMovimiento(id: string): Promise<void> {
  const { error } = await supabase.from('caja_diaria').delete().eq('id', id)
  if (error) throw error
}
