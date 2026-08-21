import { formatCurrency } from './quote'
import {
  formatPresupuestoNumero,
  formatVehiculoPublico,
} from './mappers'
import {
  CONDICIONES_PAGO_DEFAULT,
  DIAS_VALIDEZ_PRESUPUESTO_DEFAULT,
  type AdicionalLinea,
  type Presupuesto,
  type Vehiculo,
} from '../types/database'

export interface QuoteExportData {
  origen: string
  destino: string
  pasajeros: number
  fecha?: string
  fechaHasta?: string
  hora?: string
  distancia: number
  valorKm?: number
  precioBase?: number
  adicionales?: AdicionalLinea[]
  duracionMinutos?: number
  vehiculo: Vehiculo
  precioTotal: number
  precioBaseCalculado?: number
  paradasIntermedias?: string
  presupuesto?: Presupuesto
  diasValidez?: number
  condicionesPago?: string
  clienteNombre?: string
}

function formatFechaWhatsApp(fecha?: string, hora?: string, fechaHasta?: string): string | null {
  if (!fecha && !hora) return null
  const parts: string[] = []
  if (fecha) {
    const start = new Date(fecha + 'T12:00:00')
    const startTxt = start.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    if (fechaHasta && fechaHasta !== fecha) {
      const end = new Date(fechaHasta + 'T12:00:00')
      const endTxt = end.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      parts.push(`${startTxt} → ${endTxt}`)
    } else {
      parts.push(startTxt)
    }
  }
  if (hora) parts.push(`salida ${hora}`)
  return parts.join(' · ')
}

export function buildWhatsAppUrl(data: QuoteExportData): string {
  const numero = data.presupuesto
    ? formatPresupuestoNumero(data.presupuesto.numero)
    : null
  const validez =
    data.presupuesto?.dias_validez ?? data.diasValidez ?? DIAS_VALIDEZ_PRESUPUESTO_DEFAULT
  const condiciones =
    data.presupuesto?.condiciones_pago ?? data.condicionesPago ?? CONDICIONES_PAGO_DEFAULT
  const fechaTxt = formatFechaWhatsApp(data.fecha, data.hora, data.fechaHasta)
  const unidad = formatVehiculoPublico(data.vehiculo)
  const adicionales = data.adicionales ?? data.presupuesto?.adicionales ?? []
  const precioBaseRaw = data.precioBase ?? data.presupuesto?.precio_base ?? data.precioBaseCalculado ?? null
  const adicionalesSum = adicionales.reduce((sum, a) => sum + (Number(a.precio) || 0), 0)
  const baseServicio =
    precioBaseRaw != null && Number(precioBaseRaw) > 0
      ? Number(precioBaseRaw)
      : Math.max(0, Number(data.precioTotal) - adicionalesSum)

  const adicionalLines = adicionales.map(
    (a) => `• ${a.nombre}: ${formatCurrency(Number(a.precio))}`,
  )

  const lines = [
    '*San Sebastián — Viajes & Turismo*',
    'Presupuesto de transporte a medida',
    numero ? `Ref: ${numero}` : '',
    '',
    '────────────────',
    '*SERVICIO*',
    `• Origen: ${data.origen}`,
    `• Destino: ${data.destino}`,
    data.paradasIntermedias ? `• Paradas / itinerario: ${data.paradasIntermedias}` : '',
    `• Pasajeros: ${data.pasajeros}`,
    fechaTxt ? `• Fechas: ${fechaTxt}` : '',
    `• Base del servicio: ${formatCurrency(baseServicio)}`,
    `• Unidad: ${unidad}`,
    adicionales.length ? '' : null,
    adicionales.length ? '*ADICIONALES*' : null,
    ...adicionalLines,
    '',
    '────────────────',
    '*VALOR*',
    `• Total del servicio: *${formatCurrency(data.precioTotal)}*`,
    '',
    '────────────────',
    '*CONDICIONES*',
    `• Validez: ${validez} días`,
    `• Pago: ${condiciones}`,
    '',
    '_Incluye combustible, peajes y seguros de la unidad._',
    '_Alojamiento y comidas de choferes NO incluidos._',
    '',
    'WhatsApp: 3364493088',
  ].filter((line) => line !== '' && line !== null) as string[]

  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`
}

function fileBaseName(data: QuoteExportData): string {
  const n = data.presupuesto?.numero
  return n != null ? `Presupuesto-${String(n).padStart(3, '0')}` : 'Presupuesto-SanSebastian'
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
  const html = buildQuoteHtml(data)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank', 'width=800,height=900')
  if (!win) {
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileBaseName(data)}.html`
    a.click()
    URL.revokeObjectURL(url)
    return
  }
  win.addEventListener('load', () => {
    win.document.title = fileBaseName(data)
    window.setTimeout(() => {
      win.focus()
      win.print()
      URL.revokeObjectURL(url)
    }, 250)
  })
}

function buildQuoteHtml(data: QuoteExportData): string {
  const validez = data.presupuesto?.dias_validez ?? data.diasValidez ?? DIAS_VALIDEZ_PRESUPUESTO_DEFAULT
  const condiciones =
    data.presupuesto?.condiciones_pago ?? data.condicionesPago ?? CONDICIONES_PAGO_DEFAULT
  const fechaLine =
    data.fecha || data.hora
      ? `<tr><td>Fecha / Hora salida</td><td>${[data.fecha, data.hora].filter(Boolean).join(' — ')}${data.fechaHasta && data.fechaHasta !== data.fecha ? ` → ${data.fechaHasta}` : ''}</td></tr>`
      : ''
  const paradasLine = data.paradasIntermedias
    ? `<tr><td>Paradas del itinerario</td><td>${escapeHtml(data.paradasIntermedias)}</td></tr>`
    : ''
  const adicionales = data.adicionales ?? data.presupuesto?.adicionales ?? []
  const precioBaseRaw = data.precioBase ?? data.presupuesto?.precio_base ?? data.precioBaseCalculado ?? null
  const adicionalesSum = adicionales.reduce((sum, a) => sum + (Number(a.precio) || 0), 0)
  const baseServicio =
    precioBaseRaw != null && Number(precioBaseRaw) > 0
      ? Number(precioBaseRaw)
      : Math.max(0, Number(data.precioTotal) - adicionalesSum)
  const adicionalRows = adicionales
    .map(
      (a) =>
        `<tr><td>${escapeHtml(a.nombre)}</td><td>${formatCurrency(Number(a.precio))}</td></tr>`,
    )
    .join('')
  const unidad = formatVehiculoPublico(data.vehiculo)

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Presupuesto — San Sebastián</title>
  <style>
    @page { margin: 18mm; }
    body { font-family: Georgia, "Times New Roman", serif; color: #0f172a; padding: 32px; max-width: 720px; margin: 0 auto; }
    h1 { font-family: Arial, sans-serif; color: #1e3a5f; margin: 0 0 4px; font-size: 28px; letter-spacing: -0.02em; }
    .sub { color: #64748b; font-family: Arial, sans-serif; font-size: 13px; margin-bottom: 28px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-family: Arial, sans-serif; font-size: 14px; }
    td { padding: 11px 12px; border-bottom: 1px solid #e2e8f0; }
    td:first-child { font-weight: 600; width: 42%; color: #475569; }
    .total { font-family: Arial, sans-serif; font-size: 30px; font-weight: 800; color: #1e3a5f; text-align: right; margin-top: 12px; }
    .box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-top:24px; font-family: Arial, sans-serif; font-size:13px; line-height:1.55; }
    .footer { margin-top: 40px; font-family: Arial, sans-serif; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <h1>San Sebastián</h1>
  <p class="sub">Presupuesto de transporte a medida</p>
  <table>
    <tr><td>Origen</td><td>${escapeHtml(data.origen)}</td></tr>
    <tr><td>Destino</td><td>${escapeHtml(data.destino)}</td></tr>
    ${paradasLine}
    <tr><td>Pasajeros</td><td>${data.pasajeros}</td></tr>
    ${fechaLine}
    <tr><td>Base del servicio</td><td>${formatCurrency(baseServicio)}</td></tr>
    <tr><td>Vehículo</td><td>${escapeHtml(unidad)}</td></tr>
    ${adicionalRows}
  </table>
  <div class="total">Total: ${formatCurrency(data.precioTotal)}</div>
  <div class="box">
    <strong>Validez:</strong> ${validez} días corridos desde la emisión.<br/><br/>
    <strong>Condiciones de pago:</strong> ${escapeHtml(condiciones)}
  </div>
  <p class="footer">Emitido el ${new Date().toLocaleString('es-AR')} · San Sebastián Transporte · Guardá como PDF desde el diálogo de impresión</p>
</body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
