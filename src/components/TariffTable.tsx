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
    <Card hover={false} className="min-w-0 overflow-hidden">
      <CardHeader
        title="Tabla de tarifas"
        subtitle="Valores en pesos argentinos por kilómetro recorrido"
      />
      <CardBody className="!p-0">
        <div className="divide-y divide-slate-100 sm:hidden">
          {tariffs.map((row) => (
            <div key={row.type} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <VehicleIcon type={row.type} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{row.label}</p>
                  {!compact && (
                    <p className="truncate text-[11px] text-slate-400">{row.capacityHint}</p>
                  )}
                </div>
              </div>
              <p className="shrink-0 font-mono text-sm font-bold text-brand">
                {formatRatePerKm(row.ratePerKm)}
              </p>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-0 text-sm">
            <thead>
              <tr className="border-b border-primary/10 bg-surface-950/80 text-left">
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Tipo de vehículo
                </th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Tarifa/km
                </th>
                {!compact && (
                  <th className="hidden px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 md:table-cell">
                    Capacidad
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {tariffs.map((row) => (
                <tr
                  key={row.type}
                  className="border-b border-primary/5 transition-colors last:border-0 hover:bg-primary-muted/30"
                >
                  <td className="px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
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
                    <td className="hidden px-5 py-4 text-slate-600 md:table-cell">
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
