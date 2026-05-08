import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { Property } from "@/types/property"
import { formatPrice } from "@/lib/utils"
import { chooseListingBadge, getBadgeLabel, type ListingBadge } from "./chooseListingBadge"
import {
  getEditorialTitle,
  getEditorialSubtitle,
  getTorreAccent,
  type TorreAccent,
} from "./editorial"

interface UnitFeaturedCardProps {
  property: Property
  badge?: ListingBadge
  siblings?: Property[]
  /** Nome editorial da torre — usado no subtitulo "Reserva Lago · 116 m²" */
  torreNome?: string
  /** Slug curto da torre (lago/colina/mirante) — define cor signature */
  torreSlug?: string
}

/**
 * Sprint design 06/05/2026 — S1+S2+S3+S5+S6 (revisao "magazine spread").
 *
 * Hero card editorial em layout SPLIT asymmetric (60% imagem / 40% conteudo).
 * Padrao luxury (Aman residences, JHSF Reserva Cidade Jardim, Bulgari):
 * imagem respira sozinha sem overlay, conteudo respira na coluna lateral
 * com peso editorial real.
 *
 * - S1: Title editorial curto ("Duplex" em vez de "[REVENDA] Reserva Lago...")
 * - S2: Stats em grid 4 colunas com numerais grandes serif extralight
 * - S3: Layout split asymmetric (imagem | conteudo)
 * - S5: Cor signature por torre (accent dourado/bronze/cinza)
 * - S6: Aspect ratio 4:5 magazine spread (vertical editorial)
 *
 * Mobile: colapsa pra stack vertical (imagem em cima, conteudo embaixo)
 * sem overlay.
 *
 * Server Component — zero JS no client.
 */
export function UnitFeaturedCard({
  property,
  badge,
  siblings,
  torreNome,
  torreSlug,
}: UnitFeaturedCardProps) {
  const resolvedBadge = badge ?? (siblings ? chooseListingBadge(siblings) : null)
  const badgeLabel = resolvedBadge ? getBadgeLabel(resolvedBadge, property) : null
  const accent = getTorreAccent(torreSlug)

  const editorialTitle = getEditorialTitle(property)
  const subtitle = getEditorialSubtitle(property, torreNome)
  const preco = property.precoVenda ? formatPrice(property.precoVenda) : null
  const area = property.areaPrivativa ?? property.areaTotal
  const isCommercial =
    /loja|sala|comercial|conjunto/i.test(property.tipo || "")

  return (
    <Link
      href={property.url}
      style={
        {
          "--accent": accent.color,
          "--accent-soft": accent.bgSoft,
          "--accent-border": accent.borderSoft,
        } as React.CSSProperties
      }
      className="group relative block overflow-hidden rounded-3xl bg-white shadow-[0_15px_50px_-15px_rgba(38,32,16,0.18)] ring-1 ring-[var(--accent-border)] transition duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:shadow-[0_25px_70px_-15px_var(--accent-soft),0_15px_50px_-20px_rgba(38,32,16,0.25)] hover:ring-[var(--accent)]/55"
      aria-label={`Ver detalhes ${editorialTitle}, ${property.titulo}`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr]">
        {/* ───── COLUNA ESQUERDA — IMAGEM com gradient sutil ─────
            Magazine spread v6 (08/05): mobile mantem 4/5 vertical pra
            respiro de stats. Desktop ratio 1.6/1 (split mais cinematic
            que 1.4/1 anterior — imagem ganha mais peso).

            08/05 v3: foto comercial do Mirante (cores frias/neutras)
            ficava desbotada vs Lago/Colina (saturadas). Adicionado overlay
            tint accent + gradient diagonal sutil pro canto inferior dar
            peso editorial em qualquer foto, accent-aware. */}
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100 lg:aspect-auto">
          <Image
            src={property.fotoDestaque}
            alt={`${editorialTitle} — ${property.titulo}`}
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover transition duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
            loading="lazy"
            data-image-zoom
          />

          {/* Tint accent muito sutil — funde com cor signature da torre,
              dá unidade visual quando foto não tem cor própria forte */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-25"
            style={{
              background: `linear-gradient(135deg, transparent 50%, ${accent.color} 100%)`,
            }}
          />

          {/* Gradient diagonal escuro — escurece canto inferior direito
              dando profundidade editorial sem comprometer leitura do badge */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,transparent_55%,rgba(0,0,0,0.22)_100%)]"
          />

          {/* Badge canto superior — sólido dourado da torre com glow sutil
              (refinement 08/05/2026: era outline branco translúcido, agora
              tem peso editorial real). */}
          {badgeLabel && (
            <span
              className="absolute left-5 top-5 inline-flex items-center rounded-full px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-white sm:px-4"
              style={{
                backgroundColor: accent.color,
                boxShadow: `0 4px 18px -2px ${accent.color}80`,
              }}
            >
              {badgeLabel}
            </span>
          )}
        </div>

        {/* ───── COLUNA DIREITA — CONTEÚDO EDITORIAL ───── */}
        <div className="flex flex-col justify-between p-7 sm:p-9 lg:p-10">
          <div>
            {/* Caption tipologia + torre */}
            <p
              className="text-[10px] uppercase tracking-[0.4em] sm:text-[11px]"
              style={{ color: accent.color }}
            >
              Unidade em destaque
            </p>

            {/* Title editorial — peso magazine */}
            <h3 className="mt-4 font-serif text-3xl font-light italic leading-[1.05] tracking-tight text-neutral-900 sm:text-4xl lg:text-[2.5rem]">
              {editorialTitle}
            </h3>

            {/* Subtitulo — torre + area */}
            {subtitle && (
              <p className="mt-3 text-sm tracking-[0.05em] text-neutral-500">
                {subtitle}
              </p>
            )}

            {/* Linha divisora dourada/accent — h-[2px] mais pronunciada */}
            <div
              className="mt-7 h-[2px] w-14 rounded-full"
              style={{ backgroundColor: accent.color, opacity: 0.7 }}
              aria-hidden="true"
            />

            {/* S2 — Stats em grid com numerais grandes serif extralight */}
            <UnitStatsGrid property={property} accent={accent} isCommercial={isCommercial} />
          </div>

          {/* Bottom — preço + CTA */}
          <div className="mt-8 lg:mt-10">
            <div
              className="h-px w-full"
              style={{ backgroundColor: accent.color, opacity: 0.18 }}
              aria-hidden="true"
            />
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 sm:text-[11px]">
                  A partir de
                </p>
                {preco ? (
                  <p className="mt-1 font-serif text-3xl font-extralight tracking-tight text-neutral-900 sm:text-4xl">
                    {preco}
                  </p>
                ) : (
                  <p className="mt-1 font-serif text-2xl font-extralight tracking-tight text-neutral-700 sm:text-3xl">
                    Sob consulta
                  </p>
                )}
              </div>

              <span
                className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] transition group-hover:bg-neutral-900 group-hover:text-white sm:text-xs"
                style={{
                  borderColor: accent.color,
                  color: accent.color,
                }}
              >
                Ver detalhes
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ────────────────────────── Sub-componente: stats grid ──────────────────────────

interface UnitStatsGridProps {
  property: Property
  accent: TorreAccent
  isCommercial: boolean
}

function UnitStatsGrid({ property, accent, isCommercial }: UnitStatsGridProps) {
  const area = property.areaPrivativa ?? property.areaTotal
  const stats: Array<{ value: string | number; label: string }> = []

  if (area) {
    stats.push({ value: Math.round(area), label: "m²" })
  }

  if (!isCommercial) {
    if (property.dormitorios !== null && property.dormitorios > 0) {
      stats.push({
        value: property.dormitorios,
        label: property.dormitorios === 1 ? "Quarto" : "Quartos",
      })
    }
    if (property.suites !== null && property.suites > 0) {
      stats.push({
        value: property.suites,
        label: property.suites === 1 ? "Suíte" : "Suítes",
      })
    }
  }

  if (property.vagas !== null && property.vagas > 0) {
    stats.push({
      value: property.vagas,
      label: property.vagas === 1 ? "Vaga" : "Vagas",
    })
  }

  if (stats.length === 0) return null

  // Grid columns dinâmico (max 4)
  const cols = stats.length
  const gridClass =
    cols === 1
      ? "grid-cols-1"
      : cols === 2
        ? "grid-cols-2"
        : cols === 3
          ? "grid-cols-3"
          : "grid-cols-2 sm:grid-cols-4"

  return (
    <dl className={`mt-7 grid gap-x-2 gap-y-5 ${gridClass}`}>
      {stats.map((stat, idx) => (
        <div key={`${stat.label}-${idx}`}>
          <dt className="sr-only">{stat.label}</dt>
          <dd>
            <p className="font-serif text-3xl font-extralight tracking-tight text-neutral-900 sm:text-4xl">
              {stat.value}
            </p>
            <div
              className="mt-2 h-px w-6"
              style={{ backgroundColor: accent.color, opacity: 0.5 }}
              aria-hidden="true"
            />
            <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-neutral-500">
              {stat.label}
            </p>
          </dd>
        </div>
      ))}
    </dl>
  )
}
