"use client"

import { Sparkles, FileText } from "lucide-react"
import { AMENITIES_OPTIONS, type WizardState } from "../types"

interface Props {
  state: WizardState
  update: (patch: Partial<WizardState>) => void
}

export function StageExtras({ state, update }: Props) {
  function toggleAmenity(item: string) {
    const has = state.amenities.includes(item)
    const next = has ? state.amenities.filter((a) => a !== item) : [...state.amenities, item]
    update({ amenities: next })
  }

  return (
    <div>
      <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-primary">
        <Sparkles className="size-3" />
        Extras
      </div>
      <h2 className="font-display text-2xl font-bold text-fymoob-gray-dark">
        Detalhes que valorizam seu imóvel
      </h2>
      <p className="mt-1 text-sm text-fymoob-gray-mid">
        Tudo opcional — quanto mais completo, mais qualificado o lead que recebemos.
      </p>

      <div className="mt-6">
        <label htmlFor="descricao" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-fymoob-gray-dark">
          <FileText className="size-4 text-brand-primary" />
          Descrição do imóvel (opcional)
        </label>
        <textarea
          id="descricao"
          rows={4}
          value={state.descricao}
          onChange={(e) => update({ descricao: e.target.value })}
          placeholder="Conte o que torna o seu imóvel especial: localização, vista, reformas recentes, vizinhança, mobília, vagas extras..."
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-fymoob-gray-dark placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        />
        <p className="mt-1 text-xs text-fymoob-gray-mid">
          {state.descricao.length} / 2000 caracteres
        </p>
      </div>

      <div className="mt-7">
        <label className="mb-2 block text-sm font-medium text-fymoob-gray-dark">
          Características e comodidades (opcional)
        </label>
        <p className="mb-3 text-xs text-fymoob-gray-mid">
          Marque tudo que o imóvel ou condomínio oferece.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {AMENITIES_OPTIONS.map((item) => {
            const isOn = state.amenities.includes(item)
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleAmenity(item)}
                className={[
                  "rounded-lg border px-3 py-2 text-left text-sm transition",
                  isOn
                    ? "border-brand-primary bg-brand-primary/5 text-brand-primary"
                    : "border-neutral-300 bg-white text-fymoob-gray-dark hover:border-brand-primary/40",
                ].join(" ")}
              >
                {item}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function stageExtrasIsValid(): boolean {
  return true // tudo opcional
}
