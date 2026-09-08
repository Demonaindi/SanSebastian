import { Plus, Trash2 } from 'lucide-react'
import type { Chofer } from '../types/database'
import {
  availableChoferesForSlot,
  emptyChoferSlots,
  MAX_CHOFERES_POR_VIAJE,
  type ChoferSlotForm,
} from '../lib/viajeChoferes'
import { Button, FormField } from './ui'

interface ViajeChoferesFieldsProps {
  slots: ChoferSlotForm[]
  onChange: (slots: ChoferSlotForm[]) => void
  choferes: Chofer[]
  onlyDisponibles?: boolean
  disabled?: boolean
}

export function ViajeChoferesFields({
  slots,
  onChange,
  choferes,
  onlyDisponibles = false,
  disabled = false,
}: ViajeChoferesFieldsProps) {
  const list = slots.length > 0 ? slots : emptyChoferSlots(1)

  const updateSlot = (index: number, patch: Partial<ChoferSlotForm>) => {
    onChange(list.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const addSlot = () => {
    if (list.length >= MAX_CHOFERES_POR_VIAJE) return
    onChange([...list, { chofer_id: '', viaticos: '' }])
  }

  const removeSlot = (index: number) => {
    if (list.length <= 1) {
      onChange([{ chofer_id: '', viaticos: '' }])
      return
    }
    onChange(list.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">Choferes</p>
        <p className="text-[11px] text-slate-500">Hasta {MAX_CHOFERES_POR_VIAJE}</p>
      </div>

      {list.map((slot, index) => {
        const opts = availableChoferesForSlot(choferes, list, index, onlyDisponibles)
        return (
          <div
            key={index}
            className="grid gap-2 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 sm:grid-cols-[1fr_120px_auto]"
          >
            <FormField label={index === 0 ? 'Chofer' : `Chofer ${index + 1}`}>
              <select
                value={slot.chofer_id}
                disabled={disabled}
                onChange={(e) => updateSlot(index, { chofer_id: e.target.value })}
                className="input-field"
              >
                <option value="">Sin asignar</option>
                {opts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} · {c.estado}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Viáticos">
              <input
                type="number"
                min="0"
                step="0.01"
                disabled={disabled || !slot.chofer_id}
                value={slot.viaticos}
                onChange={(e) => updateSlot(index, { viaticos: e.target.value })}
                className="input-field"
                placeholder="0"
              />
            </FormField>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || (list.length === 1 && !slot.chofer_id)}
                onClick={() => removeSlot(index)}
                className="text-rose-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      })}

      {list.length < MAX_CHOFERES_POR_VIAJE && (
        <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={addSlot}>
          <Plus className="h-4 w-4" />
          Agregar chofer
        </Button>
      )}
    </div>
  )
}
