import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Building2, MapPin, BedDouble, Car, ShowerHead, Phone, ChevronDown } from "lucide-react"
import {
  getAllEmpreendimentos,
  getPropertiesByEmpreendimento,
} from "@/services/loft"
import { slugify, formatPrice, formatArea } from "@/lib/utils"
import { isVistaImage } from "@/lib/image-optimization"
import { generateItemListSchema, generateLandingStats, generateDynamicFAQ, safeJsonLd, generateBreadcrumbSchema } from "@/lib/seo"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { DynamicFAQ } from "@/components/seo/DynamicFAQ"
import { RelatedPages } from "@/components/seo/RelatedPages"
import { PropertyMap } from "@/components/property/PropertyMap"
import { getPropertyFeatureIcon } from "@/components/property/propertyFeatureIcons"
import { getEmpreendimentoAssets, getTorreShortSlug, hasEditorialLayout } from "@/data/empreendimento-assets"
import { getTorreAccent } from "@/components/empreendimento/units/editorial"
import { PlantasGallery } from "@/components/empreendimento/PlantasGallery"
import { TorreVisualGallery } from "@/components/empreendimento/TorreVisualGallery"
import { VideoLazyEmbed } from "@/components/empreendimento/VideoLazyEmbed"
import { EmpreendimentoStandardSEOContent } from "@/components/empreendimento/EmpreendimentoStandardSEOContent"
import { MasterplanPartners } from "@/components/empreendimento/MasterplanPartners"
import { AmenitiesShowcase } from "@/components/empreendimento/AmenitiesShowcase"
import { LocationStorytelling } from "@/components/empreendimento/LocationStorytelling"
import { UnitsShowcase } from "@/components/empreendimento/units/UnitsShowcase"
import { EmpreendimentoMobileMenu } from "@/components/empreendimento/EmpreendimentoMobileMenu"
import { CountUp } from "@/components/empreendimento/CountUp"
import { PageContextSync } from "@/components/analytics/PageContextSync"
import { priceToBucket } from "@/lib/analytics"
import type { Property } from "@/types/property"
import { SITE_URL } from "@/lib/constants"

interface EmpreendimentoPageProps {
  params: Promise<{ slug: string }>
}

// 2 hours — empreendimento pages change even less than individual imóveis
// (new launches, not daily edits). Reduces ISR writes by ~87% vs the
// previous 900s setting.
export const revalidate = 7200
export const dynamicParams = true

const FYMOOB_PHONE = "5541999780517"

export async function generateStaticParams() {
  try {
    const empreendimentos = await getAllEmpreendimentos()
    return empreendimentos.map((e) => ({ slug: e.slug }))
  } catch {
    return []
  }
}

// Slugs validos (anti-ISR-amplification)
const VALID_EMP_SLUG = /^[a-z0-9][a-z0-9-]{1,100}$/

// Sprint B.X (03/05/2026) — Mapa de typos conhecidos no CRM Loft que geram
// slugs canibalizando ranking. O imovel orfao continua acessivel na URL
// errada (canonical aponta pra correta, sem 301 destrutivo) ate Wagner
// renomear no CRM. Quando renomear, remover entry daqui.
const SLUG_TYPO_CANONICAL: Record<string, string> = {
  "reserva-bairgui": "reserva-barigui",
}

export async function generateMetadata({ params }: EmpreendimentoPageProps): Promise<Metadata> {
  const { slug } = await params
  if (!VALID_EMP_SLUG.test(slug)) return {}
  const empreendimentos = await getAllEmpreendimentos()
  const emp = empreendimentos.find((e) => e.slug === slug)
  if (!emp) return {}

  // Sprint B.X — quando a pagina e variante typo, canonical aponta pro slug
  // correto pra Google consolidar autoridade na URL boa.
  const canonicalSlug = SLUG_TYPO_CANONICAL[slug] || slug

  const bairroText = emp.bairros.length > 0 ? emp.bairros[0] : "Curitiba"
  const assets = getEmpreendimentoAssets(slug)
  const construtoraText = emp.construtora ? ` ${emp.construtora}` : ""
  const precoMin = emp.precoMin ? formatPrice(emp.precoMin) : ""
  const precoText = precoMin ? ` a partir de ${precoMin}` : ""

  // Title structure varies by signal density (Sprint A — 2026-05-03):
  // - Sem construtora: nome + bairro + N + preco (Fase 19.P2.B.3, +10-15% CTR
  //   via numero, validado Backlinko)
  // - Com construtora: nome + construtora + bairro + N (captura query do
  //   tipo "{nome} {construtora}" — top Google Ads pra Reserva Barigui).
  //   Preco fica na description; title sem numero respeita o feedback de
  //   GSC (number-driven hook so na description quando ja temos signal de
  //   marca forte).
  const totalText = emp.total > 0 ? `${emp.total} ` : ""
  const tituloUnidade = emp.total === 1 ? "Apartamento" : "Apartamentos"
  const title = emp.construtora
    ? `${emp.nome} ${emp.construtora} ${bairroText}: ${totalText}${tituloUnidade} | FYMOOB`
    : `${emp.nome} ${bairroText}: ${totalText}${tituloUnidade}${precoMin ? ` a Partir de ${precoMin}` : " Disponíveis"} | FYMOOB`

  // Description: 1ª frase responde "o que é + construtora + onde + preco",
  // 2ª frase ressalta intenções (plantas, fotos), 3ª prova (FYMOOB).
  // Limite ~160 chars depois do encurtamento natural do Google. Otimizada
  // pra queries: "reserva barigui", "reserva lago", "apartamento reserva
  // barigui", "avantti reserva barigui".
  const description = emp.construtora
    ? `${emp.nome} ${emp.construtora} em ${bairroText}, Curitiba${precoText}. ${emp.total} apartamentos disponíveis — veja plantas, preços e fotos. Atendimento FYMOOB.`.trim()
    : `${emp.nome} em ${bairroText}, Curitiba${precoText}. ${emp.total} apartamentos disponíveis — veja plantas, preços e fotos. Atendimento FYMOOB${construtoraText ? ` ·${construtoraText}` : ""}.`.trim()

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/empreendimento/${canonicalSlug}` },
    keywords: [
      emp.nome,
      `${emp.nome} ${bairroText}`,
      `${emp.nome} plantas`,
      `${emp.nome} preços`,
      `${emp.nome} apartamentos`,
      `apartamento ${bairroText} Curitiba`,
      ...(emp.construtora ? [`${emp.construtora} ${emp.nome}`, `${emp.construtora} Curitiba`] : []),
    ],
    openGraph: {
      title,
      description,
      url: `/empreendimento/${canonicalSlug}`,
      type: "website",
      siteName: "FYMOOB",
      locale: "pt_BR",
      images: assets?.heroImage ? [{ url: assets.heroImage, width: 1200, height: 630, alt: `${emp.nome} — ${bairroText}, Curitiba` }] : emp.imageUrl ? [{ url: emp.imageUrl, width: 1200, height: 630, alt: `${emp.nome} — ${bairroText}, Curitiba` }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: assets?.heroImage ? [assets.heroImage] : emp.imageUrl ? [emp.imageUrl] : undefined,
    },
  }
}

function groupUnitTypes(properties: Property[]) {
  const groups = new Map<string, { properties: Property[]; area: number; dorms: number; suites: number; banheiros: number; vagas: number; precoMin: number; foto: string }>()
  for (const p of properties) {
    const key = `${p.tipo} ${p.dormitorios || 0}q ${Math.round(p.areaPrivativa || 0)}m²`
    if (!groups.has(key)) {
      groups.set(key, { properties: [], area: p.areaPrivativa || 0, dorms: p.dormitorios || 0, suites: p.suites || 0, banheiros: p.banheiros || 0, vagas: p.vagas || 0, precoMin: p.precoVenda || p.precoAluguel || 0, foto: p.fotoDestaque || "" })
    }
    const g = groups.get(key)!
    g.properties.push(p)
    const preco = p.precoVenda || p.precoAluguel || 0
    if (preco > 0 && (preco < g.precoMin || g.precoMin === 0)) g.precoMin = preco
  }
  return Array.from(groups.entries()).map(([key, g]) => ({ key, ...g, count: g.properties.length })).sort((a, b) => a.area - b.area)
}

export default async function EmpreendimentoPage({ params }: EmpreendimentoPageProps) {
  const { slug } = await params
  if (!VALID_EMP_SLUG.test(slug)) notFound()
  const empreendimentos = await getAllEmpreendimentos()
  const emp = empreendimentos.find((e) => e.slug === slug)
  if (!emp) notFound()

  const properties = await getPropertiesByEmpreendimento(emp.nome)
  const assets = getEmpreendimentoAssets(slug)

  const precos = properties.map((p) => p.precoVenda ?? p.precoAluguel).filter((p): p is number => p !== null && p > 0)
  const precoMin = precos.length > 0 ? Math.min(...precos) : null
  const precoMax = precos.length > 0 ? Math.max(...precos) : null
  const areas = properties.map((p) => p.areaPrivativa).filter((a): a is number => a !== null && a > 0)
  const areaMin = areas.length > 0 ? Math.min(...areas) : null
  const areaMax = areas.length > 0 ? Math.max(...areas) : null

  const tipos = [...new Set(properties.map((p) => p.tipo))]
  const bairros = [...new Set(properties.map((p) => p.bairro).filter(Boolean))]
  const construtora = properties.find((p) => p.construtora)?.construtora || emp.construtora
  const descricao = assets?.descricaoMarketing || properties.find((p) => p.descricaoEmpreendimento)?.descricaoEmpreendimento
  const situacao = properties.find((p) => p.situacao)?.situacao
  const endereco = properties.find((p) => p.endereco)
  const allPhotos = [...new Set(properties.flatMap((p) => [p.fotoDestaque, ...p.fotos]).filter(Boolean))]
  const heroPhotos = allPhotos.slice(0, 8)
  const infraestrutura = [...new Set(properties.flatMap((p) => p.infraestrutura))].sort()
  const unitTypes = groupUnitTypes(properties)
  const lat = properties.find((p) => p.latitude)?.latitude || null
  const lng = properties.find((p) => p.longitude)?.longitude || null
  const videoUrl = assets?.videoUrl || properties.find((p) => p.urlVideo)?.urlVideo

  // Auto-extract plantas from CRM: fotos with Tipo="Planta"
  // Wagner marks photos as "Planta" in the Loft CRM photo editor
  const plantasFromCRM = [...new Set(
    properties.flatMap((p) =>
      (p.fotosPorTipo || [])
        .filter((f) => f.tipo.toLowerCase() === "planta")
        .map((f) => f.foto)
    )
  )]
  // Static fallback is ONLY applied when the slug explicitly matches an
  // editorial empreendimento. For standard empreendimentos we ONLY show
  // plantas that come from their OWN properties in the CRM.
  const plantasFinal = plantasFromCRM.length > 0
    ? plantasFromCRM
    : (hasEditorialLayout(slug) ? (assets?.plantas || []) : [])

  const itemListSchema = generateItemListSchema(properties, `/empreendimento/${slug}`)
  const rawHeroImage = assets?.heroImage || emp.imageUrl || undefined
  const absoluteHeroImage = rawHeroImage
    ? rawHeroImage.startsWith("http")
      ? rawHeroImage
      : `${SITE_URL}${rawHeroImage}`
    : undefined

  // Sprint A.2 — image array enriquecido. Schema com 1 imagem só limita rich
  // result; com 4-6 abre carousel + image preview no SERP. Ordem: hero
  // (asset local, indexavel) → parallax editorial (asset local, indexavel)
  // → fotos do CRM (CDN Vista, hoje bloqueada por robots.txt mas Google ainda
  // entende como entidade visual — quando Task 10.5 ativar o proxy, todas
  // viram indexaveis sem mexer aqui).
  const schemaImages: string[] = []
  if (absoluteHeroImage) schemaImages.push(absoluteHeroImage)
  if (assets?.parallaxImages) {
    for (const img of assets.parallaxImages) {
      const abs = img.startsWith("http") ? img : `${SITE_URL}${img}`
      if (!schemaImages.includes(abs)) schemaImages.push(abs)
    }
  }
  for (const photo of heroPhotos.slice(0, 4)) {
    if (photo && !schemaImages.includes(photo)) schemaImages.push(photo)
  }

  // Sprint A.2 — endereco com streetAddress + cep quando CRM popula.
  // Sem isso o schema vira generico e Google nao consegue desambiguar entre
  // empreendimentos do mesmo bairro.
  const streetAddressFull = endereco?.endereco
    ? [endereco.endereco, endereco.numero].filter(Boolean).join(", ")
    : undefined
  const addressNode = {
    "@type": "PostalAddress" as const,
    ...(streetAddressFull && { streetAddress: streetAddressFull }),
    addressLocality: bairros[0] || "Curitiba",
    addressRegion: "PR",
    addressCountry: "BR",
    ...(endereco?.cep && { postalCode: endereco.cep }),
  }

  // Sprint B.V (03/05/2026) — containsPlace sinaliza pro Google que o hub
  // agrupa N entidades distintas (cada torre vira um Place separado). Cada
  // torre tem URL propria via /empreendimento/[hub]/[torre] (Sprint B.7),
  // entao o schema tambem aponta esse link — Google segue como entity
  // distinta no Knowledge Graph.
  const towerPlaces =
    assets?.torres && assets.torres.length > 0
      ? assets.torres.map((t) => {
          const torreSlug = getTorreShortSlug(t.nome)
          return {
            "@type": "Place" as const,
            name: t.nome,
            ...(t.descricao && { description: t.descricao }),
            url: `${SITE_URL}/empreendimento/${slug}/${torreSlug}`,
          }
        })
      : []

  const realEstateSchema = {
    "@type": "RealEstateListing", name: emp.nome,
    description: descricao || `${emp.total} unidades disponíveis no ${emp.nome}`,
    url: `${SITE_URL}/empreendimento/${slug}`,
    ...(schemaImages.length > 0 && { image: schemaImages }),
    ...(towerPlaces.length > 0 && { containsPlace: towerPlaces }),
    // Sprint A.2 — brand: incorporadora como entidade Organization. Ajuda
    // Google a conectar empreendimento → construtora no Knowledge Graph e
    // captura queries "{construtora} {empreendimento}" (ex: "avantti reserva
    // barigui" — top Google Ads click #9).
    ...(construtora && {
      brand: { "@type": "Organization", name: construtora },
    }),
    // Sprint A.2 — geo coords reais (lat/lng do CRM via primeiro imovel
    // com coordenada). Habilita rich snippet com mapa + ranking em queries
    // locais ("reserva barigui localizacao", "reserva barigui mapa").
    ...(lat && lng && {
      geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng },
    }),
    // Fase 19.P2.B.4 — AggregateOffer enriquecido com availability (rich
    // snippet com faixa de preco no SERP + indicador de disponibilidade).
    offers: precoMin
      ? {
          "@type": "AggregateOffer",
          lowPrice: precoMin,
          highPrice: precoMax || precoMin,
          priceCurrency: "BRL",
          offerCount: properties.length,
          availability:
            properties.length > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/SoldOut",
        }
      : undefined,
    address: addressNode,
  }
  const combinedSchema = {
    "@context": "https://schema.org",
    "@graph": [realEstateSchema, itemListSchema],
  }

  const whatsMessage = `Olá! Tenho interesse no empreendimento ${emp.nome}. Gostaria de mais informações.`
  const whatsUrl = `https://wa.me/${FYMOOB_PHONE}?text=${encodeURIComponent(whatsMessage)}`
  const hasEditorial = hasEditorialLayout(slug) && assets

  if (!hasEditorial || !assets) {
    // Standard layout (existing) for empreendimentos without custom assets
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(combinedSchema) }} />
        <section className="bg-[#0d0d0d]">
          <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
            <div className="[&_nav]:text-white/60 [&_a]:text-white/60 [&_a:hover]:text-white [&_span]:text-white/80">
              <Breadcrumbs items={[{ name: "Home", url: "/" }, { name: "Empreendimentos", url: "/empreendimentos" }, { name: emp.nome, url: `/empreendimento/${slug}` }]} />
            </div>
          </div>
          {heroPhotos.length > 0 && (
            <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 gap-2 overflow-hidden rounded-2xl sm:grid-cols-4 sm:grid-rows-2 sm:gap-3 md:h-[420px]">
                <div className="relative col-span-2 row-span-2 min-h-[240px]">
                  <Image src={heroPhotos[0]} unoptimized={isVistaImage(heroPhotos[0])} alt={`${emp.nome} — foto principal`} fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" priority />
                </div>
                {heroPhotos.slice(1, 5).map((foto, i) => (
                  <div key={i} className="relative hidden min-h-[120px] sm:block">
                    <Image src={foto} unoptimized={isVistaImage(foto)} alt={`${emp.nome} — foto ${i + 2}`} fill className="object-cover" sizes="25vw" loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="font-serif text-4xl font-light tracking-tight text-white sm:text-5xl">{emp.nome}</h1>
            {construtora && <p className="mt-3 flex items-center gap-1.5 text-sm text-neutral-300"><Building2 className="h-4 w-4 text-[#c9a876]" /> Construtora {construtora}</p>}
            {bairros.length > 0 && <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-400"><MapPin className="h-4 w-4 text-[#c9a876]" /> {bairros.join(", ")}, Curitiba - PR</p>}
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"><p className="font-serif text-2xl font-light text-white">{properties.length}</p><p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-neutral-400">{properties.length === 1 ? "Unidade" : "Unidades"}</p></div>
              {precoMin && <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"><p className="font-serif text-lg font-light text-white">{formatPrice(precoMin)}</p><p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-neutral-400">A partir de</p></div>}
              {areaMin && areaMax && <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"><p className="font-serif text-lg font-light text-white">{areaMin === areaMax ? `${formatArea(areaMin)} m²` : `${formatArea(areaMin)} - ${formatArea(areaMax)} m²`}</p><p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-neutral-400">Área privativa</p></div>}
              {tipos.length > 0 && <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"><p className="font-serif text-sm font-light text-white">{tipos.join(", ")}</p><p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-neutral-400">{tipos.length === 1 ? "Tipo" : "Tipos"}</p></div>}
            </div>
          </div>
        </section>
        <StandardContent emp={emp} properties={properties} precoMin={precoMin} precoMax={precoMax} areaMin={areaMin} areaMax={areaMax} tipos={tipos} bairros={bairros} unitTypes={unitTypes} infraestrutura={infraestrutura} lat={lat} lng={lng} endereco={endereco} construtora={construtora} situacao={situacao} slug={slug} empreendimentos={empreendimentos} whatsUrl={whatsUrl} descricao={descricao} plantas={plantasFinal} />
      </>
    )
  }

  // ============================================
  // EDITORIAL LAYOUT (Reserva Barigui and others with full assets)
  // ============================================
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(combinedSchema) }} />

      {/* Sincroniza contexto da pagina pra trackers globais (WhatsApp,
          Phone) lerem neighborhood, price_range, etc. ao disparar evento.
          Em pagina de hub nao tem property_id (nao eh um imovel especifico),
          mas neighborhood + price_range + listing_purpose alimentam custom
          dimensions pra segmentacao de eventos. */}
      <PageContextSync
        neighborhood={bairros[0]}
        price_range={priceToBucket(precoMin)}
        listing_purpose="venda"
      />

      {/* SMART NAV — sticky no body, FORA do wrapper dark (fix 06/05/2026).
          ANTES: nav estava dentro de <div className="bg-neutral-950"> que
          termina junto com o hero — sticky parava de funcionar ao rolar
          alem do hero. AGORA: nav e o primeiro elemento, sticky no body,
          acompanha o scroll inteiro. CSS scroll-driven com bg sutil sempre
          presente (rgba 30% + blur 10px) e intensifica apos o hero. */}
      <nav
        aria-label="Navegação rápida"
        className="emp-smart-nav sticky top-0 z-40 border-b border-transparent text-[10px] font-light tracking-[0.2em] sm:text-[11px]"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-4 py-2.5 sm:gap-5 sm:px-6 sm:py-3 lg:px-8">
          {/* Breadcrumb compacto integrado no nav (fix 06/05/2026):
              Antes era logo cursivo "Reserva Barigui" + barra sticky separada
              embaixo. Agora breadcrumb ocupa o espaco a esquerda em uma so
              barra — UX mais limpa, alta semantica SEO preservada. Em mobile,
              so o ultimo item (nome do empreend.) aparece pra economizar
              espaco no scroll horizontal. */}
          <nav
            aria-label="Caminho de navegação"
            className="shrink-0 flex items-center gap-1.5 text-[11px] tracking-[0.15em] sm:text-[12px]"
          >
            <Link
              href="/"
              className="hidden opacity-60 transition hover:text-[#c9a876] hover:opacity-100 md:inline-flex"
            >
              Home
            </Link>
            <span className="hidden opacity-30 md:inline-flex" aria-hidden="true">›</span>
            <Link
              href="/empreendimentos"
              className="hidden opacity-60 transition hover:text-[#c9a876] hover:opacity-100 md:inline-flex"
            >
              Empreendimentos
            </Link>
            <span className="hidden opacity-30 md:inline-flex" aria-hidden="true">›</span>
            <Link
              href={`/empreendimento/${slug}`}
              className="font-serif text-[13px] italic tracking-[0.1em] opacity-95 transition hover:text-[#c9a876] sm:text-[14px]"
            >
              {emp.nome}
            </Link>
          </nav>

          {/* Spacer flex pra empurrar links pro centro/direita */}
          <span className="hidden md:block flex-1" aria-hidden="true" />

          {/* Links de navegacao — desktop only. Mobile usa hamburger menu. */}
          <Link href="#plantas" className="hidden shrink-0 px-1 uppercase opacity-75 transition hover:text-[#c9a876] hover:opacity-100 md:inline-flex">
            Plantas
          </Link>
          <Link href="#precos" className="hidden shrink-0 px-1 uppercase opacity-75 transition hover:text-[#c9a876] hover:opacity-100 md:inline-flex">
            Unidades
          </Link>
          <Link href="#infraestrutura" className="hidden shrink-0 px-1 uppercase opacity-75 transition hover:text-[#c9a876] hover:opacity-100 md:inline-flex">
            Lazer
          </Link>
          <Link href="#localizacao" className="hidden shrink-0 px-1 uppercase opacity-75 transition hover:text-[#c9a876] hover:opacity-100 md:inline-flex">
            Localização
          </Link>

          {/* CTA verde profundo — desktop only. Mobile tem hamburger + sticky
              bar de preco no rodape com CTA proprio. */}
          <a
            href={whatsUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-track="whatsapp_click"
            data-source="navbar"
            className="ml-auto hidden shrink-0 rounded-full bg-[#246B4E] px-4 py-1.5 uppercase text-[10px] font-medium tracking-[0.2em] text-white shadow-sm transition hover:bg-[#2B7D5A] sm:px-5 sm:text-[11px] md:inline-flex"
          >
            Agendar visita
          </a>

          {/* Mobile hamburger menu — substitui scroll horizontal do nav
              que cortava letras dos links. Reutiliza Sheet shadcn. */}
          <div className="ml-auto md:hidden">
            <EmpreendimentoMobileMenu
              empreendimentoNome={emp.nome}
              whatsUrl={whatsUrl}
              sections={[
                { href: "#plantas", label: "Plantas" },
                { href: "#precos", label: "Unidades" },
                { href: "#infraestrutura", label: "Lazer" },
                { href: "#localizacao", label: "Localização" },
              ]}
            />
          </div>
        </div>
      </nav>

      {/* ========================================================
          EDITORIAL HERO — Premium redesign (03/05/2026)
          Mudancas vs versao anterior:
          - Ken Burns lento (.emp-kenburns) na imagem de fundo
          - -mt-[var(--nav-h)] negativo zerado (nav e sticky-transparent,
            nao tira altura entao hero ja comeca do topo)
          - Hierarquia simplificada: 1 caption + logo + 1 H1 + 1 stats
          - Gradient bottom mais sofisticado pra fundir com proxima section
          - data-reveal nas peças textuais
          ======================================================== */}
      <section className="relative flex h-[88vh] min-h-[680px] flex-col overflow-hidden bg-neutral-950">
        <div className="absolute inset-0">
          <Image
            src={assets.heroImage}
            alt={`${emp.nome} — fachada do empreendimento ${bairros[0] ? `em ${bairros[0]}, ` : ""}Curitiba${construtora ? ` (${construtora})` : ""}`}
            fill
            className="emp-kenburns object-cover"
            sizes="100vw"
            priority
            quality={92}
          />
          {/* Overlay bottom-anchored revisado (04/05/2026 v6):
              - Topo (0-15%): leve escurecimento pra peso editorial do caption
              - Meio (15-50%): praticamente transparente — vista limpa do
                parque/skyline (protagonista)
              - Bottom (50-100%): gradient mais forte (90% no fim) pra dar
                suporte ao bloco de tagline/subfrase/CTAs. Antes era 70%
                mas com a reorganizacao (mais texto no bottom) precisa
                de mais contraste. */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent via-45% to-black/90 to-100%" />
          {/* Vinheta lateral discreta — afasta foco das bordas, joga
              olhar pro centro/horizonte do skyline */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.4)_100%)]" />
        </div>

        {/* TOPO — caption + H1 SEO (revisao v6.1 04/05/2026):
            Eliminada redundancia: caption foca em CATEGORIA (LANCAMENTO),
            H1 entrega NOME + GEO (keyword SEO). Antes ambos repetiam
            MOSSUNGUE + CURITIBA. */}
        <div className="relative z-10 pt-[5.5rem] sm:pt-[6rem]">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            {assets.subtitulo && (
              <p data-reveal className="text-[10px] tracking-[0.4em] text-[#c9a876]/85 drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)] sm:text-[11px]">
                {assets.subtitulo.toUpperCase()}
              </p>
            )}
            {/* H1 SEO completo (nome + bairro + cidade) — keyword Google
                + sinal institucional. Tamanho ligeiramente maior que
                caption (12-13px) pra hierarquia clara. */}
            <h1 data-reveal className="mt-4 font-light text-[12px] tracking-[0.3em] uppercase text-white/85 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)] sm:text-[13px]">
              {emp.nome}
              {bairros[0] && <span className="text-white/55"> · {bairros[0]}, Curitiba</span>}
            </h1>
          </div>
        </div>

        {/* Spacer flexivel — empurra o branding pro bottom */}
        <div className="flex-1" aria-hidden="true" />

        {/* Branding bottom-anchored (logo + H1 + tagline + linha tecnica + CTAs)
            Revisao GPT v5 (04/05/2026):
            - pb maior pra subir o bloco 20-40px (pb-32/40/52 vs era 24/32/40)
            - Tagline AGORA e o segundo ponto focal (clamp 24-38px font-light
              tracking negativo) — era text-base/lg/xl, ficava perdida
            - Subtitle com peso normal e leading 1.6 pra leitura confortavel
            - H1 (linha tecnica) com tracking reduzido (0.12em vs 0.25em)
            - Mais respiro vertical entre logo e textos (mt-10 vs mt-8) */}
        <div className="relative z-10 px-4 pb-32 sm:px-6 sm:pb-40 lg:pb-52">
          <div className="mx-auto max-w-4xl text-center">
            {assets.logo ? (
              <>
                <div data-reveal className="flex justify-center">
                  <Image
                    src={assets.logo}
                    alt={`${emp.nome} — logo do empreendimento em ${bairros[0] || "Curitiba"}`}
                    width={500}
                    height={240}
                    className="h-auto max-h-[180px] w-auto max-w-[78vw] object-contain drop-shadow-[0_6px_32px_rgba(0,0,0,0.6)] sm:max-h-[220px] sm:max-w-[460px]"
                    priority
                  />
                </div>
                {/* H1 movido pro topo (revisao v6 04/05/2026) pra criar
                    simetria editorial: caption + H1 no topo, logo no meio,
                    tagline + subfrase + CTAs no bottom. Aqui o linha-tecnica
                    foi removida — o H1 SEO vive no topo do hero agora. */}
                {/* Tagline aspiracional — agora segundo ponto focal apos a logo.
                    clamp(24px, 2vw, 38px) com tracking negativo + leading apertada
                    pra ar premium editorial. Override via assets.taglineHero. */}
                {(() => {
                  const tagline =
                    assets.taglineHero ||
                    (properties.length > 1
                      ? `Residencial com apenas ${properties.length} unidades`
                      : properties.length === 1
                        ? "Residencial com unidade exclusiva"
                        : null)
                  if (!tagline) return null
                  return (
                    <p data-reveal className="mt-10 whitespace-pre-line text-[clamp(22px,2.2vw,38px)] font-light leading-[1.15] tracking-[-0.035em] text-white/95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
                      {tagline}
                    </p>
                  )
                })()}
                {(() => {
                  // Subhead override editorial (08/05/2026): assets podem
                  // setar `subheadHero` pra substituir o template
                  // auto-gerado de tipos + bairro. Usar quando o pitch
                  // editorial precisa ser mais especifico que o catalogo
                  // de SKUs (numero de torres, prazo, diferenciador).
                  if (assets.subheadHero) {
                    return (
                      <p data-reveal className="mt-5 text-[14px] font-normal leading-[1.6] text-white/[0.72] drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]">
                        {assets.subheadHero}
                      </p>
                    )
                  }
                  if (tipos.length === 0) return null
                  const pluralize = (t: string) => {
                    const lower = t.toLowerCase()
                    if (lower === "studio") return "studios"
                    if (lower === "apartamento") return "apartamentos"
                    if (lower === "apartamento duplex") return "duplex"
                    if (lower === "sala comercial") return "salas comerciais"
                    if (lower === "loja") return "lojas"
                    return lower.endsWith("s") ? lower : `${lower}s`
                  }
                  const visiveis = tipos.slice(0, 3).map(pluralize)
                  const lista =
                    visiveis.length === 1
                      ? visiveis[0]
                      : visiveis.length === 2
                        ? visiveis.join(" e ")
                        : `${visiveis.slice(0, -1).join(", ")} e ${visiveis[visiveis.length - 1]}`
                  // "em frente ao Parque Barigui" vende mais que "proximos
                  // ao". Restrito ao Mossungue (vizinho direto do parque).
                  const proximidade =
                    bairros[0] === "Mossunguê"
                      ? "em frente ao Parque Barigui"
                      : bairros[0]
                        ? `no ${bairros[0]}`
                        : "em Curitiba"
                  const text = `${lista.charAt(0).toUpperCase()}${lista.slice(1)} ${proximidade}`
                  return (
                    <p data-reveal className="mt-5 text-[14px] font-normal leading-[1.6] text-white/[0.72] drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]">
                      {text}
                    </p>
                  )
                })()}

                {/* CTAs — h-11 fixo + tracking 0.14em + font-semibold no
                    primario (vs era 0.2em font-medium). Secundario com
                    border/bg mais sutis (32%/4%) e text-white/85 pra
                    parecer arquitetonico, nao "pilula SaaS". */}
                <div data-reveal className="mt-9 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                  {/* CTA primario hero — leva pro catalogo de unidades
                      (#precos). Antes era WhatsApp; trocado em 07/05/2026
                      pra reduzir friccao (usuario quer ver imoveis antes
                      de falar com corretor).

                      Cor 08/05/2026: bronze solido #8b6f47 (mesmo da torre
                      Colina) com hover gold #a0825a + sombra dourada.
                      Coerente com paleta editorial gold/bronze/verdigris
                      do hub. Verde #246B4E ficou orfao porque esse CTA e
                      link interno, nao WhatsApp. */}
                  <Link
                    href="#precos"
                    className="inline-flex h-11 items-center gap-2.5 rounded-full bg-[#8b6f47] px-[34px] text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_8px_28px_-8px_rgba(139,111,71,0.55)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#a0825a] hover:shadow-[0_12px_36px_-8px_rgba(201,168,118,0.6)] sm:h-12 sm:px-9"
                  >
                    Ver unidades
                  </Link>
                  <Link
                    href="#plantas"
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-white/[0.32] bg-white/[0.04] px-[30px] text-[11px] font-medium uppercase tracking-[0.14em] text-white/85 shadow-md backdrop-blur-md transition hover:border-white/60 hover:bg-white/15 sm:h-12 sm:px-8"
                  >
                    Ver plantas
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h1 data-reveal className="font-serif text-5xl font-light italic tracking-widest text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)] sm:text-6xl lg:text-7xl">
                  {emp.nome}
                </h1>
                {bairros[0] && (
                  <p data-reveal className="mt-4 text-xs tracking-[0.3em] text-white/80 sm:text-sm">
                    {bairros[0].toUpperCase()} · CURITIBA
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Indicador minimal — linha + chevron no canto bottom direito
            (caminho A: branding fica no centro-bottom, scroll hint mais
            sutil pra nao competir). */}
        <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 sm:bottom-8">
          <div className="flex flex-col items-center gap-1.5">
            <span className="block h-6 w-px bg-gradient-to-b from-transparent to-white/55" />
            <ChevronDown className="h-3 w-3 animate-bounce text-white/50" />
          </div>
        </div>
      </section>

      {/* Breadcrumb visual integrado no smart nav acima (fix 06/05/2026).
          BreadcrumbList schema (SEO) continua emitido via JSON-LD. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(
            generateBreadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Empreendimentos", url: "/empreendimentos" },
              { name: emp.nome, url: `/empreendimento/${slug}` },
            ]),
          ),
        }}
      />

      {/* ========================================================
          PULL QUOTE — gradient bridge entre hero e a intro section.
          Revisao GPT 04/05/2026 v3:
          - Altura reduzida ~30% (py 20/28 -> 14/20)
          - Sem italico no titulo (era "emp-pull-quote" italic + outro
            italic na proxima section: excesso de italico). Aqui titulo
            firme; "Na frente o parque" mantem italic dourado abaixo.
          - Linha dourada separadora apos titulo pra dar acabamento.
          ======================================================== */}
      <section className="relative bg-gradient-to-b from-[#0a0d0c] via-[#0b1110] to-[#101411] py-14 md:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          {assets.tagline && (
            <p data-reveal className="text-[10px] tracking-[0.4em] text-[#c9a876]/70 sm:text-xs">
              {assets.tagline}
            </p>
          )}
          <p data-reveal className="mt-6 font-serif text-3xl font-extralight tracking-tight text-white/95 sm:text-5xl lg:text-[3.5rem]">
            Onde o Parque Barigui
            <br className="hidden sm:block" /> encontra a sofisticação urbana.
          </p>
          <div data-reveal className="mx-auto mt-8 h-px w-16 bg-gradient-to-r from-transparent via-[#c9a876] to-transparent" />
          {construtora && (
            <p data-reveal className="mt-6 text-[10px] tracking-[0.4em] text-white/50 sm:text-[11px]">
              UM EMPREENDIMENTO {construtora.toUpperCase()}
            </p>
          )}
        </div>
      </section>

      {/* ===== SECTION 1 — Intro com video premium (revisao GPT v3 04/05/2026)
            Mudancas:
            - Background com radial dourado sutil + warm dark (#151716)
              em vez de #1a1a1a chapado — adiciona profundidade
            - Grid 1.1fr/1fr (texto menor que video) com gap maior
            - Alinhamento pelo topo (items-start) em vez do centro
            - Caption "VIDEO DO EMPREENDIMENTO" pequena uppercase acima
            - VideoLazyEmbed substitui iframe direto do YouTube
              (sem botao vermelho gritante)
            - Texto reduzido (descricao do asset.ts encurtada de 3 para 2
              paragrafos)
            - Preco destacado (era apagado): "A PARTIR DE" pequeno cinza,
              valor grande font-serif font-extralight off-white
            - CTAs alinhados com hero: "Agendar visita privativa" verde
              dessat + "Ver plantas" outline branco
            ===== */}
      <section
        className="relative py-20 md:py-28"
        style={{
          background:
            "radial-gradient(circle at 30% 45%, rgba(195,168,107,0.06), transparent 35%), #151716",
        }}
      >
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16 xl:gap-20">
            {/* Centralizado em mobile (lg:text-left), alinhado a esquerda em
                desktop onde o grid 2-col tem espaco lateral pra leitura
                fluida da coluna esquerda. */}
            <div className="text-center lg:text-left">
              <p data-reveal className="font-serif text-3xl font-light italic leading-tight tracking-tight text-[#c9a876] sm:text-4xl lg:text-5xl">Na frente, o parque.</p>
              <p data-reveal className="mt-2 font-serif text-3xl font-light italic leading-tight tracking-tight text-[#c9a876] sm:text-4xl lg:text-5xl">Ao lado, o shopping.</p>
              <p data-reveal className="mt-2 font-serif text-3xl font-light italic leading-tight tracking-tight text-[#c9a876] sm:text-4xl lg:text-5xl">E no centro, você.</p>

              {descricao && (
                <div data-reveal className="mx-auto mt-10 max-w-xl space-y-4 whitespace-pre-line text-[15px] leading-relaxed text-neutral-300 lg:mx-0">
                  {descricao}
                </div>
              )}

              {precoMin && (
                <div data-reveal className="mt-10 border-t border-white/10 pt-8 text-center lg:text-left">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/45 sm:text-[11px]">
                    A partir de
                  </p>
                  <p className="mt-2 font-serif text-4xl font-extralight tracking-tight text-white sm:text-5xl">
                    {formatPrice(precoMin)}
                  </p>
                </div>
              )}

              {/* CTAs intro 08/05/2026: centralizado em mobile (era left
                  alinhado, ficava solto em viewport estreito) + secundario
                  trocado de "Ver plantas" pra "Ver unidades disponiveis"
                  apontando pra #precos. Motivo: "Ver plantas" duplicava o
                  CTA do hero (mesma palavra na mesma pagina). Apos mostrar
                  preco "a partir de R$ X · N unidades", o passo natural e
                  explorar as unidades concretas, nao plantas abstratas. */}
              <div data-reveal className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4 lg:justify-start">
                <a
                  href={whatsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="whatsapp_click"
                  data-source="intro"
                  className="inline-flex items-center gap-2.5 rounded-full bg-[#246B4E] px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white shadow-lg transition hover:bg-[#2B7D5A] sm:px-9 sm:text-xs"
                >
                  Agendar visita privativa
                </a>
                <Link
                  href="#precos"
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.28] bg-white/[0.03] px-7 py-3.5 text-[11px] font-light uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm transition hover:border-white/55 hover:bg-white/10 sm:px-9 sm:text-xs"
                >
                  Ver unidades disponíveis
                </Link>
              </div>
            </div>

            {videoUrl && (
              <div data-reveal className="lg:pt-2">
                <p className="mb-4 text-[10px] tracking-[0.4em] text-white/45 sm:text-[11px]">
                  VÍDEO DO EMPREENDIMENTO
                </p>
                {/* SEO 08/05/2026: thumbnailOverride com heroImage do
                    empreendimento. Antes o componente caia no fallback
                    `i.ytimg.com/vi/{id}/maxresdefault.jpg` que ficava
                    embarcado como <img> real no HTML — Google preferia
                    essa imagem (frame do video) sobre o og:image no SERP
                    card. Apontando pro mesmo asset local que ja serve
                    de og:image, o SERP card agora exibe a foto da capa
                    do empreendimento de forma consistente. */}
                <VideoLazyEmbed
                  videoUrl={videoUrl}
                  title={`Vídeo do ${emp.nome}`}
                  thumbnailOverride={assets?.heroImage}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== PARALLAX 1 — Piscina/lake — efeito "elevador descendo"
            (08/05/2026 v3): traz de volta `background-attachment: fixed`
            no DESKTOP (efeito visual mais imersivo, imagem fica estatica
            enquanto conteudo flui sobre ela). No MOBILE mantem <Image>
            do Next com .emp-parallax-img (scroll-driven sutil — iOS
            Safari nao suporta bg-fixed corretamente, ali bg fica
            estatica sem parallax e quebra a impressao desejada).

            Trade-off perf: bg-fixed no desktop tem custo de composite
            layer reflow, mas em browser moderno (Chrome 90+/FF/Safari
            desktop) e aceitavel pra UMA section por pagina. Vale o
            ganho visual luxury. */}
      {assets.parallaxImages[0] && (
        <div className="relative h-[60vh] overflow-hidden md:h-[80vh]">
          {/* Mobile: <Image> Next com parallax scroll-driven sutil */}
          <Image
            src={assets.parallaxImages[0]}
            alt={`${emp.nome} — vista do Parque Barigui`}
            fill
            sizes="100vw"
            className="emp-parallax-img object-cover md:hidden"
            loading="lazy"
            quality={88}
          />
          {/* Desktop: bg-fixed pra efeito elevador descendo */}
          <div
            className="absolute inset-0 hidden bg-cover bg-fixed bg-center md:block"
            style={{ backgroundImage: `url(${assets.parallaxImages[0]})` }}
            role="img"
            aria-label={`${emp.nome} — vista do Parque Barigui`}
          />
          {/* Gradient suave so na metade inferior pra legibilidade do texto
              sem comprometer a foto. */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/15 to-black/65" />
          <div className="absolute inset-x-0 bottom-0 px-6 pb-12 sm:pb-16 md:pb-20">
            <div className="mx-auto max-w-3xl text-center">
              <p data-reveal className="text-[10px] tracking-[0.4em] text-white/75 sm:text-[11px]">
                VISTA INFINITA · PARQUE BARIGUI
              </p>
              <p data-reveal className="emp-pull-quote mt-5 text-2xl text-white sm:text-4xl lg:text-5xl drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)]">
                A natureza vira parte
                <br className="hidden sm:block" /> da sua casa.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===== SECTION 2 — Saiba mais heading + implantação ===== */}
      <section className="bg-white pt-16 md:pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-serif text-2xl font-light italic tracking-[0.15em] text-neutral-900 sm:text-3xl">
              Saiba mais sobre
            </h2>
            <h2 className="mt-1 font-serif text-2xl font-light italic tracking-[0.15em] text-neutral-900 sm:text-3xl">
              o empreendimento
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-sm text-neutral-500">
              Confira os detalhes do empreendimento com exclusividade.
              <br />Nossa equipe entrará em contato.
            </p>

            <a
              href={whatsUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-track="whatsapp_click"
              data-source="saiba_mais"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition hover:bg-neutral-800"
            >
              Fale conosco no WhatsApp
            </a>
          </div>
        </div>

        {(assets.lifestyleImage || assets.implantacaoImage) && (
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-[1fr_1.05fr] md:gap-16 lg:gap-20">
              {/* IMAGEM — slide-in da esquerda + parallax sutil interno +
                  border radius 24px + aspect 3/4 magazine. Imagem prioritaria
                  e a lifestyle (familia + vista). Implantacao fica de fallback. */}
              <div
                data-reveal-slide-left
                className="relative aspect-[3/4] overflow-hidden rounded-3xl shadow-xl ring-1 ring-neutral-900/5"
              >
                <Image
                  src={assets.lifestyleImage || assets.implantacaoImage!}
                  alt={`${emp.nome}${bairros[0] ? ` em ${bairros[0]}, Curitiba` : ""} — vista do Parque Barigui`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 45vw"
                  loading="lazy"
                  data-image-parallax
                />
                {/* Vinheta sutil bottom — dá profundidade sem texto */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent"
                />
              </div>

              {/* CONTEÚDO — slide-in da direita.
                  Mobile: text-center pra alinhar com o resto da pagina.
                  Desktop (md+): text-left (split 2-col com imagem ao
                  lado, leitura fluida da esquerda pra direita). */}
              <div data-reveal-slide-right className="text-center md:text-left">
                {/* Caption editorial */}
                <p className="text-[10px] uppercase tracking-[0.4em] text-[#c9a876] sm:text-[11px]">
                  Residencial
                </p>

                {/* Headline — tracking apertado (luxury), tamanho maior */}
                <h3 className="mt-4 font-serif text-4xl font-light leading-[1.05] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
                  Um complexo
                  <br />
                  <span className="italic">imobiliário único.</span>
                </h3>

                {/* Linha decorativa dourada — mx-auto em mobile, mx-0 em desktop */}
                <div
                  className="mx-auto mt-7 h-px w-12 bg-[#c9a876]/60 md:mx-0"
                  aria-hidden="true"
                />

                {/* Texto editorial — 3 paragrafos curtos em vez de 4 */}
                <p className="mt-7 text-[15px] leading-[1.65] text-neutral-700">
                  A vista cinematográfica e a natureza se tornam luxo somente
                  no <span className="text-neutral-900">{emp.nome}</span>.
                </p>

                <p className="mt-4 text-[15px] leading-[1.65] text-neutral-600">
                  Um complexo de alto padrão, em frente ao Parque Barigui e ao
                  lado do ParkShopping. A localização transforma qualidade em
                  excelência de vida.
                </p>

                <p className="mt-4 text-[15px] leading-[1.65] text-neutral-600">
                  Três empreendimentos independentes para você morar, trabalhar
                  ou ambos.
                </p>

                <Link
                  href="#empreendimentos"
                  className="mt-9 inline-flex items-center gap-2 rounded-full border border-[#c9a876] bg-transparent px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.25em] text-[#9c7d4f] transition hover:bg-[#c9a876] hover:text-white sm:text-xs"
                >
                  Conhecer as torres
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================
          STATS SOLO — Bloco editorial com 3 numeros grandes em
          isolamento. Cria respiro entre "Saiba mais" e "Torres",
          reforca escala do complexo com data points memoraveis.
          ======================================================== */}
      {assets.torres && assets.torres.length > 0 && (
        <section className="relative overflow-hidden bg-white py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8" data-reveal-stagger>
              <div className="text-center">
                <p className="font-serif text-5xl font-extralight tracking-tight text-neutral-900 sm:text-6xl lg:text-7xl">
                  <CountUp end={assets.torres.length} duration={1200} />
                </p>
                <div className="mx-auto mt-3 h-px w-12 bg-[#c9a876]" />
                <p className="mt-4 text-[10px] tracking-[0.3em] text-neutral-500 sm:text-[11px]">
                  EMPREENDIMENTOS INDEPENDENTES
                </p>
                <p className="mt-2 text-xs text-neutral-400 sm:text-sm">
                  {assets.torres.map((t) => t.nome.replace(/^Reserva /, "")).join(" · ")}
                </p>
              </div>
              <div className="text-center md:border-x md:border-neutral-200">
                <p className="font-serif text-5xl font-extralight tracking-tight text-neutral-900 sm:text-6xl lg:text-7xl">
                  <CountUp
                    end={8000}
                    duration={1800}
                    suffix={<span className="text-2xl text-neutral-500 sm:text-3xl"> m²</span>}
                  />
                </p>
                <div className="mx-auto mt-3 h-px w-12 bg-[#c9a876]" />
                <p className="mt-4 text-[10px] tracking-[0.3em] text-neutral-500 sm:text-[11px]">
                  BOSQUE PRESERVADO
                </p>
                <p className="mt-2 text-xs text-neutral-400 sm:text-sm">
                  mata nativa dentro do condomínio
                </p>
              </div>
              <div className="text-center">
                <p className="font-serif text-5xl font-extralight tracking-tight text-neutral-900 sm:text-6xl lg:text-7xl">
                  <CountUp
                    end={1.4}
                    duration={1600}
                    decimals={1}
                    suffix={<span className="text-2xl text-neutral-500 sm:text-3xl"> mi m²</span>}
                  />
                </p>
                <div className="mx-auto mt-3 h-px w-12 bg-[#c9a876]" />
                <p className="mt-4 text-[10px] tracking-[0.3em] text-neutral-500 sm:text-[11px]">
                  PARQUE BARIGUI
                </p>
                <p className="mt-2 text-xs text-neutral-400 sm:text-sm">
                  em frente ao empreendimento
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== Frente C — "Quem assina" (Sprint design 06/05/2026) =====
          Reforça autoridade do produto antes de mostrar torres/plantas.
          Padrão luxury (JHSF/Cyrela vendem branding). Renderiza só
          quando assets.partners está configurado. */}
      {assets.partners && assets.partners.length > 0 && (
        <MasterplanPartners
          partners={assets.partners}
          empreendimentoNome={emp.nome}
        />
      )}

      {/* ===== SECTION 3 — Torres + Plantas (Pacote 4 redesign) =====
          Cards refeitos: render full-bleed aspect 4:5, logo overlay top,
          descricao bottom com gradient, hover zoom + sombra dourada,
          CTA prominente. Plantas movidas pra grid separado abaixo. */}
      {assets.torres && assets.torres.length > 0 && (
        <section
          id="plantas"
          className="relative overflow-hidden bg-gradient-to-b from-white via-neutral-50 to-neutral-100 py-20 md:py-28"
        >
          {/* anchor secundario pra deep-links de empreendimentos especificos */}
          <span id="empreendimentos" className="block -translate-y-20" aria-hidden="true" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p data-reveal className="text-[10px] tracking-[0.4em] text-[#c9a876] sm:text-[11px]">
                CONHEÇA OS EMPREENDIMENTOS
              </p>
              <h2 data-reveal className="mt-4 font-serif text-3xl font-light italic tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
                Três empreendimentos independentes
              </h2>
              <p data-reveal className="mt-3 font-serif text-lg font-light italic text-neutral-500 sm:text-xl">
                para você morar, trabalhar ou ambos
              </p>
            </div>

            {/* Magazine spread v6 (08/05/2026): cards com hover reveal pattern
                (Aman/Bulgari) + cor signature por torre. Animacao 1: slide-in
                cascata via data-torre-cascade (left/bottom/right) — ver
                globals.css. */}
            <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3" data-torre-cascade>
              {assets.torres.map((torre) => {
                // Auto-fetch plantas from CRM for this torre's empreendimento.
                // Static fallback (torre.plantas) is torre-specific by design —
                // each torre in the asset map has its own plantas, never shared.
                const torreProperties = properties.filter((p) =>
                  p.empreendimento?.toLowerCase() === torre.nome.toLowerCase()
                )
                const plantasFromCRM = [...new Set(
                  torreProperties.flatMap((p) =>
                    (p.fotosPorTipo || [])
                      .filter((f) => f.tipo.toLowerCase() === "planta")
                      .map((f) => f.foto)
                  )
                )]
                const torrePlantas = plantasFromCRM.length > 0 ? plantasFromCRM : (torre.plantas || [])

                // Sprint B.4 \u2014 torreShortSlug centralizado em
                // empreendimento-assets.ts. Mesmo helper alimenta sub-rota
                // /empreendimento/[hub]/[torre], anchor ID e schema
                // containsPlace.
                const torreShortSlug = getTorreShortSlug(torre.nome)
                const torreAnchor = `torre-${torreShortSlug}`
                const accent = getTorreAccent(torreShortSlug)

                // Extrai prazo de entrega da descricao ("Entrega prevista
                // para Agosto/26." -> "Agosto/26"). Usado no footer.
                const entregaMatch = torre.descricao?.match(/entrega prevista para ([^.]+)/i)
                const entrega = entregaMatch ? entregaMatch[1].trim() : null

                return (
                  <div
                    key={torre.nome}
                    id={torreAnchor}
                    style={
                      {
                        "--torre-accent": accent.color,
                        "--torre-accent-soft": accent.bgSoft,
                        "--torre-accent-border": accent.borderSoft,
                      } as React.CSSProperties
                    }
                    className="group flex scroll-mt-24 flex-col text-center transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5"
                  >
                    {/* Render hero + thumbs de plantas + lightbox unificado.
                        Substituiu (08/05/2026) a section "PLANTAS POR TORRE"
                        separada que duplicava informacao. Click no render
                        ou em qualquer thumb abre lightbox fullscreen com
                        todas as imagens. */}
                    <TorreVisualGallery
                      render={torre.render}
                      plantas={torrePlantas}
                      torreNome={torre.nome}
                      empreendimentoNome={emp.nome}
                      bairro={bairros[0]}
                      construtora={construtora || undefined}
                      accentColor={accent.color}
                      accentBorder={accent.borderSoft}
                      accentSoft={accent.bgSoft}
                    />

                    {/* Editorial footer com link pra rota da torre. Click
                        nesse bloco navega; click no render/thumbs acima
                        abre o lightbox. UX limpa: cada zona tem 1 funcao. */}
                    <Link
                      href={`/empreendimento/${slug}/${torreShortSlug}`}
                      className="flex flex-1 flex-col px-2 pt-7 sm:pt-8"
                    >
                      {torre.categoria && (
                        <p
                          className="text-[10px] font-medium uppercase tracking-[0.3em] sm:text-[11px]"
                          style={{ color: accent.color }}
                        >
                          {torre.categoria}
                        </p>
                      )}

                      {torre.logo ? (
                        <div className="mt-5 flex h-[80px] items-center justify-center">
                          <Image
                            src={torre.logo}
                            alt={`Logo ${torre.nome} - ${emp.nome}`}
                            width={220}
                            height={88}
                            className="h-auto max-h-[68px] w-auto max-w-[200px] object-contain sm:max-h-[80px] sm:max-w-[220px]"
                          />
                        </div>
                      ) : (
                        <h3 className="mt-5 font-serif text-2xl font-light italic tracking-tight text-neutral-900 sm:text-3xl">
                          {torre.nome}
                        </h3>
                      )}

                      {/* Linha decorativa accent — extende no hover do card */}
                      <div
                        aria-hidden="true"
                        className="mx-auto mt-5 h-[2px] w-12 rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-20"
                        style={{ backgroundColor: accent.color, opacity: 0.7 }}
                      />

                      {/* Stats inline — plantas + entrega */}
                      <div className="mt-5 flex items-center justify-center gap-3 text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500 sm:text-[11px]">
                        {torrePlantas.length > 0 && (
                          <span>
                            {torrePlantas.length}{" "}
                            {torrePlantas.length === 1 ? "planta" : "plantas"}
                          </span>
                        )}
                        {/* Mostra "Pronto para morar" quando flag setada
                            no asset (torres ja entregues mesmo que descricao
                            ainda mencione "Entrega prevista para..."). Caso
                            contrario cai no fallback de prazo extraido da
                            descricao via regex. */}
                        {torrePlantas.length > 0 && (torre.prontoParaMorar || entrega) && (
                          <span aria-hidden="true" className="text-neutral-300">
                            ·
                          </span>
                        )}
                        {torre.prontoParaMorar ? (
                          <span>Pronto para morar</span>
                        ) : entrega ? (
                          <span>Entrega {entrega}</span>
                        ) : null}
                      </div>

                      {/* CTA — pílula com border accent */}
                      <div className="mt-auto pt-7">
                        <span className="inline-flex items-center gap-2 rounded-full border-2 px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] [border-color:var(--torre-accent)] [color:var(--torre-accent)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-[var(--torre-accent)] group-hover:text-white">
                          Conhecer
                          <svg
                            viewBox="0 0 24 24"
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                          >
                            <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </div>
                    </Link>
                  </div>
                )
              })}
            </div>

            {/* Section "PLANTAS POR TORRE" removida 08/05/2026 — duplicava
                informacao. Plantas agora aparecem como thumbs strip dentro
                de cada card de torre (ver TorreVisualGallery acima), com
                lightbox fullscreen ao clicar. UX mais compacta e direta. */}
          </div>
        </section>
      )}

      {/* ===== SECTION 4 — Unidades disponíveis (Sprint design 06/05/2026)
            Quando o hub tem `torres` configuradas (caso Reserva Barigui),
            usa <UnitsShowcase> editorial: hero card por torre + tabela
            compacta. Caso contrário, fallback pro grid antigo de
            PropertyCards simplificados — preserva retrocompat com outros
            empreendimentos. */}
      {assets.torres && assets.torres.length > 0 ? (
        <UnitsShowcase
          properties={properties}
          torres={assets.torres}
          hubSlug={slug}
          empreendimentoNome={emp.nome}
        />
      ) : (
        <section id="precos" className="bg-white py-20 md:py-28">
          <span id="unidades" className="block -translate-y-20" aria-hidden="true" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p data-reveal className="text-[10px] tracking-[0.4em] text-[#c9a876] sm:text-[11px]">
                CATÁLOGO COMPLETO
              </p>
              <h2 data-reveal className="mt-4 font-serif text-3xl font-light italic tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
                Unidades disponíveis
              </h2>
              <p data-reveal className="mt-3 text-sm text-neutral-500">
                {properties.length} {properties.length === 1 ? "unidade" : "unidades"} para morar ou investir
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" data-reveal-stagger>
              {properties.map((p) => (
                <Link key={p.codigo} href={`/imovel/${p.slug}`} className="group overflow-hidden rounded-sm border border-neutral-200 bg-white transition hover:border-[#c9a876] hover:shadow-lg">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image src={p.fotoDestaque || "/placeholder-property.jpg"} alt={p.titulo} fill className="object-cover transition duration-700 group-hover:scale-105" sizes="(max-width: 640px) 100vw, 33vw" loading="lazy" unoptimized={isVistaImage(p.fotoDestaque)} />
                    {p.lancamento && <span className="absolute top-3 left-3 rounded-full bg-[#c9a876] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Lançamento</span>}
                  </div>
                  <div className="p-5">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">{p.tipo} · {p.bairro}</p>
                    <p className="mt-2 line-clamp-1 font-serif text-base font-medium text-neutral-900">{p.titulo}</p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500">
                      {p.areaPrivativa && <span>{formatArea(p.areaPrivativa)} m²</span>}
                      {p.dormitorios && <span>{p.dormitorios} {p.dormitorios === 1 ? "quarto" : "quartos"}</span>}
                      {p.vagas && <span>{p.vagas} {p.vagas === 1 ? "vaga" : "vagas"}</span>}
                    </div>
                    {(p.precoVenda || p.precoAluguel) && (
                      <p className="mt-4 font-serif text-xl font-light text-neutral-900">{formatPrice(p.precoVenda || p.precoAluguel)}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== SECTION 5 — Infrastructure (Frente A — Sprint design 06/05/2026)
            Quando o empreendimento tem amenitiesShowcase configurado, usa
            o componente novo (cards visuais com renders dos amenities-âncora
            + accordion com a lista completa). Caso contrário, fallback pro
            grid flat de ícones igual ao padrão antigo. */}
      {infraestrutura.length > 0 && (
        assets.amenitiesShowcase && assets.amenitiesShowcase.length > 0 ? (
          <AmenitiesShowcase
            showcase={assets.amenitiesShowcase}
            fullList={infraestrutura}
            empreendimentoNome={emp.nome}
          />
        ) : (
          <section id="infraestrutura" className="bg-neutral-50 py-20 md:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <p data-reveal className="text-[10px] tracking-[0.4em] text-[#c9a876] sm:text-[11px]">
                  LAZER COMPLETO
                </p>
                <h2 data-reveal className="mt-4 font-serif text-3xl font-light italic tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
                  Infraestrutura do condomínio
                </h2>
                <p data-reveal className="mt-3 text-sm text-neutral-500">
                  {infraestrutura.length} itens de lazer e conveniência
                </p>
              </div>
              <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3" data-reveal-stagger>
                {infraestrutura.map((item) => {
                  const Icon = getPropertyFeatureIcon(item)
                  return (
                    <div key={item} className="flex items-center gap-3">
                      <Icon className="h-5 w-5 shrink-0 text-[#c9a876]" strokeWidth={1.8} />
                      <span className="text-sm text-neutral-700">{item}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )
      )}

      {/* ===== SECTION 6 — Localização (Frente B — Sprint design 06/05/2026)
            Quando há nearbyPlaces + aerialImage, usa o componente novo
            (foto aérea + lista "Tudo a 5 minutos" + iframe Google em
            accordion). Caso contrário, fallback pro iframe puro. */}
      {assets.nearbyPlaces && assets.nearbyPlaces.length > 0 ? (
        <LocationStorytelling
          empreendimentoNome={emp.nome}
          nearbyPlaces={assets.nearbyPlaces}
          aerialImage={assets.aerialImage}
          endereco={
            endereco?.endereco
              ? {
                  endereco: endereco.endereco,
                  numero: endereco.numero ?? "",
                  cep: endereco.cep ?? undefined,
                  bairro: bairros[0],
                }
              : undefined
          }
          bairro={bairros[0]}
          mapEmbedUrl={assets.mapEmbedUrl}
        />
      ) : (
        <section id="localizacao" className="bg-white py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p data-reveal className="text-[10px] tracking-[0.4em] text-[#c9a876] sm:text-[11px]">
                ENDEREÇO PRIVILEGIADO
              </p>
              <h2 data-reveal className="mt-4 font-serif text-3xl font-light italic tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
                Localização
              </h2>
              {endereco && (
                <p data-reveal className="mt-4 flex items-center justify-center gap-1.5 text-sm text-neutral-500">
                  <MapPin className="h-3.5 w-3.5" /> {[endereco.endereco, endereco.numero, bairros[0]].filter(Boolean).join(", ")}, Curitiba - PR
                </p>
              )}
            </div>

            <div data-reveal className="mt-12 overflow-hidden rounded-2xl border border-neutral-200 shadow-sm">
              {assets.mapEmbedUrl ? (
                <iframe src={assets.mapEmbedUrl} title="Localização" className="h-[400px] w-full md:h-[500px]" loading="lazy" allowFullScreen />
              ) : lat && lng ? (
                <PropertyMap latitude={lat} longitude={lng} bairro={bairros[0] || ""} titulo={emp.nome} endereco={endereco?.endereco} numero={endereco?.numero} cidade="Curitiba" estado="PR" />
              ) : null}
            </div>
          </div>
        </section>
      )}

      {/* ===== SECTION 6.5 — SEO content block (300+ palavras crawlable) =====
          Google indexa texto, nao imagens/parallax. Esse bloco carrega densidade
          de palavra-chave (nome do empreend., bairro, tipos, area, infra,
          construtora) sem prejudicar UX. Fica antes do CTA final pra reforcar
          contexto antes do call-to-action. */}
      <section className="bg-neutral-50 py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 data-reveal className="font-serif text-2xl font-light italic tracking-tight text-neutral-900 sm:text-3xl">
            Sobre o {emp.nome}
          </h2>
          <div data-reveal className="mt-6 space-y-4 text-[15px] leading-relaxed text-neutral-700">
            <p>
              O <strong>{emp.nome}</strong> é um empreendimento {situacao ? `em ${situacao.toLowerCase()} ` : ""}
              localizado {bairros[0] ? `no bairro ${bairros[0]}, ` : ""}em Curitiba/PR
              {construtora ? `, com construção ${construtora}` : ""}. São {properties.length}{" "}
              {properties.length === 1 ? "unidade disponível" : "unidades disponíveis"} para venda
              {tipos.length > 0 ? ` nos formatos ${tipos.slice(0, 4).join(", ").toLowerCase()}` : ""}
              {areaMin && areaMax
                ? `, com áreas privativas de ${formatArea(areaMin)}m² a ${formatArea(areaMax)}m²`
                : ""}
              {precoMin
                ? `, e valores a partir de ${formatPrice(precoMin)}${precoMax && precoMax !== precoMin ? ` chegando até ${formatPrice(precoMax)}` : ""}`
                : ""}
              .
            </p>

            {assets?.torres && assets.torres.length > 1 && (
              <p>
                O complexo é composto por {assets.torres.length} torres independentes — {" "}
                {assets.torres.map((t, i) => (
                  <span key={t.nome}>
                    <strong>{t.nome}</strong>
                    {i < assets.torres!.length - 2 ? ", " : i === assets.torres!.length - 2 ? " e " : ""}
                  </span>
                ))}
                {" "}— cada uma com proposta arquitetônica e tipologia próprias, atendendo
                desde investidores em busca de studios e lofts compactos até famílias
                que procuram coberturas duplex e plantas amplas.
              </p>
            )}

            {/* Sprint A.6 — cronograma de entrega extraido das descricoes
                editoriais (assets.torres[].descricao tem padrao "Entrega
                prevista para {Mes/Ano}"). Torres ja entregues (flag
                `prontoParaMorar`) sao rotuladas como "pronto para morar"
                em vez de prazo futuro. Renderiza so se pelo menos uma
                torre tem cronograma — empreendimentos sem editorial layout
                nao tem assets.torres entao bloco nao aparece. */}
            {(() => {
              if (!assets?.torres) return null
              const cronograma = assets.torres
                .map((t) => {
                  if (t.prontoParaMorar) {
                    return { nome: t.nome, prazo: "pronto para morar", pronto: true }
                  }
                  const match = t.descricao?.match(/entrega prevista para ([^.]+)/i)
                  return match
                    ? { nome: t.nome, prazo: match[1].trim(), pronto: false }
                    : null
                })
                .filter((x): x is { nome: string; prazo: string; pronto: boolean } => x !== null)
              if (cronograma.length === 0) return null
              return (
                <p>
                  Cronograma de entrega previsto:{" "}
                  {cronograma.map((c, i) => (
                    <span key={c.nome}>
                      <strong>{c.nome}</strong>{" "}
                      {c.pronto ? "pronto para morar" : `com entrega em ${c.prazo}`}
                      {i < cronograma.length - 2 ? ", " : i === cronograma.length - 2 ? " e " : ""}
                    </span>
                  ))}
                  . Datas conforme tabela do empreendimento — confirme pelo
                  WhatsApp antes de fechar negócio.
                </p>
              )
            })()}

            {bairros[0] && (
              <p>
                Morar {bairros[0] === "Mossunguê" ? "no Mossunguê" : `no bairro ${bairros[0]}`} é estar próximo
                {bairros[0] === "Mossunguê"
                  ? " ao Parque Barigui (um dos maiores parques urbanos de Curitiba, com 1,4 milhão de m²) e ao ParkShoppingBarigui, com acesso rápido à BR-277, Avenida Cândido Hartmann e ao Centro da cidade."
                  : ` em uma das regiões mais valorizadas de Curitiba, com infraestrutura completa de comércio, serviços e mobilidade.`}
                {" "}A localização privilegiada do {emp.nome} combina o verde do parque
                com a praticidade urbana — um diferencial que se traduz em qualidade
                de vida e potencial de valorização do imóvel.
              </p>
            )}

            {/* Sprint A.6 — endereco completo + CEP quando o CRM popula.
                Reforca sinal local pra Google e ajuda usuario a localizar
                rapidamente. */}
            {endereco?.endereco && (
              <p>
                <strong>Endereço:</strong>{" "}
                {[endereco.endereco, endereco.numero].filter(Boolean).join(", ")}
                {bairros[0] ? `, ${bairros[0]}` : ""}, Curitiba/PR
                {endereco.cep ? ` · CEP ${endereco.cep}` : ""}.
              </p>
            )}

            {infraestrutura.length > 0 && (
              <p>
                A infraestrutura de lazer do condomínio inclui {infraestrutura.slice(0, 8).join(", ").toLowerCase()}
                {infraestrutura.length > 8 ? ` e mais ${infraestrutura.length - 8} itens` : ""}, oferecendo
                experiência completa para moradores de todas as idades sem precisar sair de casa.
              </p>
            )}

            <p>
              A FYMOOB é a imobiliária parceira oficial para venda do {emp.nome}{construtora ? ` da ${construtora}` : ""}.
              Nossa equipe está pronta para apresentar plantas, valores atualizados,
              condições de pagamento e agendar visita ao plantão. Atendemos pelo
              WhatsApp <a href={whatsUrl} target="_blank" rel="noopener noreferrer" data-track="whatsapp_click" data-source="seo_text" className="font-medium text-[#c9a876] underline-offset-4 hover:underline">(41) 99978-0517</a>{" "}
              de segunda a sexta, das 8h30 às 17h. CRECI J 9420.
            </p>
          </div>
        </div>
      </section>

      {/* ===== SECTION 7 — Final CTA ===== */}
      <section id="contato" className="relative overflow-hidden bg-gradient-to-b from-[#0d0d0d] via-[#1a1a1a] to-[#0d0d0d] py-20 md:py-28">
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p data-reveal className="text-[10px] tracking-[0.4em] text-[#c9a876] sm:text-[11px]">
            FALE COM A FYMOOB
          </p>
          <h2 data-reveal className="mt-4 font-serif text-3xl font-light italic tracking-tight text-white sm:text-4xl lg:text-5xl">
            Agende sua visita
          </h2>
          <p data-reveal className="mt-4 text-sm text-white/60">
            Nossos especialistas do {emp.nome} estão prontos para atender você
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a
              href={whatsUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-track="whatsapp_click"
              data-source="final_cta"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-8 py-4 text-sm font-medium text-white transition hover:bg-[#1da851]"
            >
              <svg viewBox="0 0 24 24" className="size-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 0 1-4.11-1.14l-.29-.174-3.01.79.8-2.93-.19-.3A7.96 7.96 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" /></svg>
              WhatsApp
            </a>
            <a
              href="tel:+5541999780517"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-4 text-sm font-medium text-white/90 transition hover:border-white/40 hover:bg-white/5"
            >
              <Phone className="size-5" /> (41) 99978-0517
            </a>
          </div>

          <p className="mt-8 text-[11px] uppercase tracking-[0.25em] text-white/40">CRECI J 9420 · Seg-sex 8h30-17h</p>
        </div>
      </section>

      {/* FAQ + Related */}
      <section className="border-t border-neutral-100 bg-neutral-50 py-12 md:py-16">
        <div className="mx-auto max-w-4xl space-y-12 px-4 sm:px-6 lg:px-8">
          <DynamicFAQ
            questions={(() => {
              const stats = generateLandingStats(properties)
              const baseFaq = generateDynamicFAQ(stats, bairros[0])
              return [{ question: `Quantas unidades estão disponíveis no ${emp.nome}?`, answer: `O ${emp.nome} possui ${properties.length} ${properties.length === 1 ? "unidade disponível" : "unidades disponíveis"} no site da FYMOOB.${precoMin ? ` Preços a partir de ${formatPrice(precoMin)}.` : ""}` }, ...baseFaq.slice(1)]
            })()}
            title={`Perguntas frequentes sobre o ${emp.nome}`}
          />

          {/* Sprint B.5 (03/05/2026) — Cluster tematico de cross-link.
              Substitui o "Explore tambem" generico por 3 grupos especificos:
              (1) Outros lancamentos da mesma construtora — captura usuario
                  fa de marca (ex: quem busca "Avantti" e nao matchou esse
                  empreendimento).
              (2) Empreendimentos em bairros vizinhos — captura usuario
                  pesquisando "regiao do Parque Barigui" sem nome especifico.
              (3) Imoveis no bairro do empreendimento (manual fallback) —
                  baseline ja existia.
              Sem dependencia de CRM novo: tudo vem de getAllEmpreendimentos. */}
          {(() => {
            const sameConstrutora =
              construtora && emp.construtora
                ? empreendimentos
                    .filter(
                      (e) =>
                        e.slug !== slug &&
                        e.construtora?.toLowerCase() === emp.construtora?.toLowerCase(),
                    )
                    .slice(0, 6)
                : []
            return sameConstrutora.length > 0 ? (
              <RelatedPages
                title={`Outros lançamentos da ${construtora}`}
                links={sameConstrutora.map((e) => ({
                  href: `/empreendimento/${e.slug}`,
                  label: `${e.nome}${e.bairros[0] ? ` — ${e.bairros[0]}` : ""}`,
                }))}
              />
            ) : null
          })()}

          {(() => {
            // Bairros vizinhos pra cluster local — mapa enxuto so dos bairros
            // premium relevantes hoje. Se nao matcha, bloco nao renderiza.
            const BAIRROS_VIZINHOS: Record<string, string[]> = {
              "Mossunguê": ["Campina do Siqueira", "Cascatinha", "Bigorrilho", "Ecoville", "Santo Inácio"],
              "Bigorrilho": ["Mossunguê", "Champagnat", "Batel", "Cascatinha"],
              "Batel": ["Bigorrilho", "Centro", "Água Verde", "Champagnat"],
              "Água Verde": ["Batel", "Vila Izabel", "Portão", "Rebouças"],
              "Cabral": ["Bom Retiro", "Juvevê", "Centro Cívico", "Hugo Lange"],
              "Ecoville": ["Mossunguê", "Cidade Industrial", "Campo Comprido"],
            }
            const bairroAtual = bairros[0]
            const vizinhos = bairroAtual ? BAIRROS_VIZINHOS[bairroAtual] || [] : []
            if (vizinhos.length === 0) return null
            const empsVizinhos = empreendimentos
              .filter(
                (e) =>
                  e.slug !== slug &&
                  e.bairros.some((b) => vizinhos.includes(b)),
              )
              .slice(0, 8)
            if (empsVizinhos.length === 0) return null
            const tituloRegiao =
              bairroAtual === "Mossunguê" ? "Empreendimentos próximos ao Parque Barigui" : `Empreendimentos próximos ao ${bairroAtual}`
            return (
              <RelatedPages
                title={tituloRegiao}
                links={empsVizinhos.map((e) => ({
                  href: `/empreendimento/${e.slug}`,
                  label: `${e.nome}${e.bairros[0] ? ` — ${e.bairros[0]}` : ""}`,
                }))}
              />
            )
          })()}

          <RelatedPages title="Explore também" links={[...bairros.map((bairro) => ({ href: `/imoveis/${slugify(bairro)}`, label: `Imóveis no ${bairro}` })), ...empreendimentos.filter((e) => e.slug !== slug && e.total >= 3).slice(0, 6).map((e) => ({ href: `/empreendimento/${e.slug}`, label: e.nome }))]} />
        </div>
      </section>

      {/* Sticky bar mobile removida 08/05/2026 — pedido direto: bloco
          branco solido no rodape brigava com o tema editorial premium e
          duplicava o CTA do WhatsApp. WhatsAppFloat global (que antes
          ficava `hideOnMobile` aqui) agora aparece em mobile tambem,
          mesmo padrao das demais paginas do site. Spacer h-[80px] tambem
          removido (nao tem mais sticky bar pra absorver). */}
    </>
  )
}

// ====================================================
// Standard content (for empreendimentos without assets)
// ====================================================
function StandardContent(props: {
  emp: { nome: string; slug: string; bairros: string[]; total: number; precoMin?: number | null; precoMax?: number | null; construtora?: string | null }
  properties: Property[]
  precoMin: number | null
  precoMax: number | null
  areaMin: number | null
  areaMax: number | null
  tipos: string[]
  bairros: string[]
  unitTypes: ReturnType<typeof groupUnitTypes>
  infraestrutura: string[]
  lat: number | null
  lng: number | null
  endereco: Property | undefined
  construtora: string | null
  situacao?: string | null
  slug: string
  empreendimentos: Awaited<ReturnType<typeof getAllEmpreendimentos>>
  whatsUrl: string
  descricao: string | null | undefined
  plantas?: string[]
}) {
  const { emp, properties, precoMin, precoMax, areaMin, areaMax, tipos, bairros, unitTypes, infraestrutura, lat, lng, endereco, construtora, situacao, slug, empreendimentos, whatsUrl, descricao, plantas } = props
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 py-10 lg:grid-cols-[1fr_340px]">
          <div className="space-y-16">
            {descricao && (
              <section>
                <h2 className="font-display text-2xl font-bold text-neutral-900">Sobre o {emp.nome}</h2>
                <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-neutral-600">{descricao}</div>
              </section>
            )}
            <section>
              <h2 className="font-display text-2xl font-bold text-neutral-900">Tipos de unidades</h2>
              <div className="mt-6 space-y-4">
                {unitTypes.map((ut) => (
                  <div key={ut.key} className="flex items-center gap-4 rounded-xl border border-neutral-200 p-4">
                    {ut.foto && (
                      <div className="relative hidden h-20 w-28 shrink-0 overflow-hidden rounded-lg sm:block">
                        <Image src={ut.foto} alt={`${emp.nome} — ${ut.properties[0].tipo}${ut.area > 0 ? ` ${formatArea(ut.area)}m²` : ""}`} fill className="object-cover" sizes="112px" loading="lazy" unoptimized={isVistaImage(ut.foto)} />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-neutral-900">{ut.properties[0].tipo} {ut.area > 0 ? `${formatArea(ut.area)}m²` : ""}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                        {ut.dorms > 0 && <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> {ut.dorms} {ut.dorms === 1 ? "quarto" : "quartos"}</span>}
                        {ut.suites > 0 && <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> {ut.suites} suítes</span>}
                        {ut.banheiros > 0 && <span className="flex items-center gap-1"><ShowerHead className="h-3.5 w-3.5" /> {ut.banheiros}</span>}
                        {ut.vagas > 0 && <span className="flex items-center gap-1"><Car className="h-3.5 w-3.5" /> {ut.vagas} vagas</span>}
                      </div>
                      {ut.precoMin > 0 && <p className="mt-2 text-sm font-bold text-slate-900">A partir de {formatPrice(ut.precoMin)}</p>}
                    </div>
                    <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">{ut.count}</span>
                  </div>
                ))}
              </div>
            </section>
            {plantas && plantas.length > 0 && (
              <section>
                <h2 className="font-serif text-2xl font-light italic tracking-tight text-neutral-900">Plantas disponíveis</h2>
                <p className="mt-1 text-sm text-neutral-500">{plantas.length} {plantas.length === 1 ? "opção" : "opções"} de planta — clique para ampliar</p>
                <div className="mt-6">
                  <PlantasGallery plantas={plantas} />
                </div>
              </section>
            )}

            {infraestrutura.length > 0 && (
              <section>
                <h2 className="font-display text-2xl font-bold text-neutral-900">Infraestrutura</h2>
                <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 xl:grid-cols-3">
                  {infraestrutura.map((item) => {
                    const Icon = getPropertyFeatureIcon(item)
                    return (
                      <div key={item} className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={1.9} />
                        <span className="text-sm text-neutral-700">{item}</span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
            {lat && lng && (
              <section>
                <PropertyMap latitude={lat} longitude={lng} bairro={bairros[0] || ""} titulo={emp.nome} endereco={endereco?.endereco} numero={endereco?.numero} cidade="Curitiba" estado="PR" />
              </section>
            )}
            <section>
              <h2 className="font-display text-2xl font-bold text-neutral-900">Todas as unidades ({properties.length})</h2>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {properties.map((p) => (
                  <Link key={p.codigo} href={`/imovel/${p.slug}`} className="group overflow-hidden rounded-xl border border-neutral-200 transition hover:shadow-md">
                    <div className="relative aspect-[4/3]">
                      <Image src={p.fotoDestaque || "/placeholder-property.jpg"} alt={p.titulo} fill className="object-cover transition duration-500 group-hover:scale-105" sizes="(max-width: 640px) 100vw, 33vw" loading="lazy" unoptimized={isVistaImage(p.fotoDestaque)} />
                      {p.lancamento && <span className="absolute top-3 left-3 rounded-full bg-brand-primary px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">Lançamento</span>}
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-medium text-neutral-500">{p.tipo} · {p.bairro}</p>
                      <p className="mt-1 line-clamp-1 text-sm font-semibold text-neutral-900">{p.titulo}</p>
                      {(p.precoVenda || p.precoAluguel) && <p className="mt-2 text-base font-extrabold text-slate-900">{formatPrice(p.precoVenda || p.precoAluguel)}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-2xl border border-neutral-200 bg-white p-6">
                <h3 className="font-display text-lg font-bold text-neutral-900">Fale com um especialista</h3>
                <p className="mt-1 text-sm text-neutral-500">Tire suas dúvidas sobre o {emp.nome}</p>
                <a href={whatsUrl} target="_blank" rel="noopener noreferrer" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white">
                  <svg viewBox="0 0 24 24" className="size-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 0 1-4.11-1.14l-.29-.174-3.01.79.8-2.93-.19-.3A7.96 7.96 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" /></svg>
                  WhatsApp
                </a>
                <a href="tel:+5541999780517" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-700">
                  <Phone className="size-4" /> (41) 99978-0517
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
      {/* Spacer mobile — buffer abaixo do conteudo pra sticky bar (h~72px)
          nao cobrir o ultimo elemento. Layout standard. */}
      <div className="h-[80px] lg:hidden" aria-hidden="true" />
      <div className="fixed bottom-0 left-0 z-30 w-full border-t border-neutral-200 bg-white px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            {precoMin && <><p className="text-lg font-extrabold text-slate-900">{formatPrice(precoMin)}</p><p className="text-xs text-neutral-500">A partir de</p></>}
          </div>
          <a href={whatsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-semibold text-white">
            <svg viewBox="0 0 24 24" className="size-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 0 1-4.11-1.14l-.29-.174-3.01.79.8-2.93-.19-.3A7.96 7.96 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" /></svg>
            Visitar
          </a>
        </div>
      </div>
      {/* Bloco SEO ~1000 palavras pra empreendimentos sem editorial layout
          (Fase 19.P2.B). Audit revelou 109 de 110 empreendimentos com thin
          content (media 288 palavras). Component dinamico via dados do CRM
          + descricoes curadas de bairros/construtoras. */}
      <EmpreendimentoStandardSEOContent
        empreendimento={{
          nome: emp.nome,
          slug,
          bairros: emp.bairros,
          total: emp.total,
          precoMin: emp.precoMin,
          precoMax: emp.precoMax,
          construtora: emp.construtora,
        }}
        precoMin={precoMin}
        precoMax={precoMax}
        areaMin={areaMin}
        areaMax={areaMax}
        tipos={tipos}
        bairro={bairros[0] || ""}
        construtora={construtora}
        situacao={situacao}
        descricaoCRM={descricao}
      />

      <section className="border-t border-neutral-100 bg-neutral-50 py-12 md:py-16">
        <div className="mx-auto max-w-4xl space-y-12 px-4 sm:px-6 lg:px-8">
          <DynamicFAQ
            questions={(() => {
              const stats = generateLandingStats(properties)
              const baseFaq = generateDynamicFAQ(stats, bairros[0])
              return [{ question: `Quantas unidades estão disponíveis no ${emp.nome}?`, answer: `O ${emp.nome} possui ${properties.length} ${properties.length === 1 ? "unidade disponível" : "unidades disponíveis"} no site da FYMOOB.${precoMin ? ` Preços a partir de ${formatPrice(precoMin)}.` : ""}` }, ...baseFaq.slice(1)]
            })()}
            title={`Perguntas frequentes sobre o ${emp.nome}`}
          />
          <RelatedPages title="Explore também" links={[...bairros.map((bairro) => ({ href: `/imoveis/${slugify(bairro)}`, label: `Imóveis no ${bairro}` })), ...empreendimentos.filter((e) => e.slug !== slug && e.total >= 3).slice(0, 6).map((e) => ({ href: `/empreendimento/${e.slug}`, label: e.nome }))]} />
        </div>
      </section>
    </>
  )
}
