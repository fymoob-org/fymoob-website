#!/usr/bin/env node
/**
 * scripts/gsc-resubmit-sitemaps.mjs
 *
 * Re-submete os 4 sitemap shards pra GSC sinalizando que o conteudo
 * mudou (apos commit cd2bcfb que removeu 5 bairros 404 + outros fixes
 * de cobertura). Usa OAuth refresh_token do .env.local (mesmo padrao
 * do gsc-coverage-audit.mjs).
 *
 * Submit nao garante reindexacao imediata — apenas sinaliza ao Google
 * que o sitemap mudou. O re-crawl natural acontece a cada poucos dias
 * de qualquer forma; submit acelera em ~24-48h.
 *
 * Uso: node scripts/gsc-resubmit-sitemaps.mjs
 */

import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { google } from "googleapis"

const ENV_PATH = join(process.cwd(), ".env.local")
const SITEMAPS = [
  "https://fymoob.com.br/sitemap/0.xml",
  "https://fymoob.com.br/sitemap/1.xml",
  "https://fymoob.com.br/sitemap/2.xml",
  "https://fymoob.com.br/sitemap/3.xml",
]

function parseEnv(content) {
  const out = {}
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
  return out
}

if (!existsSync(ENV_PATH)) {
  console.error(`ERRO: .env.local nao encontrado em ${ENV_PATH}`)
  process.exit(1)
}

const env = parseEnv(readFileSync(ENV_PATH, "utf8"))
const SITE_URL = env.GSC_SITE_URL || "sc-domain:fymoob.com.br"

if (!env.GA4_CLIENT_ID || !env.GA4_CLIENT_SECRET || !env.GSC_REFRESH_TOKEN) {
  console.error(
    "ERRO: faltam GA4_CLIENT_ID / GA4_CLIENT_SECRET / GSC_REFRESH_TOKEN em .env.local",
  )
  console.error("Rode `node scripts/gsc-oauth-bootstrap.mjs` primeiro.")
  process.exit(1)
}

const oauth2 = new google.auth.OAuth2(env.GA4_CLIENT_ID, env.GA4_CLIENT_SECRET)
oauth2.setCredentials({ refresh_token: env.GSC_REFRESH_TOKEN })

const searchconsole = google.searchconsole({ version: "v1", auth: oauth2 })

async function listCurrent() {
  try {
    const { data } = await searchconsole.sitemaps.list({ siteUrl: SITE_URL })
    return data.sitemap || []
  } catch (e) {
    console.error("ERRO ao listar sitemaps existentes:", e?.message || e)
    return []
  }
}

async function submitOne(sitemapUrl) {
  try {
    await searchconsole.sitemaps.submit({
      siteUrl: SITE_URL,
      feedpath: sitemapUrl,
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
}

async function main() {
  console.log(`\n=== GSC Resubmit Sitemaps — FYMOOB ===`)
  console.log(`Site: ${SITE_URL}`)

  console.log(`\n[1/2] Estado atual no GSC:`)
  const current = await listCurrent()
  if (current.length === 0) {
    console.log(`  (nenhum sitemap registrado ainda no GSC)`)
  } else {
    for (const sm of current) {
      const lastSubmitted = sm.lastSubmitted ? new Date(sm.lastSubmitted).toISOString().slice(0, 10) : "n/a"
      const lastDownloaded = sm.lastDownloaded ? new Date(sm.lastDownloaded).toISOString().slice(0, 10) : "n/a"
      const errors = sm.errors || 0
      const warnings = sm.warnings || 0
      console.log(
        `  ${sm.path} (submetido ${lastSubmitted}, baixado ${lastDownloaded}, ${errors} err, ${warnings} warn)`,
      )
    }
  }

  console.log(`\n[2/2] Resubmetendo ${SITEMAPS.length} shards...`)
  const stats = { ok: 0, fail: 0 }
  for (const sm of SITEMAPS) {
    const r = await submitOne(sm)
    if (r.ok) {
      console.log(`  ✓ ${sm}`)
      stats.ok++
    } else {
      console.log(`  ✗ ${sm}: ${r.error}`)
      stats.fail++
    }
  }

  console.log(`\n=== Resultado ===`)
  console.log(`Sucesso: ${stats.ok}/${SITEMAPS.length}`)
  if (stats.fail > 0) console.log(`Falhas:  ${stats.fail}`)
  console.log(`\nGoogle re-crawla os sitemaps em 24-48h tipicamente.`)
  console.log(`Pra acompanhar: GSC > Indexacao > Sitemaps`)
}

main().catch((err) => {
  console.error("\n[FATAL]", err?.message || err)
  process.exit(1)
})
