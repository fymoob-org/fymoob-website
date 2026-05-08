"use client"

import { useEffect, useRef, useState } from "react"

interface CountUpProps {
  end: number
  duration?: number
  decimals?: number
  decimalSeparator?: string
  thousandsSeparator?: string
  className?: string
  suffix?: React.ReactNode
}

/**
 * Sprint design 08/05/2026 — Animation 2 (count-up stats).
 *
 * Numeral conta de 0 ate `end` quando entra no viewport (uma unica vez).
 * Easing easeOutQuart pra desacelerar no final, sensacao de "pousada"
 * editorial. Respeita prefers-reduced-motion.
 *
 * Server-render: mostra valor final estatico imediato (zero CLS, SEO ok).
 * Client hydra: rebobina pra 0 e anima quando IntersectionObserver dispara.
 */
export function CountUp({
  end,
  duration = 1600,
  decimals = 0,
  decimalSeparator = ",",
  thousandsSeparator = ".",
  className,
  suffix,
}: CountUpProps) {
  const [value, setValue] = useState(end)
  const ref = useRef<HTMLSpanElement>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) return

    const node = ref.current
    if (!node) return

    setValue(0)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || startedRef.current) return
        startedRef.current = true
        observer.disconnect()

        const startTime = performance.now()
        const tick = (now: number) => {
          const elapsed = now - startTime
          const progress = Math.min(elapsed / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 4)
          setValue(end * eased)
          if (progress < 1) requestAnimationFrame(tick)
          else setValue(end)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [end, duration])

  const formatted = formatNumber(value, decimals, decimalSeparator, thousandsSeparator)

  return (
    <span ref={ref} className={className}>
      {formatted}
      {suffix}
    </span>
  )
}

function formatNumber(
  value: number,
  decimals: number,
  decimalSeparator: string,
  thousandsSeparator: string,
): string {
  const fixed = value.toFixed(decimals)
  const [intPart, decPart] = fixed.split(".")
  const intWithThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator)
  return decPart ? `${intWithThousands}${decimalSeparator}${decPart}` : intWithThousands
}
