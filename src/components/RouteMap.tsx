import { useEffect } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { MapPoint } from '../lib/routing'

interface RouteMapProps {
  origin: MapPoint
  destination: MapPoint
  path: [number, number][]
}

function FitRouteBounds({ path, origin, destination }: RouteMapProps) {
  const map = useMap()

  useEffect(() => {
    const bounds = L.latLngBounds([
      [origin.lat, origin.lon],
      [destination.lat, destination.lon],
      ...path,
    ])
    map.fitBounds(bounds, { padding: [32, 32] })
  }, [map, path, origin, destination])

  return null
}

function pointIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

export function RouteMap({ origin, destination, path }: RouteMapProps) {
  const center: [number, number] = [
    (origin.lat + destination.lat) / 2,
    (origin.lon + destination.lon) / 2,
  ]

  return (
    <div className="max-w-full min-w-0 overflow-hidden rounded-xl border border-primary/15">
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom={false}
        className="z-0 h-52 w-full max-w-full sm:h-72"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitRouteBounds origin={origin} destination={destination} path={path} />
        <Polyline
          positions={path}
          pathOptions={{ color: '#2c5697', weight: 5, opacity: 0.85 }}
        />
        <Marker position={[origin.lat, origin.lon]} icon={pointIcon('#15803d')}>
          <Tooltip permanent direction="top" offset={[0, -10]} className="route-map-tooltip">
            Origen
          </Tooltip>
        </Marker>
        <Marker position={[destination.lat, destination.lon]} icon={pointIcon('#be123c')}>
          <Tooltip permanent direction="top" offset={[0, -10]} className="route-map-tooltip">
            Destino
          </Tooltip>
        </Marker>
      </MapContainer>
    </div>
  )
}
