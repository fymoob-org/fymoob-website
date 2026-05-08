import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Phone, ChevronDown } from "lucide-react"
import {
  getAllEmpreendimentos,
  getPropertiesByEmpreendimento,
} from "@/services/loft"
import { isVistaImage } from "@/lib/image-optimization"
import { formatPrice, formatArea } from "@/lib/utils"
import {
  generateItemListSchema,
  generateLandingStats,
  generateDynamicFAQ,
  safeJsonLd,
} from "@/lib/seo"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { DynamicFAQ } from "@/components/seo/DynamicFAQ"
import { RelatedPages } from "@/components/seo/RelatedPages"
import { PlantasCarousel } from "@/components/empreendimento/PlantasCarousel"
import {
  getEmpreendimentoAssets,
  getTorreFromShortSlug,
  getTorreShortSlug,
  classifyTorreFor,
} from "@/data/empreendimento-assets"
import { SITE_URL } from "@/lib/constants"

/**
 * Sprint B' (03/05/2026) — Sub-rota de torre como pagina dedicada.
 *
 * URL: /empreendimento/[slug]/[torre]
 *   Ex: /empreendimento/reserva-barigui/lago    (6 unidades)
 *       /empreendimento/reserva-barigui/colina  (3 unidades)
 *       /empreendimento/reserva-barigui/mirante (2 unidades)
 *
 * Diferente do Sprint B.7 inicial (re-render do hub com title diferente),
 * aqui cada torre vira landing real:
 * - Hero proprio (render da torre)
 * - Descricao focada na torre
 * - Plantas so dessa torre
 * - Unidades disponiveis filtradas por classifyTorreFor() — heuristica
 *   automatica enquanto Wagner nao segmenta unidades por torre no CRM
 * - FAQ + cronograma de entrega especifico
 * - CTA WhatsApp com mensagem por torre
 *
 * Canonical self-referencing — cada sub-rota e canonical de si mesma.
 * Antes (B' inicial) o canonical apontava pro hub na intencao de "consolidar
 * autoridade", mas Google obedeceu literalmente e nao indexou /colina e
 * /mirante (GSC reportou "Crawled - currently not indexed" em 04/05/2026).
 * Conteudo do Sprint B' ja e diferenciado o suficiente pra indexar separado:
 * hero proprio, plantas filtradas, unidades filtradas, FAQ especifica.
 * Schema RealEstateListing.isPartOf aponta pro hub e mantem sinal de
 * relacionamento sem dar hint de "nao indexe".
 */

interface TorreSubRouteProps {
  params: Promise<{ slug: string; torre: string }>
}

const VALID_HUB_SLUG = /^[a-z0-9][a-z0-9-]{1,100}$/
const VALID_TORRE_SLUG = /^[a-z0-9][a-z0-9-]{0,40}$/
const FYMOOB_PHONE = "5541999780517"

export const revalidate = 7200
export const dynamicParams = true

export async function generateStaticParams() {
  const empreendimentos = await getAllEmpreendimentos()
  const params: { slug: string; torre: string }[] = []
  for (const emp of empreendimentos) {
    const assets = getEmpreendimentoAssets(emp.slug)
    if (!assets?.torres) continue
    for (const t of assets.torres) {
      params.push({ slug: emp.slug, torre: getTorreShortSlug(t.nome) })
    }
  }
  return params
}

/**
 * Sprint B' — coleta unidades da torre. Para hubs com classifier (Reserva
 * Barigui), filtra todas as unidades do hub + variantes typo conhecidas
 * pelo nome do empreendimento, e classifica. Para hubs sem classifier,
 * mostra todas as unidades do hub (fallback).
 */
async function getTorreProperties(hubSlug: string, hubName: string, torreShortSlug: string) {
  // Hub principal sempre busca
  const main = await getPropertiesByEmpreendimento(hubName)

  // Variante typo conhecida para Reserva Barigui (1 imovel orfao em "Reserva
  // Bairgui"). Tirar quando Wagner renomear no CRM (Sprint B.X canonical
  // ja consolida ranking enquanto isso).
  const TYPO_VARIANTS: Record<string, string[]> = {
    "reserva-barigui": ["Reserva Bairgui"],
  }
  const variants = TYPO_VARIANTS[hubSlug] || []
  const variantProps = await Promise.all(variants.map((v) => getPropertiesByEmpreendimento(v)))
  const all = [...main, ...variantProps.flat()]

  // Probe: se classifier devolve null, o hub nao tem regra registrada ->
  // fallback mostra todas as unidades (mesmo comportamento do hub).
  if (all.length === 0 || classifyTorreFor(hubSlug, all[0]) === null) {
    return all
  }

  return all.filter((p) => classifyTorreFor(hubSlug, p) === torreShortSlug)
}

export async function generateMetadata({ params }: TorreSubRouteProps): Promise<Metadata> {
  const { slug, torre } = await params
  if (!VALID_HUB_SLUG.test(slug) || !VALID_TORRE_SLUG.test(torre)) return {}

  const empreendimentos = await getAllEmpreendimentos()
  const emp = empreendimentos.find((e) => e.slug === slug)
  if (!emp) return {}

  const resolved = getTorreFromShortSlug(slug, torre)
  if (!resolved) return {}

  const { torre: t } = resolved
  const bairroText = emp.bairros.length > 0 ? emp.bairros[0] : "Curitiba"
  const construtoraSuffix = emp.construtora ? ` ${emp.construtora}` : ""

  // Tenta enriquecer description com count + faixa de preco real da torre
  // (so na hora do render — generateMetadata roda separado, sem custo
  // adicional ja que getPropertiesByEmpreendimento e cached).
  const torreProps = await getTorreProperties(slug, emp.nome, torre)
  const torrePrecos = torreProps
    .map((p) => p.precoVenda ?? p.precoAluguel)
    .filter((v): v is number => v !== null && v > 0)
  const torrePrecoMin = torrePrecos.length > 0 ? Math.min(...torrePrecos) : null
  const torreCount = torreProps.length

  const title = `${t.nome}${construtoraSuffix} — ${emp.nome} em ${bairroText}, Curitiba | FYMOOB`

  const torreDescDecurta = (t.descricao
    ? t.descricao.replace(/\s+/g, " ").trim().slice(0, 110)
    : `Conheça a torre ${t.nome} dentro do complexo ${emp.nome}`
  ).replace(/[.,;:\s]+$/, "")

  const countText = torreCount > 0
    ? `${torreCount} ${torreCount === 1 ? "unidade" : "unidades"} disponíveis`
    : ""
  const precoText = torrePrecoMin ? ` a partir de ${formatPrice(torrePrecoMin)}` : ""
  const description = `${t.nome} no ${emp.nome}${construtoraSuffix} — ${bairroText}, Curitiba${precoText}. ${torreDescDecurta}.${countText ? ` ${countText}.` : ""} Plantas, preços e atendimento FYMOOB.`.trim()

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/empreendimento/${slug}/${torre}` },
    keywords: [
      t.nome,
      `${t.nome} ${bairroText}`,
      `${t.nome} ${emp.nome}`,
      `${emp.nome} ${t.nome}`,
      `${t.nome} plantas`,
      `${t.nome} preços`,
      ...(emp.construtora ? [`${emp.construtora} ${t.nome}`] : []),
    ],
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/empreendimento/${slug}/${torre}`,
      type: "website",
      siteName: "FYMOOB",
      locale: "pt_BR",
      ...(t.render && {
        images: [{ url: t.render, width: 1200, height: 630, alt: `${t.nome} — ${emp.nome}` }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(t.render && { images: [t.render] }),
    },
  }
}

export default async function TorreSubRoute({ params }: TorreSubRouteProps) {
  const { slug, torre } = await params
  if (!VALID_HUB_SLUG.test(slug) || !VALID_TORRE_SLUG.test(torre)) notFound()
  const resolved = getTorreFromShortSlug(slug, torre)
  if (!resolved) notFound()

  const { hub, torre: t } = resolved
  const empreendimentos = await getAllEmpreendimentos()
  const emp = empreendimentos.find((e) => e.slug === slug)
  if (!emp) notFound()

  const allTorreProps = await getTorreProperties(slug, emp.nome, torre)

  const bairros = [...new Set(allTorreProps.map((p) => p.bairro).filter(Boolean))]
  const bairro = bairros[0] || emp.bairros[0] || "Curitiba"
  const construtora = emp.construtora || allTorreProps.find((p) => p.construtora)?.construtora || null
  const tipos = [...new Set(allTorreProps.map((p) => p.tipo))]

  const precos = allTorreProps
    .map((p) => p.precoVenda ?? p.precoAluguel)
    .filter((v): v is number => v !== null && v > 0)
  const precoMin = precos.length > 0 ? Math.min(...precos) : null
  const precoMax = precos.length > 0 ? Math.max(...precos) : null
  const areas = allTorreProps.map((p) => p.areaPrivativa).filter((a): a is number => a !== null && a > 0)
  const areaMin = areas.length > 0 ? Math.min(...areas) : null
  const areaMax = areas.length > 0 ? Math.max(...areas) : null

  // Plantas — prioriza CRM (fotosPorTipo tipo "Planta") da propria torre,
  // fallback pro asset estatico curado (Sprint B' → torre tem plantas curadas
  // em assets-map mesmo quando CRM nao tem).
  const plantasFromCRM = [
    ...new Set(
      allTorreProps.flatMap((p) =>
        (p.fotosPorTipo || []).filter((f) => f.tipo.toLowerCase() === "planta").map((f) => f.foto),
      ),
    ),
  ]
  const plantasFinal = plantasFromCRM.length > 0 ? plantasFromCRM : t.plantas || []

  // Cronograma da torre extraido da descricao curada
  const cronogramaMatch = t.descricao?.match(/entrega prevista para ([^.]+)/i)
  const cronograma = cronogramaMatch?.[1].trim() || null

  // Schema RealEstateListing focado na torre — count + faixa de preco apenas
  // dessa torre. Canonical aponta pro hub mas o JSON-LD descreve a torre.
  const torreSchemaImages: string[] = []
  if (t.render) {
    const abs = t.render.startsWith("http") ? t.render : `${SITE_URL}${t.render}`
    torreSchemaImages.push(abs)
  }
  if (t.logo) {
    const abs = t.logo.startsWith("http") ? t.logo : `${SITE_URL}${t.logo}`
    if (!torreSchemaImages.includes(abs)) torreSchemaImages.push(abs)
  }

  const torreRealEstateSchema = {
    "@type": "RealEstateListing",
    name: `${t.nome} — ${emp.nome}`,
    description: t.descricao || `Torre ${t.nome} dentro do complexo ${emp.nome}`,
    url: `${SITE_URL}/empreendimento/${slug}/${torre}`,
    ...(torreSchemaImages.length > 0 && { image: torreSchemaImages }),
    ...(construtora && {
      brand: { "@type": "Organization", name: construtora },
    }),
    ...(precoMin && {
      offers: {
        "@type": "AggregateOffer",
        lowPrice: precoMin,
        highPrice: precoMax || precoMin,
        priceCurrency: "BRL",
        offerCount: allTorreProps.length,
        availability:
          allTorreProps.length > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/SoldOut",
      },
    }),
    address: {
      "@type": "PostalAddress",
      addressLocality: bairro,
      addressRegion: "PR",
      addressCountry: "BR",
    },
    isPartOf: {
      "@type": "Place",
      name: emp.nome,
      url: `${SITE_URL}/empreendimento/${slug}`,
    },
  }
  const itemListSchema = generateItemListSchema(allTorreProps, `/empreendimento/${slug}/${torre}`)
  const combinedSchema = {
    "@context": "https://schema.org",
    "@graph": [torreRealEstateSchema, itemListSchema],
  }

  const whatsMessage = `Olá! Tenho interesse no ${t.nome} (${emp.nome}). Pode me passar mais informações?`
  const whatsUrl = `https://wa.me/${FYMOOB_PHONE}?text=${encodeURIComponent(whatsMessage)}`

  // Outras torres do mesmo hub pra cross-link
  const outrasTorres = (hub.torres || []).filter((other) => other.nome !== t.nome)

  // Render hero image: prioriza render da torre; fallback pro hero do hub
  const heroImage = t.render || hub.heroImage

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(combinedSchema) }} />

      {/* Wrapper escuro envolvendo nav + hero (revisao v6.1 04/05/2026):
          Body global tem `bg-background` (branco). Nav sticky e transparente
          inicialmente — wrapper escuro evita que o branco do body apareça
          atras do nav. */}
      <div className="bg-neutral-950">

      {/* Smart Nav editorial premium — revisao GPT 04/05/2026:
            - logo-text na esquerda
            - links centro/direita opacity 60%, hover dourado
            - botao "Agendar visita" verde profundo (era WhatsApp neon) */}
      <nav
        aria-label="Navegação rápida"
        className="emp-smart-nav sticky top-0 z-40 border-b border-transparent text-[10px] font-light tracking-[0.2em] sm:text-[11px]"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-4 py-2.5 sm:gap-5 sm:px-6 sm:py-3 lg:px-8">
          <Link
            href={`/empreendimento/${slug}`}
            className="shrink-0 font-serif text-[13px] italic tracking-[0.15em] opacity-90 transition hover:text-[#c9a876] hover:opacity-100 sm:text-[14px]"
          >
            ← {emp.nome}
          </Link>
          <span className="hidden md:block flex-1" aria-hidden="true" />
          <Link href="#sobre" className="shrink-0 px-1 uppercase opacity-75 transition hover:text-[#c9a876] hover:opacity-100">
            Sobre
          </Link>
          <Link href="#plantas" className="shrink-0 px-1 uppercase opacity-75 transition hover:text-[#c9a876] hover:opacity-100">
            Plantas
          </Link>
          <Link href="#unidades" className="shrink-0 px-1 uppercase opacity-75 transition hover:text-[#c9a876] hover:opacity-100">
            Unidades
          </Link>
          <a
            href={whatsUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-track="whatsapp_click"
            data-source="navbar_torre"
            className="ml-auto shrink-0 rounded-full bg-[#246B4E] px-4 py-1.5 uppercase text-[10px] font-medium tracking-[0.2em] text-white shadow-sm transition hover:bg-[#2B7D5A] sm:px-5 sm:text-[11px]"
          >
            Agendar visita
          </a>
        </div>
      </nav>

      {/* HERO da torre — overlay multi-camada + hierarquia premium */}
      <section className="relative flex h-[78vh] min-h-[600px] items-center justify-center overflow-hidden bg-neutral-950">
        <div className="absolute inset-0">
          <Image
            src={heroImage}
            alt={`${t.nome} — render da torre do ${emp.nome}${construtora ? ` (${construtora})` : ""} em ${bairro}, Curitiba`}
            fill
            className="emp-kenburns object-cover"
            sizes="100vw"
            priority
            quality={90}
          />
          {/* Overlay revisado v6 (04/05/2026) — bottom mais escuro pra
              suportar o bloco tagline+CTAs reorganizado */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.04)_28%,transparent_55%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/25 to-black/85" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(0,0,0,0.4)_100%)]" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6">
          {/* TOPO: caption + H1 SEO (revisao v6 04/05/2026) — reorganizacao
              luxury editorial. Caption institucional + H1 sutil agrupados
              no topo, logo no centro, tagline + CTAs bottom. */}
          <p data-reveal className="text-[10px] tracking-[0.4em] text-white/65 sm:text-[11px]">
            LANÇAMENTO · {bairro.toUpperCase()} · CURITIBA
          </p>
          <h1 data-reveal className="mt-6 font-light text-[11px] tracking-[0.3em] uppercase text-white/70 drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)] sm:text-xs">
            {t.nome}
            <span className="text-white/50"> · {emp.nome}</span>
          </h1>
          {t.logo ? (
            <div data-reveal className="mt-10 flex justify-center sm:mt-12">
              <Image
                src={t.logo}
                alt={`Logo ${t.nome} — ${emp.nome}${construtora ? ` (${construtora})` : ""}`}
                width={500}
                height={200}
                className="h-auto max-h-[180px] w-auto max-w-[80vw] object-contain drop-shadow-[0_4px_28px_rgba(0,0,0,0.5)] sm:max-h-[220px] sm:max-w-[460px]"
                priority
              />
            </div>
          ) : null}
          {/* Tagline aspiracional — segundo ponto focal, clamp(22-38px)
              + tracking negativo pra ar editorial premium. */}
          {allTorreProps.length > 1 && (
            <p data-reveal className="mt-6 text-[clamp(22px,2.2vw,38px)] font-light leading-[1.15] tracking-[-0.035em] text-white/95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
              {allTorreProps.length} unidades exclusivas no complexo {emp.nome}
            </p>
          )}
          {allTorreProps.length === 1 && (
            <p data-reveal className="mt-6 text-[clamp(22px,2.2vw,38px)] font-light leading-[1.15] tracking-[-0.035em] text-white/95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
              Unidade exclusiva no complexo {emp.nome}
            </p>
          )}
          {tipos.length > 0 && (
            <p data-reveal className="mt-5 text-[14px] font-normal leading-[1.6] text-white/[0.72] drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]">
              {(() => {
                const pluralize = (tt: string) => {
                  const lower = tt.toLowerCase()
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
                const local =
                  bairro === "Mossunguê" ? "em frente ao Parque Barigui" : `em ${bairro || "Curitiba"}`
                return `${lista.charAt(0).toUpperCase()}${lista.slice(1)} ${local}`
              })()}
            </p>
          )}

          {/* CTAs — h-11 fixo + tracking 0.14em + font-semibold no
              primario. Linguagem unificada com hub. */}
          <div data-reveal className="mt-9 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <a
              href={whatsUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-track="whatsapp_click"
              data-source="hero_primary_torre"
              className="inline-flex h-11 items-center gap-2.5 rounded-full bg-[#246B4E] px-[34px] text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-xl transition hover:bg-[#2B7D5A] sm:h-12 sm:px-9"
            >
              Agendar visita privativa
            </a>
            <Link
              href="#plantas"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/[0.32] bg-white/[0.04] px-[30px] text-[11px] font-medium uppercase tracking-[0.14em] text-white/85 shadow-md backdrop-blur-md transition hover:border-white/60 hover:bg-white/15 sm:h-12 sm:px-8"
            >
              Ver plantas
            </Link>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2">
          <div className="flex flex-col items-center gap-2">
            <span className="block h-8 w-px bg-gradient-to-b from-transparent via-white/40 to-white/60" />
            <ChevronDown className="h-3.5 w-3.5 animate-bounce text-white/55" />
          </div>
        </div>
      </section>

      </div>{/* /wrapper bg-neutral-950 */}

      {/* Breadcrumb editorial utilitario — padding maior pra dar respiro */}
      <div className="bg-[#0a0d0c] py-5 sm:py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-[10px] [&_nav]:text-white/35 [&_a]:text-white/35 [&_a:hover]:text-[#c9a876] [&_span]:text-white/55 sm:text-[11px]">
            <Breadcrumbs
              items={[
                { name: "Home", url: "/" },
                { name: "Empreendimentos", url: "/empreendimentos" },
                { name: emp.nome, url: `/empreendimento/${slug}` },
                { name: t.nome, url: `/empreendimento/${slug}/${torre}` },
              ]}
            />
          </div>
        </div>
      </div>

      {/* ===== SECTION — Sobre a torre ===== */}
      <section id="sobre" className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p data-reveal className="font-serif text-[11px] uppercase tracking-[0.3em] text-[#c9a876]">
            Conheça a torre
          </p>
          <h2 data-reveal className="mt-3 font-serif text-3xl font-light italic tracking-tight text-neutral-900 sm:text-4xl">
            {t.nome}
          </h2>
          {t.descricao && (
            <p data-reveal className="mt-6 text-lg leading-relaxed text-neutral-700">
              {t.descricao}
            </p>
          )}
          <div className="mt-10 grid grid-cols-2 gap-6 border-t border-neutral-200 pt-8 sm:grid-cols-4" data-reveal-stagger>
            <div>
              <p className="font-serif text-2xl font-light text-neutral-900">{allTorreProps.length}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-neutral-500">{allTorreProps.length === 1 ? "Unidade" : "Unidades"}</p>
            </div>
            {precoMin && (
              <div>
                <p className="font-serif text-lg font-light text-neutral-900">{formatPrice(precoMin)}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-neutral-500">A partir de</p>
              </div>
            )}
            {areaMin && areaMax && (
              <div>
                <p className="font-serif text-lg font-light text-neutral-900">
                  {areaMin === areaMax ? `${formatArea(areaMin)} m²` : `${formatArea(areaMin)}–${formatArea(areaMax)} m²`}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-neutral-500">Área privativa</p>
              </div>
            )}
            {cronograma && (
              <div>
                <p className="font-serif text-base font-light text-neutral-900">{cronograma}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-neutral-500">Entrega prevista</p>
              </div>
            )}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href={whatsUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-track="whatsapp_click"
              data-source="sobre_torre"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#1da851]"
            >
              Falar pelo WhatsApp sobre {t.nome}
            </a>
            <Link
              href={`/empreendimento/${slug}`}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 hover:bg-neutral-50"
            >
              Ver complexo {emp.nome} completo
            </Link>
          </div>
        </div>
      </section>

      {/* ===== SECTION — Plantas ===== */}
      {plantasFinal.length > 0 && (
        <section id="plantas" className="bg-gradient-to-b from-neutral-50 to-neutral-100 py-20 md:py-28">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p data-reveal className="font-serif text-[11px] uppercase tracking-[0.3em] text-[#c9a876]">
                {t.nome}
              </p>
              <h2 data-reveal className="mt-3 font-serif text-3xl font-light italic tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
                Plantas disponíveis
              </h2>
              <p data-reveal className="mx-auto mt-4 max-w-2xl text-sm text-neutral-600">
                {plantasFinal.length} {plantasFinal.length === 1 ? "opção" : "opções"} de planta — clique para ampliar
              </p>
            </div>
            <div data-reveal className="mt-12">
              <PlantasCarousel
                plantas={plantasFinal}
                torreNome={t.nome}
                empreendimentoNome={emp.nome}
                bairro={bairro}
                construtora={construtora || undefined}
              />
            </div>
          </div>
        </section>
      )}

      {/* ===== SECTION — Unidades disponiveis (filtradas pela torre) ===== */}
      <section id="unidades" className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p data-reveal className="text-[10px] tracking-[0.4em] text-[#c9a876] sm:text-[11px]">
              CATÁLOGO {t.nome.toUpperCase()}
            </p>
            <h2 data-reveal className="mt-4 font-serif text-3xl font-light italic tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
              Unidades disponíveis
            </h2>
            <p data-reveal className="mt-3 text-sm text-neutral-500">
              {allTorreProps.length} {allTorreProps.length === 1 ? "unidade" : "unidades"}{precoMin ? ` · a partir de ${formatPrice(precoMin)}` : ""}
            </p>
          </div>

          {allTorreProps.length === 0 ? (
            <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center">
              <p className="text-sm text-neutral-600">
                Nenhuma unidade do {t.nome} disponível no momento. Fale com a equipe FYMOOB pelo WhatsApp pra ser avisado quando novas unidades entrarem.
              </p>
              <a
                href={whatsUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-track="whatsapp_click"
                data-source="unidades_vazio"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#1da851]"
              >
                Avisar quando houver unidades
              </a>
            </div>
          ) : (
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" data-reveal-stagger>
              {allTorreProps.map((p) => (
                <Link
                  key={p.codigo}
                  href={`/imovel/${p.slug}`}
                  className="group overflow-hidden rounded-sm border border-neutral-200 bg-white transition hover:border-[#c9a876] hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={p.fotoDestaque || "/placeholder-property.jpg"}
                      alt={p.titulo}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 33vw"
                      loading="lazy"
                      unoptimized={isVistaImage(p.fotoDestaque)}
                    />
                    {p.lancamento && (
                      <span className="absolute top-3 left-3 rounded-full bg-[#c9a876] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        Lançamento
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                      {p.tipo} · {p.bairro}
                    </p>
                    <p className="mt-2 line-clamp-1 font-serif text-base font-medium text-neutral-900">
                      {p.titulo}
                    </p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500">
                      {p.areaPrivativa && <span>{formatArea(p.areaPrivativa)} m²</span>}
                      {p.dormitorios ? (
                        <span>{p.dormitorios} {p.dormitorios === 1 ? "quarto" : "quartos"}</span>
                      ) : null}
                      {p.vagas ? <span>{p.vagas} {p.vagas === 1 ? "vaga" : "vagas"}</span> : null}
                    </div>
                    {(p.precoVenda || p.precoAluguel) && (
                      <p className="mt-4 font-serif text-xl font-light text-neutral-900">
                        {formatPrice(p.precoVenda || p.precoAluguel)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== SECTION — Outras torres do hub (premium card style igual hub) ===== */}
      {outrasTorres.length > 0 && (
        <section className="bg-gradient-to-b from-neutral-50 to-neutral-100 py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p data-reveal className="font-serif text-[11px] uppercase tracking-[0.3em] text-[#c9a876]">
                Outras torres do {emp.nome}
              </p>
              <h2 data-reveal className="mt-3 font-serif text-3xl font-light italic tracking-tight text-neutral-900 sm:text-4xl">
                Conheça também
              </h2>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2" data-reveal-stagger>
              {outrasTorres.map((other) => {
                const otherSlug = getTorreShortSlug(other.nome)
                return (
                  <Link
                    key={other.nome}
                    href={`/empreendimento/${slug}/${otherSlug}`}
                    className="group relative flex aspect-[5/4] overflow-hidden rounded-3xl bg-neutral-900 shadow-xl transition-all duration-500 hover:shadow-2xl hover:shadow-[#c9a876]/20"
                  >
                    {other.render && (
                      <Image
                        src={other.render}
                        alt={`${other.nome} — render da torre do ${emp.nome}${construtora ? ` (${construtora})` : ""} em ${bairro}, Curitiba`}
                        fill
                        className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/45" />
                    {other.logo && (
                      <div className="absolute top-6 left-1/2 -translate-x-1/2 sm:top-8">
                        <Image
                          src={other.logo}
                          alt={`Logo ${other.nome} · ${emp.nome}`}
                          width={220}
                          height={88}
                          className="h-auto max-h-[64px] w-auto max-w-[180px] object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] sm:max-h-[80px] sm:max-w-[220px]"
                        />
                      </div>
                    )}
                    <div className="relative z-10 mt-auto flex w-full flex-col p-6 sm:p-8">
                      {!other.logo && (
                        <h3 className="mb-4 font-serif text-2xl font-light italic tracking-wider text-white">
                          {other.nome}
                        </h3>
                      )}
                      {other.descricao && (
                        <p className="mb-5 line-clamp-2 text-sm leading-relaxed text-white/90">
                          {other.descricao}
                        </p>
                      )}
                      <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-[#c9a876] px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition group-hover:bg-[#b8966a]">
                        Conhecer
                        <span className="transition-transform group-hover:translate-x-1">→</span>
                      </span>
                    </div>
                    <div className="pointer-events-none absolute inset-0 rounded-3xl ring-0 ring-[#c9a876]/0 transition-all duration-500 group-hover:ring-2 group-hover:ring-[#c9a876]/50" />
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===== SECTION — Final CTA ===== */}
      <section id="contato" className="relative overflow-hidden bg-gradient-to-b from-[#0d0d0d] via-[#1a1a1a] to-[#0d0d0d] py-20 md:py-28">
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p data-reveal className="text-[10px] tracking-[0.4em] text-[#c9a876] sm:text-[11px]">
            FALE COM A FYMOOB
          </p>
          <h2 data-reveal className="mt-4 font-serif text-3xl font-light italic tracking-tight text-white sm:text-4xl lg:text-5xl">
            Agende sua visita
          </h2>
          <p data-reveal className="mt-4 text-sm text-white/60">
            Especialista FYMOOB pronto pra apresentar o {t.nome} ({emp.nome})
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a
              href={whatsUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-track="whatsapp_click"
              data-source="final_cta_torre"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-8 py-4 text-sm font-medium text-white transition hover:bg-[#1da851]"
            >
              WhatsApp
            </a>
            <a
              href="tel:+5541999780517"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-4 text-sm font-medium text-white/90 transition hover:border-white/40 hover:bg-white/5"
            >
              <Phone className="size-5" /> (41) 99978-0517
            </a>
          </div>
          <p className="mt-8 text-[11px] uppercase tracking-[0.25em] text-white/40">
            CRECI J 9420 · Seg-sex 8h30-17h
          </p>
        </div>
      </section>

      {/* ===== FAQ + Related ===== */}
      <section className="border-t border-neutral-100 bg-neutral-50 py-12 md:py-16">
        <div className="mx-auto max-w-4xl space-y-12 px-4 sm:px-6 lg:px-8">
          <DynamicFAQ
            questions={(() => {
              const stats = generateLandingStats(allTorreProps)
              const baseFaq = generateDynamicFAQ(stats, bairro)
              return [
                {
                  question: `Quantas unidades estão disponíveis no ${t.nome}?`,
                  answer: `O ${t.nome}, dentro do complexo ${emp.nome}, possui ${allTorreProps.length} ${allTorreProps.length === 1 ? "unidade disponível" : "unidades disponíveis"} no site da FYMOOB.${precoMin ? ` Preços a partir de ${formatPrice(precoMin)}.` : ""}${cronograma ? ` Entrega prevista para ${cronograma}.` : ""}`,
                },
                {
                  question: `Qual a diferença entre o ${t.nome} e o ${emp.nome}?`,
                  answer: `${emp.nome} é o complexo (condomínio com ${(hub.torres || []).length} torres independentes${construtora ? ` da ${construtora}` : ""}). O ${t.nome} é uma das torres do complexo, com proposta arquitetônica e tipologia próprias${t.descricao ? `: ${t.descricao}` : ""}`,
                },
                ...baseFaq.slice(0, 4),
              ]
            })()}
            title={`Perguntas frequentes sobre o ${t.nome}`}
          />

          <RelatedPages
            title={`Continue explorando o ${emp.nome}`}
            links={[
              { href: `/empreendimento/${slug}`, label: `Complexo ${emp.nome} (visão geral)` },
              ...outrasTorres.map((other) => ({
                href: `/empreendimento/${slug}/${getTorreShortSlug(other.nome)}`,
                label: `${other.nome} — ${emp.nome}`,
              })),
              ...(bairros[0]
                ? [{ href: `/imoveis/${bairros[0].toLowerCase().replace(/\s+/g, "-")}`, label: `Imóveis no ${bairros[0]}` }]
                : []),
            ]}
          />
        </div>
      </section>

      {/* Sticky bar mobile removida 08/05/2026 — mesmo motivo do hub
          /empreendimento/[slug]: bloco branco brigava com tema editorial
          + WhatsAppFloat global cobre o caso de CTA persistente. */}
    </>
  )
}
