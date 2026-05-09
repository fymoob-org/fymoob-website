import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"

import {
  getPropertyBySlug,
  getSimilarProperties,
  getAllSlugs,
} from "@/services/loft"
import {
  generatePropertySchema,
  generatePropertyDescription,
  generatePropertyDetailFAQ,
  safeJsonLd,
} from "@/lib/seo"
import { SITE_URL } from "@/lib/constants"
import { DynamicFAQ } from "@/components/seo/DynamicFAQ"
import { getPropertyPriceDisplay } from "@/lib/property-price"
import {
  getPropertyPriceBucket,
  isConsultPriceProperty,
  resolvePropertyPageVariant,
} from "@/lib/property-page-variant"
import {
  filterPropertyPhotos,
  generateImageAlt,
  getPropertyImage,
} from "@/lib/utils"
import { PropertyPageAnalytics } from "@/components/analytics/PropertyPageAnalytics"
import { PageContextSync } from "@/components/analytics/PageContextSync"
import { priceToBucket } from "@/lib/analytics"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { PropertyHeaderBlock } from "@/components/property/PropertyHeaderBlock"
import { PropertyHeroWithGallery } from "@/components/property/PropertyHeroWithGallery"
import { PropertyVideos } from "@/components/property/PropertyVideos"
import { PropertyDescription } from "@/components/property/PropertyDescription"
import { LazyContactSidebar } from "@/components/property/LazyContactSidebar"
import { PropertyCharacteristics } from "@/components/property/PropertyCharacteristics"
import { PropertyAmenities } from "@/components/property/PropertyAmenities"
import { LazySimilarProperties } from "@/components/property/LazySimilarProperties"
import { PropertyMap } from "@/components/property/PropertyMap"
import { MobileContactBar } from "@/components/property/MobileContactBar"
import { MobilePriceCard } from "@/components/property/MobilePriceCard"
import { MobileInlineContactForm } from "@/components/property/MobileInlineContactForm"
import { RecentlyViewedTracker } from "@/components/property/RecentlyViewedTracker"
import { ShareButton } from "@/components/shared/ShareButton"
import { WishlistButton } from "@/components/property/WishlistButton"
import { CompareButton } from "@/components/property/CompareButton"
import { BackButton } from "@/components/shared/BackButton"

// 1 hour — CRM data changes far less frequently than 15min.
// Reduces ISR writes by ~75% vs the previous 900s setting.
// For instant updates on CRM edit, configure on-demand revalidation
// via webhook when the Loft/Vista platform supports it.
export const revalidate = 3600
export const dynamicParams = true

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getAllSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  // Early-reject slugs malformados (anti-ISR-amplification — ver VALID_SLUG abaixo)
  if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]{9,200}$/.test(slug)) {
    return { title: "Imóvel não encontrado" }
  }
  const property = await getPropertyBySlug(slug)

  if (!property) {
    return { title: "Imóvel não encontrado" }
  }

  const description = generatePropertyDescription(property)

  return {
    title: property.titulo,
    description,
    openGraph: {
      title: property.titulo,
      description,
      type: "website",
      url: `${SITE_URL}/imovel/${property.slug}`,
      images: getPropertyImage(property)
        ? [
            {
              url: getPropertyImage(property),
              width: 1200,
              height: 630,
              alt: generateImageAlt(property),
            },
          ]
        : undefined,
    },
    alternates: {
      canonical: `/imovel/${property.slug}`,
    },
  }
}

// Slugs reais seguem pattern `tipo-bairro-cidade-uf-<N>-quartos-<N>m2-<CODIGO>`.
// O CODIGO no final e UPPERCASE (ex: AP00900, AP00296) — por isso regex
// aceita [a-zA-Z]. Validar antes de fetchar evita ISR amplification: atacante
// requisitando /imovel/aaa-1, /imovel/aaa-2... geraria entries cached 404 no
// edge da Vercel (cost spike + bloat). Regex exige minimo 10 chars + safe chars.
const VALID_SLUG = /^[a-zA-Z0-9][a-zA-Z0-9.-]{9,200}$/

export default async function PropertyPage({ params }: PageProps) {
  const { slug } = await params
  if (!VALID_SLUG.test(slug)) {
    notFound()
  }
  const property = await getPropertyBySlug(slug)

  if (!property) {
    notFound()
  }

  // Slug mudou no CRM (ex: area atualizada de 211m2 -> 268m2). Slug recebido
  // ainda funciona porque getPropertyBySlug extrai o codigo do final, mas a
  // URL nao bate com a canonical. 301 redirect pra slug atual remove a URL
  // antiga do indice do Google (em vez de mante-la como "alternate
  // canonical" no GSC report — caso reportado em 21/04/2026).
  if (property.slug !== slug) {
    permanentRedirect(`/imovel/${property.slug}`)
  }

  const rawSimilar = await getSimilarProperties(property, 4)
  const similarProperties = rawSimilar.map((p) => ({
    ...p,
    fotos: p.fotos.slice(0, 3),
  }))

  const propertySchema = generatePropertySchema(property)
  const alt = generateImageAlt(property)
  const mainImage = getPropertyImage(property)
  const allPhotos = filterPropertyPhotos(property.fotos)
  // Helper detecta dual se ambos precos > 0 (nao confia em Finalidade CRM
  // que as vezes vem vazia mesmo em imoveis dual). Respeita finalidade
  // explicita "Locação"/"Venda" pra escolher primario.
  const { price, isRental, isDual } = getPropertyPriceDisplay(property)
  const variant = resolvePropertyPageVariant(property)
  const isConsultPrice = isConsultPriceProperty(property)
  const priceBucket = getPropertyPriceBucket(property)

  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: property.bairro, url: `/imoveis/${property.bairro.toLowerCase().replace(/\s+/g, "-")}` },
    { name: property.titulo, url: `/imovel/${property.slug}` },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(propertySchema) }}
      />
      <PropertyPageAnalytics
        propertyCode={property.codigo}
        variant={variant}
        isConsultPrice={isConsultPrice}
        priceBucket={priceBucket}
        price={isConsultPrice ? null : price}
        propertyType={property.tipo}
        neighborhood={property.bairro}
        bedrooms={property.dormitorios ?? undefined}
        listingPurpose={
          property.finalidade?.toLowerCase().includes("venda")
            ? "venda"
            : property.finalidade?.toLowerCase().includes("loca")
              ? "aluguel"
              : undefined
        }
        title={property.titulo}
      />

      {/* Sincroniza contexto da pagina pra trackers globais (WhatsApp,
          Phone) lerem property_id, neighborhood, etc. ao disparar evento. */}
      <PageContextSync
        property_id={property.codigo}
        property_type={property.tipo}
        neighborhood={property.bairro}
        price_range={priceToBucket(isConsultPrice ? null : price)}
        bedrooms={property.dormitorios ?? undefined}
        listing_purpose={
          property.finalidade?.toLowerCase().includes("venda")
            ? "venda"
            : property.finalidade?.toLowerCase().includes("loca")
              ? "aluguel"
              : undefined
        }
      />

      <RecentlyViewedTracker property={property} />

      <div className="mx-auto w-full max-w-7xl px-4 pt-4 md:px-8 md:pt-6">
        <div className="mb-3 flex items-center justify-between md:hidden">
          <BackButton />
          <div className="flex items-center gap-2">
            <CompareButton codigo={property.codigo} size="sm" />
            <ShareButton title={property.titulo} url={`/imovel/${property.slug}`} variant="overlay" />
            <WishlistButton codigo={property.codigo} size="sm" />
          </div>
        </div>

        <div className="mb-4 hidden items-center justify-between md:flex">
          <Breadcrumbs items={breadcrumbItems} />
          <div className="flex items-center gap-2">
            <CompareButton codigo={property.codigo} />
            <WishlistButton codigo={property.codigo} />
            <ShareButton title={property.titulo} url={`/imovel/${property.slug}`} />
          </div>
        </div>
      </div>

      <PropertyHeroWithGallery
        fotos={allPhotos}
        mainImage={mainImage}
        alt={alt}
      />

      <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
        <div className="grid grid-cols-1 gap-8 pb-40 md:pb-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-10">
          <div>
            <PropertyHeaderBlock
              property={property}
              shortTitle={property.titulo}
              variant={variant}
            />

            <div className="mt-6 lg:hidden">
              <MobilePriceCard
                precoVenda={property.precoVenda}
                precoAluguel={property.precoAluguel}
                finalidade={property.finalidade}
                valorCondominio={property.valorCondominio}
                valorIptu={property.valorIptu}
                valorSeguroIncendio={property.valorSeguroIncendio}
                valorFci={property.valorFci}
                valorSobConsulta={property.valorSobConsulta}
              />
            </div>

            <a
              href="#enviar-mensagem"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary hover:text-brand-primary-hover lg:hidden"
            >
              Enviar mensagem
              <span aria-hidden="true">↓</span>
            </a>

            <div className={variant === "premium" ? "mt-14 border-t border-slate-200 pt-12" : "mt-8 border-t border-slate-200 pt-8"}>
              <PropertyDescription descricao={property.descricao} />
            </div>

            {property.videos.length > 0 && (
              <div className={variant === "premium" ? "mt-14 border-t border-slate-200 pt-12" : "mt-8 border-t border-slate-200 pt-8"}>
                <PropertyVideos
                  videos={property.videos}
                  propertyTitle={property.titulo}
                />
              </div>
            )}

            {property.caracteristicas.length > 0 && (
              <div className={variant === "premium" ? "mt-14 border-t border-slate-200 pt-12" : "mt-8 border-t border-slate-200 pt-8"}>
                <PropertyCharacteristics property={property} />
              </div>
            )}

            {property.infraestrutura.length > 0 && (
              <div className={variant === "premium" ? "mt-14 border-t border-slate-200 pt-12" : "mt-8 border-t border-slate-200 pt-8"}>
                <PropertyAmenities infraestrutura={property.infraestrutura} />
              </div>
            )}

            <div className={variant === "premium" ? "mt-14 border-t border-slate-200 pt-12" : "mt-8 border-t border-slate-200 pt-8"}>
              <PropertyMap
                latitude={property.latitude}
                longitude={property.longitude}
                bairro={property.bairro}
                titulo={property.titulo}
                endereco={property.endereco}
                numero={property.numero}
                cidade={property.cidade}
                estado={property.estado}
              />
            </div>

            <div className="mt-8 lg:hidden">
              <MobileInlineContactForm
                propertyTitle={property.titulo}
                propertyCode={property.codigo}
                finalidade={property.finalidade}
              />
            </div>
          </div>

          <aside className="relative z-40 hidden lg:block">
            <div className="sticky top-24 -mt-16">
              <LazyContactSidebar
                propertyTitle={property.titulo}
                propertyCode={property.codigo}
                precoVenda={property.precoVenda}
                precoAluguel={property.precoAluguel}
                finalidade={property.finalidade}
                valorCondominio={property.valorCondominio}
                valorIptu={property.valorIptu}
                valorSeguroIncendio={property.valorSeguroIncendio}
                valorFci={property.valorFci}
                valorSobConsulta={property.valorSobConsulta}
                variant={variant}
              />
            </div>
          </aside>
        </div>
      </div>

      <div className="mt-2">
        <LazySimilarProperties properties={similarProperties} />
      </div>

      {/* FAQ generica do imovel — Fase 19.P0.7. Schema FAQPage emitido
          automaticamente via DynamicFAQ. Adapta perguntas conforme finalidade
          (venda vs aluguel). */}
      <section className="border-t border-neutral-200 bg-neutral-50 py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <DynamicFAQ
            questions={generatePropertyDetailFAQ(property)}
            title={`Perguntas frequentes sobre este ${property.tipo.toLowerCase()}`}
          />
        </div>
      </section>

      <MobileContactBar
        propertyTitle={property.titulo}
        propertyCode={property.codigo}
        precoVenda={property.precoVenda}
        precoAluguel={property.precoAluguel}
        valorCondominio={property.valorCondominio}
        valorIptu={property.valorIptu}
        finalidade={property.finalidade}
        valorSobConsulta={property.valorSobConsulta}
        variant={variant}
        dataCadastro={property.dataCadastro}
        bairro={property.bairro}
      />
    </div>
  )
}
