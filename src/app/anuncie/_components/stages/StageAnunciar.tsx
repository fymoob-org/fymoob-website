"use client"

import { useEffect, useRef } from "react"
import Script from "next/script"
import Link from "next/link"
import { Send, User, ShieldCheck } from "lucide-react"
import { formatPhoneBR } from "@/lib/utils"
import type { WizardState } from "../types"

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: string | HTMLElement,
        opts: {
          sitekey: string
          callback: (token: string) => void
          "error-callback"?: () => void
          "expired-callback"?: () => void
          theme?: string
        },
      ) => string
      reset: (id?: string) => void
      remove: (id?: string) => void
    }
  }
}

interface Props {
  state: WizardState
  update: (patch: Partial<WizardState>) => void
  tsToken: string
  setTsToken: (t: string) => void
}

export function StageAnunciar({ state, update, tsToken, setTsToken }: Props) {
  const widgetContainer = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | undefined>(undefined)

  useEffect(() => {
    handleTurnstileLoad()
    return () => {
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current)
        } catch {
          /* noop */
        }
        widgetId.current = undefined
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleTurnstileLoad() {
    if (!TURNSTILE_SITE_KEY || !widgetContainer.current || !window.turnstile) return
    if (widgetId.current) return
    widgetId.current = window.turnstile.render(widgetContainer.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token: string) => setTsToken(token),
      "error-callback": () => setTsToken(""),
      "expired-callback": () => setTsToken(""),
      theme: "light",
    })
  }

  return (
    <div>
      <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-primary">
        <Send className="size-3" />
        Anunciar
      </div>
      <h2 className="font-display text-2xl font-bold text-fymoob-gray-dark">
        Quase lá — seus dados pra contato
      </h2>
      <p className="mt-1 text-sm text-fymoob-gray-mid">
        Um corretor da FYMOOB entra em contato em até 24h pra agendar avaliação.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <label htmlFor="nome" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-fymoob-gray-dark">
            <User className="size-4 text-brand-primary" />
            Nome completo <span className="text-red-500">*</span>
          </label>
          <input
            id="nome"
            name="nome"
            type="text"
            required
            autoComplete="name"
            value={state.nome}
            onChange={(e) => update({ nome: e.target.value })}
            placeholder="Seu nome"
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-fymoob-gray-dark placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-fymoob-gray-dark">
              E-mail <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={state.email}
              onChange={(e) => update({ email: e.target.value })}
              placeholder="seu@email.com"
              className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-fymoob-gray-dark placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>
          <div>
            <label htmlFor="fone" className="mb-1.5 block text-sm font-medium text-fymoob-gray-dark">
              WhatsApp <span className="text-red-500">*</span>
            </label>
            <input
              id="fone"
              name="fone"
              type="tel"
              required
              autoComplete="tel"
              inputMode="tel"
              value={state.fone}
              onChange={(e) => update({ fone: formatPhoneBR(e.target.value) })}
              placeholder="(41) 99999-9999"
              className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-fymoob-gray-dark placeholder:text-neutral-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>
        </div>

        {TURNSTILE_SITE_KEY && (
          <>
            <Script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
              strategy="afterInteractive"
              onLoad={handleTurnstileLoad}
              onReady={handleTurnstileLoad}
            />
            <div className="relative flex min-h-[65px] items-center justify-center">
              {!tsToken && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs text-neutral-500">
                  <ShieldCheck className="size-3.5 animate-pulse" />
                  Verificando segurança...
                </div>
              )}
              <div ref={widgetContainer} className="relative z-10" />
            </div>
          </>
        )}

        <label className="flex items-start gap-2 text-xs text-neutral-600">
          <input
            type="checkbox"
            checked={state.consentLGPD}
            onChange={(e) => update({ consentLGPD: e.target.checked })}
            className="mt-0.5 size-4 shrink-0 rounded border-neutral-300 text-brand-primary focus:ring-brand-primary"
          />
          <span>
            Autorizo a FYMOOB a entrar em contato e tratar meus dados conforme a{" "}
            <Link
              href="/politica-de-privacidade"
              target="_blank"
              className="font-medium text-brand-primary underline hover:text-brand-primary-hover"
            >
              Política de Privacidade
            </Link>
            . (LGPD — Lei 13.709/2018)
          </span>
        </label>
      </div>
    </div>
  )
}

export function stageAnunciarIsValid(state: WizardState, tsToken: string): boolean {
  const hasTurnstile = !TURNSTILE_SITE_KEY || Boolean(tsToken)
  return Boolean(
    state.nome.trim() &&
      state.email.trim() &&
      state.fone.trim() &&
      state.consentLGPD &&
      hasTurnstile,
  )
}
