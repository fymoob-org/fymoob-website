/**
 * Static marketing assets for empreendimentos.
 * These are provided by construtoras with authorization.
 * When an empreendimento has assets here, the landing page uses them
 * for a richer, more immersive experience.
 */

import type { Property } from "@/types/property"

export interface EmpreendimentoAssets {
  logo?: string
  heroImage: string
  heroOverlayImage?: string
  parallaxImages: string[]
  implantacaoImage?: string
  lifestyleImage?: string
  torres?: {
    nome: string
    slug?: string
    logo?: string
    render?: string
    planta?: string
    plantas?: string[]
    descricao?: string
    /**
     * Categoria curta da torre — usada como subtitle no card do hub
     * `/empreendimento/[slug]` pra diferenciar produtos (residencial 1-2Q
     * vs residencial premium vs comercial). Sem isso, 3 torres do mesmo
     * empreendimento parecem identicas no grid e usuario que busca
     * residencial pode tropecar em torre comercial.
     * Ex: "Residencial • 1-2 quartos", "Corporativo & Lojas".
     */
    categoria?: string
  }[]
  plantas?: string[]
  videoUrl?: string
  mapEmbedUrl?: string
  descricaoMarketing?: string
  tagline?: string
  subtitulo?: string
  /**
   * Override pra tagline aspiracional do hero (linha grande abaixo do H1).
   * Quando definida, substitui o template "Residencial boutique com N
   * unidades". Usar quando o empreendimento tem narrativa propria mais
   * marcante que o template generico (ex: Reserva Barigui usa
   * "Onde a cidade termina e o parque começa.").
   *
   * Suporta `\n` pra quebra de linha editorial (renderizado com
   * `whitespace-pre-line` no hero). Usar pra criar pausa dramatica
   * em frase de duas partes.
   */
  taglineHero?: string

  /**
   * Override pra subhead do hero (linha pequena abaixo da tagline).
   * Quando definida, substitui o template auto-gerado a partir de
   * tipos + bairro ("Apartamentos, duplex e studios em frente ao
   * Parque Barigui"). Usar quando o pitch editorial precisa ser mais
   * especifico que o catalogo de SKUs (numero de torres, prazo,
   * diferenciador unico).
   */
  subheadHero?: string

  /**
   * Sprint design 06/05/2026 — Frente A: amenities-âncora com render
   * dedicado. Substitui o grid flat de 42 ícones por showcase visual
   * editorial. Lista completa do CRM ainda aparece num accordion abaixo
   * (preserva SEO). Cada item: imagem AVIF/JPG do render Avantti +
   * nome + descrição curta.
   */
  amenitiesShowcase?: {
    image: string
    name: string
    description: string
  }[]

  /**
   * Sprint design 06/05/2026 — Frente B: pinos curados pra "Tudo a 5
   * minutos". Substitui iframe puro do Google Maps por foto aérea +
   * lista de proximidades com tempo. Iframe Google fica em accordion.
   */
  aerialImage?: string
  nearbyPlaces?: {
    name: string
    distance: string
    category: "parque" | "shopping" | "transporte" | "saude" | "educacao" | "gastronomia"
  }[]

  /**
   * Sprint design 06/05/2026 — Frente C: "Quem assina" — incorporadora
   * + escritórios de arquitetura/design + parceiros técnicos. Cada um
   * com logo, nome e 1 linha de credenciamento. Reforça autoridade do
   * produto, alinha com padrão luxury (JHSF/Cyrela vendem branding).
   */
  partners?: {
    role: string
    name: string
    logo?: string
    credential?: string
  }[]
}

const assetsMap: Record<string, EmpreendimentoAssets> = {
  "reserva-barigui": {
    logo: "/images/empreendimentos/reserva-barigui/logo-reserva-barigui.png",
    // Hero recriado em 04/05/2026 — substituiu folhas (botanical luxury)
    // pela vista da piscina infinity com skyline + lago + sunset (skyline
    // luxury). Vende o produto real do empreendimento (vista privilegiada
    // do Parque Barigui) e abre layout bottom-anchored: vista limpa nos
    // 60% superiores, branding (logo branca) sobre piscina escura nos
    // 40% inferiores onde tem alto contraste.
    // - pool-day.webp 319KB q92 (1672x941): hero novo. Servido via <Image>
    //   do Next que reotimiza pra AVIF em prod via Accept header.
    // - folhas.webp / folhas.png ficam no repo como backup.
    // - pool.webp 98KB: parallax piscina sunset (mantido).
    heroImage: "/images/empreendimentos/reserva-barigui/pool-day.webp",
    heroOverlayImage: "/images/empreendimentos/reserva-barigui/folhas-hero.png",
    parallaxImages: [
      "/images/empreendimentos/reserva-barigui/pool.webp",
      "/images/empreendimentos/reserva-barigui/panoramica.jpg",
      "/images/empreendimentos/reserva-barigui/localizacao.jpg",
    ],
    implantacaoImage: "/images/empreendimentos/reserva-barigui/implantacao.jpg",
    lifestyleImage: "/images/empreendimentos/reserva-barigui/lifestyle-familia-vista-parque.webp",
    tagline: "CURITIBA | REGIÃO DO BARIGUI",
    subtitulo: "LANÇAMENTO",
    taglineHero: "Onde Curitiba encontra\no privilégio do Barigui.",
    subheadHero: "Três torres independentes • Plantas de 1 a 4 quartos • Entrega em 2027",
    torres: [
      {
        nome: "Reserva Lago",
        slug: "reserva-barigui",
        logo: "/images/empreendimentos/reserva-barigui/logo-lago.png",
        render: "/images/empreendimentos/reserva-barigui/fachada-lago.jpg",
        descricao: "Apartamentos com 1 a 2 quartos, em formato de studio, loft, garden, ou duplex. Entrega prevista para Agosto/26.",
        categoria: "Residencial • 1 a 2 quartos",
        plantas: [
          "/images/empreendimentos/reserva-barigui/plantas/lago-1.png",
          "/images/empreendimentos/reserva-barigui/plantas/lago-2.png",
          "/images/empreendimentos/reserva-barigui/plantas/lago-3.png",
        ],
      },
      {
        nome: "Reserva Colina",
        slug: "reserva-colina",
        logo: "/images/empreendimentos/reserva-barigui/logo-colina.png",
        render: "/images/empreendimentos/reserva-barigui/render-colina.jpg",
        descricao: "Apartamentos de 3 a 4 suítes, com plantas de garden, laje, ou coberturas duplex. Entrega prevista para Julho/27.",
        categoria: "Residencial premium • 3 a 4 suítes",
        plantas: [
          "/images/empreendimentos/reserva-barigui/plantas/colina-1.png",
          "/images/empreendimentos/reserva-barigui/plantas/colina-2.png",
          "/images/empreendimentos/reserva-barigui/plantas/colina-3.png",
        ],
      },
      {
        nome: "Reserva Mirante",
        slug: "reserva-mirante",
        logo: "/images/empreendimentos/reserva-barigui/logo-mirante.png",
        render: "/images/empreendimentos/reserva-barigui/render-mirante.jpg",
        descricao: "Salas comerciais, lojas e lajes corporativas, de 38m² a 1.222m². Entrega prevista para Setembro/27.",
        categoria: "Corporativo & Lojas",
        plantas: [
          "/images/empreendimentos/reserva-barigui/plantas/mirante-1.webp",
          "/images/empreendimentos/reserva-barigui/plantas/mirante-2.webp",
          "/images/empreendimentos/reserva-barigui/plantas/mirante-3.webp",
          "/images/empreendimentos/reserva-barigui/plantas/mirante-4.webp",
        ],
      },
    ],
    videoUrl: "https://www.youtube.com/embed/8F1lKx4xgEo",
    mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3603.0946163108147!2d-49.318648700000004!3d-25.4351001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94dce3d178de8429%3A0x9d7c4792a4141dc0!2sR.%20Clara%20Vendramin%2C%20445%20-%20Mossungu%C3%AA%2C%20Curitiba%20-%20PR%2C%2081200-170!5e0!3m2!1spt-BR!2sbr!4v1670858575948!5m2!1spt-BR!2sbr",
    descricaoMarketing: "Um empreendimento de alto padrão em uma das regiões mais desejadas de Curitiba, com a natureza do Parque Barigui como moldura.\n\nCom apenas 10 unidades, o Reserva Barigui combina privacidade, conveniência e arquitetura contemporânea no Mossunguê.",
    aerialImage: "/images/empreendimentos/reserva-barigui/avantti-source/hub/aerea-complexo.jpeg",
    amenitiesShowcase: [
      {
        image: "/images/empreendimentos/reserva-barigui/avantti-source/colina/amenity-centro-poliesportivo.jpg",
        name: "Centro poliesportivo",
        description: "Quadras, espaço fitness e estrutura completa pra atividade física dentro do condomínio.",
      },
      {
        image: "/images/empreendimentos/reserva-barigui/avantti-source/colina/amenity-gourmet-sports-bar.jpg",
        name: "Gourmet & sports bar",
        description: "3 espaços gourmet temáticos integrados a um sports bar privativo.",
      },
      {
        image: "/images/empreendimentos/reserva-barigui/avantti-source/lago/amenity-rooftop-torre-harmonia.jpg",
        name: "Rooftop Torre Harmonia",
        description: "Cobertura panorâmica com vista direta pro Parque Barigui e skyline.",
      },
      {
        image: "/images/empreendimentos/reserva-barigui/avantti-source/lago/amenity-piscina-interna.jpg",
        name: "Piscina interna aquecida",
        description: "Piscina coberta climatizada complementando a piscina panorâmica externa.",
      },
      {
        image: "/images/empreendimentos/reserva-barigui/avantti-source/lago/amenity-lounge-salao-festas.jpg",
        name: "Lounge & salão de festas",
        description: "Dois salões de eventos pra recepções privativas e celebrações.",
      },
      {
        image: "/images/empreendimentos/reserva-barigui/avantti-source/colina/amenity-lounge-externo.jpg",
        name: "Lounge externo",
        description: "Áreas externas integradas ao bosque preservado de 8.000 m² de mata nativa.",
      },
      {
        image: "/images/empreendimentos/reserva-barigui/avantti-source/lago/amenity-tikibar.jpg",
        name: "Tiki bar & solário",
        description: "Bar à beira da piscina com lounge ao ar livre e área de descanso.",
      },
      {
        image: "/images/empreendimentos/reserva-barigui/avantti-source/colina/amenity-pe-in-ac-r03.jpg",
        name: "Áreas comuns",
        description: "Hall, lobby e circulações com acabamento alinhado ao padrão das unidades.",
      },
    ],
    nearbyPlaces: [
      { name: "Parque Barigui", distance: "em frente", category: "parque" },
      { name: "ParkShoppingBarigui", distance: "ao lado", category: "shopping" },
      { name: "BR-277 / Av. Cândido Hartmann", distance: "2 min de carro", category: "transporte" },
      { name: "Cinemark Park Shopping Barigui", distance: "ao lado", category: "gastronomia" },
      { name: "Coco Bambu Conceito Barigui", distance: "3 min de carro", category: "gastronomia" },
      { name: "Decathlon Barigui", distance: "1 min de carro", category: "shopping" },
      { name: "Hospital São Vicente Bigorrilho", distance: "8 min de carro", category: "saude" },
      { name: "Colégio Santo Anjo", distance: "5 min de carro", category: "educacao" },
    ],
    partners: [
      {
        role: "Incorporação & construção",
        name: "Avantti",
        logo: "/images/empreendimentos/reserva-barigui/logo-avantti-full.png",
        credential: "Sistema construtivo autoral AV Tec, primeiros do mundo a usar SmartJack em residencial.",
      },
      {
        role: "Masterplan & arquitetura",
        name: "Bacoccinni Arquitetura",
        logo: "/images/empreendimentos/reserva-barigui/avantti-source/hub/logo-bacoccinni.png",
        credential: "Escritório responsável pelo desenho urbano e fachada do complexo.",
      },
      {
        role: "Paisagismo & design urbano",
        name: "Takeda Design",
        logo: "/images/empreendimentos/reserva-barigui/avantti-source/hub/logo-takeda.png",
        credential: "Paisagismo e desenho urbano do complexo, incluindo o bosque preservado de 8.000 m² de mata nativa.",
      },
      {
        role: "Engenharia estrutural",
        name: "Evehx",
        credential: "Parceria de mais de 20 anos com a Avantti em lajes planas protendidas.",
      },
    ],
  },
}

// Sub-empreendimentos with simple asset entries (plantas only, no full editorial)
assetsMap["reserva-colina"] = {
  heroImage: "/images/empreendimentos/reserva-barigui/render-colina.jpg",
  parallaxImages: [],
  plantas: [
    "/images/empreendimentos/reserva-barigui/plantas/colina-1.png",
    "/images/empreendimentos/reserva-barigui/plantas/colina-2.png",
    "/images/empreendimentos/reserva-barigui/plantas/colina-3.png",
  ],
}

assetsMap["reserva-mirante"] = {
  heroImage: "/images/empreendimentos/reserva-barigui/render-mirante.jpg",
  parallaxImages: [],
  plantas: [
    "/images/empreendimentos/reserva-barigui/plantas/mirante-1.webp",
    "/images/empreendimentos/reserva-barigui/plantas/mirante-2.webp",
    "/images/empreendimentos/reserva-barigui/plantas/mirante-3.webp",
    "/images/empreendimentos/reserva-barigui/plantas/mirante-4.webp",
  ],
}

export function getEmpreendimentoAssets(slug: string): EmpreendimentoAssets | null {
  return assetsMap[slug] || null
}

export function hasEditorialLayout(slug: string): boolean {
  const assets = assetsMap[slug]
  return !!(assets && assets.torres && assets.torres.length > 0)
}

/**
 * Sprint B.V (03/05/2026) — Slug curto da torre dentro do hub.
 * "Reserva Lago" -> "lago", "Reserva Colina" -> "colina", "Reserva Mirante" -> "mirante".
 * Usado pra:
 * - Anchor IDs (#torre-lago, #torre-colina) — ja existia inline em [slug]/page.tsx
 * - URL da sub-rota /empreendimento/[slug]/[torre] (Sprint B.7)
 * - Schema containsPlace.url (Sprint B.V)
 *
 * Centralizado aqui pra evitar drift entre os 3 consumers.
 */
export function getTorreShortSlug(torreNome: string): string {
  return torreNome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^reserva-?/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Sprint B.7 (03/05/2026) — Resolve uma torre pelo seu short slug dentro do hub.
 * Ex: getTorreFromShortSlug("reserva-barigui", "lago") devolve a torre Reserva Lago.
 * Devolve null quando o slug do hub nao tem editorial ou a torre nao existe.
 */
export function getTorreFromShortSlug(
  hubSlug: string,
  torreSlug: string,
): { hub: EmpreendimentoAssets; torre: NonNullable<EmpreendimentoAssets["torres"]>[number] } | null {
  const hub = assetsMap[hubSlug]
  if (!hub?.torres) return null
  const torre = hub.torres.find((t) => getTorreShortSlug(t.nome) === torreSlug)
  if (!torre) return null
  return { hub, torre }
}

/**
 * Sprint B' (03/05/2026) — Classificacao automatica de imovel pra torre.
 *
 * Caso Reserva Barigui: o CRM nao segmenta unidades por torre — todos os 10
 * imoveis estao sob `Empreendimento: "Reserva Barigui"` (+ 1 typo "Reserva
 * Bairgui"). Pra cada sub-rota mostrar so as unidades da sua torre, este
 * mapeamento aplica regra heuristica baseada nas descricoes editoriais
 * curadas:
 *   - Reserva Lago: 1-2 quartos, formato studio/loft/garden/duplex
 *   - Reserva Colina: 3-4 suites, garden/laje/coberturas duplex
 *   - Reserva Mirante: salas comerciais, lojas, lajes corporativas
 *
 * Quando Wagner reclassificar imoveis no CRM (Sprint B caminho 2), trocar
 * pra match exato `p.empreendimento === "Reserva Lago"` etc.
 *
 * Cada hub editorial pode ter sua propria classifier — registrada aqui.
 * Hubs sem classifier nao tem sub-rotas com filtro de unidades (sub-rota
 * mostraria todas as unidades do hub mesmo).
 */
type TorreClassifier = (p: Property) => string

const HUB_CLASSIFIERS: Record<string, TorreClassifier> = {
  "reserva-barigui": (p: Property) => {
    const tipo = (p.tipo || "").toLowerCase()
    const COMERCIAL = ["sala comercial", "loja", "ponto comercial", "salas/conjuntos", "sala/conjuntos", "sala/conjunto"]
    if (COMERCIAL.some((c) => tipo.includes(c))) return "mirante"
    if ((p.dormitorios ?? 0) >= 3) return "colina"
    return "lago"
  },
}

/**
 * Classifica imovel em torre dentro do hub. Retorna torre short slug ("lago",
 * "colina", "mirante") ou null se hub nao tem classifier registrado.
 */
export function classifyTorreFor(hubSlug: string, p: Property): string | null {
  const fn = HUB_CLASSIFIERS[hubSlug]
  return fn ? fn(p) : null
}
