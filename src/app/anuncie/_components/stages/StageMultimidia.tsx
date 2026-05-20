"use client"

import { Camera } from "lucide-react"
import { PhotoUpload } from "../PhotoUpload"
import type { WizardState } from "../types"

interface Props {
  state: WizardState
  update: (patch: Partial<WizardState>) => void
}

export function StageMultimidia({ state, update }: Props) {
  return (
    <div>
      <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-primary">
        <Camera className="size-3" />
        Multimídia
      </div>
      <h2 className="font-display text-2xl font-bold text-fymoob-gray-dark">
        Adicione fotos do seu imóvel
      </h2>
      <p className="mt-1 text-sm text-fymoob-gray-mid">
        Imóveis com fotos têm 3x mais visitas. A primeira foto vira a capa do anúncio.
      </p>

      <div className="mt-6">
        <PhotoUpload fotos={state.fotos} onChange={(fotos) => update({ fotos })} />
      </div>

      <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
        💡 Dica: priorize fotos da fachada, sala, cozinha, quartos e área externa.
        Boa iluminação natural valoriza o imóvel. Se preferir, pule esta etapa — você
        pode enviar fotos depois pelo WhatsApp quando o corretor entrar em contato.
      </p>
    </div>
  )
}

export function stageMultimidiaIsValid(): boolean {
  return true // fotos sao opcionais
}
