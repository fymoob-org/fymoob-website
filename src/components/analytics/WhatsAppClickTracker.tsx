"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { getPageContext } from "@/lib/analytics"

/**
 * Listener global delegado pra todos os cliques em [data-track="whatsapp_click"].
 * Dispatch evento GA4 `whatsapp_click` com:
 * - data-source (obrigatorio, ex: "float", "footer", "card", "hero_primary")
 *   -> mapeia pra params `event_label` + `cta_location` (custom dim)
 * - data-property (opcional, codigo do imovel) -> `property_id` (custom dim)
 * - data-empreendimento (opcional, nome do hub) -> `empreendimento`
 * - data-bairro (opcional) -> `neighborhood` (custom dim)
 * - merge com getPageContext() (window.__fymoob_pageContext) — pega
 *   property_type, price_range, bedrooms, listing_purpose quando a pagina
 *   atual eh /imovel/[slug] ou /empreendimento/[slug] e sincronizou via
 *   <PageContextSync>.
 *
 * Substitui o legacy WhatsAppTracker que estava acoplado a paginas de
 * empreendimento. Desde 04/05/2026 vive no layout root pra capturar TODOS
 * os botoes WhatsApp do site (Float, Footer, LandingSEOContent, etc).
 *
 * Refator 08/05/2026 (Fase 2 analytics):
 * - param `property_code` renomeado pra `property_id` (alinha com custom
 *   dim registrada no GA4 Admin)
 * - param `bairro` renomeado pra `neighborhood` (idem)
 * - novos params: `cta_location`, `property_type`, `price_range`,
 *   `bedrooms`, `listing_purpose` — todos via getPageContext quando
 *   aplicavel
 *
 * Pre-requisito: botoes/links com `<a data-track="whatsapp_click" data-source="...">`.
 */
export function WhatsAppClickTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const handler = (e: Event) => {
      const target = e.target
      if (!(target instanceof Element)) return
      const cta = target.closest('[data-track="whatsapp_click"]') as HTMLElement | null
      if (!cta) return

      const source = cta.dataset.source || "unknown"
      const property = cta.dataset.property
      const empreendimento = cta.dataset.empreendimento
      const bairro = cta.dataset.bairro
      const ctx = getPageContext()

      // Merge data-attributes (overrides) com pageContext (defaults).
      // data-attributes ganham porque sao set explicitamente no botao
      // (ex: card de listagem com codigo do imovel daquele card, mesmo
      // numa pagina /busca onde pageContext nao tem property_id).
      const params: Record<string, string | number> = {
        event_category: "engagement",
        event_label: source,
        cta_location: source,
        page_path: pathname,
      }
      if (property) params.property_id = property
      else if (ctx.property_id) params.property_id = ctx.property_id
      if (empreendimento) params.empreendimento = empreendimento
      if (bairro) params.neighborhood = bairro
      else if (ctx.neighborhood) params.neighborhood = ctx.neighborhood
      if (ctx.property_type) params.property_type = ctx.property_type
      if (ctx.price_range) params.price_range = ctx.price_range
      if (ctx.bedrooms != null) params.bedrooms = ctx.bedrooms
      if (ctx.listing_purpose) params.listing_purpose = ctx.listing_purpose

      const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
      if (typeof gtag === "function") {
        gtag("event", "whatsapp_click", params)
      }

      // Tambem empurra pro dataLayer (compat com GTM se um dia usar)
      const dl = (window as unknown as { dataLayer?: unknown[] }).dataLayer
      if (Array.isArray(dl)) {
        dl.push({ event: "whatsapp_click", ...params })
      }
    }

    document.addEventListener("click", handler, { capture: true })
    return () => document.removeEventListener("click", handler, { capture: true })
  }, [pathname])

  return null
}
