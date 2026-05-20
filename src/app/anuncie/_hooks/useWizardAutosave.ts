"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Persiste o state do wizard em localStorage pra não perder se sair sem enviar.
 * Restaura ao montar. Limpa quando o lead é submetido com sucesso.
 *
 * Uso:
 *   const [state, setState, clear] = useWizardAutosave("anuncie-venda", initialState)
 */
export function useWizardAutosave<T>(
  key: string,
  initialState: T,
): [T, (updater: T | ((prev: T) => T)) => void, () => void] {
  const storageKey = `fymoob:anuncie-wizard:${key}`
  const [state, setStateRaw] = useState<T>(initialState)
  const restored = useRef(false)

  // Restaura uma vez no mount
  useEffect(() => {
    if (restored.current) return
    restored.current = true
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        setStateRaw((prev) => ({ ...prev, ...parsed }))
      }
    } catch {
      // ignora restore inválido
    }
  }, [storageKey])

  // Persiste a cada mudança (debounce 300ms)
  useEffect(() => {
    if (typeof window === "undefined") return
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(state))
      } catch {
        // localStorage cheio ou bloqueado — silencia
      }
    }, 300)
    return () => clearTimeout(t)
  }, [state, storageKey])

  const setState = (updater: T | ((prev: T) => T)) => {
    setStateRaw(updater)
  }

  const clear = () => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      /* noop */
    }
  }

  return [state, setState, clear]
}
