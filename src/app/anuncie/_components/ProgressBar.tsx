interface ProgressBarProps {
  currentStep: number // 1..total
  total: number
  labels?: string[]
}

/**
 * Progress bar visual com dots numerados + barra de progresso.
 * Pattern padrão de wizard moderno (Quinto Andar, Loft, ZAP).
 */
export function ProgressBar({ currentStep, total, labels }: ProgressBarProps) {
  const percent = (currentStep / total) * 100

  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium text-fymoob-gray-mid">
          Etapa {currentStep} de {total}
        </span>
        <span className="font-semibold text-brand-primary">{Math.round(percent)}%</span>
      </div>

      {/* Barra contínua */}
      <div className="relative h-1.5 w-full rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-brand-primary transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Dots numerados */}
      <div className="mt-3 flex items-center justify-between">
        {Array.from({ length: total }, (_, i) => i + 1).map((step) => {
          const done = step < currentStep
          const active = step === currentStep
          return (
            <div key={step} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                  done
                    ? "bg-brand-primary text-white"
                    : active
                    ? "bg-brand-primary text-white ring-4 ring-brand-primary/20"
                    : "bg-neutral-200 text-neutral-500"
                }`}
              >
                {done ? "✓" : step}
              </div>
              {labels?.[step - 1] && (
                <span
                  className={`text-[10px] uppercase tracking-wider ${
                    active ? "font-semibold text-brand-primary" : "text-neutral-400"
                  }`}
                >
                  {labels[step - 1]}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
