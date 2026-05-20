"use client"

import { useCallback, useEffect, useState } from "react"
import { useMapsLibrary } from "@vis.gl/react-google-maps"

/**
 * Hook pra geocodar endereço via Google Maps JS API (client-side).
 *
 * Vantagem: aceita chave restrita por HTTP referer (a restrição padrão
 * do Cloud Console). A API REST do Geocoding REJEITA chave com referer,
 * então o caminho client-side é o único que funciona reusando a mesma
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY do mapa.
 *
 * Cascata interna: rua+numero → rua → bairro → cidade. Sempre devolve
 * coords, no pior caso o centroide da cidade.
 *
 * IMPORTANTE: o componente que usa o hook precisa estar dentro de
 * <APIProvider> pra a lib carregar.
 */
export function useGoogleGeocoder() {
  const geocodingLibrary = useMapsLibrary("geocoding")
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null)

  useEffect(() => {
    if (!geocodingLibrary) return
    setGeocoder(new geocodingLibrary.Geocoder())
  }, [geocodingLibrary])

  const geocode = useCallback(
    async (params: {
      rua: string
      numero?: string
      bairro: string
      cidade: string
      uf?: string
    }): Promise<{ lat: number; lng: number } | null> => {
      if (!geocoder) return null

      const ruaCompleta = [params.rua, params.numero].filter(Boolean).join(", ")
      const queries = [
        [ruaCompleta, params.bairro, params.cidade, params.uf, "Brasil"],
        [params.rua, params.bairro, params.cidade, params.uf, "Brasil"],
        [params.bairro, params.cidade, params.uf, "Brasil"],
        [params.cidade, params.uf, "Brasil"],
      ]
        .map((parts) => parts.filter(Boolean).join(", "))
        .filter((q) => q.length > 3)

      for (const query of queries) {
        try {
          const result = await geocoder.geocode({
            address: query,
            region: "br",
          })
          if (result.results.length > 0) {
            const loc = result.results[0].geometry.location
            return { lat: loc.lat(), lng: loc.lng() }
          }
        } catch {
          // segue pra proxima query menos especifica
        }
      }
      return null
    },
    [geocoder],
  )

  return { geocode, ready: Boolean(geocoder) }
}
