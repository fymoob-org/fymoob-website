import Image from "next/image"
import { getPropertyFeatureIcon } from "@/components/property/propertyFeatureIcons"
import type { EmpreendimentoAssets } from "@/data/empreendimento-assets"

type AmenityCard = NonNullable<EmpreendimentoAssets["amenitiesShowcase"]>[number]

interface AmenitiesShowcaseProps {
  showcase: AmenityCard[]
  fullList: string[]
  empreendimentoNome: string
}

/**
 * Frente A — Sprint design 06/05/2026.
 *
 * Substitui a seção #infraestrutura quando o empreendimento tem
 * `amenitiesShowcase` configurado. Antes: grid flat de 42 ícones idênticos
 * (UX de imobiliária comum). Agora: 6-8 cards visuais grandes com renders
 * dos amenities-âncora + lista completa colapsada num <details> nativo
 * (SEO preservado, zero JS).
 *
 * Padrão luxury: foto/render hero do espaço + nome + descrição editorial
 * curta. Lista exaustiva fica como referência secundária.
 *
 * Server Component — <details>/<summary> nativos = zero JS no client.
 */
export function AmenitiesShowcase({
  showcase,
  fullList,
  empreendimentoNome,
}: AmenitiesShowcaseProps) {
  if (showcase.length === 0 && fullList.length === 0) return null

  return (
    <section id="infraestrutura" className="bg-neutral-50 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p data-reveal className="text-[10px] tracking-[0.4em] text-[#c9a876] sm:text-[11px]">
            LAZER COMPLETO
          </p>
          <h2
            data-reveal
            className="mt-4 font-serif text-3xl font-light italic tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
          >
            Lazer pensado em escala de hotel
          </h2>
          <p data-reveal className="mx-auto mt-4 max-w-2xl text-sm text-neutral-500">
            {fullList.length > 0
              ? `${fullList.length} itens de lazer e conveniência. Áreas comuns equipadas pra que cada unidade seja apenas o seu refúgio.`
              : "Áreas comuns completas pra que cada unidade seja apenas o seu refúgio."}
          </p>
        </div>

        {/* Showcase grid — magazine spread cards (08/05/2026 v3).
            Antes: cards brancos chapados com foto pequena 4:3 + texto
            embaixo. Depois: full-bleed image cards aspect 4:5, conteudo
            editorial overlay (numero + nome + linha dourada sempre
            visiveis), descricao slide-up no hover via grid-rows trick
            (smooth height animation, zero JS). Padrao Aman/Bulgari.

            Transicoes: easing luxury cubic-bezier(0.22,1,0.36,1) em
            todas as propriedades. Imagem zoom 1400ms (cinematic),
            overlay/conteudo 700ms. Ring/glow gold no hover. */}
        {showcase.length > 0 && (
          <div
            className="mx-auto mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            data-reveal-zigzag
          >
            {showcase.map((amenity, idx) => (
              <article
                key={amenity.name}
                className="group relative aspect-[4/5] overflow-hidden rounded-3xl bg-neutral-900 shadow-lg ring-1 ring-neutral-200/60 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_25px_60px_-15px_rgba(201,168,118,0.25),0_15px_40px_-15px_rgba(0,0,0,0.35)] hover:ring-[#c9a876]/40"
              >
                <Image
                  src={amenity.image}
                  alt={`${amenity.name} — render do ${empreendimentoNome}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.08]"
                  loading={idx < 3 ? "eager" : "lazy"}
                  data-image-zoom
                />

                {/* Gradient overlay — leve no estado normal, firma no
                    hover pra suportar leitura da descricao revelada. */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:from-black/92 group-hover:via-black/45" />

                {/* Numero editorial top-left — magazine reference number
                    com linha dourada decorativa. Cresce no hover. */}
                <div className="absolute left-5 top-5 flex items-center gap-3 sm:left-6 sm:top-6">
                  <span className="font-serif text-[11px] tracking-[0.3em] text-white/65 sm:text-xs">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="h-px w-8 bg-[#c9a876] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-14" />
                </div>

                {/* Conteudo bottom — nome + linha + descricao revelavel.
                    Description usa grid-rows trick: 0fr -> 1fr anima
                    height de forma fluida (CSS-only, sem max-height
                    arbitrario). Browsers que nao suportam (raros)
                    degradam pra estado fechado. */}
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
                  <h3 className="font-serif text-2xl font-light italic leading-tight tracking-tight text-white sm:text-[1.6rem]">
                    {amenity.name}
                  </h3>

                  {/* Linha dourada — extende no hover */}
                  <div
                    className="mt-3 h-[2px] w-12 rounded-full bg-[#c9a876] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-20"
                    aria-hidden="true"
                  />

                  {/* Descricao com grid-rows animation — animacao smooth
                      de height sem max-height arbitrario. Padrao: parent
                      grid `0fr -> 1fr` + child wrapper com overflow-hidden
                      + conteudo real dentro. Padding-top aparece
                      naturalmente quando expande (clipado quando 0fr).

                      Mobile/tablet (<lg): sempre visivel (grid-rows-[1fr]
                      + opacity-100). Sem hover em touch, esconder a
                      descricao bloqueia info pro usuario. Desktop (lg+):
                      hidden por padrao + revela no hover. */}
                  <div className="grid grid-rows-[1fr] transition-[grid-template-rows] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] lg:grid-rows-[0fr] lg:group-hover:grid-rows-[1fr]">
                    <div className="overflow-hidden">
                      <p className="pt-3 text-sm leading-relaxed text-white/85 opacity-100 transition-opacity duration-500 ease-out lg:opacity-0 lg:group-hover:opacity-100 lg:group-hover:delay-150">
                        {amenity.description}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Lista completa — accordion nativo HTML5, SEO friendly, zero JS */}
        {fullList.length > 0 && (
          <details
            className="mx-auto mt-14 max-w-5xl rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8"
            data-reveal
          >
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-neutral-700 transition hover:text-neutral-900">
              <span className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#c9a876]">
                  Lista completa
                </span>
                <span className="text-neutral-400">·</span>
                <span>Ver todos os {fullList.length} itens</span>
              </span>
              <svg
                className="h-4 w-4 transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>

            <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
              {fullList.map((item) => {
                const Icon = getPropertyFeatureIcon(item)
                return (
                  <div key={item} className="flex items-center gap-3">
                    <Icon
                      className="h-5 w-5 shrink-0 text-[#c9a876]"
                      strokeWidth={1.8}
                    />
                    <span className="text-sm text-neutral-700">{item}</span>
                  </div>
                )
              })}
            </div>
          </details>
        )}
      </div>
    </section>
  )
}
