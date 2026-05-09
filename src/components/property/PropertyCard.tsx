"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Trash2 } from "lucide-react"

import { PropertyFeatures } from "@/components/shared/PropertyFeatures"
import { getTopViewedCodes } from "@/lib/view-tracker"
import {
  cn,
  filterPropertyPhotos,
  formatPrice,
  generateImageAlt,
  getPropertyImage,
} from "@/lib/utils"
import type { Property } from "@/types/property"
import { isVistaImage } from "@/lib/image-optimization"
import { getPropertyPriceDisplay } from "@/lib/property-price"
import { pushAnalyticsEvent, priceToBucket } from "@/lib/analytics"
import { getBadge } from "./card/hooks/usePropertyCard"
import { CardBadge } from "./card/CardBadge"
import { PhotoCarousel } from "./card/PhotoCarousel"
import { FavoriteButton } from "./card/FavoriteButton"

const WISHLIST_STORAGE_KEY = "fymoob:wishlist"
const RECENT_STORAGE_KEY = "fymoob:recent"
const RECENT_MAX = 8
const MAX_CARD_PHOTOS = 5

// getBadge agora vem unificado do hook (sistema de badges glass morphism).

export function saveToRecentlyViewed(property: Property) {
  if (typeof window === "undefined") return

  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY)
    const recent: Array<{
      codigo: string
      slug: string
      titulo: string
      preco: number | null
      foto: string
      bairro: string
      timestamp: number
    }> = raw ? JSON.parse(raw) : []

    const filtered = recent.filter((item) => item.codigo !== property.codigo)
    filtered.unshift({
      codigo: property.codigo,
      slug: property.slug,
      titulo: property.titulo,
      preco: property.precoVenda ?? property.precoAluguel,
      foto: property.fotoDestaque,
      bairro: property.bairro,
      timestamp: Date.now(),
    })

    localStorage.setItem(
      RECENT_STORAGE_KEY,
      JSON.stringify(filtered.slice(0, RECENT_MAX))
    )
  } catch {
    // Ignore local storage failures.
  }
}

export function getRecentlyViewed(): Array<{
  codigo: string
  slug: string
  titulo: string
  preco: number | null
  foto: string
  bairro: string
  timestamp: number
}> {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getWishlistProperties(): string[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function getPropertyPhotos(property: Property): string[] {
  const merged = [getPropertyImage(property), ...filterPropertyPhotos(property.fotos)]
    .filter(Boolean)
  const uniquePhotos = Array.from(new Set(merged))
  const photos = uniquePhotos.length > 0 ? uniquePhotos : ["/logo.png"]

  return photos.slice(0, MAX_CARD_PHOTOS)
}

type PriceContext = "venda" | "locacao" | null

interface PropertyCardProps {
  property: Property
  prioritizeFirstImage?: boolean
  variant?: "vertical" | "horizontal" | "responsive"
  compactFeatures?: boolean
  context?: "default" | "search"
  priceContext?: PriceContext
  // "toggle" = coracao (adiciona/remove). "remove" = X (pagina de favoritos).
  wishlistAction?: "toggle" | "remove"
  // Callback disparado quando user clica no X em wishlistAction="remove".
  onRemove?: (codigo: string) => void
  // Esconde suites + banheiros no resumo de features (pagina de favoritos).
  hideSecondaryFeatures?: boolean
}

export function PropertyCard({
  property,
  prioritizeFirstImage = false,
  variant = "vertical",
  compactFeatures = false,
  context = "default",
  priceContext = null,
  wishlistAction = "toggle",
  onRemove,
  hideSecondaryFeatures = false,
}: PropertyCardProps) {
  const alt = generateImageAlt(property)
  // Helper centraliza logica: dual detectado se ambos precos > 0 (nao depende
  // de Finalidade CRM que as vezes vem vazia mesmo em imoveis dual). Respeita
  // finalidade explicita "Venda" / "Locação" pra escolher preco primario.
  const { price, secondaryPrice, isRental, isDual } = getPropertyPriceDisplay(property, priceContext)
  const primaryIsRental = isRental
  const photos = useMemo(() => getPropertyPhotos(property), [property])
  const [topViewed, setTopViewed] = useState<Set<string>>(new Set())
  useEffect(() => {
    const load = () => setTopViewed(getTopViewedCodes())
    if ("requestIdleCallback" in window) {
      requestIdleCallback(load)
    } else {
      load()
    }
  }, [])

  const badge = useMemo(() => getBadge(property, topViewed), [property, topViewed])
  const [dynamicPhotos, setDynamicPhotos] = useState<string[] | null>(null)
  const fetchedRef = useRef(false)
  const articleRef = useRef<HTMLElement>(null)

  // Em favoritos (wishlistAction="remove"), nao carregamos fotos extras:
  // user ja viu as fotos quando favoritou, card funciona como mini-preview
  // estatico. Zero arrows, zero swipe, zero fetch /api/photos (1 req/card saved).
  const isFavoritesCard = wishlistAction === "remove"

  const loadPhotosOnHover = useCallback(() => {
    if (isFavoritesCard) return
    if (fetchedRef.current || photos.length > 1) return

    fetchedRef.current = true
    fetch(`/api/photos/${property.codigo}`)
      .then((response) => (response.ok ? response.json() : []))
      .then((apiPhotos: string[]) => {
        if (apiPhotos.length > 1) {
          setDynamicPhotos(apiPhotos)
        }
      })
      .catch(() => {})
  }, [property.codigo, photos.length, isFavoritesCard])

  // Auto-trigger no mobile (sem hover). IntersectionObserver dispara o fetch
  // quando card entra em viewport. Desktop tambem se beneficia — redundante
  // com onMouseEnter mas fetchedRef guard evita duplicacao. Vista API nao
  // permite { Foto: [...] } em /imoveis/listar (so em /detalhes), entao
  // essa estrategia lazy eh necessaria pra ter multiplas fotos no card.
  useEffect(() => {
    if (isFavoritesCard) return
    const el = articleRef.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      // Fallback: trigger imediato em browsers muito antigos
      loadPhotosOnHover()
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadPhotosOnHover()
          observer.disconnect()
        }
      },
      { rootMargin: "200px" } // trigger 200px antes do card aparecer
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadPhotosOnHover, isFavoritesCard])

  const displayPhotos = dynamicPhotos ?? photos

  const propertyHref = `/imovel/${property.slug}`
  const isHorizontal = variant === "horizontal"
  const isResponsive = variant === "responsive"
  const isSearchContext = context === "search"
  const isCompactCard = compactFeatures && !isHorizontal && !isResponsive
  const useInlineFeatures =
    (isResponsive || compactFeatures || (isHorizontal && !isSearchContext)) && !isCompactCard
  const hasPrice = price !== null && price > 0
  const displayPrice = hasPrice
    ? formatPrice(price)
    : isSearchContext
      ? "Consultar valor"
      : formatPrice(price)

  const router = useRouter()

  // Handler de click no card inteiro. Verifica se clique foi em elemento
  // interativo (botao, link interno) antes de navegar — evita navegar
  // quando user clica em FavoriteButton/setas do carousel/etc.
  const handleCardClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const target = event.target as HTMLElement
      if (target.closest('button, a, [role="button"]')) return
      // GA4 select_item (Google recommended) — sinaliza qual card foi
      // clicado em qual lista. Funil view_item_list -> select_item ->
      // view_item permite medir CTR de cards.
      const navPrice = isRental
        ? property.precoAluguel ?? 0
        : property.precoVenda ?? 0
      pushAnalyticsEvent("select_item", {
        item_list_name: context,
        items: [
          {
            item_id: property.codigo,
            item_name: property.titulo || property.codigo,
            item_category: property.tipo,
            item_category2: property.bairro,
            price: navPrice,
          },
        ],
        currency: "BRL",
        property_id: property.codigo,
        property_type: property.tipo,
        neighborhood: property.bairro,
        price_range: priceToBucket(navPrice) || "",
        bedrooms: property.dormitorios ?? 0,
        cta_location: `card_${context}`,
      })
      router.push(propertyHref)
    },
    [router, propertyHref, property, context, isRental]
  )

  return (
    <article
      ref={articleRef}
      onMouseEnter={loadPhotosOnHover}
      onClick={handleCardClick}
      className={cn(
        "group relative cursor-pointer overflow-hidden transition-all duration-300",
        isResponsive
          ? "flex flex-row rounded-2xl border border-neutral-200 bg-white hover:shadow-lg sm:flex-col sm:hover:-translate-y-1.5 sm:hover:border-brand-primary/30 sm:hover:shadow-2xl"
          : isHorizontal
            ? "flex flex-col rounded-2xl border border-neutral-200 bg-white hover:shadow-lg sm:flex-row sm:hover:shadow-xl"
            : isSearchContext
              ? "flex h-full flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"
              : isCompactCard
                ? "flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-md hover:-translate-y-1.5 hover:shadow-xl"
                : "flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm hover:-translate-y-1 hover:shadow-xl"
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden",
          isResponsive
            ? "w-28 shrink-0 self-stretch sm:w-full sm:shrink sm:self-auto sm:aspect-[4/3]"
            : isHorizontal
              ? "aspect-[4/3] sm:aspect-auto sm:min-h-[250px] sm:w-2/5 sm:shrink-0 sm:self-stretch"
              : isSearchContext
                ? "aspect-[16/9]"
                : isCompactCard
                  ? "aspect-[16/10]"
                  : "aspect-[21/9] max-h-[400px] xl:max-h-[480px]"
        )}
      >
        {isHorizontal && !isResponsive ? (
          <Image
            src={displayPhotos[0]}
            alt={alt}
            fill
            priority={prioritizeFirstImage}
            loading={prioritizeFirstImage ? "eager" : "lazy"}
            fetchPriority={prioritizeFirstImage ? "high" : "auto"}
            className="object-cover transition-transform duration-[1500ms] ease-out group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 40vw"
            unoptimized={isVistaImage(displayPhotos[0])}
          />
        ) : (
          <PhotoCarousel
            photos={displayPhotos}
            alt={alt}
            codigo={property.codigo}
            prioritizeFirstImage={prioritizeFirstImage}
            lcpHint={prioritizeFirstImage}
            imageClassName={
              isCompactCard
                ? "transition-transform duration-[1500ms] ease-out group-hover:scale-110"
                : "transition-transform duration-[1500ms] ease-out group-hover:scale-105"
            }
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/40 to-transparent" />
        {isSearchContext && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 via-black/25 to-transparent" />
        )}

        {badge && (
          <CardBadge
            badge={badge}
            className={cn(
              "absolute z-20",
              isHorizontal || isResponsive
                ? "left-1.5 top-1.5 sm:left-3 sm:top-3"
                : "left-3 top-3"
            )}
          />
        )}

        {/* Em favoritos, botao "remover" vai inline no content area (evita
            colidir com pill DESTAQUE/LANCAMENTO em cards mobile estreitos). */}
        {!isFavoritesCard && (
          <FavoriteButton
            codigo={property.codigo}
            action={wishlistAction}
            onRemove={onRemove}
            className="right-2 top-2 size-7 sm:right-3 sm:top-3 sm:size-9"
          />
        )}

        {isSearchContext && (
          <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between px-5 pb-4">
            <div>
              <p className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
                {displayPrice}
                {isRental && hasPrice && (
                  <span className="text-sm font-normal text-white/80"> /mês</span>
                )}
              </p>
              {isDual && secondaryPrice && (
                <p className="mt-0.5 text-sm font-semibold text-white/80 drop-shadow-md">
                  {primaryIsRental ? "Venda " : "Aluguel "}
                  {formatPrice(secondaryPrice)}
                  {!primaryIsRental && " /mês"}
                </p>
              )}
            </div>
            <span className="text-sm font-medium uppercase text-slate-200 drop-shadow-md">
              {property.codigo}
            </span>
          </div>
        )}

      </div>

      <div
        className={cn(
          isResponsive
            ? "flex min-w-0 flex-1 flex-col justify-center gap-1 p-3 sm:flex-none sm:gap-0 sm:space-y-1.5 sm:p-4 md:p-5"
            : isSearchContext
                ? "flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5"
                : isHorizontal
                  ? "flex min-w-0 flex-1 flex-col justify-center gap-1.5 p-4 sm:gap-2 sm:p-6"
                  : isCompactCard
                    ? "flex flex-1 flex-col gap-2.5 p-4"
                    : "flex flex-1 flex-col space-y-3 p-5"
        )}
      >
        {isSearchContext ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              {property.tipo}
            </span>
            {property.bairro && (
              <span className="rounded-full bg-slate-100/90 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                {property.bairro}
              </span>
            )}
          </div>
        ) : isHorizontal || isResponsive ? (
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-neutral-500">
              {property.tipo}
              {property.bairro && (
                <>
                  <span className="mx-2">•</span>
                  {property.bairro}
                </>
              )}
            </p>
            {isFavoritesCard && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  // Mesma logica do FavoriteButton action="remove":
                  // le wishlist do localStorage, remove codigo, persiste, dispara callback.
                  try {
                    const raw = window.localStorage.getItem("fymoob:wishlist")
                    const current: string[] = raw ? JSON.parse(raw) : []
                    const next = Array.isArray(current)
                      ? current.filter((c) => c !== property.codigo)
                      : []
                    window.localStorage.setItem("fymoob:wishlist", JSON.stringify(next))
                  } catch {
                    // ignore
                  }
                  onRemove?.(property.codigo)
                }}
                aria-label="Remover dos favoritos"
                className="group/remove -mt-0.5 -mr-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-rose-50 hover:text-rose-600 sm:size-8"
              >
                <Trash2 className="size-4 stroke-[2px]" />
              </button>
            )}
          </div>
        ) : isCompactCard ? (
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {property.tipo}
            {property.bairro && (
              <>
                <span className="mx-1.5 text-slate-300">&bull;</span>
                {property.bairro}
              </>
            )}
          </p>
        ) : null}

        <h2
          className={cn(
            "tracking-tight transition-colors",
            isSearchContext
              ? "line-clamp-2 text-lg font-semibold leading-snug text-slate-800 group-hover:text-slate-600"
              : isHorizontal
                ? "line-clamp-2 text-sm font-bold text-neutral-900 sm:text-lg"
                : isResponsive
                ? "line-clamp-2 text-sm font-bold text-neutral-900 sm:text-base"
                : isCompactCard
                  ? "line-clamp-2 text-[15px] font-semibold leading-snug text-slate-800"
                  : "truncate text-lg font-semibold leading-snug text-slate-800"
          )}
        >
          {property.titulo}
        </h2>

        {useInlineFeatures && (
          <div>
            <p
              className={cn(
                "font-semibold tracking-tight text-slate-900",
                isHorizontal
                  ? "text-lg sm:text-xl"
                  : isResponsive
                    ? "text-base sm:text-lg"
                    : "text-xl",
                hasPrice ? "text-slate-900" : "text-slate-500"
              )}
            >
              {displayPrice}
              {isRental && hasPrice && (
                <span className="text-xs font-normal text-neutral-500"> /mês</span>
              )}
            </p>
            {isDual && secondaryPrice && (
              <p className="text-xs font-semibold text-slate-500 sm:text-sm">
                {primaryIsRental ? "Venda " : "Aluguel "}
                {formatPrice(secondaryPrice)}
                {!primaryIsRental && " /mês"}
              </p>
            )}
          </div>
        )}

        {isCompactCard ? (
          <PropertyFeatures
            dormitorios={property.dormitorios}
            suites={hideSecondaryFeatures ? null : property.suites}
            banheiros={hideSecondaryFeatures ? null : property.banheiros}
            vagas={property.vagas}
            areaPrivativa={property.areaPrivativa}
            cardCompact
          />
        ) : !useInlineFeatures ? (
          <div className="pb-1">
            <PropertyFeatures
              dormitorios={property.dormitorios}
              banheiros={hideSecondaryFeatures ? null : property.banheiros}
              vagas={property.vagas}
              areaPrivativa={property.areaPrivativa}
              cardCompact={isSearchContext}
              editorial={!isSearchContext}
            />
          </div>
        ) : (
          <PropertyFeatures
            dormitorios={property.dormitorios}
            suites={hideSecondaryFeatures ? null : property.suites}
            banheiros={hideSecondaryFeatures ? null : property.banheiros}
            vagas={property.vagas}
            areaPrivativa={property.areaPrivativa}
            size="sm"
            compact={isResponsive}
          />
        )}

        {isCompactCard ? (
          <div className="mt-auto">
            <div className="flex items-end justify-between border-t border-slate-100 pt-3">
              <div>
                <p
                  className={cn(
                    "text-lg font-bold tracking-tight sm:text-2xl sm:font-extrabold",
                    hasPrice ? "text-slate-900" : "text-slate-400"
                  )}
                >
                  {displayPrice}
                  {isRental && hasPrice && (
                    <span className="text-[10px] font-normal text-slate-500 sm:text-xs"> /mês</span>
                  )}
                </p>
                {isDual && secondaryPrice && (
                  <p className="mt-0.5 text-xs font-semibold text-slate-500 sm:text-sm">
                    {primaryIsRental ? "Venda " : "Aluguel "}
                    {formatPrice(secondaryPrice)}
                    {!primaryIsRental && " /mês"}
                  </p>
                )}
              </div>
              <span className="text-xs font-medium text-slate-400 sm:text-sm sm:font-semibold sm:text-slate-500">
                {property.codigo}
              </span>
            </div>
          </div>
        ) : !useInlineFeatures && !isSearchContext ? (
          <div className="mt-auto flex items-end justify-between gap-4 border-t border-slate-100 pt-4">
            <div>
              <p
                className={cn(
                  "text-2xl font-extrabold tracking-tight",
                  hasPrice ? "text-slate-900" : "text-slate-500"
                )}
              >
                {displayPrice}
                {isRental && hasPrice && (
                  <span className="text-sm font-normal text-neutral-500"> /mês</span>
                )}
              </p>
              {isDual && secondaryPrice && (
                <p className="mt-0.5 text-sm font-semibold text-slate-500">
                  {primaryIsRental ? "Venda " : "Aluguel "}
                  {formatPrice(secondaryPrice)}
                  {!primaryIsRental && " /mês"}
                </p>
              )}
            </div>
            <span className="shrink-0 text-right text-xs font-medium text-slate-400">
              {property.codigo}
            </span>
          </div>
        ) : null}
      </div>

      {/* Link invisivel so pra SEO (anchor com href para crawlers) +
          navegacao por teclado (Tab + Enter). Click visual do card
          inteiro usa handleCardClick via onClick do <article>.
          sr-only esconde visualmente mas mantem na arvore de acessibilidade. */}
      <Link
        href={propertyHref}
        aria-label={`Ver detalhes de ${property.titulo}`}
        className="sr-only"
      >
        Ver detalhes
      </Link>
    </article>
  )
}
