import { formatCurrency, formatRatePerKm } from './quote'
import { formatPresupuestoNumero, getCategoriaLabel, getRateForVehiculo } from './mappers'
import {
  CONDICIONES_PAGO_DEFAULT,
  DIAS_VALIDEZ_PRESUPUESTO_DEFAULT,
  type Presupuesto,
  type Vehiculo,
} from '../types/database'

export interface QuoteExportData {
  origen: string
  destino: string
  pasajeros: number
  fecha?: string
  hora?: string
  distancia: number
  duracionMinutos?: number
  vehiculo: Vehiculo
  precioTotal: number
  precioBaseCalculado?: number
  paradasIntermedias?: string
  presupuesto?: Presupuesto
  diasValidez?: number
  condicionesPago?: string
}

export function buildWhatsAppUrl(data: QuoteExportData): string {
  const numero = data.presupuesto
    ? formatPresupuestoNumero(data.presupuesto.numero)
    : 'Presupuesto estimado'
  const validez = data.presupuesto?.dias_validez ?? data.diasValidez ?? DIAS_VALIDEZ_PRESUPUESTO_DEFAULT
  const condiciones =
    data.presupuesto?.condiciones_pago ?? data.condicionesPago ?? CONDICIONES_PAGO_DEFAULT

  const lines = [
    `*San Sebastián — ${numero}*`,
    '',
    `📍 Origen: ${data.origen}`,
    `📍 Destino: ${data.destino}`,
    data.paradasIntermedias ? `🚏 Paradas: ${data.paradasIntermedias}` : '',
    `👥 Pasajeros: ${data.pasajeros}`,
    data.fecha ? `📅 Fecha: ${data.fecha}${data.hora ? ` ${data.hora}` : ''}` : '',
    `🛣️ Distancia (origen→destino): ${data.distancia} km`,
    data.duracionMinutos ? `⏱️ Tiempo estimado: ~${data.duracionMinutos} min` : '',
    `🚌 Vehículo: ${data.vehiculo.nombre} (${getCategoriaLabel(data.vehiculo.categoria)})`,
    `💰 Tarifa base: ${formatRatePerKm(getRateForVehiculo(data.vehiculo))}`,
    `*Total: ${formatCurrency(data.precioTotal)}*`,
    '',
    `⏳ Validez: ${validez} días`,
    `💳 Condiciones de pago: ${condiciones}`,
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
  const numero = data.presupuesto
    ? formatPresupuestoNumero(data.presupuesto.numero)
    : 'Presupuesto estimado'
  const validez = data.presupuesto?.dias_validez ?? data.diasValidez ?? DIAS_VALIDEZ_PRESUPUESTO_DEFAULT
  const condiciones =
    data.presupuesto?.condiciones_pago ?? data.condicionesPago ?? CONDICIONES_PAGO_DEFAULT
  const fechaLine =
    data.fecha || data.hora
      ? `<tr><td>Fecha / Hora salida</td><td>${[data.fecha, data.hora].filter(Boolean).join(' — ')}</td></tr>`
      : ''
  const paradasLine = data.paradasIntermedias
    ? `<tr><td>Paradas del itinerario</td><td>${data.paradasIntermedias}</td></tr>`
    : ''
  const baseLine =
    data.precioBaseCalculado != null && data.precioBaseCalculado !== data.precioTotal
      ? `<tr><td>Precio calculado (origen→destino)</td><td>${formatCurrency(data.precioBaseCalculado)}</td></tr>`
      : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${numero} — San Sebastián</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1e293b; padding: 40px; max-width: 720px; margin: 0 auto; }
    h1 { color: #2c5697; margin-bottom: 4px; }
    .badge { display:inline-block; background:#2c5697; color:#fff; padding:6px 12px; border-radius:999px; font-size:13px; font-weight:700; margin-bottom:16px; }
    .sub { color: #64748b; font-size: 14px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    td:first-child { font-weight: 600; width: 42%; color: #475569; }
    .total { font-size: 28px; font-weight: bold; color: #2c5697; text-align: right; margin-top: 16px; }
    .box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-top:24px; font-size:13px; line-height:1.5; }
    .footer { margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="badge">${numero}</div>
  <h1>San Sebastián</h1>
  <p class="sub">Autotransporte de pasajeros — Presupuesto formal</p>
  <table>
    <tr><td>Origen</td><td>${data.origen}</td></tr>
    <tr><td>Destino</td><td>${data.destino}</td></tr>
    ${paradasLine}
    <tr><td>Pasajeros</td><td>${data.pasajeros}</td></tr>
    ${fechaLine}
    <tr><td>Distancia origen→destino</td><td>${data.distancia} km${data.duracionMinutos ? ` (~${data.duracionMinutos} min)` : ''}</td></tr>
    <tr><td>Vehículo</td><td>${data.vehiculo.nombre} (${getCategoriaLabel(data.vehiculo.categoria)})</td></tr>
    <tr><td>Tarifa/km</td><td>${formatRatePerKm(getRateForVehiculo(data.vehiculo))}</td></tr>
    ${baseLine}
  </table>
  <div class="total">Total: ${formatCurrency(data.precioTotal)}</div>
  <div class="box">
    <strong>Validez:</strong> ${validez} días corridos desde la emisión.<br/><br/>
    <strong>Condiciones de pago:</strong> ${condiciones}
  </div>
  <p class="footer">Emitido el ${new Date().toLocaleString('es-AR')} · San Sebastián Transporte</p>
</body>
</html>`
}
