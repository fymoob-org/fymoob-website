"use client"

import { useEffect, useRef } from "react"
import { Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps"
import { MapPin } from "lucide-react"

interface LocationMapProps {
  latitude: number | null
  longitude: number | null
  onChange: (lat: number, lng: number) => void
}

/**
 * Mapa interativo Google Maps pro wizard /anuncie. Marker arrastável; updates
 * lat/lng via callback.
 *
 * O <APIProvider> que carrega o SDK fica no AnuncieWizard (envolve o wizard
 * inteiro) — assim useGoogleGeocoder consegue rodar antes do mapa renderizar
 * pra geocodar endereço quando o user preenche o número.
 *
 * Sem coords → não renderiza (não polui UI com mapa vazio).
 */
export function LocationMap({ latitude, longitude, onChange }: LocationMapProps) {
  if (latitude === null || longitude === null) return null

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200">
      <div className="relative h-[320px] w-full">
        <Map
          mapId="fymoob-anuncie-map"
          defaultZoom={16}
          defaultCenter={{ lat: latitude, lng: longitude }}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
        >
          <DraggableMarker lat={latitude} lng={longitude} onChange={onChange} />
        </Map>
        <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-fymoob-gray-dark shadow-md backdrop-blur-sm">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5 text-brand-primary" />
            Arraste o marcador pra ajustar
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Marker arrastavel. Re-centraliza o mapa quando lat/lng mudam externamente
 * (ex: novo CEP). Atualiza state via onChange no dragend.
 */
function DraggableMarker({
  lat,
  lng,
  onChange,
}: {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
}) {
  const map = useMap()
  const lastCenter = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (!map) return
    // So recentraliza se coords mudaram externamente (nao por drag).
    if (
      lastCenter.current &&
      lastCenter.current.lat === lat &&
      lastCenter.current.lng === lng
    ) {
      return
    }
    map.panTo({ lat, lng })
    lastCenter.current = { lat, lng }
  }, [map, lat, lng])

  return (
    <AdvancedMarker
      position={{ lat, lng }}
      draggable
      onDragEnd={(e) => {
        if (e.latLng) {
          const newLat = e.latLng.lat()
          const newLng = e.latLng.lng()
          lastCenter.current = { lat: newLat, lng: newLng }
          onChange(newLat, newLng)
        }
      }}
    />
  )
}
