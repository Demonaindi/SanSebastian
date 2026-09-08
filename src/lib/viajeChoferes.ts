import type { Chofer, ViajeChoferInput, ViajeChoferWithNombre, ViajeWithRelations } from '../types/database'

export const MAX_CHOFERES_POR_VIAJE = 3

export type ChoferSlotForm = {
  chofer_id: string
  viaticos: string
}

export function emptyChoferSlots(count = 1): ChoferSlotForm[] {
  return Array.from({ length: Math.min(Math.max(count, 1), MAX_CHOFERES_POR_VIAJE) }, () => ({
    chofer_id: '',
    viaticos: '',
  }))
}

export function slotsFromViaje(viaje: ViajeWithRelations): ChoferSlotForm[] {
  const rows = [...(viaje.viaje_choferes ?? [])].sort((a, b) => a.orden - b.orden)
  if (rows.length > 0) {
    return rows.map((r) => ({
      chofer_id: r.chofer_id,
      viaticos: Number(r.viaticos) > 0 ? String(Number(r.viaticos)) : '',
    }))
  }
  if (viaje.chofer_id) {
    return [{ chofer_id: viaje.chofer_id, viaticos: '' }]
  }
  return emptyChoferSlots(1)
}

export function slotsToInput(slots: ChoferSlotForm[]): ViajeChoferInput[] {
  return slots
    .filter((s) => s.chofer_id)
    .map((s) => ({
      chofer_id: s.chofer_id,
      viaticos: parseFloat(s.viaticos) || 0,
    }))
}

export function choferIdsFromViaje(viaje: ViajeWithRelations): string[] {
  const fromJoin = [...(viaje.viaje_choferes ?? [])]
    .sort((a, b) => a.orden - b.orden)
    .map((r) => r.chofer_id)
  if (fromJoin.length > 0) return fromJoin
  return viaje.chofer_id ? [viaje.chofer_id] : []
}

export function formatViajeChoferes(
  viaje: ViajeWithRelations,
  fallbackNombre?: string | null,
): string {
  const rows = [...(viaje.viaje_choferes ?? [])].sort((a, b) => a.orden - b.orden)
  if (rows.length > 0) {
    return rows
      .map((r) => {
        const nombre = r.choferes?.nombre ?? 'Chofer'
        const viaticos = Number(r.viaticos)
        return viaticos > 0 ? `${nombre} (viáticos)` : nombre
      })
      .join(', ')
  }
  return fallbackNombre || viaje.choferes?.nombre || '—'
}

export function formatViajeChoferesDetalle(
  rows: ViajeChoferWithNombre[] | undefined,
  formatMoney: (n: number) => string,
): { nombre: string; viaticos: string }[] {
  return [...(rows ?? [])]
    .sort((a, b) => a.orden - b.orden)
    .map((r) => ({
      nombre: r.choferes?.nombre ?? 'Chofer',
      viaticos: formatMoney(Number(r.viaticos) || 0),
    }))
}

export function availableChoferesForSlot(
  choferes: Chofer[],
  slots: ChoferSlotForm[],
  slotIndex: number,
  onlyDisponibles = false,
): Chofer[] {
  const taken = new Set(
    slots.map((s, i) => (i !== slotIndex && s.chofer_id ? s.chofer_id : '')).filter(Boolean),
  )
  return choferes.filter((c) => {
    if (taken.has(c.id)) return false
    if (!onlyDisponibles) return true
    return c.estado === 'Disponible' || c.estado === 'En viaje' || slots[slotIndex]?.chofer_id === c.id
  })
}
