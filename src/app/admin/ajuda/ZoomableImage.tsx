"use client"

import { useEffect, useState } from "react"
import { X, ZoomIn } from "lucide-react"

interface ZoomableImageProps {
  src?: string
  alt?: string
}

/**
 * Imagem clicável que expande pra fullscreen em overlay.
 * Usada em /admin/ajuda pros prints do manual ficarem legíveis quando
 * Bruno/Wagner quiser ver detalhes (texto pequeno, ícones).
 *
 * - Click na imagem ou no badge "🔍" -> abre overlay
 * - Click no overlay, X ou tecla Esc -> fecha
 * - Trava scroll do body quando aberto
 */
export function ZoomableImage({ src, alt }: ZoomableImageProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open])

  if (!src) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group my-4 block w-full overflow-hidden rounded-lg border border-slate-200 shadow-sm transition-shadow hover:shadow-md dark:border-admin-border"
        aria-label={`Ampliar imagem: ${alt || "screenshot"}`}
      >
        <span className="relative block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt || ""}
            loading="lazy"
            className="block w-full transition-transform duration-200 group-hover:scale-[1.01]"
          />
          <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            <ZoomIn className="size-3" />
            Ampliar
          </span>
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt || "Imagem ampliada"}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar imagem"
            className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt || ""}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[95vh] max-w-[95vw] cursor-default rounded-lg shadow-2xl"
          />
        </div>
      )}
    </>
  )
}
