"use client"

import { useCallback, useState } from "react"

export interface ViaCEPResult {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  ddd: string
  /** Coords vem do BrasilAPI v2 quando disponivel. Geocode preciso eh feito
   *  client-side via useGoogleGeocoder (Google Maps JS) no SubLocalizacao. */
  latitude?: number
  longitude?: number
  erro?: boolean
}

interface UseViaCEPReturn {
  loading: boolean
  error: string | null
  lookup: (cep: string) => Promise<ViaCEPResult | null>
}

const cache = new Map<string, ViaCEPResult>()

/**
 * Geocoda endereco via Nominatim (OSM). Fallback gratuito sem key — usado
 * apenas quando o usuario faz a busca de CEP e ainda nao tem o Google
 * Geocoder client-side disponivel (ex: race condition na carga inicial).
 * Cobertura limitada em cidades menores; user pode arrastar o pin pra
 * ajustar.
 */
async function geocodeViaNominatim(
  rua: string,
  bairro: string,
  cidade: string,
  uf: string,
): Promise<{ lat: number; lng: number } | null> {
  const queries = [
    [rua, bairro, cidade, uf, "Brasil"],
    [bairro, cidade, uf, "Brasil"],
    [cidade, uf, "Brasil"],
  ]
    .map((parts) => parts.filter(Boolean).join(", "))
    .filter((q) => q.length > 0)

  for (const query of queries) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=br&limit=1`
      const res = await fetch(url)
      if (!res.ok) continue
      const data = await res.json()
      if (!Array.isArray(data) || data.length === 0) continue
      const lat = Number(data[0].lat)
      const lng = Number(data[0].lon)
      if (Number.isNaN(lat) || Number.isNaN(lng)) continue
      return { lat, lng }
    } catch {
      // segue pra proxima query menos especifica
    }
  }
  return null
}

/**
 * Hook pra autocompletar endereço por CEP.
 *
 * Estratégia em cascata:
 *   1. BrasilAPI v2 — endereço + coords (quando disponíveis)
 *   2. ViaCEP — fallback de endereço (sem coords)
 *   3. Nominatim — geocoda o endereço retornado se ainda não tem coords
 *
 * Cache em memória pra evitar refetch do mesmo CEP.
 */
export function useViaCEP(): UseViaCEPReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lookup = useCallback(async (rawCep: string): Promise<ViaCEPResult | null> => {
    const cep = rawCep.replace(/\D/g, "")
    if (cep.length !== 8) {
      setError("CEP deve ter 8 dígitos")
      return null
    }

    if (cache.has(cep)) {
      setError(null)
      return cache.get(cep)!
    }

    setLoading(true)
    setError(null)

    let result: ViaCEPResult | null = null

    // BrasilAPI v2 — primary (endereço + coords quando o service tem).
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`)
      if (res.ok) {
        const data = await res.json()
        result = {
          cep,
          logradouro: data.street || "",
          complemento: "",
          bairro: data.neighborhood || "",
          localidade: data.city || "",
          uf: data.state || "",
          ddd: "",
          latitude: data.location?.coordinates?.latitude
            ? Number(data.location.coordinates.latitude)
            : undefined,
          longitude: data.location?.coordinates?.longitude
            ? Number(data.location.coordinates.longitude)
            : undefined,
        }
      }
    } catch {
      // segue pro fallback
    }

    // Fallback — ViaCEP (so endereco, sem coords).
    if (!result) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
        if (res.ok) {
          const data = await res.json()
          if (!data.erro) {
            result = {
              cep,
              logradouro: data.logradouro || "",
              complemento: data.complemento || "",
              bairro: data.bairro || "",
              localidade: data.localidade || "",
              uf: data.uf || "",
              ddd: data.ddd || "",
            }
          }
        }
      } catch {
        // segue pro erro abaixo
      }
    }

    setLoading(false)

    if (!result) {
      setError("CEP não encontrado")
      return null
    }

    // Quando BrasilAPI nao trouxe coords, usamos Nominatim como pseudo-inicial.
    // O refino preciso (rua+numero) acontece via useGoogleGeocoder no
    // SubLocalizacao depois que o user digita o numero.
    if (!result.latitude || !result.longitude) {
      const coords = await geocodeViaNominatim(
        result.logradouro,
        result.bairro,
        result.localidade,
        result.uf,
      )
      if (coords) {
        result.latitude = coords.lat
        result.longitude = coords.lng
      }
    }

    cache.set(cep, result)
    return result
  }, [])

  return { loading, error, lookup }
}
