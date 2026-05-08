import type {
  Property,
  PropertyFilters,
  BairroSummary,
  BairroMarketStats,
  TypeSummary,
  PropertyType,
  PropertyStats,
  EmpreendimentoSummary,
  LoftPropertyRaw,
} from "@/types/property"
import {
  CARAC_FIELDS,
  INFRA_FIELDS,
  CARAC_LABELS,
  INFRA_LABELS,
  type LoftCharacteristicsMap,
} from "@/types/characteristics"
import { slugify, humanizeCaracLabel } from "@/lib/utils"
import { sortByRelevance } from "@/lib/property-relevance"
import { unstable_cache } from "next/cache"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// Fase 20.W1.6: env var pra alternar prod/sandbox sem editar codigo.
// Default: produção. Em dev/staging: setar LOFT_API_BASE_URL=https://sandbox-rest.vistahost.com.br
const LOFT_BASE_URL = process.env.LOFT_API_BASE_URL || "https://brunoces-rest.vistahost.com.br"
const LOFT_API_KEY = process.env.LOFT_API_KEY || ""
const PAGE_SIZE = 50 // API max per request
// 15 minutes (reduzido de 1h em 22/04/2026 — acelera reflexo de mudancas do
// CRM no site. Custo: 4x mais requests ao Loft/dia, ainda insignificante;
// ganho: Bruno/Wagner veem alteracoes no site em <=15min em vez de <=1h).
//
// IMPORTANTE: Fase 20.W2.6 (01/05/2026) tentou voltar pra 1h argumentando
// economia de ~R$10-20/mes em writes ISR. REVERTIDO pos-audit: a mudanca
// piorava UX do Bruno por ganho de infra desprezivel. Decisao original
// do comentario acima respeitada.
const REVALIDATE_SECONDS = 900

// ---------------------------------------------------------------------------
// API fields to request
// Caracteristicas + InfraEstrutura: tipos em src/types/characteristics.ts
// ---------------------------------------------------------------------------

// Slim fields for cards/listings.
// Nota: Vista API NAO aceita { Foto: [...] } em /imoveis/listar
// (so em /imoveis/detalhes). Fotos adicionais sao carregadas lazy
// via IntersectionObserver -> /api/photos/[code] quando card entra
// em viewport.
//
// Caracteristicas + InfraEstrutura vem como objects nested — Loft expoe
// TODOS os campos definidos no CRM sem precisar whitelist. Bruno adiciona
// "Jacuzzi" no CRM → vem automatico aqui, UI de filtros derivada depois.
// Custo: payload maior (~4-5x), mas cache de 1h absorve.
const CARD_FIELDS = [
  "Codigo", "Categoria", "Status", "BairroComercial", "Bairro", "Cidade", "UF",
  "ValorVenda", "ValorLocacao", "ValorACombinar", "Dormitorios", "Suites", "Vagas", "TotalBanheiros",
  "AreaPrivativa", "AreaTotal", "FotoDestaque", "TituloSite",
  "ExibirNoSite", "DestaqueWeb", "SuperDestaqueWeb", "Lancamento",
  "Empreendimento", "Construtora", "DataCadastro", "DataAtualizacao",
  "Latitude", "Longitude",
  "FotoDestaquePequena",
  "Caracteristicas", "InfraEstrutura",
]

// Full fields for detail pages (single property)
const DETAIL_FIELDS = [
  "Codigo", "Referencia", "Categoria", "Status", "Finalidade", "Situacao", "Ocupacao",
  "ValorVenda", "ValorLocacao", "ValorCondominio", "ValorIptu", "ValorM2", "ValorACombinar",
  "SeguroIncendio", "Fci",
  "Bairro", "BairroComercial", "Cidade", "Endereco", "Numero", "Complemento",
  "Bloco", "CEP", "UF", "Latitude", "Longitude", "GMapsLatitude", "GMapsLongitude",
  "AreaTotal", "AreaPrivativa", "AreaTerreno", "Dormitorios", "Suites",
  "TotalBanheiros", "Vagas", "QtdVarandas", "Salas",
  "Empreendimento", "CodigoEmpreendimento", "Construtora", "DescricaoEmpreendimento",
  "DescricaoWeb", "TituloSite", "TextoAnuncio", "KeywordsWeb",
  "FotoDestaque", "FotoDestaquePequena", "URLVideo", "TemTourVirtual",
  // Video[] resource nested — exposto so em /imoveis/detalhes (igual `Foto`).
  // Wagner cadastra videos no CRM Loft via "Galeria de Videos" (Tipo=youtube|vimeo|mp4)
  // e o site lia apenas URLVideo (URL unica externa) — bug fixado 05/05/2026.
  { Video: ["Video", "VideoCodigo", "Tipo", "Descricao", "DescricaoWeb", "Destaque", "ExibirNoSite", "ExibirSite"] },
  "ExibirNoSite", "DestaqueWeb", "SuperDestaqueWeb", "Lancamento",
  "AceitaFinanciamento", "AceitaPermuta",
  "Face", "GaragemTipo", "Topografia", "AnoConstrucao",
  "DataCadastro", "DataAtualizacao",
  "Caracteristicas", "InfraEstrutura",
]

// ---------------------------------------------------------------------------
// API fetch helper (GET only — NEVER POST/PUT/DELETE)
// ---------------------------------------------------------------------------

async function fetchLoftAPI<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${LOFT_BASE_URL}${endpoint}`)
  url.searchParams.set("key", LOFT_API_KEY)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  // NUNCA logar url.toString() — contem LOFT_API_KEY no query string.
  const urlString = url.toString()

  // Retry simples em 5xx/429/timeout. 1 retry com backoff curto — sem biblioteca.
  // Timeout 10s por tentativa evita que ISR regeneration fique pendurada.
  const maxAttempts = 2
  let lastErr: unknown = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(urlString, {
        headers: { Accept: "application/json" },
        next: { revalidate: REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(10_000),
      })

      if (res.ok) {
        return res.json() as Promise<T>
      }

      const text = await res.text().catch(() => "")
      console.error(`[Loft API] ${res.status} on ${endpoint} (attempt ${attempt}): ${text.slice(0, 200)}`)

      // 4xx nao-429 = bug do client, nao adianta retry
      if (res.status < 500 && res.status !== 429) {
        throw new Error(`Loft API error: ${res.status}`)
      }
      lastErr = new Error(`Loft API error: ${res.status}`)
    } catch (err) {
      // AbortError (timeout) ou network — loga sem url (tem secret)
      const name = err instanceof Error ? err.name : "UnknownError"
      console.error(`[Loft API] fetch failed on ${endpoint} (attempt ${attempt}): ${name}`)
      lastErr = err
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 500 * attempt))
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("Loft API: max retries exceeded")
}

// ---------------------------------------------------------------------------
// Map API raw → Property
// ---------------------------------------------------------------------------

function parseNumber(val: string | undefined | null): number | null {
  if (!val) return null
  const n = parseFloat(val)
  // Rejeita NaN, zero e negativos (CRM as vezes tem precos negativos por typo).
  return isNaN(n) || n <= 0 ? null : n
}

/**
 * Parse de coordenada geografica (latitude ou longitude). Diferente de
 * parseNumber, aceita negativos — Curitiba esta em lat ~-25, lng ~-49,
 * ambos negativos. Bug detectado 02/05/2026: parseNumber descartava todas
 * as coordenadas reais do CRM, fazendo o mapa do site cair sempre no
 * centroide do bairro (fallback), distante do imovel real.
 *
 * Range valido: latitude -90..90, longitude -180..180. Zero e tratado como
 * sentinela "nao preenchido" (CRMs frequentemente persistem 0,0 quando
 * coord nao foi setada).
 */
function parseCoordinate(
  val: string | undefined | null,
  axis: "lat" | "lng"
): number | null {
  if (!val) return null
  const n = parseFloat(val)
  if (isNaN(n) || n === 0) return null
  const max = axis === "lat" ? 90 : 180
  if (n < -max || n > max) return null
  return n
}

function parseBool(val: string | undefined): boolean {
  return val === "Sim"
}

function parseOptionalFlag(val: unknown): boolean {
  if (typeof val === "number") return val > 0
  if (typeof val !== "string") return false

  const normalized = val.trim().toLowerCase()
  if (!normalized) return false

  return ["sim", "s", "true", "1", "yes", "y"].includes(normalized)
}

function generateSlug(raw: LoftPropertyRaw): string {
  const tipo = slugify(raw.Categoria || "imovel")
  const bairro = slugify(raw.BairroComercial || raw.Bairro || "curitiba")
  const cidade = slugify(raw.Cidade || "curitiba")
  const uf = (raw.UF || "pr").toLowerCase()
  const dorms = raw.Dormitorios && raw.Dormitorios !== "0" ? `${raw.Dormitorios}-quartos` : ""
  const area = raw.AreaPrivativa ? `${raw.AreaPrivativa}m2` : ""
  const parts = [tipo, bairro, cidade, uf, dorms, area, raw.Codigo].filter(Boolean)
  return parts.join("-")
}

// Extrai array de caracteristicas marcadas como "Sim" do payload Loft.
// Fase 20.W2.4: substitui Record<string, unknown> assertions duplas por
// LoftCharacteristicsMap tipado (tipo extraido em /types/characteristics).
function extractCharacteristics(raw: LoftCharacteristicsMap | undefined): string[] {
  if (!raw || typeof raw !== "object") return []
  const result: string[] = []
  for (const [key, value] of Object.entries(raw)) {
    if (value === "Sim") result.push(humanizeCaracLabel(key))
  }
  return result
}

/**
 * Determina finalidade (Venda / Locação / Venda e Locação) cruzando Status do
 * CRM com presença de ValorVenda/ValorLocacao.
 *
 * Fase 20.W2.3: extraido do mapRawToProperty pra eliminar chain de 6 if/else
 * e isolar regra que documenta incidente 22/04/2026.
 *
 * Caso especifico (incidente 22/04/2026, imovel 69804147): quando Bruno migra
 * imovel de dual (venda+locacao) pra venda-only, ele muda Status pra "Venda"
 * mas esquece de zerar ValorLocacao residual. Pela regra antiga (so precos),
 * o imovel continuava aparecendo no filtro de Locacao mesmo com Status
 * explicito "Venda".
 *
 * Hierarquia:
 * 1. Status="Venda" + ValorVenda > 0 → venda-only (ignora ValorLocacao residual)
 * 2. Status="Venda e Aluguel" + algum valor → dual
 * 3. Ambos precos > 0 → dual (legado, Bruno historicamente cadastrava
 *    dual com Status="Aluguel")
 * 4. Apenas um preco > 0 → respectiva finalidade
 * 5. Nenhum preco (lancamento, "a combinar") → fallback pelo Status puro
 */
function determineFinalidade(
  status: string,
  valorVenda: number,
  valorLoc: number
): Property["finalidade"] {
  if (status === "Venda" && valorVenda > 0) return "Venda"
  if (status === "Venda e Aluguel" && (valorVenda > 0 || valorLoc > 0)) return "Venda e Locação"
  if (valorVenda > 0 && valorLoc > 0) return "Venda e Locação"
  if (valorVenda > 0) return "Venda"
  if (valorLoc > 0) return "Locação"
  // Sem precos: respeita Status declarado
  if (status === "Aluguel") return "Locação"
  if (status === "Venda e Aluguel") return "Venda e Locação"
  return "Venda"
}

// Remove "?" e � (Unicode replacement char) repetidos no inicio do texto,
// junto com whitespace adjacente. Cobre o caso de emojis que o CRM Loft
// converte em "?" quando o encoding nao bate. Nao toca o miolo — perguntas
// legitimas "...vale a pena?" preservadas.
function cleanLeadingReplacementChars(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.replace(/^[\s?�]+/, "").trim()
}

// Extrai e normaliza videos do recurso `Video[]` da API Vista.
// Estrutura recebida: { "1": { Video, VideoCodigo, Tipo, Descricao, ... }, "2": {...} }
// Filtros aplicados:
//  - ExibirNoSite === "Sim" (Wagner pode ocultar video especifico no CRM)
//  - Video field nao-vazio (descarta entradas corrompidas)
// Ordenacao: destaque primeiro, depois pela ordem natural retornada pela API
// (que ja vem ordenada por VideoCodigo).
function parseVideos(raw: LoftPropertyRaw["Video"]): import("@/types/property").PropertyVideo[] {
  if (!raw || typeof raw !== "object") return []
  const items = Array.isArray(raw) ? raw : Object.values(raw)
  const videos = items
    .filter((v): v is NonNullable<typeof v> & { Video: string } =>
      Boolean(
        v &&
          typeof v === "object" &&
          typeof v.Video === "string" &&
          v.Video.trim() !== "" &&
          // ExibirNoSite default "Sim" se ausente — comportamento Vista
          (v.ExibirNoSite === undefined || v.ExibirNoSite === "Sim")
      )
    )
    .map((v) => ({
      videoId: v.Video.trim(),
      tipo: ((v.Tipo || "youtube").toLowerCase()) as import("@/types/property").PropertyVideo["tipo"],
      // Limpa "?" + whitespace iniciais — emojis (🌳📐🏡) que o CRM Loft converte
      // em "?" por encoding errado quando Wagner cola texto com emojis. Caso
      // reportado 05/05/2026 no imovel 69805524: "? CHACARA URBANA..." vira
      // "CHACARA URBANA...". Conservador: so toca o inicio, "?" no meio (ex:
      // pergunta legitima "...vale a pena?") fica preservado.
      descricao: cleanLeadingReplacementChars(v.Descricao),
      descricaoWeb: cleanLeadingReplacementChars(v.DescricaoWeb),
      destaque: v.Destaque === "Sim",
    }))
  // Destaque primeiro, ordem natural depois (stable sort).
  videos.sort((a, b) => Number(b.destaque) - Number(a.destaque))
  return videos
}

function mapRawToProperty(raw: LoftPropertyRaw): Property {
  const slug = generateSlug(raw)
  // Coordenadas geograficas: usa parseCoordinate (aceita negativos —
  // Curitiba esta em lat -25, lng -49). parseNumber descartava 100% das
  // coords reais do CRM (bug detectado por Bruno em 02/05/2026).
  const lat =
    parseCoordinate(raw.Latitude, "lat") ??
    parseCoordinate(raw.GMapsLatitude, "lat")
  const lng =
    parseCoordinate(raw.Longitude, "lng") ??
    parseCoordinate(raw.GMapsLongitude, "lng")

  // Caracteristicas + InfraEstrutura: API Loft expoe objects nested com
  // TODAS as chaves do CRM. Iteramos e incluimos apenas as marcadas como
  // "Sim" — qualquer campo novo que Bruno cadastre (ex: "Jacuzzi") aparece
  // automaticamente sem mudar codigo. humanizeCaracLabel corrige formatacao
  // ("Sala T V" → "Sala de TV").
  const caracteristicas = extractCharacteristics(raw.Caracteristicas)
  const infraestrutura = extractCharacteristics(raw.InfraEstrutura)

  // Extract photo URLs from nested Foto object.
  // Filter obrigatorio: CRM as vezes retorna string vazia ou URLs relativas que
  // quebram <Image src=""> do Next (erro "empty string is not allowed").
  const fotos: string[] = []
  const fotosPorTipo: { foto: string; tipo: string; descricao: string }[] = []
  if (raw.Foto && typeof raw.Foto === "object") {
    const sorted = Object.values(raw.Foto).sort(
      (a, b) => parseInt(a.Ordem || "0") - parseInt(b.Ordem || "0")
    )
    for (const foto of sorted) {
      if (typeof foto.Foto === "string" && foto.Foto.startsWith("https://")) {
        fotos.push(foto.Foto)
        fotosPorTipo.push({
          foto: foto.Foto,
          tipo: (foto.Tipo || "").trim(),
          descricao: (foto.Descricao || "").trim(),
        })
      }
    }
  }

  const status = (raw.Status || "").trim()
  const valorVenda = parseNumber(raw.ValorVenda) ?? 0
  const valorLoc = parseNumber(raw.ValorLocacao) ?? 0
  const finalidade = determineFinalidade(status, valorVenda, valorLoc)

  // Disponibilidade: BLACKLIST conservadora para nao esconder imoveis por engano.
  // Marcamos como indisponivel APENAS quando o status contem um padrao
  // sabidamente de imovel fora do mercado. Qualquer outro valor (inclusive vazio
  // ou desconhecido) mantem disponivel por padrao. O filtro real de exibicao
  // ja e feito pelo parametro ExibirNoSite=Sim no request Loft — este campo
  // e metadata auxiliar para features futuras (ex: badge "Recem publicado").
  const statusLower = status.toLowerCase()
  const disponivel =
    !statusLower.includes("alugado") &&
    !statusLower.includes("pendente") &&
    !statusLower.includes("suspenso") &&
    !statusLower.includes("vendido") &&
    !statusLower.includes("reservado")

  const titulo = raw.TituloSite
    || raw.TextoAnuncio
    || `${raw.Categoria || "Imóvel"} no ${raw.BairroComercial || raw.Bairro || "Curitiba"}`

  return {
    codigo: raw.Codigo,
    referencia: raw.Referencia || null,
    slug,
    url: `/imovel/${slug}`,
    titulo,
    tituloSite: raw.TituloSite || null,
    textoAnuncio: raw.TextoAnuncio || null,
    tipo: (raw.Categoria || "Apartamento") as PropertyType,
    finalidade,
    status: status as Property["status"],
    disponivel,
    situacao: raw.Situacao || null,
    ocupacao: raw.Ocupacao || null,
    precoVenda: parseNumber(raw.ValorVenda),
    precoAluguel: parseNumber(raw.ValorLocacao),
    valorCondominio: parseNumber(raw.ValorCondominio),
    valorIptu: parseNumber(raw.ValorIptu),
    valorSeguroIncendio: parseNumber(raw.SeguroIncendio),
    valorFci: parseNumber(raw.Fci),
    valorM2: parseNumber(raw.ValorM2),
    valorSobConsulta: parseOptionalFlag(raw.ValorACombinar),
    bairro: raw.BairroComercial || raw.Bairro || "",
    bairroComercial: raw.BairroComercial || raw.Bairro || "",
    cidade: raw.Cidade || "Curitiba",
    estado: raw.UF || "PR",
    endereco: raw.Endereco || "",
    numero: raw.Numero || null,
    complemento: raw.Complemento || null,
    bloco: raw.Bloco || null,
    cep: raw.CEP || null,
    latitude: lat,
    longitude: lng,
    areaTotal: parseNumber(raw.AreaTotal),
    areaPrivativa: parseNumber(raw.AreaPrivativa),
    areaTerreno: parseNumber(raw.AreaTerreno),
    dormitorios: parseNumber(raw.Dormitorios),
    suites: parseNumber(raw.Suites),
    banheiros: parseNumber(raw.TotalBanheiros),
    vagas: parseNumber(raw.Vagas),
    varandas: parseNumber(raw.QtdVarandas),
    salas: parseNumber(raw.Salas),
    empreendimento: raw.Empreendimento || null,
    codigoEmpreendimento: raw.CodigoEmpreendimento || null,
    construtora: raw.Construtora || null,
    descricaoEmpreendimento: raw.DescricaoEmpreendimento || null,
    descricao: raw.DescricaoWeb || raw.TextoAnuncio || "",
    keywordsWeb: raw.KeywordsWeb || null,
    // fotoDestaque so aceita URL https valida — evita Next/Image crash.
    fotoDestaque: typeof raw.FotoDestaque === "string" && raw.FotoDestaque.startsWith("https://") ? raw.FotoDestaque : "",
    fotoDestaquePequena: typeof raw.FotoDestaquePequena === "string" && raw.FotoDestaquePequena.startsWith("https://") ? raw.FotoDestaquePequena : null,
    fotos,
    fotosPorTipo,
    urlVideo: raw.URLVideo || null,
    videos: parseVideos(raw.Video),
    temTourVirtual: parseBool(raw.TemTourVirtual),
    exibirNoSite: parseBool(raw.ExibirNoSite),
    destaqueWeb: parseBool(raw.DestaqueWeb),
    superDestaqueWeb: parseBool(raw.SuperDestaqueWeb),
    lancamento: parseBool(raw.Lancamento),
    aceitaFinanciamento: parseBool(raw.AceitaFinanciamento),
    aceitaPermuta: parseBool(raw.AceitaPermuta),
    face: raw.Face || null,
    garagemTipo: raw.GaragemTipo || null,
    topografia: raw.Topografia || null,
    anoConstrucao: raw.AnoConstrucao || null,
    caracteristicas,
    infraestrutura,
    dataCadastro: raw.DataCadastro || null,
    dataAtualizacao: raw.DataAtualizacao || null,
  }
}

// ---------------------------------------------------------------------------
// Fetch all properties from API with parallel pagination
// ---------------------------------------------------------------------------

function extractProperties(data: Record<string, unknown>): LoftPropertyRaw[] {
  const results: LoftPropertyRaw[] = []
  for (const [key, value] of Object.entries(data)) {
    if (["total", "paginas", "pagina", "quantidade"].includes(key)) continue
    if (value && typeof value === "object" && "Codigo" in (value as Record<string, unknown>)) {
      results.push(value as LoftPropertyRaw)
    }
  }
  return results
}

// Cap defensivo: FYMOOB tem ~249 imoveis. 40 paginas de 50 = 2000, 8x margem.
// Sem o cap, bug no CRM (total inflado) + ISR regen = runaway Vercel cost.
const MAX_PAGES_SAFETY_CAP = 40

async function fetchAllPropertiesRaw(): Promise<Property[]> {
  // First request to get total count
  const firstPesquisa = JSON.stringify({
    fields: CARD_FIELDS,
    filter: { ExibirNoSite: "Sim" },
    paginacao: { pagina: 1, quantidade: PAGE_SIZE },
  })

  const firstData = await fetchLoftAPI<Record<string, unknown>>("/imoveis/listar", {
    pesquisa: firstPesquisa,
    showtotal: "1",
  })

  const total = (firstData.total as number) || 0
  const rawTotalPages = Math.ceil(total / PAGE_SIZE)
  const totalPages = Math.min(rawTotalPages, MAX_PAGES_SAFETY_CAP)
  if (rawTotalPages > MAX_PAGES_SAFETY_CAP) {
    console.warn(
      `[Loft] rawTotalPages=${rawTotalPages} excedeu cap de ${MAX_PAGES_SAFETY_CAP} ` +
      `(total reportado=${total}). Truncando — inspecione CRM.`
    )
  }
  const allRaw = extractProperties(firstData)

  // Fetch remaining pages in parallel (bounded)
  if (totalPages > 1) {
    const pagePromises = []
    for (let p = 2; p <= totalPages; p++) {
      const pesquisa = JSON.stringify({
        fields: CARD_FIELDS,
        filter: { ExibirNoSite: "Sim" },
        paginacao: { pagina: p, quantidade: PAGE_SIZE },
      })
      pagePromises.push(
        fetchLoftAPI<Record<string, unknown>>("/imoveis/listar", {
          pesquisa,
          showtotal: "1",
        })
      )
    }
    const pages = await Promise.all(pagePromises)
    for (const pageData of pages) {
      allRaw.push(...extractProperties(pageData))
    }
  }

  return allRaw.map(mapRawToProperty)
}

// Cached version using Next.js cache (persists across Vercel Lambdas).
// Tag "imoveis" permite invalidacao granular via POST /api/revalidate
// (ex: webhook pos-sync do CRM Loft/Vista, ou trigger manual do admin).
// Todas as ~12 funcoes publicas derivam deste cache via getAllPropertiesInternal,
// entao 1 tag = invalida tudo do catalogo sem tocar cache de photos/lead/etc.
const getCachedProperties = unstable_cache(
  fetchAllPropertiesRaw,
  ["fymoob-all-properties"],
  { revalidate: REVALIDATE_SECONDS, tags: ["imoveis"] }
)

// ---------------------------------------------------------------------------
// Get all properties (API only)
// ---------------------------------------------------------------------------

async function getAllPropertiesInternal(): Promise<Property[]> {
  if (!LOFT_API_KEY) {
    console.warn("[Loft] LOFT_API_KEY not set — returning empty list")
    return []
  }
  try {
    return await getCachedProperties()
  } catch (err) {
    // Loft indisponivel: degradar pra lista vazia em vez de 500 na pagina inteira.
    // unstable_cache ja servira o valor anterior enquanto houver cache valido;
    // esse catch protege o caso de primeiro acesso com Loft offline.
    console.error("[Loft] getCachedProperties failed — returning empty list:", err instanceof Error ? err.message : err)
    return []
  }
}

// ---------------------------------------------------------------------------
// Indexed property for fast filtering
// ---------------------------------------------------------------------------

interface IndexedProperty {
  property: Property
  bairroSlug: string
  cidadeSlug: string
  finalidadeSlug: string
  searchableText: string
  price: number | null
}

function indexProperties(properties: Property[]): IndexedProperty[] {
  return properties.map((property) => ({
    property,
    bairroSlug: slugify(property.bairro),
    cidadeSlug: slugify(property.cidade),
    finalidadeSlug: slugify(property.finalidade),
    searchableText: slugify(
      `${property.titulo} ${property.descricao} ${property.bairro} ${property.tipo} ${property.codigo}`
    ),
    price: property.precoVenda ?? property.precoAluguel,
  }))
}

// ---------------------------------------------------------------------------
// Apply filters (in-memory, same logic as before)
// ---------------------------------------------------------------------------

function applyFilters(indexed: IndexedProperty[], filters: PropertyFilters): Property[] {
  const bairroSlugSet =
    filters.bairros?.length
      ? new Set(filters.bairros.map((b) => slugify(b)))
      : filters.bairro
        ? new Set([slugify(filters.bairro)])
        : null
  const cidadeSlugSet =
    filters.cidades?.length
      ? new Set(filters.cidades.map((c) => slugify(c)))
      : filters.cidade
        ? new Set([slugify(filters.cidade)])
        : null
  const finalidadeSlugSetRaw =
    filters.finalidades?.length
      ? new Set(filters.finalidades.map((f) => slugify(f)))
      : filters.finalidade
        ? new Set([slugify(filters.finalidade)])
        : null
  // "Venda e Locação" properties should appear in both Comprar and Alugar results
  const finalidadeSlugSet = finalidadeSlugSetRaw
    ? (() => {
        const expanded = new Set(finalidadeSlugSetRaw)
        if (expanded.has("venda") || expanded.has("locacao")) {
          expanded.add("venda-e-locacao")
        }
        return expanded
      })()
    : null
  const tipoSet =
    filters.tipos?.length
      ? new Set(filters.tipos)
      : filters.tipo
        ? new Set([filters.tipo])
        : null
  const quartosMin = filters.quartosMin ?? filters.dormitoriosMin ?? null
  const codigo = filters.codigo?.trim().toLowerCase() ?? null
  const searchTerms = filters.busca
    ? slugify(filters.busca).split("-").filter(Boolean)
    : []

  const result: Property[] = []

  for (const item of indexed) {
    const p = item.property
    // NOTA: nao filtramos por p.disponivel aqui. A API ja aplica
    // ExibirNoSite=Sim (ver URL_PARAMS_LIST). Filtrar de novo por
    // um status derivado correria risco de sumir imoveis por engano
    // (valor do status vindo da API pode nao matchar lista exata).
    // O campo p.disponivel fica como metadata para features futuras.
    if (tipoSet && !tipoSet.has(p.tipo)) continue
    if (finalidadeSlugSet && !finalidadeSlugSet.has(item.finalidadeSlug)) continue
    if (bairroSlugSet && !bairroSlugSet.has(item.bairroSlug)) continue
    if (cidadeSlugSet && !cidadeSlugSet.has(item.cidadeSlug)) continue
    if (filters.empreendimento && p.empreendimento !== filters.empreendimento) continue
    if (filters.empreendimentos && filters.empreendimentos.length > 0) {
      if (!p.empreendimento || !filters.empreendimentos.includes(p.empreendimento)) continue
    }
    if (filters.lancamento !== undefined && p.lancamento !== filters.lancamento) continue
    if (codigo && !p.codigo.toLowerCase().includes(codigo)) continue
    if (filters.precoMin && (item.price === null || item.price < filters.precoMin)) continue
    if (filters.precoMax && (item.price === null || item.price > filters.precoMax)) continue
    if (quartosMin && (p.dormitorios === null || p.dormitorios < quartosMin)) continue
    if (filters.quartosMax && (p.dormitorios === null || p.dormitorios > filters.quartosMax)) continue
    if (filters.areaMin && (p.areaPrivativa === null || p.areaPrivativa < filters.areaMin)) continue
    if (filters.areaMax && (p.areaPrivativa === null || p.areaPrivativa > filters.areaMax)) continue
    if (filters.vagasMin && (p.vagas === null || p.vagas < filters.vagasMin)) continue
    if (filters.suitesMin && (p.suites === null || p.suites < filters.suitesMin)) continue
    if (filters.banheirosMin && (p.banheiros === null || p.banheiros < filters.banheirosMin)) continue
    if (filters.caracteristicasUnidade && filters.caracteristicasUnidade.length > 0) {
      const unitFeatures = new Set(p.caracteristicas)
      const hasAll = filters.caracteristicasUnidade.every((label) => unitFeatures.has(label))
      if (!hasAll) continue
    }
    if (filters.caracteristicasCondominio && filters.caracteristicasCondominio.length > 0) {
      const condoFeatures = new Set(p.infraestrutura)
      const hasAll = filters.caracteristicasCondominio.every((label) => condoFeatures.has(label))
      if (!hasAll) continue
    }
    if (searchTerms.length > 0 && !searchTerms.every((t) => item.searchableText.includes(t))) continue
    result.push(p)
  }

  // Default: "recente" (mais novos primeiro). "relevante" continua disponível
  // como opção explícita (?orderBy=relevante) — score composto em src/lib/property-relevance.ts.
  const effectiveOrder = filters.orderBy ?? "recente"
  switch (effectiveOrder) {
    case "preco-asc":
      result.sort((a, b) => (a.precoVenda ?? a.precoAluguel ?? 0) - (b.precoVenda ?? b.precoAluguel ?? 0))
      break
    case "preco-desc":
      result.sort((a, b) => (b.precoVenda ?? b.precoAluguel ?? 0) - (a.precoVenda ?? a.precoAluguel ?? 0))
      break
    case "area-asc":
      result.sort((a, b) => (a.areaPrivativa ?? 0) - (b.areaPrivativa ?? 0))
      break
    case "area-desc":
      result.sort((a, b) => (b.areaPrivativa ?? 0) - (a.areaPrivativa ?? 0))
      break
    case "recente":
      result.sort((a, b) => {
        const da = a.dataAtualizacao ?? a.dataCadastro
        const db = b.dataAtualizacao ?? b.dataCadastro
        if (!da && !db) return 0
        if (!da) return 1
        if (!db) return -1
        return db.localeCompare(da)
      })
      break
    case "relevante":
      return sortByRelevance(result)
  }

  return result
}

// ---------------------------------------------------------------------------
// Public API — same signatures as before
// ---------------------------------------------------------------------------

export async function getProperties(
  filters: PropertyFilters = {}
): Promise<{ properties: Property[]; total: number }> {
  const all = await getAllPropertiesInternal()
  const indexed = indexProperties(all)
  const filtered = applyFilters(indexed, filters)
  const page = filters.page ?? 1
  const limit = filters.limit ?? 20
  const start = (page - 1) * limit
  const paginated = filtered.slice(start, start + limit)

  return { properties: paginated, total: filtered.length }
}

export async function getPropertyBySlug(slug: string): Promise<Property | null> {
  // Extract property code from slug (last segment after final dash)
  const parts = slug.split("-")
  const codigo = parts[parts.length - 1]

  if (LOFT_API_KEY && codigo) {
    try {
      // Fetch property details and photos in parallel (2 small requests, not 250 properties)
      const [detailData, photoData] = await Promise.all([
        fetchLoftAPI<Record<string, unknown>>("/imoveis/detalhes", {
          imovel: codigo,
          pesquisa: JSON.stringify({ fields: DETAIL_FIELDS }),
        }),
        fetchLoftAPI<Record<string, unknown>>("/imoveis/detalhes", {
          imovel: codigo,
          pesquisa: JSON.stringify({ fields: ["Codigo", { Foto: ["Foto", "Ordem", "Tipo", "Descricao"] }] }),
        }),
      ])

      if (detailData && "Codigo" in detailData) {
        // Merge photo data into detail data
        const merged = { ...detailData, Foto: photoData?.Foto } as LoftPropertyRaw
        return mapRawToProperty(merged)
      }
    } catch {
      // Fallback to list search below
    }
  }

  // Fallback: search in all properties
  const all = await getAllPropertiesInternal()
  return all.find((p) => p.slug === slug) ?? null
}

export async function getPropertiesByBairro(bairro: string, limit?: number): Promise<Property[]> {
  const all = await getAllPropertiesInternal()
  const filtered = all.filter((p) => slugify(p.bairro) === slugify(bairro))
  return limit ? filtered.slice(0, limit) : filtered
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

// Agregação de dados de mercado por bairro — fonte: Loft API (tempo real).
// Usado na página /imoveis/[bairro] para mostrar stats no estilo Zillow.
export async function getBairroMarketStats(bairroSlug: string): Promise<BairroMarketStats | null> {
  const all = await getAllPropertiesInternal()
  const properties = all.filter((p) => slugify(p.bairro) === bairroSlug)
  if (properties.length === 0) return null

  const venda = properties.filter((p) => p.finalidade === "Venda" && p.precoVenda && p.precoVenda > 0)
  const aluguel = properties.filter((p) => p.finalidade === "Locação" && p.precoAluguel && p.precoAluguel > 0)

  const precosVenda = venda.map((p) => p.precoVenda!).filter((v) => v > 0)
  const precosAluguel = aluguel.map((p) => p.precoAluguel!).filter((v) => v > 0)
  const areasVenda = venda.map((p) => p.areaPrivativa).filter((v): v is number => v != null && v > 0)

  const precosM2 = venda
    .map((p) => {
      const area = p.areaPrivativa
      if (!area || area <= 0 || !p.precoVenda || p.precoVenda <= 0) return null
      return p.precoVenda / area
    })
    .filter((v): v is number => v != null && isFinite(v) && v > 0)

  // Preço médio por Nº de dormitórios (só venda para ser comparável)
  const porQuartosAcc = new Map<string, number[]>()
  for (const p of venda) {
    if (p.dormitorios == null || p.dormitorios <= 0) continue
    const key = p.dormitorios >= 5 ? "5+" : String(p.dormitorios)
    if (!porQuartosAcc.has(key)) porQuartosAcc.set(key, [])
    porQuartosAcc.get(key)!.push(p.precoVenda!)
  }
  const precoMedioPorQuartos: Record<string, number> = {}
  for (const [key, prices] of porQuartosAcc) {
    const m = avg(prices)
    if (m != null) precoMedioPorQuartos[key] = m
  }

  return {
    bairro: properties[0].bairro,
    slug: bairroSlug,
    totalAtivos: properties.length,
    totalVenda: venda.length,
    totalAluguel: aluguel.length,
    precoMedioVenda: avg(precosVenda),
    precoMedioAluguel: avg(precosAluguel),
    precoM2Medio: avg(precosM2),
    precoMinVenda: precosVenda.length > 0 ? Math.min(...precosVenda) : null,
    precoMaxVenda: precosVenda.length > 0 ? Math.max(...precosVenda) : null,
    areaMediaVenda: avg(areasVenda),
    precoMedioPorQuartos,
  }
}

export async function getPropertiesByType(tipo: PropertyType, limit?: number): Promise<Property[]> {
  const all = await getAllPropertiesInternal()
  const filtered = all.filter((p) => p.tipo === tipo)
  return limit ? filtered.slice(0, limit) : filtered
}

// Escolhe a grafia canonica entre variantes do mesmo nome (ex: "Sítio
// Cercado" vs "Sitio Cercado"). Regras de tiebreak, em ordem:
// 1) variante mais frequente no catalogo (reflete padrao Bruno usa mais)
// 2) variante com mais diacriticos (portugues correto tem acentos)
// 3) ordem alfabetica (determinismo)
function pickCanonicalLabel(variants: Map<string, number>): string {
  let best = ""
  let bestCount = -1
  let bestDiacritics = -1
  for (const [label, count] of variants) {
    const diacritics = (label.normalize("NFD").match(/[\u0300-\u036f]/g) || []).length
    const isBetter =
      count > bestCount ||
      (count === bestCount && diacritics > bestDiacritics) ||
      (count === bestCount && diacritics === bestDiacritics && label < best)
    if (best === "" || isBetter) {
      best = label
      bestCount = count
      bestDiacritics = diacritics
    }
  }
  return best
}

export async function getAllBairros(limit?: number): Promise<BairroSummary[]> {
  const all = await getAllPropertiesInternal()
  const { getBairroImage } = await import("@/lib/bairro-images")

  // Chave = slug do bairro (normalizado, sem acento) pra unificar grafias
  // inconsistentes no CRM (ex: "Sítio Cercado" = "Sitio Cercado"). Label
  // canonico escolhido depois via pickCanonicalLabel.
  const bairroMap = new Map<string, { variants: Map<string, number>; total: number; tipos: Map<PropertyType, number>; cidadeCount: Map<string, number>; finalidadeCount: Map<string, number>; quartosCount: Map<string, number>; fallbackPhoto: string | null }>()
  for (const p of all) {
    if (!p.bairro) continue
    const key = slugify(p.bairro)
    if (!bairroMap.has(key)) bairroMap.set(key, { variants: new Map(), total: 0, tipos: new Map(), cidadeCount: new Map(), finalidadeCount: new Map(), quartosCount: new Map(), fallbackPhoto: null })
    const entry = bairroMap.get(key)!
    entry.variants.set(p.bairro, (entry.variants.get(p.bairro) ?? 0) + 1)
    entry.total++
    entry.tipos.set(p.tipo, (entry.tipos.get(p.tipo) ?? 0) + 1)
    entry.cidadeCount.set(p.cidade, (entry.cidadeCount.get(p.cidade) ?? 0) + 1)
    const fin = p.finalidade || "Venda"
    entry.finalidadeCount.set(fin, (entry.finalidadeCount.get(fin) ?? 0) + 1)
    if (p.dormitorios != null && p.dormitorios > 0) {
      const qKey = p.dormitorios >= 5 ? "5+" : String(p.dormitorios)
      entry.quartosCount.set(qKey, (entry.quartosCount.get(qKey) ?? 0) + 1)
    }
    if (!entry.fallbackPhoto && p.fotoDestaque) entry.fallbackPhoto = p.fotoDestaque
  }

  const result = Array.from(bairroMap.entries())
    .map(([slug, info]) => {
      const bairro = pickCanonicalLabel(info.variants)
      // Pick the most common city for this bairro
      let topCidade = ""
      let topCount = 0
      for (const [cidade, count] of info.cidadeCount) {
        if (count > topCount) { topCidade = cidade; topCount = count }
      }
      return {
        bairro,
        slug,
        total: info.total,
        cidade: topCidade,
        tipos: Array.from(info.tipos.entries()).map(([tipo, count]) => ({ tipo, count })),
        porFinalidade: Object.fromEntries(info.finalidadeCount),
        porQuartos: Object.fromEntries(info.quartosCount),
        imageUrl: getBairroImage(bairro, info.fallbackPhoto),
      }
    })
    .sort((a, b) => b.total - a.total)

  return limit ? result.slice(0, limit) : result
}

// Taxonomia de caracteristicas/infra agregada por frequencia — usada pelos
// filtros de busca pra render dinamico (sem whitelist). Deriva de todos
// imoveis ativos via Caracteristicas + InfraEstrutura dos objects raw Loft.
// Cache via unstable_cache em getAllPropertiesInternal; revalidateTag
// "imoveis" propaga.
export async function getAllCaracteristicas() {
  const all = await getAllPropertiesInternal()
  const { aggregateCaracteristicas } = await import("./taxonomy")
  return aggregateCaracteristicas(all)
}

export async function getAllCities(): Promise<string[]> {
  const all = await getAllPropertiesInternal()
  // Agrega por slug pra unificar grafias inconsistentes no CRM
  // (ex: "São Paulo" vs "Sao Paulo" viram a mesma cidade). Label canonico
  // escolhido por frequencia + preferencia por diacriticos.
  const cityVariants = new Map<string, Map<string, number>>()
  for (const p of all) {
    if (!p.cidade) continue
    const key = slugify(p.cidade)
    if (!cityVariants.has(key)) cityVariants.set(key, new Map())
    const v = cityVariants.get(key)!
    v.set(p.cidade, (v.get(p.cidade) ?? 0) + 1)
  }
  return Array.from(cityVariants.values())
    .map((variants) => pickCanonicalLabel(variants))
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
}

// Variante de getAllBairros que NAO agrega bairros homonimos em cidades
// distintas (ex: "Centro" de Curitiba vs Araucaria permanecem entries
// separadas). Usada pelo autocomplete da busca para expor TODAS as cidades
// presentes no catalogo — senao cidades sem bairro exclusivo (ex: Araucaria
// se todos seus bairros existem tambem em Curitiba) somem do filtro.
//
// Nao substitui getAllBairros() porque rotas e metadata ainda esperam 1
// entry por slug (ex: /imoveis/centro aponta para uma pagina unica que
// agrega as duas cidades — comportamento atual mantido deliberadamente).
export async function getAllBairrosByCidade(): Promise<BairroSummary[]> {
  const all = await getAllPropertiesInternal()
  const { getBairroImage } = await import("@/lib/bairro-images")

  // Chave composta slug(cidade)|slug(bairro) — unifica variantes de grafia
  // (ex: "Sitio Cercado" e "Sítio Cercado" viram mesmo entry) e preserva
  // pares cidade+bairro distintos (ex: "Centro" de Curitiba vs Araucaria).
  const map = new Map<string, { bairroVariants: Map<string, number>; cidadeVariants: Map<string, number>; total: number; tipos: Map<PropertyType, number>; finalidadeCount: Map<string, number>; quartosCount: Map<string, number>; fallbackPhoto: string | null }>()
  for (const p of all) {
    if (!p.bairro) continue
    const key = `${slugify(p.cidade)}|${slugify(p.bairro)}`
    if (!map.has(key)) map.set(key, { bairroVariants: new Map(), cidadeVariants: new Map(), total: 0, tipos: new Map(), finalidadeCount: new Map(), quartosCount: new Map(), fallbackPhoto: null })
    const entry = map.get(key)!
    entry.bairroVariants.set(p.bairro, (entry.bairroVariants.get(p.bairro) ?? 0) + 1)
    entry.cidadeVariants.set(p.cidade, (entry.cidadeVariants.get(p.cidade) ?? 0) + 1)
    entry.total++
    entry.tipos.set(p.tipo, (entry.tipos.get(p.tipo) ?? 0) + 1)
    const fin = p.finalidade || "Venda"
    entry.finalidadeCount.set(fin, (entry.finalidadeCount.get(fin) ?? 0) + 1)
    if (p.dormitorios != null && p.dormitorios > 0) {
      const qKey = p.dormitorios >= 5 ? "5+" : String(p.dormitorios)
      entry.quartosCount.set(qKey, (entry.quartosCount.get(qKey) ?? 0) + 1)
    }
    if (!entry.fallbackPhoto && p.fotoDestaque) entry.fallbackPhoto = p.fotoDestaque
  }

  return Array.from(map.values())
    .map((info) => {
      const bairro = pickCanonicalLabel(info.bairroVariants)
      const cidade = pickCanonicalLabel(info.cidadeVariants)
      return {
        bairro,
        slug: slugify(bairro),
        total: info.total,
        cidade,
        tipos: Array.from(info.tipos.entries()).map(([tipo, count]) => ({ tipo, count })),
        porFinalidade: Object.fromEntries(info.finalidadeCount),
        porQuartos: Object.fromEntries(info.quartosCount),
        imageUrl: getBairroImage(bairro, info.fallbackPhoto),
      }
    })
    .sort((a, b) => b.total - a.total)
}

export async function getSimilarProperties(property: Property, limit: number = 4): Promise<Property[]> {
  const all = await getAllPropertiesInternal()
  const price = property.precoVenda ?? property.precoAluguel ?? 0
  const cidadeSlug = slugify(property.cidade || "")

  // HARD FILTERS (confirmado com Bruno em 18/04): similar deve SEMPRE bater
  // finalidade e cidade. Faixa de preco comeca estrita (±30%) e alarga
  // gradativamente se nao atingir 4 resultados. Referencia: erro tipico
  // de Zestimate/Redfin e ~7% e CMA profissional ~2-4%, entao ±30% e
  // a janela comum em recomendacoes de marketing imobiliario BR.
  const PRICE_TIERS = [
    { min: 0.7, max: 1.3 },   // ±30% — ideal (ticket coerente)
    { min: 0.5, max: 1.5 },   // ±50% — fallback 1 (bairro com poucos comps)
    { min: 0.2, max: 1.8 },   // ±80% — fallback final (catalogo muito raso)
  ]

  // Pre-filtra por finalidade + cidade (invariantes). Depois aplica tiers
  // de preco progressivos ate conseguir `limit` resultados.
  const sameCityAndFinalidade = all.filter((p) => {
    if (p.slug === property.slug) return false
    // Finalidade exata — dual property so bate com outro dual (mapeamento
    // em mapRawToProperty ja trata por ValorVenda/ValorLocacao).
    if (p.finalidade !== property.finalidade) return false
    // Cidade normalizada por slugify (resolve grafias inconsistentes CRM).
    if (slugify(p.cidade || "") !== cidadeSlug) return false
    return true
  })

  const scoreProperty = (p: Property) => {
    let score = 0
    if (p.tipo === property.tipo) score += 30
    if (p.bairro === property.bairro) score += 25
    if (property.dormitorios && p.dormitorios) {
      const diff = Math.abs(p.dormitorios - property.dormitorios)
      if (diff === 0) score += 15
      else if (diff === 1) score += 8
    }
    // Proximidade de preco premia quem esta mais perto do alvo
    const pPrice = p.precoVenda ?? p.precoAluguel ?? 0
    if (price > 0 && pPrice > 0) {
      const ratio = pPrice / price
      if (ratio >= 0.9 && ratio <= 1.1) score += 20       // ±10% (super proximo)
      else if (ratio >= 0.8 && ratio <= 1.2) score += 10  // ±20%
    }
    if (property.areaPrivativa && p.areaPrivativa) {
      const areaRatio = p.areaPrivativa / property.areaPrivativa
      if (areaRatio >= 0.7 && areaRatio <= 1.3) score += 10
      else if (areaRatio >= 0.5 && areaRatio <= 1.5) score += 5
    }
    return score
  }

  // Imovel alvo sem preco: nao filtra por faixa, usa direto ranking
  if (price <= 0) {
    return sameCityAndFinalidade
      .map((p) => ({ property: p, score: scoreProperty(p) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.property)
  }

  // Iterative price window — comeca ±30%, alarga se < limit
  for (const tier of PRICE_TIERS) {
    const inTier = sameCityAndFinalidade.filter((p) => {
      const pPrice = p.precoVenda ?? p.precoAluguel ?? 0
      if (pPrice <= 0) return false
      const ratio = pPrice / price
      return ratio >= tier.min && ratio <= tier.max
    })
    if (inTier.length >= limit) {
      return inTier
        .map((p) => ({ property: p, score: scoreProperty(p) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((s) => s.property)
    }
  }

  // Mesmo no tier mais amplo nao achou 4 — retorna o que tiver (catalogo
  // com pouquissimos imoveis naquela cidade+finalidade).
  const widest = sameCityAndFinalidade.filter((p) => {
    const pPrice = p.precoVenda ?? p.precoAluguel ?? 0
    if (pPrice <= 0) return false
    const { min, max } = PRICE_TIERS[PRICE_TIERS.length - 1]
    const ratio = pPrice / price
    return ratio >= min && ratio <= max
  })
  return widest
    .map((p) => ({ property: p, score: scoreProperty(p) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.property)
}

export async function getAllSlugs(): Promise<string[]> {
  const all = await getAllPropertiesInternal()
  return all.map((p) => p.slug)
}

// Slug + imagens por imovel — usado pelo sitemap pra incluir fotos no
// shard 0 (sitemap image extension). Google Search Console reconhece
// imagens do sitemap pra indexacao em Google Imagens, fortalecendo
// visibilidade dos imoveis em buscas visuais.
export async function getAllPropertySitemapData(): Promise<
  { slug: string; fotoDestaque: string | null; fotos: string[] }[]
> {
  const all = await getAllPropertiesInternal()
  return all.map((p) => ({
    slug: p.slug,
    fotoDestaque: p.fotoDestaque || null,
    fotos: p.fotos.slice(0, 5), // max 5 fotos por URL (cap recomendado Google)
  }))
}

export async function getAllTypes(): Promise<TypeSummary[]> {
  const all = await getAllPropertiesInternal()
  const typeMap = new Map<PropertyType, { total: number; porFinalidade: Map<string, number> }>()
  for (const p of all) {
    if (!typeMap.has(p.tipo)) typeMap.set(p.tipo, { total: 0, porFinalidade: new Map() })
    const entry = typeMap.get(p.tipo)!
    entry.total++
    const fin = p.finalidade || "Venda"
    entry.porFinalidade.set(fin, (entry.porFinalidade.get(fin) ?? 0) + 1)
  }
  return Array.from(typeMap.entries()).map(([tipo, info]) => ({
    tipo,
    slug: slugify(tipo),
    total: info.total,
    porFinalidade: Object.fromEntries(info.porFinalidade),
  }))
}

export async function getFeaturedProperties(limit: number = 8): Promise<Property[]> {
  if (LOFT_API_KEY) {
    try {
      const pesquisa = JSON.stringify({
        fields: CARD_FIELDS,
      })
      const data = await fetchLoftAPI<Record<string, unknown>>("/imoveis/destaques", { pesquisa })

      const featured: Property[] = []
      for (const [, value] of Object.entries(data)) {
        if (value && typeof value === "object" && "Codigo" in (value as Record<string, unknown>)) {
          featured.push(mapRawToProperty(value as LoftPropertyRaw))
        }
      }
      return featured.slice(0, limit)
    } catch {
      // Fallback below
    }
  }

  const all = await getAllPropertiesInternal()
  const withPhotos = all.filter((p) => p.fotoDestaque && p.fotos.length > 0)
  return withPhotos.slice(0, limit)
}

export async function getPropertyStats(): Promise<PropertyStats> {
  const all = await getAllPropertiesInternal()
  const precos = all
    .map((p) => p.precoVenda ?? p.precoAluguel)
    .filter((p): p is number => p !== null && p > 0)

  const tipoMap = new Map<PropertyType, number>()
  for (const p of all) tipoMap.set(p.tipo, (tipoMap.get(p.tipo) ?? 0) + 1)

  return {
    total: all.length,
    precoMin: precos.length > 0 ? Math.min(...precos) : null,
    precoMax: precos.length > 0 ? Math.max(...precos) : null,
    porTipo: Array.from(tipoMap.entries()).map(([tipo, count]) => ({ tipo, count })),
  }
}

// ---------------------------------------------------------------------------
// New: Empreendimentos
// ---------------------------------------------------------------------------

export async function getAllEmpreendimentos(): Promise<EmpreendimentoSummary[]> {
  const all = await getAllPropertiesInternal()

  // Agrupa por SLUG (nao por nome literal) — assim variacoes de grafia no
  // CRM ("Vitória Régia" vs "Vitoria Regia") que slugificam pro mesmo valor
  // viram um unico empreendimento. Antes geravam 2 cards apontando pra
  // mesma URL + erro React de chave duplicada na pagina /empreendimentos
  // (incidente 08/05/2026 com slug "vitoria-regia"). Pra cada bucket, o
  // nome canonico e o que aparece com MAIS imoveis (frequencia decide).
  const slugMap = new Map<string, { properties: Property[]; nameCounts: Map<string, number> }>()

  for (const p of all) {
    if (!p.empreendimento) continue
    const slug = slugify(p.empreendimento)
    if (!slug) continue
    let bucket = slugMap.get(slug)
    if (!bucket) {
      bucket = { properties: [], nameCounts: new Map() }
      slugMap.set(slug, bucket)
    }
    bucket.properties.push(p)
    bucket.nameCounts.set(
      p.empreendimento,
      (bucket.nameCounts.get(p.empreendimento) ?? 0) + 1,
    )
  }

  return Array.from(slugMap.entries())
    .map(([slug, { properties, nameCounts }]) => {
      const precos = properties
        .map((p) => p.precoVenda ?? p.precoAluguel)
        .filter((p): p is number => p !== null && p > 0)
      const bairros = [...new Set(properties.map((p) => p.bairro).filter(Boolean))]
      // Nome canonico = grafia mais frequente. Em empate, primeira encontrada.
      const nome = [...nameCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]

      return {
        nome,
        slug,
        total: properties.length,
        construtora: properties.find((p) => p.construtora)?.construtora ?? null,
        bairros,
        imageUrl: properties[0]?.fotoDestaque || null,
        precoMin: precos.length > 0 ? Math.min(...precos) : null,
        precoMax: precos.length > 0 ? Math.max(...precos) : null,
      }
    })
    .filter((e) => e.nome.trim() !== "")
    .sort((a, b) => b.total - a.total)
}

export async function getPropertiesByEmpreendimento(empreendimento: string): Promise<Property[]> {
  const all = await getAllPropertiesInternal()
  return all.filter((p) => p.empreendimento === empreendimento)
}
