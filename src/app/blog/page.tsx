import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { getAllPosts } from "@/services/blog"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { BlogCard } from "@/components/blog/BlogCard"
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll"
import { RecommendedPosts } from "@/components/blog/RecommendedPosts"

export async function generateMetadata(): Promise<Metadata> {
  const posts = await getAllPosts()
  const count = posts.length
  const title = count > 0
    ? `Blog FYMOOB: ${count} guias de imóveis e bairros em Curitiba`
    : "Blog FYMOOB: guias de imóveis e bairros em Curitiba"

  return {
    title,
    description:
      "Guias sobre financiamento (CET, MCMV), ITBI, propter rem e bairros de Curitiba: Batel, Água Verde, Bigorrilho. Conteúdo atualizado mensalmente.",
    alternates: {
      canonical: "/blog",
    },
  }
}

const POSTS_PER_PAGE = 9

interface BlogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams
  const pageParam = typeof params.page === "string" ? params.page : "1"
  const currentPage = Math.max(1, Number(pageParam) || 1)

  const allPosts = await getAllPosts()
  const totalPages = Math.max(1, Math.ceil(allPosts.length / POSTS_PER_PAGE))
  const page = Math.min(currentPage, totalPages)

  const isFirstPage = page === 1
  const startIndex = isFirstPage ? 0 : (page - 1) * POSTS_PER_PAGE + 1
  const endIndex = isFirstPage ? POSTS_PER_PAGE + 1 : startIndex + POSTS_PER_PAGE

  const featured = isFirstPage ? allPosts[0] ?? null : null
  const gridPosts = isFirstPage
    ? allPosts.slice(1, POSTS_PER_PAGE + 1)
    : allPosts.slice(startIndex, endIndex)

  return (
    <>
      {/* Hero — compact with background image */}
      <section className="relative overflow-hidden bg-neutral-950 py-10 md:py-14">
        <Image
          src="https://ppbxdsyojwqujdrmnxdv.storage.sa-east-1.nhost.run/v1/files/13582abc-9e5d-4857-9ed9-1ef2e200b779"
          alt="Vista panorâmica de Curitiba"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(11,17,32,0.85) 0%, rgba(11,17,32,0.65) 100%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Home", url: "/" },
              { name: "Blog", url: "/blog" },
            ]}
            variant="dark"
          />
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-white md:text-4xl">
            Blog FYMOOB
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">
            Dicas, guias e informações sobre o mercado imobiliário em Curitiba
            para ajudar você a encontrar o imóvel ideal.
          </p>
        </div>
      </section>

      {/* Featured post — first page only */}
      {featured && (
        <section className="py-10 md:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <AnimateOnScroll>
              <BlogCard post={featured} featured />
            </AnimateOnScroll>
          </div>
        </section>
      )}

      {/* Mais lidos — sprint design 06/05/2026.
          So aparece na pagina 1. Ranking algoritmico baseado em GSC 30d
          (cliques + CTR + recency + evergreen) com MMR pra diversidade.
          Separado do grid abaixo (que e listagem por data) — entrega
          rotacao por demanda real sem perder ordenacao cronologica. */}
      {isFirstPage && (
        <RecommendedPosts
          limit={3}
          context="blog"
          title="Mais lidos do blog"
          viewAllHref="/blog"
          viewAllLabel="Todos os artigos"
          className="border-t border-neutral-100 bg-neutral-50/40"
        />
      )}

      {/* Posts grid — paginas sem featured (page 2+) precisam de padding-top
          pra nao colar no hero. Pagina 1 com featured ja tem py do bloco anterior. */}
      {gridPosts.length > 0 && (
        <section className={featured ? "pb-10 md:pb-14" : "py-10 md:py-14"}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <AnimateOnScroll stagger className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {gridPosts.map((post) => (
                <div key={post.slug} className="h-full">
                  <BlogCard post={post} />
                </div>
              ))}
            </AnimateOnScroll>
          </div>
        </section>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          aria-label="Paginação do blog"
          className="pb-16 md:pb-24"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 sm:px-6 lg:px-8">
            {page > 1 && (
              <Link
                href={page === 2 ? "/blog" : `/blog?page=${page - 1}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-brand-primary hover:text-brand-primary"
              >
                <ChevronLeft className="size-4" />
                Anterior
              </Link>
            )}
            <span className="px-4 text-sm text-neutral-500">
              Página {page} de {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/blog?page=${page + 1}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-brand-primary hover:text-brand-primary"
              >
                Próximo
                <ChevronRight className="size-4" />
              </Link>
            )}
          </div>
        </nav>
      )}

      {/* Bloco SEO ~600 palavras antes do footer — Fase 19.P0.12 (gap pos-audit).
          Anteriormente /blog tinha apenas 45 palavras de texto, comprometendo
          relevancia. Adiciona contexto editorial sobre os temas cobertos. */}
      {isFirstPage && (
        <section className="border-t border-neutral-200 bg-white py-12 md:py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl font-bold text-neutral-900 md:text-3xl">
              O blog da FYMOOB: conteúdo prático sobre o mercado imobiliário de Curitiba
            </h2>
            <div className="mt-6 space-y-4 leading-relaxed text-neutral-700">
              <p>
                O blog da <strong>FYMOOB Imobiliária</strong> (CRECI J 9420) reúne {allPosts.length}{" "}
                guias práticos escritos por especialistas para quem está pensando em comprar,
                alugar ou investir em imóveis em Curitiba. Cobrimos temas como financiamento (Caixa,
                Itaú, Bradesco), ITBI, MCMV, documentação, comparativos de bairros, mercado imobiliário,
                custo de vida e dicas de visita.
              </p>
              <p>
                Todos os artigos são escritos com base em dados reais e atualizados — citamos
                fontes externas como o <strong>Índice FipeZAP</strong> (preço médio do m² em Curitiba
                em março/2026: R$ 11.621), <strong>IBGE</strong>, <strong>Caixa Econômica Federal</strong>,
                <strong>Lei do Inquilinato 8.245/91</strong> e a <strong>Lei 13.786/2018</strong> que
                regula compra de imóvel na planta. Nossos autores são corretores ativos no mercado
                de Curitiba: Bruno César de Almeida (CRECI/PR 24.494) e equipe.
              </p>
              <p>
                Para complementar a leitura, oferecemos guias estruturados nos chamados &ldquo;pillars&rdquo;:{" "}
                <Link href="/comprar-imovel-curitiba" className="font-semibold text-brand-primary hover:underline">
                  Como comprar imóvel em Curitiba
                </Link>
                ,{" "}
                <Link href="/morar-em-curitiba" className="font-semibold text-brand-primary hover:underline">
                  Morar em Curitiba
                </Link>
                {" "}e{" "}
                <Link href="/alugar-curitiba" className="font-semibold text-brand-primary hover:underline">
                  Alugar imóvel em Curitiba
                </Link>
                . Também publicamos <strong>guias por bairro</strong> (Portão, Água Verde, Batel,
                Bigorrilho, Ecoville e mais) com infraestrutura, escolas, transporte e perfil de
                cada região. Veja todos os imóveis disponíveis em{" "}
                <Link href="/busca" className="font-semibold text-brand-primary hover:underline">
                  /busca
                </Link>
                {" "}ou nos catálogos por tipo:{" "}
                <Link href="/apartamentos-curitiba" className="text-brand-primary hover:underline">
                  apartamentos
                </Link>
                ,{" "}
                <Link href="/casas-curitiba" className="text-brand-primary hover:underline">
                  casas
                </Link>
                ,{" "}
                <Link href="/sobrados-curitiba" className="text-brand-primary hover:underline">
                  sobrados
                </Link>
                {" "}e{" "}
                <Link href="/terrenos-curitiba" className="text-brand-primary hover:underline">
                  terrenos
                </Link>
                .
              </p>
              <p>
                Quer dúvida ou sugestão de tema para um próximo artigo? Fale com a gente pelo
                WhatsApp{" "}
                <a
                  href="https://wa.me/5541999780517"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-primary hover:underline"
                >
                  (41) 99978-0517
                </a>
                {" "}ou e-mail <a href="mailto:fymoob@gmail.com" className="font-semibold text-brand-primary hover:underline">fymoob@gmail.com</a>.
                Atendimento de segunda a sexta, das 8h30 às 17h.
              </p>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
