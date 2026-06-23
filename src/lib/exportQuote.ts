import { formatCurrency, formatRatePerKm } from './quote'
import { getCategoriaLabel, getRateForVehiculo } from './mappers'
import type { Vehiculo } from '../types/database'

export interface QuoteExportData {
  origen: string
  destino: string
  pasajeros: number
  fecha?: string
  hora?: string
  distancia: number
  vehiculo: Vehiculo
  precioTotal: number
}

export function buildWhatsAppUrl(data: QuoteExportData): string {
  const lines = [
    '*San Sebastián — Presupuesto de viaje*',
    '',
    `📍 Origen: ${data.origen}`,
    `📍 Destino: ${data.destino}`,
    `👥 Pasajeros: ${data.pasajeros}`,
    data.fecha ? `📅 Fecha: ${data.fecha}${data.hora ? ` ${data.hora}` : ''}` : '',
    `🛣️ Distancia estimada: ${data.distancia} km`,
    `🚌 Vehículo: ${data.vehiculo.nombre} (${getCategoriaLabel(data.vehiculo.categoria)})`,
    `💰 Tarifa: ${formatRatePerKm(getRateForVehiculo(data.vehiculo))}`,
    `*Total estimado: ${formatCurrency(data.precioTotal)}*`,
    '',
    '_Autotransporte de pasajeros_',
  ].filter(Boolean)

  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`
}

export function printQuote(data: QuoteExportData): void {
  const html = buildQuoteHtml(data)
  const win = window.open('', '_blank', 'width=800,height=900')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}

export function exportQuotePdf(data: QuoteExportData): void {
  printQuote(data)
}

function buildQuoteHtml(data: QuoteExportData): string {
  const fechaLine =
    data.fecha || data.hora
      ? `<tr><td>Fecha / Hora</td><td>${[data.fecha, data.hora].filter(Boolean).join(' — ')}</td></tr>`
      : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Presupuesto San Sebastián</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1e293b; padding: 40px; max-width: 720px; margin: 0 auto; }
    h1 { color: #2c5697; margin-bottom: 4px; }
    .sub { color: #64748b; font-size: 14px; margin-bottom: 32px; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    td:first-child { font-weight: 600; width: 40%; color: #475569; }
    .total { font-size: 28px; font-weight: bold; color: #2c5697; text-align: right; margin-top: 24px; }
    .footer { margin-top: 48px; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <h1>San Sebastián</h1>
  <p class="sub">Autotransporte de pasajeros — Presupuesto estimado</p>
  <table>
    <tr><td>Origen</td><td>${data.origen}</td></tr>
    <tr><td>Destino</td><td>${data.destino}</td></tr>
    <tr><td>Pasajeros</td><td>${data.pasajeros}</td></tr>
    ${fechaLine}
    <tr><td>Distancia estimada</td><td>${data.distancia} km</td></tr>
    <tr><td>Vehículo</td><td>${data.vehiculo.nombre} (${getCategoriaLabel(data.vehiculo.categoria)})</td></tr>
    <tr><td>Tarifa</td><td>${formatRatePerKm(getRateForVehiculo(data.vehiculo))}</td></tr>
  </table>
  <div class="total">Total: ${formatCurrency(data.precioTotal)}</div>
  <p class="footer">Documento generado el ${new Date().toLocaleString('es-AR')} · Valores estimados sujetos a confirmación.</p>
</body>
</html>`
}
