const ARGENTINA_BBOX = '-73.5,-55.2,-53.5,-21.8'
const FETCH_TIMEOUT_MS = 12000

export interface MapPoint {
  lat: number
  lon: number
  label: string
}

export interface RouteInfo {
  distanceKm: number
  durationMinutes: number
  originResolved: string
  destinationResolved: string
  origin: MapPoint
  destination: MapPoint
  path: [number, number][]
}

interface GeocodeResult {
  lat: number
  lon: number
  label: string
}

async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('La consulta de ruta tardó demasiado. Probá de nuevo.')
    }
    throw err
  } finally {
    window.clearTimeout(timer)
  }
}

async function geocodeAddress(query: string): Promise<GeocodeResult> {
  const trimmed = query.trim()
  const search = /argentina/i.test(trimmed) ? trimmed : `${trimmed}, Argentina`
  const params = new URLSearchParams({
    q: search,
    limit: '1',
    bbox: ARGENTINA_BBOX,
  })

  const response = await fetchWithTimeout(`https://photon.komoot.io/api/?${params}`)
  if (!response.ok) {
    throw new Error(`No se pudo ubicar "${trimmed}" en el mapa.`)
  }

  const data = (await response.json()) as {
    features?: Array<{
      geometry: { coordinates: [number, number] }
      properties: Record<string, string | undefined>
    }>
  }

  const feature = data.features?.[0]
  if (!feature) {
    throw new Error(`No se encontró "${trimmed}". Probá con ciudad y provincia (ej: Mar del Plata, Buenos Aires).`)
  }

  const [lon, lat] = feature.geometry.coordinates
  const p = feature.properties
  const parts = [p.name, p.city ?? p.county, p.state, p.country].filter(Boolean)
  const label = parts.length > 0 ? parts.join(', ') : trimmed

  return { lat, lon, label }
}

async function fetchDrivingRoute(
  from: GeocodeResult,
  to: GeocodeResult,
): Promise<{ distanceKm: number; durationMinutes: number; path: [number, number][] }> {
  const coords = `${from.lon},${from.lat};${to.lon},${to.lat}`
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`

  const response = await fetchWithTimeout(url)
  if (!response.ok) {
    throw new Error('No se pudo calcular la ruta entre origen y destino.')
  }

  const data = (await response.json()) as {
    code?: string
    routes?: Array<{
      distance: number
      duration: number
      geometry?: { coordinates: [number, number][] }
    }>
  }

  if (data.code !== 'Ok' || !data.routes?.[0]) {
    throw new Error('No hay ruta en carretera disponible entre esos puntos.')
  }

  const route = data.routes[0]
  const rawPath = route.geometry?.coordinates ?? [
    [from.lon, from.lat],
    [to.lon, to.lat],
  ]

  const path: [number, number][] = rawPath.map(([lon, lat]) => [lat, lon])

  return {
    distanceKm: Math.round((route.distance / 1000) * 10) / 10,
    durationMinutes: Math.round(route.duration / 60),
    path,
  }
}

export async function getDrivingRouteDistance(origin: string, destination: string): Promise<RouteInfo> {
  const [from, to] = await Promise.all([geocodeAddress(origin), geocodeAddress(destination)])
  const route = await fetchDrivingRoute(from, to)

  return {
    distanceKm: route.distanceKm,
    durationMinutes: route.durationMinutes,
    originResolved: from.label,
    destinationResolved: to.label,
    origin: { lat: from.lat, lon: from.lon, label: from.label },
    destination: { lat: to.lat, lon: to.lon, label: to.label },
    path: route.path,
  }
}
