/**
 * Contexto da pagina atual — sincronizado por <PageContextSync> em paginas
 * de imovel/empreendimento/listagem. Trackers globais (WhatsAppClickTracker,
 * PhoneClickTracker) leem dali pra enriquecer eventos com property_id,
 * neighborhood, etc., sem precisar passar via context React (trackers vivem
 * no layout root, fora da arvore das paginas).
 *
 * Os params correspondem 1:1 com as 8 custom dimensions registradas em
 * GA4 Admin (08/05/2026 via scripts/ga4-fase1-config.mjs):
 *   property_id, property_type, neighborhood, price_range, bedrooms,
 *   lead_source, cta_location, listing_purpose.
 */
export interface FymoobPageContext {
  property_id?: string
  property_type?: string
  neighborhood?: string
  price_range?: string
  bedrooms?: number
  listing_purpose?: string
}

declare global {
  interface Window {
    dataLayer: unknown[]
    __fymoob_pageContext?: FymoobPageContext
  }
}

// AnalyticsValue aceita objetos e arrays pra suportar GA4 ecommerce
// schemas (items[], promotions[], etc.)
type AnalyticsValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>
  | Array<Record<string, unknown>>

export function pushAnalyticsEvent(
  event: string,
  params: Record<string, AnalyticsValue> = {},
) {
  if (typeof window === "undefined") return

  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  if (typeof gtag === "function") {
    gtag("event", event, params)
  }

  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({
    event,
    ...params,
  })
}

/**
 * Le o contexto da pagina atual sincronizado por <PageContextSync>.
 * Retorna `{}` se nao definido (paginas sem contexto explicito).
 */
export function getPageContext(): FymoobPageContext {
  if (typeof window === "undefined") return {}
  return window.__fymoob_pageContext || {}
}

/**
 * Mapeia preco numerico pro bucket string usado como custom dimension.
 * Buckets calibrados pro mercado de Curitiba 2026 (FipeZap referencia):
 *   <300k       — popular / 1Q
 *   300-500k    — primeiro imovel / 2Q
 *   500-800k    — medio / 3Q em bairro alto-medio
 *   800k-1.5M   — alto padrao
 *   >1.5M       — premium (Batel/Bigorrilho/Mossungue full)
 */
export function priceToBucket(price: number | null | undefined): string | undefined {
  if (price == null || price <= 0) return undefined
  if (price < 300_000) return "<300k"
  if (price < 500_000) return "300-500k"
  if (price < 800_000) return "500-800k"
  if (price < 1_500_000) return "800k-1.5M"
  return ">1.5M"
}
