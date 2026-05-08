import type { Property } from "@/types/property"

/**
 * Sprint design 06/05/2026 — S1 + S4 + S5.
 * Helpers editoriais pro layout magazine das unidades.
 */

// ────────────────────────── S1: Title editorial ──────────────────────────

/**
 * Mapeia tipo bruto do CRM pra label editorial curto.
 * Substitui titulos longos do CRM ("[REVENDA] Reserva Lago - Duplex 2 quartos
 * a venda no Mossungue") por labels editoriais ("Duplex"). Bairro e torre
 * ja estao no contexto da pagina — nao precisam estar no titulo de cada card.
 */
const TYPE_LABEL: Record<string, string> = {
  "Apartamento Duplex": "Duplex",
  "Cobertura": "Cobertura",
  "Studio": "Studio",
  "Sala Comercial": "Sala corporativa",
  "Salas/Conjuntos": "Sala corporativa",
  "Loja": "Loja",
  "Apartamento": "Apartamento",
  "Casa": "Casa",
  "Casa em Condomínio": "Casa em condomínio",
  "Sobrado": "Sobrado",
  "Kitnet": "Kitnet",
  "Ponto Comercial": "Ponto comercial",
  "Prédio Comercial": "Prédio corporativo",
  "Terreno": "Terreno",
  "Terreno Comercial": "Terreno comercial",
  "Chácara": "Chácara",
}

export function getEditorialTitle(property: Property): string {
  const tipo = (property.tipo || "").trim()
  return TYPE_LABEL[tipo] || tipo || "Unidade"
}

/**
 * Subtitulo editorial: torre + area. "Reserva Lago · 116 m²".
 * Quando torreNome nao e passado, retorna so a area. Quando area nao
 * existe, retorna so a torre. Strings vazias sao filtradas.
 */
export function getEditorialSubtitle(
  property: Property,
  torreNome?: string,
): string {
  const area = property.areaPrivativa ?? property.areaTotal
  const parts: string[] = []
  if (torreNome) parts.push(torreNome)
  if (area) parts.push(`${Math.round(area)} m²`)
  return parts.join(" · ")
}

// ────────────────────────── S4: Row accolade ──────────────────────────

export type RowAccolade =
  | "most-affordable"
  | "largest-area"
  | "biggest-bedrooms"
  | null

/**
 * Calcula raridade/destaque editorial de cada row pra dar hierarquia
 * a tabela. So 1 row pode receber cada accolade por torre.
 *
 * Prioridade: more-affordable > largest-area > biggest-bedrooms (1 por row).
 *
 * Regras:
 * - 'most-affordable': menor preco da torre (e tem >=2 imoveis)
 * - 'largest-area':    maior area da torre (e tem >=2 imoveis)
 * - 'biggest-bedrooms': mais quartos da torre, se >= 4 (raridade)
 */
export function getRowAccolade(
  property: Property,
  siblings: Property[],
): RowAccolade {
  if (siblings.length < 2) return null

  // Mais acessivel
  const validPrices = siblings
    .map((p) => p.precoVenda)
    .filter((p): p is number => p !== null && p > 0)
  if (validPrices.length >= 2) {
    const minPrice = Math.min(...validPrices)
    if (property.precoVenda === minPrice) return "most-affordable"
  }

  // Maior area
  const validAreas = siblings
    .map((p) => p.areaPrivativa ?? p.areaTotal ?? 0)
    .filter((a) => a > 0)
  if (validAreas.length >= 2) {
    const maxArea = Math.max(...validAreas)
    const propArea = property.areaPrivativa ?? property.areaTotal ?? 0
    if (propArea === maxArea) return "largest-area"
  }

  // Mais quartos (so se >= 4)
  const validBedrooms = siblings
    .map((p) => p.dormitorios ?? 0)
    .filter((b) => b > 0)
  if (validBedrooms.length >= 2) {
    const maxBedrooms = Math.max(...validBedrooms)
    if (maxBedrooms >= 4 && property.dormitorios === maxBedrooms) {
      return "biggest-bedrooms"
    }
  }

  return null
}

export function getRowAccoladeLabel(accolade: RowAccolade): string | null {
  if (accolade === "most-affordable") return "Mais acessível"
  if (accolade === "largest-area") return "Maior área"
  if (accolade === "biggest-bedrooms") return "Mais quartos"
  return null
}

// ────────────────────────── S5: Torre accent ──────────────────────────

export interface TorreAccent {
  /** Cor principal — usada em caption, linhas, accents */
  color: string
  /** Versao 8% transparente — usada em bg sutil de chips/hover */
  bgSoft: string
  /** Versao 40% transparente — usada em borders */
  borderSoft: string
}

/**
 * Cor signature por torre dentro do hub Reserva Barigui. Diferentes torres
 * ganham accent distinto pra criar identidade propria no flow editorial.
 *
 * - Lago    -> Dourado warm (natureza/parque, palette do hub)
 * - Colina  -> Bronze profundo (elegancia residencial premium)
 * - Mirante -> Verdigris / cobre oxidado (corporativo, mas vivo —
 *              historia: cinza puro #6b7280 ficou desbotado vs gold/bronze;
 *              tentativa 08/05/2026 com #475569 slate-petroleo ainda lia
 *              como "cinza" porque slate tem chroma muito baixa.
 *              Fix 08/05/2026 v2: #4f7368 (verdigris/cobre oxidado).
 *              Hue 165 distinto de gold (75) e bronze (40), saturacao
 *              ~3x maior que slate, mantem familia "metal patinado"
 *              coerente com o resto do hub — Aman/Bulgari aesthetic.)
 *
 * Hubs sem mapping registrado caem no default dourado (paleta padrao da
 * pagina de empreendimento). Aceitar chave por nome curto (lago/colina/
 * mirante) — output do `getTorreShortSlug`.
 */
const TORRE_ACCENTS: Record<string, TorreAccent> = {
  lago: {
    color: "#c9a876",
    bgSoft: "rgba(201, 168, 118, 0.08)",
    borderSoft: "rgba(201, 168, 118, 0.4)",
  },
  colina: {
    color: "#8b6f47",
    bgSoft: "rgba(139, 111, 71, 0.08)",
    borderSoft: "rgba(139, 111, 71, 0.4)",
  },
  mirante: {
    color: "#4f7368",
    bgSoft: "rgba(79, 115, 104, 0.10)",
    borderSoft: "rgba(79, 115, 104, 0.45)",
  },
}

const DEFAULT_ACCENT: TorreAccent = TORRE_ACCENTS.lago

export function getTorreAccent(torreShortSlug?: string): TorreAccent {
  if (!torreShortSlug) return DEFAULT_ACCENT
  return TORRE_ACCENTS[torreShortSlug] ?? DEFAULT_ACCENT
}
