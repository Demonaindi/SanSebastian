import { supabase } from '../lib/supabaseClient'
import type { Cliente, NewClienteInput } from '../types/database'

export async function fetchClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nombre_razon_social')

  if (error) throw error
  return data ?? []
}

export async function createCliente(input: NewClienteInput): Promise<Cliente> {
  const { data, error } = await supabase
    .from('clientes')
    .insert({
      nombre_razon_social: input.nombre_razon_social,
      cuil_cuit_dni: input.cuil_cuit_dni ?? null,
      telefono: input.telefono ?? null,
      email: input.email ?? null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteCliente(id: string): Promise<void> {
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) throw error
}
