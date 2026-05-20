"use client"

import { Minus, Plus } from "lucide-react"

interface StepperProps {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  label: string
  id: string
}

/**
 * Counter `-` `[N]` `+` mobile-friendly. Pattern usado em filtros de
 * busca de imóveis (Airbnb, Booking) e formulários de captação modernos.
 */
export function Stepper({ value, onChange, min = 0, max = 99, label, id }: StepperProps) {
  const dec = () => onChange(Math.max(min, value - 1))
  const inc = () => onChange(Math.min(max, value + 1))

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-fymoob-gray-dark">
        {label}
      </label>
      <div className="inline-flex items-center gap-3 rounded-lg border border-neutral-300 bg-white px-2 py-1.5">
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          aria-label={`Reduzir ${label}`}
          className="flex h-8 w-8 items-center justify-center rounded-md text-fymoob-gray-dark transition hover:bg-brand-primary/10 hover:text-brand-primary disabled:opacity-30"
        >
          <Minus className="size-4" />
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/\D/g, ""), 10)
            if (!isNaN(n)) onChange(Math.max(min, Math.min(max, n)))
          }}
          className="w-10 bg-transparent text-center text-base font-semibold text-fymoob-gray-dark focus:outline-none"
        />
        <button
          type="button"
          onClick={inc}
          disabled={value >= max}
          aria-label={`Aumentar ${label}`}
          className="flex h-8 w-8 items-center justify-center rounded-md text-fymoob-gray-dark transition hover:bg-brand-primary/10 hover:text-brand-primary disabled:opacity-30"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}
