/**
 * State do wizard estilo Imovelweb. 4 estagios:
 *   1. Principais (3 sub-passos: Tipo, Localizacao, Caracteristicas)
 *   2. Multimidia (fotos)
 *   3. Extras (descricao + amenities)
 *   4. Anunciar (contato + LGPD + envio)
 *
 * Cada sub-step mexe num subset; orchestrator mantem state inteiro em
 * localStorage (auto-save).
 */

export type AnuncieMode = "venda" | "locacao"

export type PropertyTypeOption =
  | "Apartamento"
  | "Casa"
  | "Sobrado"
  | "Cobertura"
  | "Studio"
  | "Sala Comercial"
  | "Terreno"

/** Subtipos opcionais — refinam o tipo principal (espelha CRM Loft). */
export const SUBTIPOS_BY_TIPO: Record<PropertyTypeOption, string[]> = {
  Apartamento: ["Padrão", "Garden", "Duplex", "Triplex", "Kitnet"],
  Casa: ["Térrea", "Sobrado", "Casa em condomínio"],
  Sobrado: ["Padrão", "Em condomínio"],
  Cobertura: ["Padrão", "Duplex"],
  Studio: ["Padrão", "Loft"],
  "Sala Comercial": ["Padrão", "Conjunto", "Loja"],
  Terreno: ["Residencial", "Comercial", "Industrial"],
}

export type IdadeImovel = "lancamento" | "construcao" | "usado" | ""

export interface WizardState {
  // Stage 1.1 — Operacao + Tipo
  operacao: AnuncieMode
  tipo: PropertyTypeOption | ""
  subtipo: string

  // Stage 1.2 — Localizacao
  cep: string
  cidade: string
  bairro: string
  rua: string
  numero: string
  complemento: string
  /** Coordenadas geográficas — preenchidas via BrasilAPI ou drag do pin */
  latitude: number | null
  longitude: number | null
  /** "exata" mostra pin no mapa de busca; "aproximada" mostra só o bairro */
  precisaoLocalizacao: "exata" | "aproximada"

  // Stage 1.3 — Caracteristicas
  quartos: number
  banheiros: number
  suites: number
  vagas: number
  andar: string // so apto/cobertura
  areaUtil: string
  areaTotal: string
  idade: IdadeImovel
  anosUso: string // so quando idade = "usado"
  valor: string
  condominio: string
  iptu: string
  semValor: boolean

  // Stage 2 — Multimidia
  fotos: string[]

  // Stage 3 — Extras
  descricao: string
  amenities: string[] // ex: ["Piscina", "Churrasqueira"]

  // Stage 4 — Anunciar
  nome: string
  email: string
  fone: string
  consentLGPD: boolean
}

export const initialWizardState: WizardState = {
  operacao: "venda",
  tipo: "",
  subtipo: "",
  cep: "",
  cidade: "",
  bairro: "",
  rua: "",
  numero: "",
  complemento: "",
  latitude: null,
  longitude: null,
  precisaoLocalizacao: "exata",
  quartos: 2,
  banheiros: 1,
  suites: 0,
  vagas: 1,
  andar: "",
  areaUtil: "",
  areaTotal: "",
  idade: "",
  anosUso: "",
  valor: "",
  condominio: "",
  iptu: "",
  semValor: false,
  fotos: [],
  descricao: "",
  amenities: [],
  nome: "",
  email: "",
  fone: "",
  consentLGPD: false,
}

export const TIPOS_VENDA: PropertyTypeOption[] = [
  "Apartamento",
  "Casa",
  "Sobrado",
  "Cobertura",
  "Studio",
  "Sala Comercial",
  "Terreno",
]

export const TIPOS_LOCACAO: PropertyTypeOption[] = [
  "Apartamento",
  "Casa",
  "Sobrado",
  "Cobertura",
  "Studio",
  "Sala Comercial",
]

export const AMENITIES_OPTIONS = [
  "Piscina",
  "Churrasqueira",
  "Academia",
  "Salão de festas",
  "Playground",
  "Quadra esportiva",
  "Sauna",
  "Espaço gourmet",
  "Coworking",
  "Pet place",
  "Bicicletário",
  "Portaria 24h",
  "Elevador",
  "Aquecimento solar",
  "Ar-condicionado",
  "Mobiliado",
] as const

export type StageKey = "principais" | "multimidia" | "extras" | "anunciar"

export const STAGES: { key: StageKey; label: string }[] = [
  { key: "principais", label: "Principais" },
  { key: "multimidia", label: "Multimídia" },
  { key: "extras", label: "Extras" },
  { key: "anunciar", label: "Anunciar" },
]

export type Stage1SubKey = "tipo" | "localizacao" | "caracteristicas"

export const STAGE1_SUBS: { key: Stage1SubKey; label: string }[] = [
  { key: "tipo", label: "Operação e tipo de imóvel" },
  { key: "localizacao", label: "Localização" },
  { key: "caracteristicas", label: "Características" },
]
