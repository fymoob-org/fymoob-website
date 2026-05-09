"use client"

import { useEffect } from "react"
import type { FymoobPageContext } from "@/lib/analytics"

/**
 * Sincroniza o contexto da pagina atual em window.__fymoob_pageContext.
 * Usado pra que trackers globais (WhatsAppClickTracker, PhoneClickTracker)
 * — que vivem no layout root, fora da arvore React desta pagina — possam
 * ler property_id, neighborhood, price_range, etc. ao disparar eventos.
 *
 * Limpa o contexto no unmount pra evitar leakage entre paginas em
 * navegacao client-side (Next App Router).
 *
 * Uso (em /imovel/[slug] ou /empreendimento/[slug]):
 *
 *   <PageContextSync
 *     property_id={property.codigo}
 *     property_type={property.tipo}
 *     neighborhood={property.bairro}
 *     price_range={priceToBucket(property.precoVenda)}
 *     bedrooms={property.dormitorios}
 *     listing_purpose={property.finalidade === "Venda" ? "venda" : "aluguel"}
 *   />
 */
export function PageContextSync(props: FymoobPageContext) {
  useEffect(() => {
    const ctx: FymoobPageContext = {}
    if (props.property_id) ctx.property_id = props.property_id
    if (props.property_type) ctx.property_type = props.property_type
    if (props.neighborhood) ctx.neighborhood = props.neighborhood
    if (props.price_range) ctx.price_range = props.price_range
    if (props.bedrooms != null) ctx.bedrooms = props.bedrooms
    if (props.listing_purpose) ctx.listing_purpose = props.listing_purpose

    window.__fymoob_pageContext = ctx

    return () => {
      // Limpa no unmount pra evitar contaminar pagina seguinte (especialmente
      // relevante em App Router com client-side nav)
      if (window.__fymoob_pageContext === ctx) {
        window.__fymoob_pageContext = undefined
      }
    }
  }, [
    props.property_id,
    props.property_type,
    props.neighborhood,
    props.price_range,
    props.bedrooms,
    props.listing_purpose,
  ])

  return null
}
