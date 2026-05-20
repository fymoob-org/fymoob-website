"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { APIProvider } from "@vis.gl/react-google-maps"
import { ArrowLeft, ArrowRight, Send, Loader2, CheckCircle2, Save } from "lucide-react"
import { submitLead } from "@/services/client-api"
import { pushAnalyticsEvent } from "@/lib/analytics"
import { useWizardAutosave } from "../_hooks/useWizardAutosave"
import { WizardChrome } from "./WizardChrome"
import { StagePrincipais, subTipoIsValid, subLocalizacaoIsValid, subCaracteristicasIsValid } from "./stages/StagePrincipais"
import { StageMultimidia } from "./stages/StageMultimidia"
import { StageExtras } from "./stages/StageExtras"
import { StageAnunciar, stageAnunciarIsValid } from "./stages/StageAnunciar"
import {
  type AnuncieMode,
  type StageKey,
  type Stage1SubKey,
  type WizardState,
  initialWizardState,
  STAGES,
  STAGE1_SUBS,
} from "./types"

interface AnuncieWizardProps {
  /** Operacao pre-selecionada pela URL. Usuario pode trocar no step 1. */
  defaultOperacao: AnuncieMode
}

export function AnuncieWizard({ defaultOperacao }: AnuncieWizardProps) {
  const router = useRouter()
  const [state, setState, clearAutosave] = useWizardAutosave<WizardState>(
    defaultOperacao,
    { ...initialWizardState, operacao: defaultOperacao },
  )
  const mode = state.operacao // fonte de verdade agora vem do state
  const [stage, setStage] = useState<StageKey>("principais")
  const [sub, setSub] = useState<Stage1SubKey>("tipo")
  const [tsToken, setTsToken] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  function update(patch: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...patch }))
  }

  function canAdvance(): boolean {
    if (stage === "principais") {
      if (sub === "tipo") return subTipoIsValid(state)
      if (sub === "localizacao") return subLocalizacaoIsValid(state)
      return subCaracteristicasIsValid(state)
    }
    if (stage === "anunciar") return stageAnunciarIsValid(state, tsToken)
    return true // multimidia + extras tudo opcional
  }

  const completedStages = computeCompletedStages(state, stage, tsToken)
  const completedSubs = computeCompletedSubs(state, stage, sub)

  function next() {
    if (!canAdvance()) return
    if (stage === "principais") {
      const idx = STAGE1_SUBS.findIndex((s) => s.key === sub)
      if (idx < STAGE1_SUBS.length - 1) setSub(STAGE1_SUBS[idx + 1].key)
      else setStage("multimidia")
    } else if (stage === "multimidia") {
      setStage("extras")
    } else if (stage === "extras") {
      setStage("anunciar")
    }
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function back() {
    if (stage === "principais") {
      const idx = STAGE1_SUBS.findIndex((s) => s.key === sub)
      if (idx > 0) setSub(STAGE1_SUBS[idx - 1].key)
    } else if (stage === "multimidia") {
      setStage("principais")
      setSub("caracteristicas")
    } else if (stage === "extras") {
      setStage("multimidia")
    } else {
      setStage("extras")
    }
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function selectSub(target: Stage1SubKey) {
    if (stage !== "principais") return
    setSub(target)
  }

  function salvarESair() {
    // Autosave ja persistiu em localStorage; basta navegar pra hub /anuncie.
    // Quando o usuario voltar pra /anuncie/{operacao} a key bate e o state restaura.
    router.push("/anuncie")
  }

  async function submit() {
    if (!canAdvance()) return
    setStatus("sending")
    setErrorMsg("")

    const finalidade = mode === "venda" ? "Vender imóvel" : "Alugar imóvel"
    const mensagemFinal = buildMensagem(state, mode)

    try {
      const result = await submitLead({
        nome: state.nome,
        email: state.email,
        fone: state.fone,
        mensagem: mensagemFinal,
        interesse: finalidade,
        consentLGPD: true,
        turnstileToken: tsToken,
        imovel: {
          mode,
          tipo: state.tipo,
          subtipo: state.subtipo,
          cep: state.cep,
          cidade: state.cidade,
          bairro: state.bairro,
          rua: state.rua,
          numero: state.numero,
          complemento: state.complemento,
          quartos: state.quartos,
          banheiros: state.banheiros,
          suites: state.suites,
          vagas: state.vagas,
          andar: state.andar,
          areaUtil: state.areaUtil,
          areaTotal: state.areaTotal,
          idade: state.idade,
          anosUso: state.anosUso,
          valor: state.semValor ? null : state.valor,
          condominio: state.condominio,
          iptu: state.iptu,
          semValor: state.semValor,
          descricao: state.descricao,
          amenities: state.amenities,
          fotos: state.fotos,
        },
      })

      if (!result.ok) {
        setErrorMsg(result.error || "Erro ao enviar cadastro")
        setStatus("error")
        return
      }

      setStatus("sent")
      pushAnalyticsEvent("generate_lead", {
        form_id: `anuncie_wizard_${mode}`,
        interesse: finalidade,
        page_path: typeof window !== "undefined" ? window.location.pathname : null,
        property_type: state.tipo || null,
        neighborhood: state.bairro || null,
        listing_purpose: mode,
        has_photos: state.fotos.length > 0,
      })
      clearAutosave()
    } catch {
      setErrorMsg("Erro de conexão. Tenta de novo em um momento.")
      setStatus("error")
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
        <h2 className="mt-4 font-display text-2xl font-bold text-emerald-900">
          Cadastro recebido!
        </h2>
        <p className="mt-2 text-sm text-emerald-700">
          Um corretor da FYMOOB entrará em contato em até 24h pelo WhatsApp ou email pra agendar
          a avaliação do seu imóvel.
        </p>
        <p className="mt-4 text-xs text-emerald-600">
          Enquanto isso, fique à vontade pra explorar o catálogo de imóveis da FYMOOB.
        </p>
      </div>
    )
  }

  const isFinal = stage === "anunciar"
  const isFirst = stage === "principais" && sub === "tipo"
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  const wizardBody = (
    <WizardChrome
      mode={mode}
      currentStage={stage}
      currentSub={stage === "principais" ? sub : undefined}
      completedStages={completedStages}
      completedSubs={completedSubs}
      state={state}
      onSelectSub={selectSub}
    >
      {stage === "principais" && <StagePrincipais mode={mode} sub={sub} state={state} update={update} />}
      {stage === "multimidia" && <StageMultimidia state={state} update={update} />}
      {stage === "extras" && <StageExtras state={state} update={update} />}
      {stage === "anunciar" && (
        <StageAnunciar state={state} update={update} tsToken={tsToken} setTsToken={setTsToken} />
      )}

      {status === "error" && errorMsg && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMsg}</p>
      )}

      <div className="mt-8 flex flex-col-reverse items-stretch gap-3 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        {!isFirst ? (
          <button
            type="button"
            onClick={back}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium text-fymoob-gray-dark transition hover:bg-neutral-50"
          >
            <ArrowLeft className="size-4" />
            Voltar
          </button>
        ) : (
          <span className="hidden sm:block" />
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3">
          <button
            type="button"
            onClick={salvarESair}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium text-fymoob-gray-dark transition hover:bg-neutral-50"
          >
            <Save className="size-4" />
            Salvar e sair
          </button>

          {!isFinal ? (
            <button
              type="button"
              onClick={next}
              disabled={!canAdvance()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primary-hover disabled:opacity-50"
            >
              Continuar
              <ArrowRight className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canAdvance() || status === "sending"}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primary-hover disabled:opacity-50"
            >
              {status === "sending" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Enviar cadastro
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </WizardChrome>
  )

  // APIProvider envolve o wizard inteiro pra que useGoogleGeocoder funcione
  // no SubLocalizacao (geocoda endereço antes do mapa renderizar). Sem a key,
  // só o mapa fica oculto — wizard continua funcional.
  if (!googleMapsKey) return wizardBody
  return <APIProvider apiKey={googleMapsKey}>{wizardBody}</APIProvider>
}

function computeCompletedStages(state: WizardState, current: StageKey, tsToken: string): Set<StageKey> {
  const done = new Set<StageKey>()
  const principaisDone =
    subTipoIsValid(state) && subLocalizacaoIsValid(state) && subCaracteristicasIsValid(state)
  if (principaisDone) done.add("principais")

  const idx = STAGES.findIndex((s) => s.key === current)
  if (idx >= 2 && principaisDone) done.add("multimidia")
  if (idx >= 3 && principaisDone) done.add("extras")
  if (stageAnunciarIsValid(state, tsToken)) done.add("anunciar")
  return done
}

function computeCompletedSubs(
  state: WizardState,
  stage: StageKey,
  currentSub: Stage1SubKey,
): Set<Stage1SubKey> {
  const done = new Set<Stage1SubKey>()
  if (stage !== "principais") {
    if (subTipoIsValid(state)) done.add("tipo")
    if (subLocalizacaoIsValid(state)) done.add("localizacao")
    if (subCaracteristicasIsValid(state)) done.add("caracteristicas")
    return done
  }
  const idx = STAGE1_SUBS.findIndex((s) => s.key === currentSub)
  if (idx > 0 && subTipoIsValid(state)) done.add("tipo")
  if (idx > 1 && subLocalizacaoIsValid(state)) done.add("localizacao")
  return done
}

function buildMensagem(state: WizardState, mode: AnuncieMode): string {
  const lines: string[] = []
  lines.push(`=== Cadastro de imóvel (${mode === "venda" ? "Venda" : "Locação"}) ===`)
  lines.push("")

  lines.push("📍 ENDEREÇO")
  lines.push(`  CEP: ${state.cep}`)
  lines.push(`  ${state.rua}, ${state.numero}${state.complemento ? ` — ${state.complemento}` : ""}`)
  lines.push(`  ${state.bairro} · ${state.cidade}`)
  lines.push("")

  lines.push("🏠 IMÓVEL")
  lines.push(`  Tipo: ${state.tipo}${state.subtipo ? ` (${state.subtipo})` : ""}`)
  if (state.areaUtil) lines.push(`  Área útil: ${state.areaUtil} m²`)
  if (state.areaTotal) lines.push(`  Área total: ${state.areaTotal} m²`)
  if (state.tipo !== "Terreno") {
    lines.push(
      `  ${state.quartos} quarto(s) · ${state.banheiros} banheiro(s) · ${state.suites} suíte(s) · ${state.vagas} vaga(s)`,
    )
  }
  if (state.andar) lines.push(`  Andar: ${state.andar}`)
  if (state.idade) {
    const idadeMap: Record<string, string> = {
      lancamento: "Breve lançamento",
      construcao: "Em construção",
      usado: state.anosUso ? `${state.anosUso} anos de uso` : "Usado",
    }
    lines.push(`  Idade: ${idadeMap[state.idade]}`)
  }
  lines.push("")

  lines.push("💰 VALOR")
  if (state.semValor) {
    lines.push("  Proprietário não definiu valor — pediu avaliação")
  } else {
    const label = mode === "venda" ? "Valor pretendido" : "Aluguel pretendido"
    lines.push(`  ${label}: R$ ${state.valor}`)
    if (state.condominio) lines.push(`  Condomínio: R$ ${state.condominio}/mês`)
    if (state.iptu) lines.push(`  IPTU: R$ ${state.iptu}/ano`)
  }
  lines.push("")

  if (state.amenities.length > 0) {
    lines.push("✨ COMODIDADES")
    lines.push(`  ${state.amenities.join(", ")}`)
    lines.push("")
  }

  if (state.fotos.length > 0) {
    lines.push(`📷 FOTOS (${state.fotos.length})`)
    state.fotos.forEach((url, i) => lines.push(`  ${i + 1}. ${url}`))
    lines.push("")
  }

  if (state.descricao) {
    lines.push("💬 DESCRIÇÃO DO PROPRIETÁRIO")
    lines.push(`  ${state.descricao}`)
  }

  return lines.join("\n")
}
