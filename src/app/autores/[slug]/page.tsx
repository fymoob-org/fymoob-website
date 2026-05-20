import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Calendar, Award, BookOpen, MapPin } from "lucide-react"
import { getAllPosts } from "@/services/blog"
import { BlogCard } from "@/components/blog/BlogCard"
import { safeJsonLd } from "@/lib/seo"

// Página de autor — Research Protocol v1.0, Section 9.
// Requisito YMYL Google: autor identificado com credenciais visíveis
// (E-E-A-T — Experience, Expertise, Authoritativeness, Trust).
// Estrutura escalável pra múltiplos autores conforme FYMOOB crescer.

interface Author {
  slug: string
  name: string
  role: string
  credentials: string[]
  photo: string
  bio: string
  location: string
  expertise: string[]
  yearsExperience: number
  since: number
  linkedin?: string
  whatsapp?: string
}

const AUTHORS: Record<string, Author> = {
  "bruno-cesar-almeida": {
    slug: "bruno-cesar-almeida",
    name: "Bruno César de Almeida",
    role: "Corretor de Imóveis e Sócio-Fundador da FYMOOB",
    credentials: ["CRECI/PR 24.494", "FYMOOB CRECI J 9420", "Negócios Imobiliários (UFPR)", "Direito (Faculdade Curitibana)"],
    photo: "/images/team/bruno.jpeg",
    bio: "Especialista no mercado imobiliário de Curitiba desde 2009. Sócio-fundador da FYMOOB Imobiliária, com formação em Negócios Imobiliários pela UFPR e Direito pela Faculdade Curitibana. Atua na intermediação de compra, venda e locação em todos os principais bairros de Curitiba e região metropolitana, com especialização em imóveis de alto padrão e investimento.",
    location: "Curitiba, PR",
    expertise: [
      "Financiamento imobiliário (Caixa, Itaú, Bradesco, Santander, BRB)",
      "Minha Casa Minha Vida 2026",
      "ITBI e aspectos jurídicos da compra",
      "Análise de bairros de Curitiba",
      "Investimento em imóveis para renda e valorização",
    ],
    yearsExperience: new Date().getFullYear() - 2009,
    since: 2009,
    whatsapp: "554199978-0517",
  },
}

interface AuthorPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return Object.keys(AUTHORS).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const { slug } = await params
  const author = AUTHORS[slug]
  if (!author) return {}
  return {
    title: `${author.name} | Autor no Blog FYMOOB`,
    description: `${author.role}. ${author.credentials[0]}. ${author.yearsExperience} anos no mercado imobiliário de ${author.location}. Veja todos os artigos.`,
    alternates: { canonical: `/autores/${slug}` },
    openGraph: {
      type: "profile",
      title: author.name,
      description: author.role,
      images: [{ url: author.photo }],
    },
  }
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { slug } = await params
  const author = AUTHORS[slug]
  if (!author) notFound()

  const allPosts = await getAllPosts()
  const authorPosts = allPosts.filter((p) => p.author === author.name)

  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    jobTitle: author.role,
    worksFor: {
      "@type": "RealEstateAgent",
      name: "FYMOOB Imobiliária",
      url: "https://fymoob.com.br",
      areaServed: "Curitiba, PR",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Curitiba",
      addressRegion: "PR",
      addressCountry: "BR",
    },
    alumniOf: author.credentials
      .filter((c) => c.includes("UFPR") || c.includes("Curitibana"))
      .map((c) => ({ "@type": "EducationalOrganization", name: c })),
    hasCredential: author.credentials.map((c) => ({ "@type": "EducationalOccupationalCredential", name: c })),
    knowsAbout: author.expertise,
    image: `https://fymoob.com.br${author.photo}`,
    url: `https://fymoob.com.br/autores/${slug}`,
    sameAs: [
      author.whatsapp ? `https://wa.me/${author.whatsapp}` : null,
      author.linkedin ?? null,
    ].filter(Boolean),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
      />

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header — foto + nome + credenciais */}
        <header className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-[200px_1fr]">
          <div className="relative mx-auto aspect-square w-40 overflow-hidden rounded-full bg-neutral-200 md:w-full">
            <Image
              src={author.photo}
              alt={author.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 160px, 200px"
              priority
            />
          </div>

          <div>
            <h1 className="font-display text-3xl font-bold text-neutral-950 md:text-4xl">
              {author.name}
            </h1>
            <p className="mt-2 text-lg text-brand-primary">{author.role}</p>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-2 text-sm">
                <MapPin size={16} className="mt-0.5 shrink-0 text-brand-primary" />
                <div>
                  <dt className="font-medium text-neutral-500">Atuação</dt>
                  <dd className="text-neutral-900">{author.location}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Calendar size={16} className="mt-0.5 shrink-0 text-brand-primary" />
                <div>
                  <dt className="font-medium text-neutral-500">Experiência</dt>
                  <dd className="text-neutral-900">
                    {author.yearsExperience} anos (desde {author.since})
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm sm:col-span-2">
                <Award size={16} className="mt-0.5 shrink-0 text-brand-primary" />
                <div>
                  <dt className="font-medium text-neutral-500">Credenciais</dt>
                  <dd className="text-neutral-900">
                    <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      {author.credentials.map((c) => (
                        <li key={c} className="before:mr-2 before:text-neutral-400 before:content-['•'] first:before:hidden">
                          {c}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              </div>
            </dl>
          </div>
        </header>

        {/* Bio */}
        <section className="mb-12 rounded-2xl bg-neutral-50 p-8">
          <h2 className="mb-4 font-display text-xl font-semibold text-neutral-950">Sobre</h2>
          <p className="text-base leading-relaxed text-neutral-700">{author.bio}</p>
        </section>

        {/* Áreas de especialização */}
        <section className="mb-12">
          <h2 className="mb-4 font-display text-xl font-semibold text-neutral-950">
            Áreas de especialização
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {author.expertise.map((e) => (
              <li
                key={e}
                className="flex items-start gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700"
              >
                <BookOpen size={16} className="mt-0.5 shrink-0 text-brand-primary" />
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Artigos do autor */}
        {authorPosts.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-6 font-display text-xl font-semibold text-neutral-950">
              Artigos ({authorPosts.length})
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {authorPosts.slice(0, 9).map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
          </section>
        )}

        {/* Contato */}
        {author.whatsapp && (
          <section className="rounded-2xl border border-brand-primary-muted bg-brand-primary-light p-8 text-center">
            <h2 className="font-display text-xl font-semibold text-neutral-950">
              Quer falar com {author.name.split(" ")[0]}?
            </h2>
            <p className="mt-2 text-sm text-neutral-700">
              Chame no WhatsApp pra tirar dúvidas e conhecer o catálogo.
            </p>
            <Link
              href={`https://wa.me/${author.whatsapp}?text=Olá ${author.name.split(" ")[0]}, vim pelo blog da FYMOOB.`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-brand-primary-hover hover:shadow-lg"
            >
              Falar no WhatsApp
            </Link>
          </section>
        )}

        {/* Back link */}
        <div className="mt-12">
          <Link
            href="/blog"
            className="text-sm font-medium text-brand-primary hover:text-brand-primary-hover hover:underline"
          >
            ← Voltar ao blog
          </Link>
        </div>
      </div>
    </>
  )
}
