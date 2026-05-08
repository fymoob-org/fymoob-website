import type { MetadataRoute } from "next"
import { getAllBairros, getAllTypes, getAllEmpreendimentos, getAllPropertySitemapData } from "@/services/loft"
import { getAllSlugs as getAllBlogSlugs } from "@/services/blog"
import { getAllGuiaSlugs } from "@/services/guias"
import {
  getArticleSourceMode,
  listAuthors,
  listPublishedArticles,
} from "@/services/articles"
import { getEmpreendimentoAssets, getTorreShortSlug, hasEditorialLayout } from "@/data/empreendimento-assets"
import type { PropertyType } from "@/types/property"
import { SITE_URL } from "@/lib/constants"

const TIPO_SLUG_MAP: Partial<Record<PropertyType, string>> = {
  Apartamento: "apartamentos",
  "Apartamento Duplex": "apartamentos-duplex",
  Casa: "casas",
  "Casa em Condomínio": "casas-em-condominio",
  Chácara: "chacaras",
  Cobertura: "coberturas",
  Kitnet: "kitnets",
  Loja: "lojas",
  "Ponto Comercial": "pontos-comerciais",
  "Prédio Comercial": "predios-comerciais",
  "Sala Comercial": "salas-comerciais",
  "Salas/Conjuntos": "salas-conjuntos",
  Sobrado: "sobrados",
  Studio: "studios",
  Terreno: "terrenos",
  "Terreno Comercial": "terrenos-comerciais",
  Empreendimento: "empreendimentos",
}

const TIPO_STATIC_PAGES: Partial<Record<PropertyType, string>> = {
  Apartamento: "apartamentos-curitiba",
  Casa: "casas-curitiba",
  Sobrado: "sobrados-curitiba",
  Terreno: "terrenos-curitiba",
}

// Next.js generates /sitemap.xml as the index automatically when generateSitemaps
// is exported. Each id becomes /sitemap/[id].xml. Splitting into 4 segments keeps
// each child small (<5MB) and helps GSC reporting by category.
export async function generateSitemaps() {
  return [
    { id: 0 }, // imoveis
    { id: 1 }, // bairros + combinações
    { id: 2 }, // blog + guias + pillars
    { id: 3 }, // static + institucional + empreendimentos
  ]
}

export default async function sitemap({
  id,
}: {
  id: Promise<string>
}): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  // Next 16 passa `id` como Promise<string> (mudanca vs Next 15 onde era
  // number direto). Precisa await + parseInt. Bug descoberto pre-cutover:
  // JSON.stringify de Promise retorna {} e todas comparacoes falhavam,
  // gerando shards vazios.
  const rawId = await id
  const shardId = parseInt(rawId, 10)

  // Segment 0: imóveis individuais.
  //
  // Nota historica (23/04/2026): tinhamos <image:image> com fotos do CDN Loft
  // (cdn.vistahost.com.br), mas esse CDN bloqueia TODOS os crawlers no
  // robots.txt (User-agent: * / Disallow: /). Resultado no GSC apos 6 dias:
  // 0 imagens indexadas de 241 submetidas + 1187 warnings. Imagens removidas
  // do sitemap pra limpar o relatorio de warnings.
  //
  // Pra recuperar indexacao no Google Images, precisa implementar proxy
  // proprio (ex: /api/img?src=...) que sirva as imagens pelo nosso dominio
  // — nosso robots.txt permite Googlebot-Image. Backlogged em Fase 10.
  if (shardId === 0) {
    const entries = await getAllPropertySitemapData()
    return entries.map((entry) => ({
      url: `${SITE_URL}/imovel/${entry.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }))
  }

  // Segment 1: bairros + combinações (tipo, finalidade, quartos, preço)
  if (shardId === 1) {
    const [allBairros, types] = await Promise.all([getAllBairros(), getAllTypes()])

    // Filtra bairros pelo mesmo threshold do generateStaticParams em
    // src/app/imoveis/[bairro]/page.tsx (b.total >= 2). Sem isso, o sitemap
    // emite URLs que retornam 404 — auditoria GSC 08/05/2026 detectou 5 URLs
    // 404 (campina-das-pedras, lindoia, pilarzinho, nacoes, vila-izabel) que
    // poluíam crawl budget e caíam no relatório "Não encontrada".
    const bairros = allBairros.filter((b) => b.total >= 2)

    const typePages: MetadataRoute.Sitemap = types
      .filter((t) => TIPO_STATIC_PAGES[t.tipo])
      .map((t) => ({
        url: `${SITE_URL}/${TIPO_STATIC_PAGES[t.tipo]}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }))

    const bairroPages: MetadataRoute.Sitemap = bairros.map((b) => ({
      url: `${SITE_URL}/imoveis/${b.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))

    const combinedPages: MetadataRoute.Sitemap = bairros.flatMap((b) =>
      b.tipos
        .filter((t) => t.count >= 3)
        .filter((t) => TIPO_SLUG_MAP[t.tipo])
        .map((t) => ({
          url: `${SITE_URL}/imoveis/${b.slug}/${TIPO_SLUG_MAP[t.tipo]}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.6,
        }))
    )

    const tipoFinalidadePages: MetadataRoute.Sitemap = ["apartamentos", "casas", "sobrados", "terrenos"].flatMap(
      (tipo) => [
        {
          url: `${SITE_URL}/${tipo}-curitiba/venda`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        },
        {
          url: `${SITE_URL}/${tipo}-curitiba/aluguel`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        },
      ]
    )

    const finalidadePages: MetadataRoute.Sitemap = bairros.flatMap((b) => {
      const urls: MetadataRoute.Sitemap = []
      const vendaCount = b.porFinalidade["Venda"] ?? 0
      const aluguelCount = b.porFinalidade["Locação"] ?? 0
      if (vendaCount >= 2)
        urls.push({
          url: `${SITE_URL}/imoveis/${b.slug}/venda`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        })
      if (aluguelCount >= 2)
        urls.push({
          url: `${SITE_URL}/imoveis/${b.slug}/aluguel`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        })
      return urls
    })

    const quartosPages: MetadataRoute.Sitemap = bairros.flatMap((b) =>
      [1, 2, 3, 4, 5].flatMap((q) => {
        const qKey = q === 5 ? "5+" : String(q)
        const count = b.porQuartos?.[qKey] ?? 0
        if (count < 2) return []
        return [
          {
            url: `${SITE_URL}/imoveis/${b.slug}/${q}-quartos`,
            lastModified: now,
            changeFrequency: "weekly" as const,
            priority: 0.6,
          },
        ]
      })
    )

    const priceRangePages: MetadataRoute.Sitemap = [
      "ate-300-mil",
      "300-a-500-mil",
      "500-mil-a-1-milhao",
      "1-a-3-milhoes",
      "acima-3-milhoes",
    ].map((faixa) => ({
      url: `${SITE_URL}/imoveis/preco/${faixa}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))

    return [
      ...typePages,
      ...bairroPages,
      ...combinedPages,
      ...tipoFinalidadePages,
      ...finalidadePages,
      ...quartosPages,
      ...priceRangePages,
    ]
  }

  // Segment 2: blog + guias + pillars + autores (Fase 18)
  if (shardId === 2) {
    const supabaseMode = getArticleSourceMode() === "supabase"

    const [blogSlugs, guiaSlugs, articles, authors] = await Promise.all([
      getAllBlogSlugs(),
      getAllGuiaSlugs(),
      // Lista completa pra pegar updated_at real (lastmod) — somente em modo Supabase.
      supabaseMode ? listPublishedArticles() : Promise.resolve([]),
      supabaseMode ? listAuthors() : Promise.resolve([]),
    ])

    const pillarPages: MetadataRoute.Sitemap = [
      {
        url: `${SITE_URL}/comprar-imovel-curitiba`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.9,
      },
      // Pillar especializado em apartamentos (Fase 19.P1.1) — query "comprar
      // apartamento curitiba" tem 10x volume da query generica.
      {
        url: `${SITE_URL}/comprar-apartamento-curitiba`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.9,
      },
      {
        url: `${SITE_URL}/morar-em-curitiba`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.9,
      },
      {
        url: `${SITE_URL}/alugar-curitiba`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.9,
      },
    ]

    const blogListing: MetadataRoute.Sitemap = [
      {
        url: `${SITE_URL}/blog`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      },
    ]

    // Posts do blog: em modo Supabase usamos `updated_at` real por post (Fase
    // 18 — sinal pro Google ranquear mudancas reais). Em modo legado, fallback
    // pra `now` uniforme do build.
    const blogPostPages: MetadataRoute.Sitemap = supabaseMode
      ? articles.map((a) => ({
          url: `${SITE_URL}/blog/${a.slug}`,
          lastModified: a.updated_at ? new Date(a.updated_at) : now,
          changeFrequency: "monthly" as const,
          priority: 0.6,
        }))
      : blogSlugs.map((slug) => ({
          url: `${SITE_URL}/blog/${slug}`,
          lastModified: now,
          changeFrequency: "monthly" as const,
          priority: 0.6,
        }))

    const guiaPages: MetadataRoute.Sitemap = guiaSlugs.map((slug) => ({
      url: `${SITE_URL}/guia/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }))

    // Paginas de autor (E-E-A-T) — somente em modo Supabase
    const authorPages: MetadataRoute.Sitemap = authors.map((a) => ({
      url: `${SITE_URL}/autor/${a.slug}`,
      lastModified: a.updated_at ? new Date(a.updated_at) : now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }))

    return [
      ...pillarPages,
      ...blogListing,
      ...blogPostPages,
      ...guiaPages,
      ...authorPages,
    ]
  }

  // Segment 3: static + institucional + empreendimentos
  if (shardId === 3) {
    const empreendimentos = await getAllEmpreendimentos()

    const staticPages: MetadataRoute.Sitemap = [
      {
        url: SITE_URL,
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 1.0,
      },
      {
        url: `${SITE_URL}/busca`,
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.8,
      },
    ]

    const institutionalPages: MetadataRoute.Sitemap = [
      { url: `${SITE_URL}/sobre`, priority: 0.5 },
      { url: `${SITE_URL}/contato`, priority: 0.6 },
      { url: `${SITE_URL}/anuncie`, priority: 0.7 },
      { url: `${SITE_URL}/empreendimentos`, priority: 0.8 },
      { url: `${SITE_URL}/lancamentos`, priority: 0.9 },
      { url: `${SITE_URL}/faq`, priority: 0.6 },
      { url: `${SITE_URL}/politica-editorial`, priority: 0.3 },
    ].map((p) => ({
      ...p,
      lastModified: now,
      changeFrequency: "monthly" as const,
    }))

    // Empreendimentos com layout editorial (assets curados, plantas estaticas,
    // descricao marketing) sao landings de mais alto valor — Google Ads roda
    // em cima delas e o trafego organico fecha lead via WhatsApp. Bump pra 0.9
    // sinaliza prioridade superior pros 3 demais editoriais que valem (1.0).
    const empreendimentoPages: MetadataRoute.Sitemap = empreendimentos.map((e) => ({
      url: `${SITE_URL}/empreendimento/${e.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: hasEditorialLayout(e.slug) ? 0.9 : 0.8,
      // images removidas — CDN Loft bloqueia crawlers (ver nota no shard 0)
    }))

    // Sprint B.7 (03/05/2026) — sub-rotas das torres em hubs editoriais:
    // /empreendimento/reserva-barigui/lago, /colina, /mirante. Cada uma e
    // entidade buscavel propria pra capturar queries por torre. Canonical
    // delas aponta pro hub, mas Google indexa pra match de query.
    // Priority 0.85 (logo abaixo do hub a 0.9).
    const torreSubRoutes: MetadataRoute.Sitemap = empreendimentos.flatMap((e) => {
      const assets = getEmpreendimentoAssets(e.slug)
      if (!assets?.torres) return []
      return assets.torres.map((t) => ({
        url: `${SITE_URL}/empreendimento/${e.slug}/${getTorreShortSlug(t.nome)}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.85,
      }))
    })

    return [...staticPages, ...institutionalPages, ...empreendimentoPages, ...torreSubRoutes]
  }

  return []
}
