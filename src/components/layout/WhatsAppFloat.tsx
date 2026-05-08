"use client"

import { usePathname } from "next/navigation"

const FYMOOB_PHONE = "5541999780517"

export function WhatsAppFloat() {
  const pathname = usePathname()
  const isPropertyPage = pathname.startsWith("/imovel/")
  const isEmpreendimentoPage = pathname.startsWith("/empreendimento/")
  const isAdmin = pathname.startsWith("/admin")
  const isStudio = pathname.startsWith("/studio")

  // Hide on admin panel and Sanity Studio — internal tools, no public CTAs
  if (isAdmin || isStudio) return null

  // Em /imovel/* a sticky bar inferior ja oferece CTA de contato no mobile
  // — manter o flutuante alem dela duplica chamada. No desktop nao tem
  // sticky bar, entao o flutuante continua sendo o anchor de contato.
  //
  // /empreendimento/* tinha tratamento similar ate 08/05/2026, mas a
  // sticky bar foi removida nesses hubs (briga visual com tema editorial
  // premium). Agora o WhatsAppFloat aparece tambem em mobile nessas pgs,
  // mesmo padrao do resto do site.
  const hideOnMobile = isPropertyPage

  const message = "Olá! Gostaria de mais informações sobre os imóveis da FYMOOB."
  const url = `https://wa.me/${FYMOOB_PHONE}?text=${encodeURIComponent(message)}`

  // Posicao mobile: bottom-20 (80px) em paginas com BottomNav, bottom-4
  // (16px) em /empreendimento/* (BottomNav fica oculta nessas rotas — ver
  // BottomNav.tsx:93). Sem ajuste, o float ficaria flutuando alto demais
  // sobre o vazio, fora da convencao do canto inferior. Desktop sempre
  // bottom-6 (sem BottomNav em md+).
  const bottomMobile = isEmpreendimentoPage ? "bottom-4" : "bottom-20"

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-track="whatsapp_click"
      data-source="float"
      aria-label="Fale conosco pelo WhatsApp"
      className={`fixed ${bottomMobile} right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-all duration-300 hover:scale-110 md:bottom-6 md:right-6 md:h-14 md:w-14 ${hideOnMobile ? "hidden md:flex" : ""}`}
    >
      <svg viewBox="0 0 32 32" className="size-7 fill-white md:size-8">
        <path d="M16.004 3.2C9.064 3.2 3.404 8.86 3.404 15.8c0 2.22.58 4.39 1.68 6.3L3.2 28.8l6.9-1.81a12.56 12.56 0 0 0 5.9 1.49h.004c6.94 0 12.6-5.66 12.6-12.6 0-3.37-1.31-6.53-3.69-8.91A12.52 12.52 0 0 0 16.004 3.2Zm0 23.04a10.41 10.41 0 0 1-5.31-1.45l-.38-.23-3.95 1.04 1.05-3.86-.25-.39a10.42 10.42 0 0 1-1.6-5.55c0-5.76 4.69-10.44 10.45-10.44 2.79 0 5.41 1.09 7.39 3.06a10.38 10.38 0 0 1 3.05 7.39c0 5.76-4.69 10.44-10.45 10.44Zm5.73-7.82c-.31-.16-1.85-.91-2.14-1.02-.29-.1-.5-.16-.7.16-.21.31-.81 1.02-.99 1.23-.18.21-.37.23-.68.08-.31-.16-1.32-.49-2.52-1.56-.93-.83-1.56-1.86-1.74-2.17-.18-.31-.02-.48.14-.64.14-.14.31-.37.47-.55.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.55-.08-.16-.7-1.69-.96-2.31-.25-.61-.51-.52-.7-.53h-.6c-.21 0-.55.08-.83.39-.29.31-1.09 1.07-1.09 2.6 0 1.53 1.12 3.01 1.27 3.22.16.21 2.2 3.35 5.32 4.7.74.32 1.32.51 1.77.66.75.24 1.43.2 1.96.12.6-.09 1.85-.76 2.11-1.49.26-.73.26-1.35.18-1.49-.08-.13-.29-.21-.6-.37Z" />
      </svg>
      <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
        1
      </span>
    </a>
  )
}
