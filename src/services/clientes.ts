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
  if (!input.nombre_razon_social.trim() || !input.telefono.trim()) {
    throw new Error('Nombre y teléfono son obligatorios.')
  }

  const { data, error } = await supabase
    .from('clientes')
    .insert({
      nombre_razon_social: input.nombre_razon_social.trim(),
      telefono: input.telefono.trim(),
      cuil_cuit_dni: input.cuil_cuit_dni?.trim() || null,
      email: input.email?.trim() || null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateCliente(id: string, input: NewClienteInput): Promise<Cliente> {
  if (!input.nombre_razon_social.trim() || !input.telefono.trim()) {
    throw new Error('Nombre y teléfono son obligatorios.')
  }

  const { data, error } = await supabase
    .from('clientes')
    .update({
      nombre_razon_social: input.nombre_razon_social.trim(),
      telefono: input.telefono.trim(),
      cuil_cuit_dni: input.cuil_cuit_dni?.trim() || null,
      email: input.email?.trim() || null,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteCliente(id: string): Promise<void> {
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) throw error
}
