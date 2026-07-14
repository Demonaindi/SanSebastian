import { supabase } from '../lib/supabaseClient'
import type { NewVehiculoInput, Vehiculo, VehiculoEstado } from '../types/database'

export async function fetchVehiculos(): Promise<Vehiculo[]> {
  const { data, error } = await supabase
    .from('vehiculos')
    .select('*')
    .order('nombre')

  if (error) throw error
  return (data ?? []).map((v) => ({
    ...v,
    color: v.color || '#3b82f6',
    matafuegos_vencimiento: v.matafuegos_vencimiento ?? null,
  }))
}

export async function createVehiculo(input: NewVehiculoInput): Promise<Vehiculo> {
  const { data, error } = await supabase
    .from('vehiculos')
    .insert({
      nombre: input.nombre,
      categoria: input.categoria,
      capacidad: input.capacidad,
      tarifa_km: input.tarifa_km,
      color: input.color || '#3b82f6',
      vtv_vencimiento: input.vtv_vencimiento ?? null,
      seguro_vencimiento: input.seguro_vencimiento ?? null,
      matafuegos_vencimiento: input.matafuegos_vencimiento ?? null,
      kilometraje: input.kilometraje ?? 0,
      estado: 'Disponible',
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateVehiculo(
  id: string,
  input: Partial<NewVehiculoInput> & { estado?: VehiculoEstado },
): Promise<Vehiculo> {
  const { data, error } = await supabase
    .from('vehiculos')
    .update(input)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateVehiculoTarifa(id: string, tarifa_km: number): Promise<Vehiculo> {
  return updateVehiculo(id, { tarifa_km })
}

export async function updateVehiculoEstado(id: string, estado: VehiculoEstado): Promise<Vehiculo> {
  return updateVehiculo(id, { estado })
}

export async function deleteVehiculo(id: string): Promise<void> {
  const { error } = await supabase.from('vehiculos').delete().eq('id', id)
  if (error) throw error
}
