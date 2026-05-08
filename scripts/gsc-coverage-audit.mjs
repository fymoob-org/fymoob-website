#!/usr/bin/env node
/**
 * scripts/gsc-coverage-audit.mjs
 *
 * Auditoria de cobertura/indexacao via GSC URL Inspection API.
 * Pega todas as URLs do sitemap em prod, inspeciona uma a uma, agrupa
 * por `coverageState` (motivo da indexacao ou nao), e escreve relatorio
 * JSON + CSV pra revisao.
 *
 * Auth: usa GSC_REFRESH_TOKEN do .env.local (gerado via
 * scripts/gsc-oauth-bootstrap.mjs). Reusa GA4_CLIENT_ID/SECRET (mesmo
 * OAuth client cobre as 2 APIs). Sem service account.
 *
 * Quota URL Inspection API: 2000 req/dia + 600 req/min por property.
 * O FYMOOB tem ~588 URLs no sitemap — cabe em 1 corrida.
 *
 * Uso:
 *   node scripts/gsc-coverage-audit.mjs                # processa tudo do sitemap
 *   node scripts/gsc-coverage-audit.mjs --limit 50     # so primeiras 50
 *   node scripts/gsc-coverage-audit.mjs --output tmp/coverage.json
 *
 * Output:
 *   tmp/gsc-coverage-YYYY-MM-DD.json — agrupado por categoria + URLs
 *   tmp/gsc-coverage-YYYY-MM-DD.csv  — flat: url,coverageState,robotsState,indexingState,lastCrawl
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { google } from "googleapis"

const ENV_PATH = join(process.cwd(), ".env.local")
const SITEMAP_URLS = [
  "https://fymoob.com.br/sitemap/0.xml",
  "https://fymoob.com.br/sitemap/1.xml",
  "https://fymoob.com.br/sitemap/2.xml",
  "https://fymoob.com.br/sitemap/3.xml",
]

const args = process.argv.slice(2)
const getArg = (flag) => {
  const idx = args.indexOf(flag)
  return idx >= 0 ? args[idx + 1] : null
}
const LIMIT = parseInt(getArg("--limit") || "0", 10) || null
const today = new Date().toISOString().slice(0, 10)
const OUTPUT = getArg("--output") || `tmp/gsc-coverage-${today}.json`

function parseEnv(content) {
  const out = {}
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
  return out
}

function loadEnv() {
  if (!existsSync(ENV_PATH)) {
    console.error(`ERRO: .env.local nao encontrado em ${ENV_PATH}`)
    process.exit(1)
  }
  return parseEnv(readFileSync(ENV_PATH, "utf8"))
}

const env = loadEnv()
const SITE_URL = env.GSC_SITE_URL || "sc-domain:fymoob.com.br"

if (!env.GA4_CLIENT_ID || !env.GA4_CLIENT_SECRET || !env.GSC_REFRESH_TOKEN) {
  console.error("ERRO: faltam GA4_CLIENT_ID / GA4_CLIENT_SECRET / GSC_REFRESH_TOKEN no .env.local")
  console.error("Rode `node scripts/gsc-oauth-bootstrap.mjs` primeiro pra obter o refresh_token.")
  process.exit(1)
}

const oauth2 = new google.auth.OAuth2(env.GA4_CLIENT_ID, env.GA4_CLIENT_SECRET)
oauth2.setCredentials({ refresh_token: env.GSC_REFRESH_TOKEN })

const searchconsole = google.searchconsole({ version: "v1", auth: oauth2 })

// ─────────────────────────────────────────────────────────────────────────
// Sitemap fetch + parse
// ─────────────────────────────────────────────────────────────────────────

async function fetchSitemap(url) {
  const res = await fetch(url, { headers: { "user-agent": "fymoob-audit/1.0" } })
  if (!res.ok) {
    console.warn(`[sitemap] ${url} retornou ${res.status}, pulando`)
    return []
  }
  const xml = await res.text()
  // parse simples — extrai todos <loc>...</loc>
  const matches = xml.matchAll(/<loc>([^<]+)<\/loc>/g)
  return [...matches].map((m) => m[1].trim())
}

async function collectSitemapUrls() {
  const all = []
  for (const sm of SITEMAP_URLS) {
    const urls = await fetchSitemap(sm)
    console.log(`  ${sm} -> ${urls.length} URLs`)
    all.push(...urls)
  }
  // dedupe preservando ordem
  return [...new Set(all)]
}

// ─────────────────────────────────────────────────────────────────────────
// URL Inspection API — 1 URL por chamada
// ─────────────────────────────────────────────────────────────────────────

async function inspectOne(pageUrl) {
  try {
    const { data } = await searchconsole.urlInspection.index.inspect({
      requestBody: {
        siteUrl: SITE_URL,
        inspectionUrl: pageUrl,
        languageCode: "pt-BR",
      },
    })
    const idx = data.inspectionResult?.indexStatusResult || {}
    return {
      url: pageUrl,
      verdict: idx.verdict || null, // PASS | FAIL | NEUTRAL
      coverageState: idx.coverageState || null,
      robotsTxtState: idx.robotsTxtState || null,
      indexingState: idx.indexingState || null,
      lastCrawlTime: idx.lastCrawlTime || null,
      pageFetchState: idx.pageFetchState || null,
      googleCanonical: idx.googleCanonical || null,
      userCanonical: idx.userCanonical || null,
      crawledAs: idx.crawledAs || null,
      sitemap: idx.sitemap || [],
      error: null,
    }
  } catch (e) {
    return {
      url: pageUrl,
      verdict: "ERROR",
      coverageState: null,
      error: e?.message || String(e),
    }
  }
}

// Concorrencia controlada — 5 paralelos eh seguro pra 600 req/min
async function inspectAll(urls, concurrency = 5) {
  const results = []
  let completed = 0
  const total = urls.length

  async function worker(slice) {
    for (const url of slice) {
      const r = await inspectOne(url)
      results.push(r)
      completed++
      if (completed % 25 === 0 || completed === total) {
        console.log(`  ${completed}/${total} (${Math.round((completed / total) * 100)}%)`)
      }
    }
  }

  // Particiona urls em N slices
  const slices = Array.from({ length: concurrency }, (_, i) =>
    urls.filter((_, idx) => idx % concurrency === i),
  )
  await Promise.all(slices.map(worker))

  // Restaura ordem original
  const idxMap = new Map(urls.map((u, i) => [u, i]))
  results.sort((a, b) => idxMap.get(a.url) - idxMap.get(b.url))
  return results
}

// ─────────────────────────────────────────────────────────────────────────
// Agrupamento por categoria
// ─────────────────────────────────────────────────────────────────────────

function categorize(results) {
  const byState = new Map()
  for (const r of results) {
    const key = r.coverageState || (r.verdict === "ERROR" ? "ERROR" : "UNKNOWN")
    if (!byState.has(key)) byState.set(key, [])
    byState.get(key).push(r)
  }
  // ordena categorias por tamanho desc
  return [...byState.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([state, urls]) => ({ state, count: urls.length, urls }))
}

// ─────────────────────────────────────────────────────────────────────────
// Output
// ─────────────────────────────────────────────────────────────────────────

function ensureDir(filepath) {
  const dir = dirname(filepath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function writeJson(filepath, data) {
  ensureDir(filepath)
  writeFileSync(filepath, JSON.stringify(data, null, 2), "utf8")
}

function writeCsv(filepath, results) {
  const csvPath = filepath.replace(/\.json$/, ".csv")
  ensureDir(csvPath)
  const header = "url,verdict,coverageState,robotsTxtState,indexingState,pageFetchState,googleCanonical,userCanonical,lastCrawlTime,error"
  const rows = results.map((r) =>
    [
      r.url,
      r.verdict ?? "",
      r.coverageState ?? "",
      r.robotsTxtState ?? "",
      r.indexingState ?? "",
      r.pageFetchState ?? "",
      r.googleCanonical ?? "",
      r.userCanonical ?? "",
      r.lastCrawlTime ?? "",
      (r.error ?? "").replace(/[\r\n,]/g, " "),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  )
  writeFileSync(csvPath, [header, ...rows].join("\n"), "utf8")
  return csvPath
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== GSC Coverage Audit — FYMOOB ===")
  console.log(`Site: ${SITE_URL}`)

  console.log("\n[1/3] Coletando URLs dos sitemaps...")
  let urls = await collectSitemapUrls()
  console.log(`  Total deduplicado: ${urls.length} URLs`)

  if (LIMIT && urls.length > LIMIT) {
    console.log(`  --limit ${LIMIT} aplicado, processando primeiras ${LIMIT}`)
    urls = urls.slice(0, LIMIT)
  }

  if (urls.length === 0) {
    console.error("Nenhuma URL coletada. Sitemap retornou vazio?")
    process.exit(1)
  }

  console.log(`\n[2/3] Inspecionando ${urls.length} URLs via GSC API (5 paralelos)...`)
  const t0 = Date.now()
  const results = await inspectAll(urls, 5)
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`  Concluido em ${elapsed}s`)

  console.log("\n[3/3] Agrupando por coverageState...")
  const categories = categorize(results)
  for (const c of categories) {
    console.log(`  ${c.state.padEnd(60)} ${c.count}`)
  }

  // Estatisticas resumo
  const summary = {
    total: results.length,
    indexed: results.filter((r) => r.verdict === "PASS").length,
    notIndexed: results.filter((r) => r.verdict === "FAIL" || r.verdict === "NEUTRAL").length,
    errors: results.filter((r) => r.verdict === "ERROR").length,
    byCoverageState: categories.map((c) => ({ state: c.state, count: c.count })),
  }

  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      site: SITE_URL,
      sitemapsScanned: SITEMAP_URLS,
      total: results.length,
      durationSeconds: parseFloat(elapsed),
    },
    summary,
    categories,
  }

  writeJson(OUTPUT, output)
  const csvPath = writeCsv(OUTPUT, results)

  console.log(`\n=== Resumo ===`)
  console.log(`Total inspecionado: ${summary.total}`)
  console.log(`Indexadas (PASS):   ${summary.indexed} (${Math.round((summary.indexed / summary.total) * 100)}%)`)
  console.log(`NAO indexadas:      ${summary.notIndexed} (${Math.round((summary.notIndexed / summary.total) * 100)}%)`)
  console.log(`Erros API:          ${summary.errors}`)
  console.log(`\nOutput JSON: ${OUTPUT}`)
  console.log(`Output CSV:  ${csvPath}`)
}

main().catch((err) => {
  console.error("\n[FATAL]", err?.message || err)
  if (err?.errors) console.error(err.errors)
  process.exit(1)
})
