import { MapPin, ClipboardList, Camera, Phone } from "lucide-react"

const PASSOS = [
  { icon: MapPin, label: "Localize" },
  { icon: ClipboardList, label: "Conte como é" },
  { icon: Camera, label: "Envie fotos" },
  { icon: Phone, label: "Receba contato" },
] as const

/**
 * Mini-banner horizontal com 4 passos em ícone. Versão compacta do
 * "Como funciona" do Imovelweb pra mostrar acima do wizard sem roubar
 * espaço visual.
 */
export function ComoFuncionaCompacto() {
  return (
    <div className="mb-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <ol className="flex items-center justify-between gap-2 overflow-x-auto sm:gap-4">
        {PASSOS.map((passo, idx) => {
          const Icon = passo.icon
          return (
            <li key={passo.label} className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary/10">
                  <Icon className="size-4 text-brand-primary" />
                </div>
                <span className="whitespace-nowrap text-xs font-semibold text-fymoob-gray-dark sm:text-sm">
                  {idx + 1}. {passo.label}
                </span>
              </div>
              {idx < PASSOS.length - 1 && (
                <span className="hidden h-0.5 w-6 rounded-full bg-neutral-300 sm:block" />
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
