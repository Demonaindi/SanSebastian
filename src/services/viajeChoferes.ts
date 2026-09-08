import { supabase } from '../lib/supabaseClient'
import { MAX_CHOFERES_POR_VIAJE } from '../lib/viajeChoferes'
import type { ViajeChoferInput } from '../types/database'
import { syncChoferEstado } from './viajes'

export { MAX_CHOFERES_POR_VIAJE }

export async function setViajeChoferes(
  viajeId: string,
  items: ViajeChoferInput[],
  previousChoferIds: (string | null | undefined)[] = [],
): Promise<void> {
  const cleaned = items
    .filter((x) => x.chofer_id)
    .slice(0, MAX_CHOFERES_POR_VIAJE)
    .map((x) => ({
      chofer_id: x.chofer_id,
      viaticos: Number.isFinite(x.viaticos) && x.viaticos > 0 ? x.viaticos : 0,
    }))

  const ids = cleaned.map((x) => x.chofer_id)
  if (new Set(ids).size !== ids.length) {
    throw new Error('No se puede asignar el mismo chofer más de una vez')
  }

  const { error } = await supabase.rpc('set_viaje_choferes', {
    p_viaje_id: viajeId,
    p_items: cleaned,
  })

  if (error) {
    const { error: delError } = await supabase.from('viaje_choferes').delete().eq('viaje_id', viajeId)
    if (delError) throw error

    if (cleaned.length > 0) {
      const rows = cleaned.map((x, i) => ({
        viaje_id: viajeId,
        chofer_id: x.chofer_id,
        viaticos: x.viaticos,
        orden: i + 1,
      }))
      const { error: insError } = await supabase.from('viaje_choferes').insert(rows)
      if (insError) throw error
    }

    const { error: patchError } = await supabase
      .from('viajes')
      .update({ chofer_id: cleaned[0]?.chofer_id ?? null })
      .eq('id', viajeId)
    if (patchError) throw patchError
  }

  const affected = new Set<string>()
  for (const id of previousChoferIds) {
    if (id) affected.add(id)
  }
  for (const id of ids) affected.add(id)
  await Promise.all([...affected].map((id) => syncChoferEstado(id)))
}
