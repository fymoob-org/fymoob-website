"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { getPageContext } from "@/lib/analytics"

/**
 * Listener global pra cliques em links `tel:` (telefone direto).
 * Dispatch evento GA4 `phone_click` — Google nao tem evento "recommended"
 * pra phone, entao usamos custom event com schema alinhado a whatsapp_click.
 *
 * Captura QUALQUER `<a href="tel:...">` no site (sem precisar adicionar
 * data-track explicito), MAS tambem permite override via data-source pra
 * elementos que querem rotular o local (ex: data-source="footer_phone").
 *
 * Params enviados (alinhados as custom dimensions GA4):
 *   - event_category: "engagement"
 *   - event_label / cta_location: source (data-source ou "tel_link")
 *   - page_path
 *   - property_id, neighborhood, property_type, price_range, bedrooms,
 *     listing_purpose (via getPageContext quando aplicavel)
 *
 * Pra ser marcado como Key Event no GA4 Admin (similar a whatsapp_click).
 * Valor sugerido: R$ 100-250 (ligacao direta = intencao mais quente que
 * WhatsApp). Adicionar no script ga4-fase1-config.mjs depois do primeiro
 * disparo real (GA4 nao deixa marcar key event de evento que nunca chegou).
 *
 * Criado 08/05/2026 (Fase 2 analytics).
 */
export function PhoneClickTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const handler = (e: Event) => {
      const target = e.target
      if (!(target instanceof Element)) return
      // Aceita tanto o link tel: quanto data-track="phone_click" explicito
      const cta = target.closest(
        '[data-track="phone_click"], a[href^="tel:"]',
      ) as HTMLElement | null
      if (!cta) return

      const source = cta.dataset.source || "tel_link"
      const ctx = getPageContext()

      const params: Record<string, string | number> = {
        event_category: "engagement",
        event_label: source,
        cta_location: source,
        page_path: pathname,
      }
      // Phone number do href (so primeiros digitos pra debug, sem PII full
      // — Google ja loga phone_number raw via Enhanced Conversions se ativado)
      if (cta instanceof HTMLAnchorElement && cta.href.startsWith("tel:")) {
        const num = cta.href.replace("tel:", "").replace(/\D/g, "")
        if (num) params.phone_prefix = num.slice(0, 4) // ex: "5541"
      }
      if (cta.dataset.property) params.property_id = cta.dataset.property
      else if (ctx.property_id) params.property_id = ctx.property_id
      if (ctx.neighborhood) params.neighborhood = ctx.neighborhood
      if (ctx.property_type) params.property_type = ctx.property_type
      if (ctx.price_range) params.price_range = ctx.price_range
      if (ctx.bedrooms != null) params.bedrooms = ctx.bedrooms
      if (ctx.listing_purpose) params.listing_purpose = ctx.listing_purpose

      const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
      if (typeof gtag === "function") {
        gtag("event", "phone_click", params)
      }
      const dl = (window as unknown as { dataLayer?: unknown[] }).dataLayer
      if (Array.isArray(dl)) {
        dl.push({ event: "phone_click", ...params })
      }
    }

    document.addEventListener("click", handler, { capture: true })
    return () => document.removeEventListener("click", handler, { capture: true })
  }, [pathname])

  return null
}
