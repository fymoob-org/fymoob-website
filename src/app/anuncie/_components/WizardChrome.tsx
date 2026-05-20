"use client"

import { Check, Tag, Home, MapPin, Ruler, Banknote } from "lucide-react"
import type { ReactNode } from "react"
import type {
  AnuncieMode,
  StageKey,
  Stage1SubKey,
  WizardState,
} from "./types"
import { STAGES, STAGE1_SUBS } from "./types"

interface WizardChromeProps {
  mode: AnuncieMode
  currentStage: StageKey
  currentSub?: Stage1SubKey
  completedStages: Set<StageKey>
  completedSubs: Set<Stage1SubKey>
  state: WizardState
  onSelectSub: (sub: Stage1SubKey) => void
  children: ReactNode
}

/**
 * Shell visual do wizard estilo Imovelweb:
 * - Header: progress horizontal 4 estagios numerados com linhas conectoras
 * - Aside (lg+): sub-passos do estagio atual + card "Detalhe do anuncio"
 * - Main: conteudo do sub-step (children)
 *
 * Mobile: aside vira chips horizontais acima do main (overflow-x-auto).
 */
export function WizardChrome({
  mode,
  currentStage,
  currentSub,
  completedStages,
  completedSubs,
  state,
  onSelectSub,
  children,
}: WizardChromeProps) {
  return (
    <div>
      <ProgressHeader currentStage={currentStage} completed={completedStages} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {currentStage === "principais" && (
            <SubStepsList
              current={currentSub ?? "tipo"}
              completed={completedSubs}
              onSelect={onSelectSub}
            />
          )}
          <DetalheCard mode={mode} state={state} />
        </aside>

        <main className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

function ProgressHeader({
  currentStage,
  completed,
}: {
  currentStage: StageKey
  completed: Set<StageKey>
}) {
  const currentIdx = STAGES.findIndex((s) => s.key === currentStage)

  return (
    <ol className="flex w-full items-center justify-between gap-2">
      {STAGES.map((stage, idx) => {
        const isDone = completed.has(stage.key)
        const isCurrent = stage.key === currentStage
        const isPending = !isDone && !isCurrent

        return (
          <li key={stage.key} className="flex flex-1 items-center gap-2 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition",
                  isDone && "bg-brand-primary text-white",
                  isCurrent && "bg-brand-primary text-white ring-4 ring-brand-primary/20",
                  isPending && "border-2 border-neutral-300 bg-white text-neutral-400",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {isDone ? <Check className="size-4" /> : idx + 1}
              </div>
              <span
                className={[
                  "text-[11px] font-semibold uppercase tracking-wider sm:text-xs",
                  isCurrent || isDone ? "text-fymoob-gray-dark" : "text-neutral-400",
                ].join(" ")}
              >
                {stage.label}
              </span>
            </div>
            {idx < STAGES.length - 1 && (
              <div
                className={[
                  "mb-5 h-0.5 flex-1 rounded-full transition",
                  idx < currentIdx ? "bg-brand-primary" : "bg-neutral-200",
                ].join(" ")}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

function SubStepsList({
  current,
  completed,
  onSelect,
}: {
  current: Stage1SubKey
  completed: Set<Stage1SubKey>
  onSelect: (sub: Stage1SubKey) => void
}) {
  return (
    <nav className="rounded-xl border border-neutral-200 bg-white p-2 shadow-sm">
      {STAGE1_SUBS.map((sub) => {
        const isDone = completed.has(sub.key)
        const isCurrent = sub.key === current
        return (
          <button
            key={sub.key}
            type="button"
            onClick={() => isDone && onSelect(sub.key)}
            disabled={!isDone && !isCurrent}
            className={[
              "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition",
              isCurrent && "bg-brand-primary/10 font-semibold text-brand-primary",
              !isCurrent && isDone && "text-fymoob-gray-dark hover:bg-neutral-50",
              !isCurrent && !isDone && "cursor-not-allowed text-neutral-400",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="flex items-center gap-2">
              {isCurrent && <span className="h-4 w-0.5 rounded-full bg-brand-primary" />}
              {sub.label}
            </span>
            {isDone && <Check className="size-3.5 text-emerald-500" />}
          </button>
        )
      })}
    </nav>
  )
}

function DetalheCard({ state }: { mode: AnuncieMode; state: WizardState }) {
  const isVenda = state.operacao === "venda"
  const finalidade = isVenda ? "Venda" : "Aluguel"
  const localizacao = [state.bairro, state.cidade].filter(Boolean).join(" · ")
  const tipoLinha = [state.tipo, state.subtipo].filter(Boolean).join(" · ")
  const areaLinha = state.areaUtil ? `${state.areaUtil} m²` : ""
  const valorLinha = state.semValor
    ? "Avaliação solicitada"
    : state.valor
      ? `R$ ${state.valor}`
      : ""

  const hasAny = tipoLinha || localizacao || areaLinha || valorLinha

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-100 px-4 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-fymoob-gray-mid">
          Detalhe do anúncio
        </h3>
        <span
          className={[
            "mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold",
            isVenda
              ? "bg-brand-primary/10 text-brand-primary"
              : "bg-emerald-50 text-emerald-700",
          ].join(" ")}
        >
          <Tag className="size-3" />
          {finalidade}
        </span>
      </div>
      <ul className="space-y-3 p-4 text-sm">
        {tipoLinha ? (
          <Row icon={<Home className="size-4 text-brand-primary" />} label="Tipo">
            {tipoLinha}
          </Row>
        ) : (
          <RowEmpty label="Tipo do imóvel" />
        )}
        {localizacao ? (
          <Row icon={<MapPin className="size-4 text-brand-primary" />} label="Localização">
            {localizacao}
          </Row>
        ) : (
          <RowEmpty label="Localização" />
        )}
        {areaLinha ? (
          <Row icon={<Ruler className="size-4 text-brand-primary" />} label="Área útil">
            {areaLinha}
          </Row>
        ) : (
          <RowEmpty label="Área" />
        )}
        {valorLinha && (
          <Row icon={<Banknote className="size-4 text-brand-primary" />} label="Valor">
            {valorLinha}
          </Row>
        )}
        {!hasAny && (
          <li className="text-xs italic text-neutral-400">
            Preencha as etapas pra ver o resumo aqui.
          </li>
        )}
      </ul>
    </div>
  )
}

function Row({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-fymoob-gray-mid">
          {label}
        </span>
        <span className="block truncate text-sm font-medium text-fymoob-gray-dark">
          {children}
        </span>
      </span>
    </li>
  )
}

function RowEmpty({ label }: { label: string }) {
  return (
    <li className="flex items-start gap-2.5 opacity-50">
      <span className="mt-0.5 size-4 shrink-0 rounded-full border border-dashed border-neutral-300" />
      <span className="block text-xs italic text-neutral-400">{label}</span>
    </li>
  )
}
