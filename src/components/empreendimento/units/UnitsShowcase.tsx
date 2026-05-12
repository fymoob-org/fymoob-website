import Image from "next/image"
import type { Property } from "@/types/property"
import {
  classifyTorreFor,
  getTorreShortSlug,
  type EmpreendimentoAssets,
} from "@/data/empreendimento-assets"
import { UnitFeaturedCard } from "./UnitFeaturedCard"
import { UnitsTable } from "./UnitsTable"
import { chooseListingBadge } from "./chooseListingBadge"
import { getTorreAccent } from "./editorial"

type Torre = NonNullable<EmpreendimentoAssets["torres"]>[number]

interface UnitsShowcaseProps {
  properties: Property[]
  torres: Torre[]
  hubSlug: string
  empreendimentoNome: string
}

/**
 * Sprint design 06/05/2026 — D2/D3.
 *
 * Orquestrador da seção #precos pra empreendimentos editoriais.
 * Substitui o grid de PropertyCards generico por um layout magazine:
 *
 * Para cada torre do hub:
 *   1. Mini-header editorial (caption torre + nome serif + entrega)
 *   2. UnitFeaturedCard — unidade-destaque (cobertura > maior área > primeiro)
 *   3. UnitsTable — demais unidades em tabela compacta
 *
 * Sem tabs/JS: cada torre vira sub-seção empilhada (zero JS, 100% SEO,
 * mobile-friendly por rolagem natural). Cada bloco torre ganha animação
 * `data-reveal` própria.
 *
 * Renderiza só quando temos `torres` configurado E classifier registrado
 * pro hubSlug. Caso contrário, page.tsx faz fallback pro grid antigo.
 *
 * Server Component — zero JS no client.
 */
/**
 * Sprint design 08/05/2026 — Apple frosted glass v4.
 *
 * Asset trocado pra folhas.webp (botanical, textura sem elementos
 * competindo). Aplicado blur forte direto na imagem -> abstract texture
 * que dialoga com cards/tabela em frosted glass por cima. Padrao iOS 18
 * /Vision Pro: background visivel + cards translucidos com backdrop blur.
 */
const AMBIENT_IMAGE = "/images/empreendimentos/reserva-barigui/folhas.webp"

export function UnitsShowcase({
  properties,
  torres,
  hubSlug,
  empreendimentoNome,
}: UnitsShowcaseProps) {
  if (properties.length === 0 || torres.length === 0) return null

  // Agrupa imoveis por torre via classifier
  const propertiesByTorre = groupByTorre(properties, hubSlug)

  // Calcula badge global (mesma regra aplicada a todo o catalogo)
  const globalBadge = chooseListingBadge(properties)

  // So renderiza torres com pelo menos 1 unidade
  const torresWithUnits = torres.filter((t) => {
    const slug = getTorreShortSlug(t.nome)
    return (propertiesByTorre[slug]?.length ?? 0) > 0
  })

  if (torresWithUnits.length === 0) return null

  const totalUnits = properties.length

  return (
    <section
      id="precos"
      className="relative overflow-hidden py-20 md:py-28"
    >
      {/* Bug fix 08/05/2026: section tinha `bg-[#f9f4ea]` sólido + div
          do background com `-z-10` — a imagem ficava ATRÁS do bg sólido,
          nunca aparecia. Solução: bg da section vira o próprio div
          ambient, com Image + overlays sobrepostos no mesmo container.
          Conteúdo tem `relative z-10` pra ficar acima. */}
      {/* Magazine spread v6 (Aman/Bulgari Residences pattern, 08/05/2026):
          Bg pure white, clutter-free, generous white space. Sem imagem
          ambient — produto fala por si. Linhas douradas top/bottom como
          unica decoracao da section. Tipografia editorial gigante e
          contraste de cards com white preserve foco no produto. */}
      <div className="pointer-events-none absolute inset-0 bg-white" aria-hidden="true">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9a876]/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#c9a876]/40 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header da secao mestre */}
        <div className="text-center">
          <p data-reveal className="text-[10px] tracking-[0.4em] text-[#c9a876] sm:text-[11px]">
            CATÁLOGO COMPLETO
          </p>
          <h2
            data-reveal
            className="mt-4 font-serif text-3xl font-light italic tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
          >
            Tipologias disponíveis
          </h2>
          <p data-reveal className="mx-auto mt-4 max-w-2xl text-sm text-neutral-500">
            {totalUnits} {totalUnits === 1 ? "tipologia" : "tipologias"} pra morar
            ou investir, distribuídas entre os {torresWithUnits.length}{" "}
            {torresWithUnits.length === 1 ? "empreendimento" : "empreendimentos"} do
            masterplan {empreendimentoNome}.
          </p>
        </div>

        {/* Blocos editoriais por torre — magazine spread v6.
            Espacamento generoso entre torres + separator dourado decorativo
            entre cada bloco pra criar ritmo de "capitulos" editoriais. */}
        <div className="mt-20 md:mt-24">
          {torresWithUnits.map((torre, torreIndex) => {
            const slug = getTorreShortSlug(torre.nome)
            const torreProps = propertiesByTorre[slug] ?? []
            const featured = pickFeatured(torreProps)
            const remaining = torreProps.filter((p) => p.codigo !== featured?.codigo)
            const entrega = extractEntregaPrazo(torre.descricao)
            const accent = getTorreAccent(slug)

            return (
              <div
                key={slug}
                id={`unidades-${slug}`}
                className={`scroll-mt-20 ${torreIndex > 0 ? "mt-24 md:mt-32" : ""}`}
                data-reveal="soft"
              >
                {/* Separator decorativo entre torres — 3 pontos dourado
                    pattern editorial (Wallpaper magazine style). Aparece
                    so a partir da segunda torre. */}
                {torreIndex > 0 && (
                  <div
                    aria-hidden="true"
                    className="mx-auto mb-24 flex items-center justify-center gap-3 md:mb-32"
                  >
                    <span className="h-px w-16 bg-[#c9a876]/40" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#c9a876]/60" />
                    <span className="h-1 w-1 rounded-full bg-[#c9a876]/40" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#c9a876]/60" />
                    <span className="h-px w-16 bg-[#c9a876]/40" />
                  </div>
                )}

                {/* Mini-header da torre — magazine cover style: title
                    gigante serif italic + caption pequena em accent da
                    torre + linha decorativa + descricao + entrega */}
                <div className="mx-auto max-w-3xl text-center">
                  <p
                    className="text-[10px] uppercase tracking-[0.4em] sm:text-[11px]"
                    style={{ color: accent.color, opacity: 0.85 }}
                  >
                    {torreProps.length}{" "}
                    {torreProps.length === 1 ? "unidade" : "unidades"} disponíveis
                  </p>
                  <h3 className="mt-4 font-serif text-4xl font-light italic leading-[1.05] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
                    {torre.nome}
                  </h3>
                  {/* Linha decorativa accent da torre — h-[2px] mais firme */}
                  <div
                    className="mx-auto mt-6 h-[2px] w-16 rounded-full"
                    style={{ backgroundColor: accent.color, opacity: 0.7 }}
                    aria-hidden="true"
                  />
                  {torre.descricao && (
                    <p className="mt-6 text-[15px] leading-relaxed text-neutral-600">
                      {torre.descricao}
                    </p>
                  )}
                  {entrega && (
                    <p className="mt-5 text-[11px] uppercase tracking-[0.3em] text-neutral-400">
                      {entrega.isSegundaFase ? "2ª fase" : "Entrega prevista"} · {entrega.prazo}
                    </p>
                  )}
                </div>

                {/* Featured card editorial split (60/40) */}
                {featured && (
                  <div className="mx-auto mt-12 max-w-6xl" data-reveal>
                    <UnitFeaturedCard
                      property={featured}
                      badge={globalBadge}
                      siblings={torreProps}
                      torreNome={torre.nome}
                      torreSlug={slug}
                    />
                  </div>
                )}

                {/* Lista editorial das demais unidades (menu degustacao) */}
                {remaining.length > 0 && (
                  <div className="mx-auto mt-12 max-w-6xl" data-reveal="soft">
                    <UnitsTable
                      properties={remaining}
                      badge={globalBadge}
                      torreSlug={slug}
                      siblings={torreProps}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ────────────────────────── Helpers internos ──────────────────────────

function groupByTorre(
  properties: Property[],
  hubSlug: string,
): Record<string, Property[]> {
  const result: Record<string, Property[]> = {}
  for (const p of properties) {
    const torreSlug = classifyTorreFor(hubSlug, p)
    if (!torreSlug) continue
    if (!result[torreSlug]) result[torreSlug] = []
    result[torreSlug].push(p)
  }
  return result
}

/**
 * Escolhe a unidade-destaque pra hero card. Prioridade:
 * 1. Cobertura (raridade absoluta)
 * 2. Maior area privativa (mais aspiracional / capa do empreendimento)
 * 3. Primeira da lista (fallback)
 *
 * NUNCA escolhe imovel sem foto de destaque.
 */
function pickFeatured(properties: Property[]): Property | null {
  const withPhoto = properties.filter((p) => Boolean(p.fotoDestaque))
  if (withPhoto.length === 0) return null

  // 1. Cobertura
  const cobertura = withPhoto.find((p) =>
    (p.tipo || "").toLowerCase().includes("cobertura"),
  )
  if (cobertura) return cobertura

  // 2. Maior area
  const sorted = [...withPhoto].sort((a, b) => {
    const areaA = a.areaPrivativa ?? a.areaTotal ?? 0
    const areaB = b.areaPrivativa ?? b.areaTotal ?? 0
    return areaB - areaA
  })
  return sorted[0] ?? null
}

/**
 * Extrai prazo de entrega da descricao editorial da torre. Padrao usado
 * em empreendimento-assets.ts: "Entrega prevista para Agosto/26."
 *
 * Quando a descricao menciona "1ª fase pronta", retorna flag indicando
 * que o prazo se refere a SEGUNDA FASE (a primeira ja foi entregue) —
 * permite render labels como "2ª fase · Agosto/26" em vez de "Entrega
 * prevista · Agosto/26", deixando explicito que parte ja foi entregue.
 */
function extractEntregaPrazo(
  descricao?: string,
): { prazo: string; isSegundaFase: boolean } | null {
  if (!descricao) return null
  const match = descricao.match(/entrega prevista para ([^.]+)/i)
  if (!match) return null
  const isSegundaFase = /1[ºªa] fase pronta|primeira fase pronta/i.test(descricao)
  return { prazo: match[1].trim(), isSegundaFase }
}
