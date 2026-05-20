"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { MapPin, Ruler, Loader2, Building2, Square, Hammer, Calendar, Sparkles, Eye, EyeOff } from "lucide-react"
import { useViaCEP } from "../../_hooks/useViaCEP"
import { useGoogleGeocoder } from "../../_hooks/useGoogleGeocoder"
import { Stepper } from "../Stepper"

const LocationMap = dynamic(() => import("../LocationMap").then((m) => m.LocationMap), {
  ssr: false,
})
import {
  TIPOS_VENDA,
  TIPOS_LOCACAO,
  SUBTIPOS_BY_TIPO,
  type AnuncieMode,
  type PropertyTypeOption,
  type Stage1SubKey,
  type IdadeImovel,
  type WizardState,
} from "../types"

interface Props {
  mode: AnuncieMode
  sub: Stage1SubKey
  state: WizardState
  update: (patch: Partial<WizardState>) => void
}

function tiposFor(op: AnuncieMode): PropertyTypeOption[] {
  return op === "venda" ? TIPOS_VENDA : TIPOS_LOCACAO
}

export function StagePrincipais({ mode, sub, state, update }: Props) {
  if (sub === "tipo") return <SubTipo mode={mode} state={state} update={update} />
  if (sub === "localizacao") return <SubLocalizacao state={state} update={update} />
  return <SubCaracteristicas state={state} update={update} />
}

// ----------------------------------------------------------------------
// Sub 1.1 — Operacao + Tipo + Subtipo
// ----------------------------------------------------------------------

function SubTipo({
  state,
  update,
}: {
  mode: AnuncieMode
  state: WizardState
  update: (patch: Partial<WizardState>) => void
}) {
  const tipos = state.operacao === "venda" ? TIPOS_VENDA : TIPOS_LOCACAO
  const subtipos = state.tipo ? SUBTIPOS_BY_TIPO[state.tipo] : []

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-fymoob-gray-dark">
        Vamos começar! O que você quer fazer?
      </h2>
      <p className="mt-1 text-sm text-fymoob-gray-mid">
        Você pode trocar a qualquer momento.
      </p>

      <div className="mt-5">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-fymoob-gray-mid">
          Tipo de operação
        </span>
        <div className="inline-flex rounded-full border border-neutral-300 bg-neutral-50 p-1">
          {(["venda", "locacao"] as const).map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => update({ operacao: op, tipo: state.tipo && tiposFor(op).includes(state.tipo) ? state.tipo : "" })}
              className={[
                "rounded-full px-5 py-1.5 text-sm font-semibold transition",
                state.operacao === op
                  ? "bg-brand-primary text-white shadow-sm"
                  : "text-fymoob-gray-mid hover:text-fymoob-gray-dark",
              ].join(" ")}
            >
              {op === "venda" ? "Venda" : "Aluguel"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7">
        <label className="mb-2 block text-sm font-medium text-fymoob-gray-dark">
          Tipo de imóvel <span className="text-red-500">*</span>
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
          {tipos.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => update({ tipo: t, subtipo: "" })}
              className={[
                "rounded-lg border px-3 py-3 text-sm font-medium transition",
                state.tipo === t
                  ? "border-brand-primary bg-brand-primary/5 text-brand-primary"
                  : "border-neutral-300 bg-white text-fymoob-gray-dark hover:border-brand-primary/40",
              ].join(" ")}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {subtipos.length > 0 && (
        <div className="mt-5">
          <label htmlFor="subtipo" className="mb-2 block text-sm font-medium text-fymoob-gray-dark">
            Subtipo
          </label>
          <select
            id="subtipo"
            value={state.subtipo}
            onChange={(e) => update({ subtipo: e.target.value })}
            className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm text-fymoob-gray-dark focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          >
            <option value="">Selecione o subtipo</option>
            {subtipos.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

export function subTipoIsValid(state: WizardState): boolean {
  return Boolean(state.tipo)
}

// ----------------------------------------------------------------------
// Sub 1.2 — Localizacao (CEP + endereco)
// ----------------------------------------------------------------------

function formatCEP(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

function SubLocalizacao({
  state,
  update,
}: {
  state: WizardState
  update: (patch: Partial<WizardState>) => void
}) {
  const { lookup, loading, error } = useViaCEP()
  const { geocode: geocodeViaGoogle, ready: geocoderReady } = useGoogleGeocoder()
  const [searched, setSearched] = useState(false)

  async function buscarCEP() {
    const digits = state.cep.replace(/\D/g, "")
    if (digits.length !== 8) return
    setSearched(true)
    const data = await lookup(digits)
    if (!data) return

    // Tenta refinar coords com Google Geocoder client-side se disponivel —
    // muito mais preciso que o fallback Nominatim do useViaCEP.
    let coords: { lat: number; lng: number } | null = null
    if (geocoderReady) {
      coords = await geocodeViaGoogle({
        rua: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        uf: data.uf,
      })
    }

    update({
      cidade: data.localidade || state.cidade,
      bairro: data.bairro || state.bairro,
      rua: data.logradouro || state.rua,
      ...(coords
        ? { latitude: coords.lat, longitude: coords.lng }
        : data.latitude && data.longitude
          ? { latitude: data.latitude, longitude: data.longitude }
          : {}),
    })
  }

  /**
   * Re-geocoda incluindo o numero da rua quando o usuario sai do campo.
   * Coordenadas ficam muito mais precisas (rua+numero vs centroide do bairro).
   */
  async function refinarCoordsComNumero() {
    if (!geocoderReady) return
    if (!state.rua || !state.bairro || !state.cidade || !state.numero.trim()) return
    const coords = await geocodeViaGoogle({
      rua: state.rua,
      numero: state.numero,
      bairro: state.bairro,
      cidade: state.cidade,
    })
    if (coords) {
      update({ latitude: coords.lat, longitude: coords.lng })
    }
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-fymoob-gray-dark">
        Onde está localizado seu imóvel?
      </h2>
      <p className="mt-1 text-sm text-fymoob-gray-mid">
        Informe o CEP — preenchemos cidade, bairro e rua automaticamente.
      </p>

      <div className="mt-5">
        <label htmlFor="cep" className="mb-1.5 block text-sm font-medium text-fymoob-gray-dark">
          CEP <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            id="cep"
            name="cep"
            type="text"
            required
            inputMode="numeric"
            value={state.cep}
            onChange={(e) => update({ cep: formatCEP(e.target.value) })}
            onBlur={buscarCEP}
            placeholder="00000-000"
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 text-sm text-fymoob-gray-dark placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
          <button
            type="button"
            onClick={buscarCEP}
            disabled={state.cep.replace(/\D/g, "").length !== 8 || loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-primary px-4 py-2.5 text-sm font-semibold text-brand-primary transition hover:bg-brand-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
            Pesquisar
          </button>
        </div>
        {searched && error && (
          <p className="mt-1.5 text-xs text-red-600">CEP não encontrado — preencha os campos manualmente.</p>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="rua" className="mb-1.5 block text-sm font-medium text-fymoob-gray-dark">
            Endereço <span className="text-red-500">*</span>
          </label>
          <input
            id="rua"
            type="text"
            required
            value={state.rua}
            onChange={(e) => update({ rua: e.target.value })}
            placeholder="Insira a rua"
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-fymoob-gray-dark placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>
        <div>
          <label htmlFor="numero" className="mb-1.5 block text-sm font-medium text-fymoob-gray-dark">
            Número <span className="text-red-500">*</span>
          </label>
          <input
            id="numero"
            type="text"
            inputMode="numeric"
            required
            value={state.numero}
            onChange={(e) => update({ numero: e.target.value })}
            onBlur={refinarCoordsComNumero}
            placeholder="Ex: 1234"
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-fymoob-gray-dark placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>
        <div>
          <label htmlFor="complemento" className="mb-1.5 block text-sm font-medium text-fymoob-gray-dark">
            Complemento
          </label>
          <input
            id="complemento"
            type="text"
            value={state.complemento}
            onChange={(e) => update({ complemento: e.target.value })}
            placeholder="Ex: apto 502, bloco B"
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-fymoob-gray-dark placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>
        <div>
          <label htmlFor="cidade" className="mb-1.5 block text-sm font-medium text-fymoob-gray-dark">
            Cidade <span className="text-red-500">*</span>
          </label>
          <input
            id="cidade"
            type="text"
            required
            value={state.cidade}
            onChange={(e) => update({ cidade: e.target.value })}
            placeholder="Curitiba"
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-fymoob-gray-dark placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>
        <div>
          <label htmlFor="bairro" className="mb-1.5 block text-sm font-medium text-fymoob-gray-dark">
            Bairro <span className="text-red-500">*</span>
          </label>
          <input
            id="bairro"
            type="text"
            required
            value={state.bairro}
            onChange={(e) => update({ bairro: e.target.value })}
            placeholder="Ex: Batel"
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-fymoob-gray-dark placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>
      </div>

      {state.latitude !== null && state.longitude !== null && (
        <div className="mt-7">
          <h3 className="font-semibold text-fymoob-gray-dark">Como gostaria de mostrar a sua localização?</h3>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
            {(
              [
                { v: "exata" as const, label: "Exata", icon: Eye, desc: "Pin no endereço" },
                { v: "aproximada" as const, label: "Aproximada", icon: EyeOff, desc: "Só o bairro" },
              ]
            ).map((opt) => {
              const Icon = opt.icon
              const isOn = state.precisaoLocalizacao === opt.v
              return (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => update({ precisaoLocalizacao: opt.v })}
                  className={[
                    "flex flex-1 items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition sm:flex-none",
                    isOn
                      ? "border-brand-primary bg-brand-primary/5 text-brand-primary"
                      : "border-neutral-300 bg-white text-fymoob-gray-dark hover:border-brand-primary/40",
                  ].join(" ")}
                >
                  <Icon className="size-4" />
                  <span>
                    <span className="block font-semibold">{opt.label}</span>
                    <span className="block text-[11px] text-fymoob-gray-mid">{opt.desc}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-4">
            <LocationMap
              latitude={state.latitude}
              longitude={state.longitude}
              onChange={(lat, lng) => update({ latitude: lat, longitude: lng })}
            />
          </div>

          {state.precisaoLocalizacao === "aproximada" && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              ⚠️ Ao selecionar &ldquo;Aproximada&rdquo; seu imóvel não aparecerá no mapa de busca —
              só o nome do bairro. Use se quiser preservar privacidade do endereço exato.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function subLocalizacaoIsValid(state: WizardState): boolean {
  return Boolean(
    state.cep.replace(/\D/g, "").length === 8 &&
      state.cidade.trim() &&
      state.bairro.trim() &&
      state.rua.trim() &&
      state.numero.trim(),
  )
}

// ----------------------------------------------------------------------
// Sub 1.3 — Caracteristicas (quartos/banheiros/area/valor/idade)
// ----------------------------------------------------------------------

function formatMoney(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (!digits) return ""
  return Number(digits).toLocaleString("pt-BR")
}

function SubCaracteristicas({
  state,
  update,
}: {
  state: WizardState
  update: (patch: Partial<WizardState>) => void
}) {
  const isApto = state.tipo === "Apartamento" || state.tipo === "Cobertura" || state.tipo === "Studio"
  const isTerreno = state.tipo === "Terreno"
  const valorLabel = state.operacao === "venda" ? "Valor do imóvel" : "Aluguel mensal"

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-fymoob-gray-dark">
        Características principais
      </h2>
      <p className="mt-1 text-sm text-fymoob-gray-mid">
        Conte-nos um pouco mais sobre o seu imóvel.
      </p>

      {!isTerreno && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Stepper
            id="quartos"
            label="Quartos (opcional)"
            value={state.quartos}
            onChange={(v) => update({ quartos: v })}
            max={20}
          />
          <Stepper
            id="banheiros"
            label="Banheiros (opcional)"
            value={state.banheiros}
            onChange={(v) => update({ banheiros: v })}
            max={20}
          />
          <Stepper
            id="suites"
            label="Suítes (opcional)"
            value={state.suites}
            onChange={(v) => update({ suites: v })}
            max={10}
          />
          <Stepper
            id="vagas"
            label="Vagas de garagem (opcional)"
            value={state.vagas}
            onChange={(v) => update({ vagas: v })}
            max={20}
          />
        </div>
      )}

      {isApto && (
        <div className="mt-5">
          <label htmlFor="andar" className="mb-1.5 block text-sm font-medium text-fymoob-gray-dark">
            Andar (opcional)
          </label>
          <input
            id="andar"
            type="text"
            inputMode="numeric"
            value={state.andar}
            onChange={(e) => update({ andar: e.target.value })}
            placeholder="Ex: 12"
            className="w-full max-w-xs rounded-lg border border-neutral-300 px-4 py-3 text-sm text-fymoob-gray-dark placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>
      )}

      <div className="mt-7">
        <h3 className="flex items-center gap-1.5 text-base font-bold text-fymoob-gray-dark">
          <Square className="size-4 text-brand-primary" />
          Área
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="areaUtil" className="mb-1.5 block text-sm font-medium text-fymoob-gray-dark">
              Área útil (m²) <span className="text-red-500">*</span>
            </label>
            <input
              id="areaUtil"
              type="text"
              inputMode="numeric"
              required
              value={state.areaUtil}
              onChange={(e) => update({ areaUtil: e.target.value.replace(/\D/g, "") })}
              placeholder="Ex: 75"
              className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-fymoob-gray-dark placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>
          <div>
            <label htmlFor="areaTotal" className="mb-1.5 block text-sm font-medium text-fymoob-gray-dark">
              Área total (m²) (opcional)
            </label>
            <input
              id="areaTotal"
              type="text"
              inputMode="numeric"
              value={state.areaTotal}
              onChange={(e) => update({ areaTotal: e.target.value.replace(/\D/g, "") })}
              placeholder="Ex: 120"
              className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-fymoob-gray-dark placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>
        </div>
      </div>

      {!isTerreno && (
        <div className="mt-7">
          <h3 className="flex items-center gap-1.5 text-base font-bold text-fymoob-gray-dark">
            <Calendar className="size-4 text-brand-primary" />
            Idade do imóvel
          </h3>
          <div className="mt-3 space-y-2">
            {(
              [
                { v: "lancamento" as const, label: "Breve lançamento", icon: Sparkles },
                { v: "construcao" as const, label: "Em construção", icon: Hammer },
                { v: "usado" as const, label: "Anos de uso", icon: Building2 },
              ]
            ).map((opt) => {
              const Icon = opt.icon
              const isOn = state.idade === opt.v
              return (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => update({ idade: opt.v })}
                  className={[
                    "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition",
                    isOn
                      ? "border-brand-primary bg-brand-primary/5 text-brand-primary"
                      : "border-neutral-300 bg-white text-fymoob-gray-dark hover:border-brand-primary/40",
                  ].join(" ")}
                >
                  <Icon className="size-4" />
                  <span className="font-medium">{opt.label}</span>
                </button>
              )
            })}
          </div>
          {state.idade === "usado" && (
            <div className="mt-3 max-w-xs">
              <label htmlFor="anosUso" className="mb-1.5 block text-sm font-medium text-fymoob-gray-dark">
                Quantos anos? (opcional)
              </label>
              <input
                id="anosUso"
                type="text"
                inputMode="numeric"
                value={state.anosUso}
                onChange={(e) => update({ anosUso: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                placeholder="Ex: 5"
                className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-fymoob-gray-dark placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>
          )}
        </div>
      )}

      <div className="mt-7">
        <h3 className="flex items-center gap-1.5 text-base font-bold text-fymoob-gray-dark">
          <Ruler className="size-4 text-brand-primary" />
          Valor
        </h3>
        <label className="mt-3 flex items-start gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-fymoob-gray-dark">
          <input
            type="checkbox"
            checked={state.semValor}
            onChange={(e) => update({ semValor: e.target.checked })}
            className="mt-0.5 size-4 shrink-0 rounded border-neutral-300 text-brand-primary focus:ring-brand-primary"
          />
          <span>
            Não sei o valor — quero uma avaliação primeiro
          </span>
        </label>

        <div className={["mt-3 space-y-4", state.semValor && "pointer-events-none opacity-40"].filter(Boolean).join(" ")}>
          <div>
            <label htmlFor="valor" className="mb-1.5 block text-sm font-medium text-fymoob-gray-dark">
              {valorLabel} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">R$</span>
              <input
                id="valor"
                type="text"
                inputMode="numeric"
                required={!state.semValor}
                value={state.valor}
                onChange={(e) => update({ valor: formatMoney(e.target.value) })}
                placeholder="0"
                className="w-full rounded-lg border border-neutral-300 pl-10 pr-4 py-3 text-sm text-fymoob-gray-dark placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>
          </div>

          {!isTerreno && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="condominio" className="mb-1.5 block text-sm font-medium text-fymoob-gray-dark">
                  Condomínio mensal (opcional)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">R$</span>
                  <input
                    id="condominio"
                    type="text"
                    inputMode="numeric"
                    value={state.condominio}
                    onChange={(e) => update({ condominio: formatMoney(e.target.value) })}
                    placeholder="0"
                    className="w-full rounded-lg border border-neutral-300 pl-10 pr-4 py-3 text-sm text-fymoob-gray-dark placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="iptu" className="mb-1.5 block text-sm font-medium text-fymoob-gray-dark">
                  IPTU anual (opcional)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">R$</span>
                  <input
                    id="iptu"
                    type="text"
                    inputMode="numeric"
                    value={state.iptu}
                    onChange={(e) => update({ iptu: formatMoney(e.target.value) })}
                    placeholder="0"
                    className="w-full rounded-lg border border-neutral-300 pl-10 pr-4 py-3 text-sm text-fymoob-gray-dark placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function subCaracteristicasIsValid(state: WizardState): boolean {
  if (!state.areaUtil.trim()) return false
  if (!state.semValor && !state.valor.trim()) return false
  return true
}
