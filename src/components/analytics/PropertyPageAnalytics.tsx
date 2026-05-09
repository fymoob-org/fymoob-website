"use client"

import { useEffect } from "react"

import type { PropertyPageVariant } from "@/types/property"
import { pushAnalyticsEvent } from "@/lib/analytics"

interface PropertyPageAnalyticsProps {
  propertyCode: string
  variant: PropertyPageVariant
  isConsultPrice: boolean
  priceBucket: string
  price: number | null
  /** Tipo do imovel (Apartamento, Casa, Sobrado, etc). Custom dim. */
  propertyType?: string
  /** Bairro — custom dim `neighborhood`. */
  neighborhood?: string
  /** Quartos — custom dim. */
  bedrooms?: number
  /** Finalidade ("venda", "aluguel", "ambos") — custom dim `listing_purpose`. */
  listingPurpose?: string
  /** Titulo do imovel pra `view_item.item_name`. */
  title?: string
}

/**
 * Dispara dois eventos por carregamento de pagina de imovel:
 *
 * 1. `view_item` (Google recommended) — desbloqueia relatorios prontos
 *    de "Item performance" e funciona com Enhanced Ecommerce report.
 *    Schema padrao: items[] array + currency + value top-level.
 *
 * 2. `property_page_view` (legacy custom) — mantido pra compat com
 *    relatorios/segmentos existentes baseados nele.
 *
 * Ambos sao deduplicados por sessionStorage (1 disparo por imovel/variant
 * por sessao do navegador).
 *
 * Refator 08/05/2026 (Fase 2 analytics):
 * - Adicionado view_item Google standard
 * - Aceita props extras pra alimentar custom dimensions: property_type,
 *   neighborhood, bedrooms, listing_purpose
 */
export function PropertyPageAnalytics({
  propertyCode,
  variant,
  isConsultPrice,
  priceBucket,
  price,
  propertyType,
  neighborhood,
  bedrooms,
  listingPurpose,
  title,
}: PropertyPageAnalyticsProps) {
  useEffect(() => {
    const key = `fymoob:pdp-analytics:${propertyCode}:${variant}`
    if (window.sessionStorage.getItem(key)) return

    // 1. view_item (Google recommended) — top-level params + items[].
    // GA4 standard schema: https://support.google.com/analytics/answer/9267735
    const value = isConsultPrice ? 0 : price ?? 0
    pushAnalyticsEvent("view_item", {
      currency: "BRL",
      value,
      // Custom dimensions registradas em ga4-fase1-config (event-scoped)
      property_id: propertyCode,
      ...(propertyType ? { property_type: propertyType } : {}),
      ...(neighborhood ? { neighborhood } : {}),
      ...(bedrooms != null ? { bedrooms } : {}),
      price_range: priceBucket,
      ...(listingPurpose ? { listing_purpose: listingPurpose } : {}),
      // items[] array — schema GA4 ecommerce
      items: [
        {
          item_id: propertyCode,
          item_name: title || propertyCode,
          ...(propertyType ? { item_category: propertyType } : {}),
          ...(neighborhood ? { item_category2: neighborhood } : {}),
          ...(listingPurpose ? { item_category3: listingPurpose } : {}),
          price: value,
          quantity: 1,
        },
      ],
    })

    // 2. property_page_view (custom legacy) — mantido pra compat.
    pushAnalyticsEvent("property_page_view", {
      property_code: propertyCode,
      page_variant: variant,
      is_consult_price: isConsultPrice,
      price_bucket: priceBucket,
      price: isConsultPrice ? null : price,
    })

    window.sessionStorage.setItem(key, "1")
  }, [
    isConsultPrice,
    price,
    priceBucket,
    propertyCode,
    variant,
    propertyType,
    neighborhood,
    bedrooms,
    listingPurpose,
    title,
  ])

  return null
}
