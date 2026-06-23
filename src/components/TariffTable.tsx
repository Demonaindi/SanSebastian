import type { TariffRow } from '../types/database'
import { formatRatePerKm } from '../lib/quote'
import { VehicleIcon } from './VehicleIcon'
import { Card, CardBody, CardHeader } from './ui'

interface TariffTableProps {
  tariffs: TariffRow[]
  compact?: boolean
}

export function TariffTable({ tariffs, compact = false }: TariffTableProps) {
  if (tariffs.length === 0) return null

  return (
    <Card hover={false}>
      <CardHeader
        title="Tabla de tarifas"
        subtitle="Valores en pesos argentinos por kilómetro recorrido"
      />
      <CardBody className="p-0 sm:p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary/10 bg-surface-950/80 text-left">
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Tipo de vehículo
                </th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">
                  Tarifa/km
                </th>
                {!compact && (
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden sm:table-cell">
                    Capacidad
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {tariffs.map((row) => (
                <tr
                  key={row.type}
                  className="border-b border-primary/5 last:border-0 transition-colors hover:bg-primary-muted/30"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <VehicleIcon type={row.type} size="sm" />
                      <span className="font-semibold text-slate-900">{row.label}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="font-mono text-base font-bold text-brand">
                      {formatRatePerKm(row.ratePerKm)}
                    </span>
                  </td>
                  {!compact && (
                    <td className="px-5 py-4 text-slate-600 hidden sm:table-cell">
                      {row.capacityHint}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  )
}
