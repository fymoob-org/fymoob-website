"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { isVistaImage } from "@/lib/image-optimization"

interface TorreVisualGalleryProps {
  /** Render principal da torre (marketing image) — primeiro slide do lightbox */
  render?: string | null
  /** Plantas tecnicas — viram thumbs strip + slides 1..N do lightbox */
  plantas: string[]
  torreNome: string
  empreendimentoNome?: string
  bairro?: string
  construtora?: string
  /** Cor signature da torre — usada em ring hover, dots ativos, accent */
  accentColor: string
  accentBorder: string
  accentSoft: string
}

/**
 * Sprint design 08/05/2026 — Render hero + plantas thumbs + lightbox unificado.
 *
 * Substitui o padrao anterior de "card render no hub" + "section PLANTAS
 * POR TORRE separada com PlantasCarousel" (duplicacao informacional).
 *
 * Layout:
 *   - Render grande (marketing image, mantem peso visual de hero)
 *   - Strip de thumbs das plantas abaixo (1-N quadrados pequenos)
 *   - Click em qualquer um abre lightbox fullscreen com TODAS as imagens
 *     (render como slide 0, plantas como 1..N), com keyboard nav (Esc,
 *     setas), mobile dots, body scroll lock.
 *
 * Reaproveita o pattern de PlantasGallery.tsx mas adaptado pra incluir o
 * render junto com as plantas no carousel fullscreen.
 */
export function TorreVisualGallery({
  render,
  plantas,
  torreNome,
  empreendimentoNome,
  bairro,
  construtora,
  accentColor,
  accentBorder,
  accentSoft,
}: TorreVisualGalleryProps) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  // Combina render + plantas — render fica como slide 0 (hero/marketing)
  const allImages: string[] = []
  if (render) allImages.push(render)
  allImages.push(...plantas)

  // Alt text otimizado pra SEO (Sprint A.5 pattern reaproveitado)
  const altText = (i: number) => {
    const local = bairro ? `, ${bairro}, Curitiba` : ""
    const incorporadora = construtora ? ` (${construtora})` : ""
    const empContext = empreendimentoNome ? `, ${empreendimentoNome}${incorporadora}` : ""
    if (render && i === 0) {
      return `${torreNome} - render da torre${empContext}${local}`
    }
    const plantaNum = render ? i : i + 1
    return `Planta ${plantaNum} - ${torreNome}${empContext}${local}`
  }

  const close = useCallback(() => setOpen(false), [])
  const next = useCallback(
    () => setIndex((i) => (i + 1) % allImages.length),
    [allImages.length],
  )
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + allImages.length) % allImages.length),
    [allImages.length],
  )

  // Body scroll lock quando aberto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = ""
      }
    }
  }, [open])

  // Keyboard nav
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      if (e.key === "ArrowRight") next()
      if (e.key === "ArrowLeft") prev()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, close, next, prev])

  const openAt = (i: number) => {
    setIndex(i)
    setOpen(true)
  }

  if (!render && plantas.length === 0) return null

  return (
    <>
      {/* Render principal — clickable, abre lightbox no slide 0 */}
      {render && (
        <button
          type="button"
          onClick={() => openAt(0)}
          aria-label={`Ampliar ${altText(0)}`}
          className="group/render relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-neutral-900 shadow-xl ring-1 transition-shadow duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-2xl"
          style={
            {
              "--ring-color": accentBorder,
              boxShadow: undefined,
              ringColor: accentBorder,
            } as React.CSSProperties
          }
        >
          <Image
            src={render}
            alt={altText(0)}
            fill
            className="object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/render:scale-[1.06]"
            sizes="(max-width: 768px) 100vw, 33vw"
            loading="lazy"
            data-image-zoom
          />
          {/* Gradient bottom sutil — mesmo padrao anterior */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_60%,rgba(0,0,0,0.25)_100%)]" />

          {/* Cue de zoom no canto inferior direito (aparece on hover) */}
          <span
            aria-hidden="true"
            className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.2em] text-neutral-700 opacity-0 shadow-md backdrop-blur-sm transition-opacity duration-300 group-hover/render:opacity-100 sm:text-[10px]"
          >
            Ampliar
          </span>
        </button>
      )}

      {/* Strip de thumbs das plantas */}
      {plantas.length > 0 && (
        <div
          className={cn(
            "mt-3 grid gap-2",
            plantas.length === 1 && "grid-cols-1",
            plantas.length === 2 && "grid-cols-2",
            plantas.length === 3 && "grid-cols-3",
            plantas.length >= 4 && "grid-cols-4",
          )}
        >
          {plantas.slice(0, 4).map((planta, i) => {
            const lightboxIndex = render ? i + 1 : i
            return (
              <button
                key={i}
                type="button"
                onClick={() => openAt(lightboxIndex)}
                aria-label={altText(lightboxIndex)}
                className="group/thumb relative aspect-[4/3] overflow-hidden rounded-lg bg-white p-1.5 ring-1 transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  borderColor: accentBorder,
                  boxShadow: `0 0 0 1px ${accentBorder}`,
                }}
              >
                <Image
                  src={planta}
                  alt={altText(lightboxIndex)}
                  fill
                  className="object-contain p-1 transition-transform duration-500 group-hover/thumb:scale-105"
                  sizes="(max-width: 768px) 25vw, 100px"
                  loading="lazy"
                  unoptimized={isVistaImage(planta)}
                />
                {/* Counter chip se tem mais que 4 plantas (na ultima thumb) */}
                {plantas.length > 4 && i === 3 && (
                  <span
                    className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-semibold text-white"
                    aria-hidden="true"
                  >
                    +{plantas.length - 3}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Lightbox fullscreen */}
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col bg-black animate-[fadeIn_0.2s_ease-out]"
          onClick={close}
        >
          {/* Top bar — counter + close */}
          <div className="flex h-14 shrink-0 items-center justify-between px-4 sm:px-6">
            <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white/85 backdrop-blur-sm">
              {torreNome} — {render && index === 0 ? "Render" : `Planta ${render ? index : index + 1}`} ({index + 1}/{allImages.length})
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                close()
              }}
              className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur-sm transition hover:bg-white/20 hover:text-white"
              aria-label="Fechar"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Imagem principal */}
          <div
            className="flex flex-1 items-center justify-center overflow-hidden px-2 sm:px-16"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              key={index}
              src={allImages[index]}
              alt={altText(index)}
              width={1600}
              height={1200}
              className="max-h-[calc(100dvh-4rem)] w-auto object-contain animate-[fadeIn_0.15s_ease-out]"
              priority
              unoptimized={isVistaImage(allImages[index])}
            />
          </div>

          {/* Setas desktop */}
          {allImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  prev()
                }}
                className="absolute top-1/2 left-4 z-[10000] hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:scale-110 hover:bg-white/25 sm:flex"
                aria-label="Imagem anterior"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  next()
                }}
                className="absolute top-1/2 right-4 z-[10000] hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:scale-110 hover:bg-white/25 sm:flex"
                aria-label="Próxima imagem"
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          )}

          {/* Mobile dots */}
          {allImages.length > 1 && (
            <div className="flex justify-center gap-1.5 pb-6 sm:hidden">
              {allImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIndex(i)
                  }}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    index === i ? "w-6" : "w-1 bg-white/40",
                  )}
                  style={index === i ? { width: "1.5rem", backgroundColor: accentColor } : {}}
                  aria-label={`Ir para imagem ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hide unused — accentSoft reservado pra futuras animacoes */}
      <span className="hidden" data-accent-soft={accentSoft} aria-hidden="true" />
    </>
  )
}
