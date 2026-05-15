#!/usr/bin/env node
/**
 * Audita os 95 empreendimentos pra identificar gaps de SEO/UX:
 * - Sem fotoDestaque (OG ruim)
 * - Sem geo (lat/lng)
 * - Sem descricao
 * - Sem construtora
 * - Title duplicado
 * - 1 unico imovel (low-content)
 *
 * Usa API publica do site (sitemap + paginas) — nao consome cota Loft.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"

const BASE = "https://fymoob.com.br"
const UA = "Mozilla/5.0 (compatible; FYMOOB-Audit/1.0)"

async function fetchSitemapEmpreendimentos() {
  const slugs = []
  for (let i = 0; i < 4; i++) {
    const res = await fetch(`${BASE}/sitemap/${i}.xml`, { headers: { "user-agent": UA } })
    if (!res.ok) continue
    const xml = await res.text()
    const matches = xml.matchAll(/<loc>https:\/\/fymoob\.com\.br\/empreendimento\/([a-z0-9-]+)<\/loc>/g)
    for (const m of matches) slugs.push(m[1])
  }
  return [...new Set(slugs)]
}

async function inspectEmpreendimento(slug) {
  const url = `${BASE}/empreendimento/${slug}`
  const res = await fetch(url, { headers: { "user-agent": UA } })
  if (!res.ok) return { slug, ok: false, status: res.status }
  const html = await res.text()
  const titleMatch = html.match(/<title>([^<]+)<\/title>/)
  const descMatch = html.match(/<meta name="description" content="([^"]+)"/)
  const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
  const canonicalMatch = html.match(/<link rel="canonical" href="([^"]+)"/)
  const robotsMatch = html.match(/<meta name="robots" content="([^"]+)"/)
  const ldJsonMatches = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)]
  const hasFAQ = ldJsonMatches.some((m) => m[1].includes('"@type":"FAQPage"'))
  const hasItemList = ldJsonMatches.some((m) => m[1].includes('"@type":"ItemList"'))
  const hasBreadcrumb = ldJsonMatches.some((m) => m[1].includes('"@type":"BreadcrumbList"'))
  const hasRealEstate = ldJsonMatches.some((m) => m[1].includes("RealEstateListing"))
  const hasGeo = /"latitude":\s*-?\d+\.\d+/.test(html) || /"geo":\s*\{/.test(html)
  const titleLen = titleMatch?.[1].length || 0
  const descLen = descMatch?.[1].length || 0
  // Conta imagens reais (excluindo logo + ícones)
  const imageMatches = [...html.matchAll(/<img[^>]*src="([^"]+)"/g)]
  const realImages = imageMatches.filter(
    (m) =>
      m[1].includes("vistahost") ||
      m[1].includes("/images/empreendimentos") ||
      m[1].includes("/_next/image"),
  )
  return {
    slug,
    ok: true,
    title: titleMatch?.[1] || "",
    titleLen,
    desc: descMatch?.[1] || "",
    descLen,
    ogImage: ogImageMatch?.[1] || "",
    hasOgImage: !!ogImageMatch?.[1],
    canonical: canonicalMatch?.[1] || "",
    hasCanonical: !!canonicalMatch?.[1],
    robots: robotsMatch?.[1] || "(default)",
    hasFAQ,
    hasItemList,
    hasBreadcrumb,
    hasRealEstate,
    hasGeo,
    imageCount: realImages.length,
  }
}

async function main() {
  console.log("▸ Fetch sitemap")
  const slugs = await fetchSitemapEmpreendimentos()
  console.log(`  ${slugs.length} empreendimentos`)

  console.log("▸ Inspecting (paralelo 8x)")
  const results = []
  const CONCURRENCY = 8
  for (let i = 0; i < slugs.length; i += CONCURRENCY) {
    const batch = slugs.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map(inspectEmpreendimento))
    results.push(...batchResults)
    process.stdout.write(`  ${results.length}/${slugs.length}\r`)
  }
  console.log("")

  // Análise
  const ok = results.filter((r) => r.ok)
  const noOgImage = ok.filter((r) => !r.hasOgImage)
  const noGeo = ok.filter((r) => !r.hasGeo)
  const noFAQ = ok.filter((r) => !r.hasFAQ)
  const noItemList = ok.filter((r) => !r.hasItemList)
  const noBreadcrumb = ok.filter((r) => !r.hasBreadcrumb)
  const titleTooLong = ok.filter((r) => r.titleLen > 65)
  const titleTooShort = ok.filter((r) => r.titleLen < 30)
  const descTooShort = ok.filter((r) => r.descLen < 100)
  const fewImages = ok.filter((r) => r.imageCount < 3)

  // Title duplicados
  const titleMap = new Map()
  for (const r of ok) {
    if (!titleMap.has(r.title)) titleMap.set(r.title, [])
    titleMap.get(r.title).push(r.slug)
  }
  const dupTitles = [...titleMap.entries()].filter(([_, slugs]) => slugs.length > 1)

  console.log("\n=== RESUMO ===")
  console.log(`Total: ${slugs.length}`)
  console.log(`OK: ${ok.length}`)
  console.log(`Erros: ${results.length - ok.length}`)
  console.log("")
  console.log("Gaps:")
  console.log(`  Sem og:image:           ${noOgImage.length}`)
  console.log(`  Sem geo (lat/lng):      ${noGeo.length}`)
  console.log(`  Sem FAQ schema:         ${noFAQ.length}`)
  console.log(`  Sem ItemList schema:    ${noItemList.length}`)
  console.log(`  Sem BreadcrumbList:     ${noBreadcrumb.length}`)
  console.log(`  Title >65 chars:        ${titleTooLong.length}`)
  console.log(`  Title <30 chars:        ${titleTooShort.length}`)
  console.log(`  Description <100 chars: ${descTooShort.length}`)
  console.log(`  Imagens <3:             ${fewImages.length}`)
  console.log(`  Title duplicado:        ${dupTitles.length} grupos`)

  const out = {
    meta: {
      generatedAt: new Date().toISOString(),
      total: slugs.length,
      ok: ok.length,
    },
    summary: {
      noOgImage: noOgImage.length,
      noGeo: noGeo.length,
      noFAQ: noFAQ.length,
      noItemList: noItemList.length,
      noBreadcrumb: noBreadcrumb.length,
      titleTooLong: titleTooLong.length,
      titleTooShort: titleTooShort.length,
      descTooShort: descTooShort.length,
      fewImages: fewImages.length,
      dupTitleGroups: dupTitles.length,
    },
    issues: {
      noOgImage: noOgImage.map((r) => r.slug),
      noGeo: noGeo.map((r) => r.slug),
      noFAQ: noFAQ.map((r) => r.slug),
      noItemList: noItemList.map((r) => r.slug),
      titleTooLong: titleTooLong.map((r) => ({ slug: r.slug, len: r.titleLen, title: r.title })),
      titleTooShort: titleTooShort.map((r) => ({ slug: r.slug, len: r.titleLen, title: r.title })),
      descTooShort: descTooShort.map((r) => ({ slug: r.slug, len: r.descLen, desc: r.desc })),
      fewImages: fewImages.map((r) => ({ slug: r.slug, imageCount: r.imageCount })),
      dupTitles: dupTitles.map(([title, slugs]) => ({ title, slugs })),
    },
    all: ok,
  }

  const outPath = "tmp/intel/empreendimentos-audit.json"
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(out, null, 2))
  console.log(`\n✓ Salvo em ${outPath}`)
}

main().catch((e) => {
  console.error("FATAL:", e)
  process.exit(1)
})
