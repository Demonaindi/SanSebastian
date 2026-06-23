import { supabase } from '../lib/supabaseClient'
import type { Chofer, ChoferEstado, NewChoferInput } from '../types/database'

export async function fetchChoferes(): Promise<Chofer[]> {
  const { data, error } = await supabase
    .from('choferes')
    .select('*')
    .order('nombre')

  if (error) throw error
  return data ?? []
}

export async function createChofer(input: NewChoferInput): Promise<Chofer> {
  const { data, error } = await supabase
    .from('choferes')
    .insert({
      nombre: input.nombre,
      licencia_categoria: input.licencia_categoria,
      estado: input.estado ?? 'Disponible',
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateChoferEstado(id: string, estado: ChoferEstado): Promise<Chofer> {
  const { data, error } = await supabase
    .from('choferes')
    .update({ estado })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteChofer(id: string): Promise<void> {
  const { error } = await supabase.from('choferes').delete().eq('id', id)
  if (error) throw error
}
