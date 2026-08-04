import { toPng } from 'html-to-image'
import { formatCurrency, formatDurationHours } from './quote'
import { formatVehiculoPublico, getCategoriaLabel } from './mappers'
import {
  CONDICIONES_PAGO_DEFAULT,
  DIAS_VALIDEZ_PRESUPUESTO_DEFAULT,
} from '../types/database'
import type { QuoteExportData } from './exportQuote'

const NAVY = '#0B2F5B'
const NAVY_SOFT = '#1A4A7A'
const ORANGE = '#F08A1A'
const MUTED = '#5B6B7C'
const WRAP =
  'overflow-wrap:anywhere;word-break:break-word;white-space:normal;min-width:0;'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function softClamp(value: string, maxChars: number): string {
  const trimmed = value.trim()
  if (trimmed.length <= maxChars) return trimmed
  return `${trimmed.slice(0, maxChars - 1).trimEnd()}…`
}

function fileBaseName(data: QuoteExportData): string {
  const n = data.presupuesto?.numero
  return n != null ? `Presupuesto-${String(n).padStart(3, '0')}` : 'Presupuesto-SanSebastian'
}

function formatRangoFechas(fecha?: string, hora?: string, fechaHasta?: string): string {
  if (!fecha) return 'A coordinar'
  const start = new Date(fecha + 'T12:00:00')
  if (!fechaHasta || fechaHasta === fecha) {
    let out = start.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    if (hora) out += ` · ${hora}`
    return out.toUpperCase()
  }
  const end = new Date(fechaHasta + 'T12:00:00')
  if (
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear()
  ) {
    const monthYear = start.toLocaleDateString('es-AR', {
      month: 'long',
      year: 'numeric',
    })
    const days: number[] = []
    const cursor = new Date(start)
    while (cursor <= end) {
      days.push(cursor.getDate())
      cursor.setDate(cursor.getDate() + 1)
    }
    const daysTxt =
      days.length === 1
        ? String(days[0])
        : days.length === 2
          ? `${days[0]} y ${days[1]}`
          : `${days.slice(0, -1).join(', ')} y ${days[days.length - 1]}`
    return `${daysTxt} DE ${monthYear}`.toUpperCase()
  }
  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }
  let out = `${start.toLocaleDateString('es-AR', opts)} → ${end.toLocaleDateString('es-AR', opts)}`
  if (hora) out += ` · ${hora}`
  return out.toUpperCase()
}

async function loadBannerDataUrl(): Promise<string> {
  const url = `${window.location.origin}/quote-banner.png`
  const res = await fetch(url)
  if (!res.ok) throw new Error('No se pudo cargar el banner del presupuesto.')
  const blob = await res.blob()
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('No se pudo leer el banner del presupuesto.'))
    reader.readAsDataURL(blob)
  })
}

function iconCircle(svgPath: string): string {
  return `
  <div style="width:28px;height:28px;border-radius:50%;background:#E8EEF5;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${NAVY}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>
  </div>`
}

function summaryItem(label: string, value: string, icon: string): string {
  return `
  <div style="display:flex;gap:10px;align-items:flex-start;${WRAP}">
    ${icon}
    <div style="min-width:0;${WRAP}">
      <div style="font-size:11px;font-weight:800;color:${MUTED};text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(label)}</div>
      <div style="margin-top:2px;font-size:14px;font-weight:800;color:${NAVY};line-height:1.3;${WRAP}">${escapeHtml(value)}</div>
    </div>
  </div>`
}

export function buildVisualQuoteMarkup(data: QuoteExportData, bannerSrc: string): string {
  const validez =
    data.presupuesto?.dias_validez ?? data.diasValidez ?? DIAS_VALIDEZ_PRESUPUESTO_DEFAULT
  const condiciones = softClamp(
    data.presupuesto?.condiciones_pago ?? data.condicionesPago ?? CONDICIONES_PAGO_DEFAULT,
    320,
  )
  const unidad = softClamp(formatVehiculoPublico(data.vehiculo), 140)
  const unidadCorta = softClamp(
    `${getCategoriaLabel(data.vehiculo.categoria)} · ${data.vehiculo.capacidad} PASAJEROS`.toUpperCase(),
    90,
  )
  const cliente = softClamp(data.clienteNombre?.trim() || 'A confirmar', 100)
  const origen = softClamp(data.origen.trim(), 140)
  const destino = softClamp(data.destino.trim(), 140)
  const fechas = formatRangoFechas(data.fecha, data.hora, data.fechaHasta)
  const paradas = data.paradasIntermedias?.trim()
    ? softClamp(data.paradasIntermedias.trim(), 260)
    : ''
  const tiempo = formatDurationHours(data.duracionMinutos)

  const adicionales = data.adicionales ?? data.presupuesto?.adicionales ?? []
  const valorKm = data.valorKm ?? data.presupuesto?.valor_km ?? null
  const precioBase = data.precioBase ?? data.presupuesto?.precio_base ?? data.precioBaseCalculado ?? null

  const servicioItems = [
    `Traslado ida y vuelta ${origen} – ${destino}.`,
    paradas ? `Itinerario / paradas: ${paradas}.` : 'Permanencia durante toda la estadía.',
    `Unidad habilitada para ${data.pasajeros} pasajeros (capacidad ${data.vehiculo.capacidad}).`,
    data.distancia > 0
      ? `Distancia: ${data.distancia} km${tiempo ? ` · ${tiempo}` : ''}${valorKm != null ? ` · ${formatCurrency(valorKm)}/km` : ''}.`
      : null,
    precioBase != null ? `Base del servicio: ${formatCurrency(precioBase)}.` : null,
    ...adicionales.map((a) => `${a.nombre}: ${formatCurrency(Number(a.precio))}.`),
    'Incluye combustible, peajes y seguros.',
  ].filter(Boolean) as string[]

  const routeShort = (value: string) => softClamp(value, 54)

  const userIcon = iconCircle(
    '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
  )
  const pinIcon = iconCircle(
    '<path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  )
  const calIcon = iconCircle(
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  )
  const busIcon = iconCircle(
    '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 17v2M17 17v2M3 12h18"/>',
  )

  return `
<div id="ss-quote-card" style="
  width: 980px;
  background: #ffffff;
  color: #111;
  font-family: Arial, Helvetica, sans-serif;
  overflow: visible;
  position: relative;
  box-sizing: border-box;
">
  <div style="width:100%;line-height:0;background:#fff;">
    <img
      src="${bannerSrc}"
      alt="San Sebastián Viajes &amp; Turismo"
      width="980"
      style="display:block;width:100%;height:auto;"
    />
  </div>

  <div style="padding: 20px 28px 8px; background: #fff;">
    <div style="display:grid;grid-template-columns:1.15fr 0.95fr;gap:22px;align-items:start;">
      <div style="min-width:0;">
        <div style="
          font-size: 30px;
          line-height: 1.05;
          font-weight: 900;
          color: ${NAVY};
          letter-spacing: -0.02em;
          text-transform: uppercase;
          ${WRAP}
        ">Presupuesto de<br/>transporte a medida</div>
        <div style="margin-top:10px;height:3px;width:120px;background:${NAVY_SOFT};border-radius:99px;"></div>
      </div>
      <div style="display:grid;gap:12px;min-width:0;">
        ${summaryItem('Cliente', cliente.toUpperCase(), userIcon)}
        ${summaryItem('Destino', destino.toUpperCase(), pinIcon)}
        ${summaryItem('Fechas', fechas, calIcon)}
        ${summaryItem('Unidad', unidadCorta, busIcon)}
      </div>
    </div>

    <div style="margin-top: 22px; border: 2px solid #B7C9DE; border-radius: 18px; background: #fff; position: relative; padding: 28px 18px 16px; box-sizing: border-box;">
      <div style="
        position: absolute; left: 18px; top: -14px;
        background: ${NAVY}; color: #fff;
        font-size: 11px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase;
        padding: 8px 14px; border-radius: 8px;
      ">Servicio solicitado</div>
      <div style="display:flex;gap:16px;align-items:stretch;">
        <div style="flex:1.4;min-width:0;">
          ${servicioItems
            .map(
              (item) => `
            <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;font-size:13.5px;line-height:1.4;color:#1f2a37;">
              <div style="width:22px;height:22px;border-radius:50%;background:${NAVY};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;flex-shrink:0;">✓</div>
              <div style="${WRAP}">${escapeHtml(item)}</div>
            </div>`,
            )
            .join('')}
          <div style="margin-top:4px;font-size:12px;color:${MUTED};${WRAP}">
            Unidad: ${escapeHtml(unidad)}
          </div>
        </div>
        <div style="
          flex:0.75;min-width:160px;max-width:210px;
          border-radius:16px;background:linear-gradient(180deg,#F3F7FC,#E7EEF7);
          border:1.5px solid #C5D4E6;padding:16px 12px;
          display:flex;flex-direction:column;justify-content:center;align-items:center;
          text-align:center;gap:8px;box-sizing:border-box;
        ">
          <div style="width:14px;height:14px;border-radius:50%;background:#16a34a;border:2px solid ${NAVY};flex-shrink:0;"></div>
          <div style="font-size:11px;font-weight:900;color:${NAVY};text-transform:uppercase;letter-spacing:0.02em;${WRAP}">${escapeHtml(routeShort(origen))}</div>
          <div style="width:2px;height:42px;background:repeating-linear-gradient(${NAVY} 0 5px, transparent 5px 10px);flex-shrink:0;"></div>
          <div style="width:14px;height:14px;border-radius:50%;background:${ORANGE};border:2px solid ${NAVY};flex-shrink:0;"></div>
          <div style="font-size:11px;font-weight:900;color:${NAVY};text-transform:uppercase;letter-spacing:0.02em;${WRAP}">${escapeHtml(routeShort(destino))}</div>
        </div>
      </div>
    </div>

    <div style="margin: 30px auto 8px; max-width: 520px; border: 2px solid #B7C9DE; border-radius: 16px; background: #fff; position: relative; padding: 28px 18px 18px; text-align: center; box-sizing: border-box;">
      <div style="
        position:absolute;left:50%;top:-13px;transform:translateX(-50%);
        background:${NAVY};color:#fff;font-size:11px;font-weight:900;
        letter-spacing:0.08em;text-transform:uppercase;padding:7px 14px;border-radius:8px;white-space:nowrap;
      ">Valor total del servicio</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;">
        <div style="height:3px;width:48px;background:${ORANGE};border-radius:99px;"></div>
        <div style="font-size:46px;font-weight:900;letter-spacing:-0.03em;line-height:1.1;color:${NAVY};${WRAP}">
          ${escapeHtml(formatCurrency(data.precioTotal))}
        </div>
        <div style="height:3px;width:48px;background:${ORANGE};border-radius:99px;"></div>
      </div>
    </div>

    <div style="margin-top: 22px; border: 2px solid #B7C9DE; border-radius: 18px; background: #fff; position: relative; padding: 28px 18px 14px; box-sizing: border-box;">
      <div style="
        position: absolute; left: 18px; top: -14px;
        background: ${NAVY}; color: #fff;
        font-size: 11px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase;
        padding: 8px 14px; border-radius: 8px;
      ">Observaciones</div>
      <div style="font-size: 13px; line-height: 1.5; color: #243041; ${WRAP}">
        <div style="margin-bottom: 8px;">• El alojamiento y las comidas de los choferes <span style="color:${ORANGE};font-weight:900;">NO ESTÁN INCLUIDOS</span> en el valor del servicio.</div>
        <div style="margin-bottom: 8px;">• El hotel y las comidas de los choferes serán provistos y abonados por el contratante (${escapeHtml(cliente)}).</div>
        <div style="margin-bottom: 8px;">• Incluye combustible, peajes y seguros.</div>
        <div style="margin-bottom: 8px;">• Condiciones de pago: ${escapeHtml(condiciones)}</div>
        <div style="margin-bottom: 8px;">• Presupuesto sujeto a disponibilidad de unidades al momento de la confirmación.</div>
        <div>• Validez del presupuesto: <strong>${validez} días</strong>.</div>
      </div>
    </div>

    <div style="margin-top: 26px; display: flex; justify-content: space-between; align-items: flex-end; gap: 14px; padding-bottom: 8px;">
      <div style="min-width:0;${WRAP}">
        <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 28px; color: ${NAVY}; font-style: italic; font-weight: 700;">¡Gracias por elegirnos!</div>
      </div>
      <div style="text-align:right;flex-shrink:0;max-width:280px;${WRAP}">
        <div style="font-size:15px;font-weight:900;color:${NAVY};">San Sebastián</div>
        <div style="font-size:12px;font-weight:700;color:${MUTED};margin-top:2px;">Transporte de Pasajeros</div>
        <div style="font-size:12px;font-weight:700;color:${NAVY};margin-top:4px;">Maximiliano Bertorello</div>
      </div>
    </div>
  </div>

  <div style="height:10px;background:linear-gradient(90deg,${NAVY} 0%,${NAVY} 55%,${ORANGE} 55%,${ORANGE} 100%);"></div>
</div>`
}

export async function exportQuoteImage(data: QuoteExportData): Promise<void> {
  const bannerSrc = await loadBannerDataUrl()
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText =
    'position:fixed;left:-10000px;top:0;width:980px;pointer-events:none;opacity:1;z-index:-1;'
  host.innerHTML = buildVisualQuoteMarkup(data, bannerSrc)
  document.body.appendChild(host)

  const card = host.querySelector('#ss-quote-card') as HTMLElement | null
  if (!card) {
    document.body.removeChild(host)
    throw new Error('No se pudo armar la imagen del presupuesto.')
  }

  const bannerImg = card.querySelector('img')
  if (bannerImg && !bannerImg.complete) {
    await new Promise<void>((resolve, reject) => {
      bannerImg.onload = () => resolve()
      bannerImg.onerror = () => reject(new Error('No se pudo renderizar el banner.'))
    })
  }

  try {
    const dataUrl = await toPng(card, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    })

    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${fileBaseName(data)}.png`
    a.click()
  } finally {
    document.body.removeChild(host)
  }
}
