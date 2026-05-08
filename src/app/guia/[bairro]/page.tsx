import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"
import { Calendar, Clock, MapPin } from "lucide-react"
import { MDXRemote } from "next-mdx-remote/rsc"
import remarkGfm from "remark-gfm"
import { getGuiaBySlug, getAllGuiaSlugs } from "@/services/guias"
import { getAllBairros, getProperties, getPropertyStats } from "@/services/loft"
import { generateLandingStats, generateDynamicFAQ, generateFAQPageSchema, generatePillarSchema, safeJsonLd } from "@/lib/seo"
import { formatPrice } from "@/lib/utils"
import { mdxComponents } from "@/lib/mdx-components"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { AuthorBio } from "@/components/blog/AuthorBio"
import { DynamicFAQ } from "@/components/seo/DynamicFAQ"
import { RelatedPages } from "@/components/seo/RelatedPages"
import { PropertyGrid } from "@/components/search/PropertyGrid"
import { projectForCard } from "@/lib/property-projection"

export const revalidate = 3600 // 1 hour

interface PageProps {
  params: Promise<{ bairro: string }>
}

export async function generateStaticParams() {
  const slugs = await getAllGuiaSlugs()
  return slugs.map((bairro) => ({ bairro }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { bairro } = await params
  const guia = await getGuiaBySlug(bairro)
  if (!guia) return {}

  return {
    title: guia.title,
    description: guia.description,
    alternates: { canonical: `/guia/${bairro}` },
    openGraph: {
      title: guia.title,
      description: guia.description,
      type: "article",
      publishedTime: guia.date,
      url: `/guia/${bairro}`,
      images: guia.image ? [{ url: guia.image }] : undefined,
    },
  }
}

export default async function GuiaBairroPage({ params }: PageProps) {
  const { bairro } = await params
  const guia = await getGuiaBySlug(bairro)

  // Quando nao ha guia MDX pro bairro, ao inves de 404 redireciona pra
  // /imoveis/<bairro> (308 Permanent Redirect — equivalente SEO a 301).
  // Auditoria GSC 08/05/2026 detectou 29 URLs /guia/<bairro> indexadas
  // pelo Google retornando 404. Site antigo Atomicat tinha esse padrao;
  // redirect preserva equity dos backlinks externos. Caso o bairro tambem
  // nao tenha rota valida em /imoveis/, mantem 404 real.
  if (!guia) {
    const bairros = await getAllBairros()
    const target = bairros.find((b) => b.slug === bairro)
    if (target && target.total >= 2) {
      permanentRedirect(`/imoveis/${target.slug}`)
    }
    notFound()
  }

  // Fetch real property data for this neighborhood
  const bairroName = guia.bairro
  const result = await getProperties({ bairro: bairroName, limit: 200 })
  const properties = result.properties
  const stats = generateLandingStats(properties)
  const faqQuestions = generateDynamicFAQ(stats, bairroName)

  const propertiesVenda = properties.filter((p) => p.finalidade?.includes("Venda"))
  const propertiesAluguel = properties.filter((p) => p.finalidade?.includes("Loca"))
  const bairroSlug = bairroName.toLowerCase().replace(/\s+/g, "-")

  const formattedDate = new Date(guia.date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Guias de Bairro", url: "/blog" },
    { name: `Morar no ${bairroName}`, url: `/guia/${bairro}` },
  ]

  const relatedLinks = [
    { label: `Imóveis no ${bairroName}`, href: `/imoveis/${bairroSlug}` },
    { label: `Apartamentos no ${bairroName}`, href: `/imoveis/${bairroSlug}/apartamentos` },
    { label: `Casas no ${bairroName}`, href: `/imoveis/${bairroSlug}/casas` },
    { label: "Melhores Bairros de Curitiba", href: "/blog/melhores-bairros-curitiba-2026" },
    { label: "Comprar Imóvel em Curitiba", href: "/comprar-imovel-curitiba" },
  ]

  // BlogPosting schema com E-E-A-T canonico (mesmo shape de /blog/[slug])
  const articleSchema = {
    ...generatePillarSchema({
      title: guia.title,
      description: guia.description,
      image: guia.image,
      date: guia.date,
      pagePath: `/guia/${bairro}`,
    }),
    about: {
      "@type": "Place",
      name: `${bairroName}, Curitiba, PR`,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(articleSchema) }}
      />

      <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* Header */}
        <header className="mt-6">
          <div className="flex items-center gap-3 text-sm text-neutral-500">
            <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-medium text-brand-primary">
              Guia de Bairro
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {guia.readingTime} min de leitura
            </span>
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-neutral-950 sm:text-4xl md:text-5xl">
            {guia.title}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-neutral-600">
            {guia.description}
          </p>

          {/* Author */}
          <div className="mt-6">
            <AuthorBio compact />
          </div>
        </header>

        {/* Stats bar — live data from CRM */}
        {stats.total > 0 && (
          <div className="mt-8 grid grid-cols-3 gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 sm:gap-4 sm:p-6">
            <div className="text-center">
              <p className="text-lg font-bold text-brand-primary sm:text-2xl">{stats.total}</p>
              <p className="mt-1 text-[10px] text-neutral-500 sm:text-xs">imóveis disponíveis</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-neutral-900 sm:text-2xl">
                {formatPrice(stats.precoMedio)}
              </p>
              <p className="mt-1 text-[10px] text-neutral-500 sm:text-xs">preço médio</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-neutral-900 sm:text-2xl">
                {Math.round(stats.areaMedio ?? 0)}m²
              </p>
              <p className="mt-1 text-[10px] text-neutral-500 sm:text-xs">área média</p>
            </div>
          </div>
        )}

        {/* MDX Content */}
        <div className="prose-fymoob mt-10">
          <MDXRemote
            source={guia.content}
            options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
            components={mdxComponents}
          />
        </div>

        {/* Properties for sale in this neighborhood */}
        {propertiesVenda.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-6 font-display text-2xl font-bold tracking-tight text-neutral-950">
              Imóveis à venda no {bairroName}
            </h2>
            <PropertyGrid properties={propertiesVenda.slice(0, 6).map(p => projectForCard(p))} />
            {propertiesVenda.length > 6 && (
              <div className="mt-6 text-center">
                <a
                  href={`/imoveis/${bairroSlug}/venda`}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primary-hover"
                >
                  Ver todos os {propertiesVenda.length} imóveis à venda
                </a>
              </div>
            )}
          </section>
        )}

        {/* Properties for rent */}
        {propertiesAluguel.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-6 font-display text-2xl font-bold tracking-tight text-neutral-950">
              Imóveis para alugar no {bairroName}
            </h2>
            <PropertyGrid properties={propertiesAluguel.slice(0, 4).map(p => projectForCard(p))} />
            {propertiesAluguel.length > 4 && (
              <div className="mt-6 text-center">
                <a
                  href={`/imoveis/${bairroSlug}/aluguel`}
                  className="inline-flex items-center gap-2 rounded-full border border-brand-primary px-6 py-2.5 text-sm font-semibold text-brand-primary transition hover:bg-brand-primary/5"
                >
                  Ver todos os {propertiesAluguel.length} imóveis para alugar
                </a>
              </div>
            )}
          </section>
        )}

        {/* FAQ */}
        {faqQuestions.length > 0 && (
          <section className="mt-12">
            <DynamicFAQ
              questions={faqQuestions}
              title={`Perguntas frequentes sobre morar no ${bairroName}`}
            />
          </section>
        )}

        {/* Author bio full */}
        <div className="mt-12 border-t border-neutral-200 pt-8">
          <AuthorBio />
        </div>

        {/* Related pages */}
        <div className="mt-8">
          <RelatedPages links={relatedLinks} title="Conteúdo relacionado" />
        </div>
      </article>
    </>
  )
}
