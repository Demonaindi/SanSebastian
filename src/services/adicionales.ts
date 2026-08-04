import { supabase } from '../lib/supabaseClient'
import type { AdicionalCatalogo } from '../types/database'

export async function fetchAdicionales(): Promise<AdicionalCatalogo[]> {
  const { data, error } = await supabase
    .from('adicionales')
    .select('*')
    .eq('activo', true)
    .order('nombre')

  if (error) throw error
  return (data ?? []) as AdicionalCatalogo[]
}

export async function createAdicional(nombre: string): Promise<AdicionalCatalogo> {
  const { data, error } = await supabase
    .from('adicionales')
    .insert({ nombre: nombre.trim(), activo: true })
    .select('*')
    .single()

  if (error) throw error
  return data as AdicionalCatalogo
}
