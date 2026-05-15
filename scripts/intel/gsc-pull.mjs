#!/usr/bin/env node
/**
 * Sprint 1 — Analytics Intelligence (Linha A)
 * Evidence collector pra GSC. Roda deterministico, gera JSON, ZERO LLM.
 *
 * AUTH: usa OAuth refresh token de .env.local (GA4_CLIENT_ID +
 * GA4_CLIENT_SECRET + GSC_REFRESH_TOKEN). NAO usa Service Account porque
 * o Google tem um bug ativo desde 23/abr/2026 que rejeita SAs novas no
 * Search Console com "email not found". Ver docs/analytics/intel-setup.md.
 *
 * Uso:
 *   node scripts/intel/gsc-pull.mjs                                # auto: D-10..D-3 vs D-17..D-10
 *   node scripts/intel/gsc-pull.mjs --output tmp/intel/gsc.json
 *   node scripts/intel/gsc-pull.mjs --p1 2026-05-06..2026-05-12 \
 *     --p2 2026-04-29..2026-05-05 --output tmp/intel/gsc.json
 *
 * Output JSON estrutura:
 *   { meta, summary, topQueries, topPages, bigMovers, opportunities, devices }
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import process from "node:process"
import { google } from "googleapis"

const ENV_PATH = join(process.cwd(), ".env.local")
const SITE_URL = process.env.GSC_SITE_URL || "sc-domain:fymoob.com.br"

const args = process.argv.slice(2)
const getArg = (flag) => {
  const idx = args.indexOf(flag)
  return idx >= 0 ? args[idx + 1] : null
}

const p1Arg = getArg("--p1")
const p2Arg = getArg("--p2")
const outputPath = getArg("--output")

// ─────────────────────────────────────────────────────────────────────────
// Auth via OAuth refresh token
// ─────────────────────────────────────────────────────────────────────────

function parseEnv(content) {
  const out = {}
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
  return out
}

const env = parseEnv(readFileSync(ENV_PATH, "utf-8"))
if (!env.GA4_CLIENT_ID || !env.GA4_CLIENT_SECRET || !env.GSC_REFRESH_TOKEN) {
  console.error("✗ Faltam GA4_CLIENT_ID / GA4_CLIENT_SECRET / GSC_REFRESH_TOKEN em .env.local")
  console.error("  Rode: node scripts/gsc-oauth-bootstrap.mjs")
  process.exit(1)
}

const oauth2 = new google.auth.OAuth2(env.GA4_CLIENT_ID, env.GA4_CLIENT_SECRET)
oauth2.setCredentials({ refresh_token: env.GSC_REFRESH_TOKEN })
const searchconsole = google.searchconsole({ version: "v1", auth: oauth2 })

// ─────────────────────────────────────────────────────────────────────────
// Helpers de data
// ─────────────────────────────────────────────────────────────────────────

function ymd(date) {
  return date.toISOString().slice(0, 10)
}

function isoWeek(date) {
  const target = new Date(date.valueOf())
  const dayNr = (date.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNr + 3)
  const firstThursday = target.valueOf()
  target.setUTCMonth(0, 1)
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7)
  }
  const year = new Date(firstThursday).getUTCFullYear()
  const week = 1 + Math.ceil((firstThursday - target) / 604800000)
  return { year, week }
}

function defaultPeriods(refDate = new Date()) {
  // GSC tem lag 2-3 dias. D-10..D-3 = 7 dias confiaveis recentes.
  const end = new Date(refDate)
  end.setUTCDate(end.getUTCDate() - 3)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 6)
  const compareEnd = new Date(start)
  compareEnd.setUTCDate(compareEnd.getUTCDate() - 1)
  const compareStart = new Date(compareEnd)
  compareStart.setUTCDate(compareStart.getUTCDate() - 6)
  return {
    p1: { start: ymd(start), end: ymd(end) },
    p2: { start: ymd(compareStart), end: ymd(compareEnd) },
  }
}

let p1Start, p1End, p2Start, p2End
if (p1Arg && p2Arg) {
  ;[p1Start, p1End] = p1Arg.split("..")
  ;[p2Start, p2End] = p2Arg.split("..")
} else {
  const { p1, p2 } = defaultPeriods()
  p1Start = p1.start
  p1End = p1.end
  p2Start = p2.start
  p2End = p2.end
}

// ─────────────────────────────────────────────────────────────────────────
// GSC API helpers
// ─────────────────────────────────────────────────────────────────────────

async function queryGSC({ startDate, endDate, dimensions, rowLimit = 50 }) {
  const { data } = await searchconsole.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: { startDate, endDate, dimensions, rowLimit },
  })
  return data.rows || []
}

async function totalsFor(start, end) {
  const rows = await queryGSC({
    startDate: start,
    endDate: end,
    dimensions: [],
    rowLimit: 1,
  })
  const r = rows[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 }
  return {
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: r.ctr || 0,
    position: r.position || 0,
  }
}

function diff(a, b) {
  return Number((a - b).toFixed(4))
}

function pctDelta(a, b) {
  if (b === 0) return null
  return Number((((a - b) / b) * 100).toFixed(1))
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

console.error(`▸ GSC: ${SITE_URL}`)
console.error(`  Periodo 1 (atual): ${p1Start} -> ${p1End}`)
console.error(`  Periodo 2 (compare): ${p2Start} -> ${p2End}`)

const [p1Totals, p2Totals, p1Queries, p2Queries, p1Pages, p2Pages, p1Devices] =
  await Promise.all([
    totalsFor(p1Start, p1End),
    totalsFor(p2Start, p2End),
    queryGSC({ startDate: p1Start, endDate: p1End, dimensions: ["query"], rowLimit: 100 }),
    queryGSC({ startDate: p2Start, endDate: p2End, dimensions: ["query"], rowLimit: 100 }),
    queryGSC({ startDate: p1Start, endDate: p1End, dimensions: ["page"], rowLimit: 50 }),
    queryGSC({ startDate: p2Start, endDate: p2End, dimensions: ["page"], rowLimit: 50 }),
    queryGSC({ startDate: p1Start, endDate: p1End, dimensions: ["device"], rowLimit: 5 }),
  ])

const queryMap = new Map()
for (const r of p1Queries) {
  queryMap.set(r.keys[0], {
    query: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
    prevClicks: 0,
    prevImpressions: 0,
    prevPosition: null,
  })
}
for (const r of p2Queries) {
  const k = r.keys[0]
  if (queryMap.has(k)) {
    const e = queryMap.get(k)
    e.prevClicks = r.clicks
    e.prevImpressions = r.impressions
    e.prevPosition = r.position
  } else {
    queryMap.set(k, {
      query: k,
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: null,
      prevClicks: r.clicks,
      prevImpressions: r.impressions,
      prevPosition: r.position,
    })
  }
}
const queryComparison = [...queryMap.values()].map((q) => ({
  ...q,
  clicksDelta: q.clicks - q.prevClicks,
  impressionsDelta: q.impressions - q.prevImpressions,
  positionDelta:
    q.prevPosition !== null && q.position !== null
      ? Number((q.prevPosition - q.position).toFixed(2))
      : null,
}))

const topQueries = [...queryComparison].sort((a, b) => b.clicks - a.clicks).slice(0, 30)

const bigMoversUp = [...queryComparison]
  .filter((q) => q.positionDelta !== null && q.positionDelta >= 5 && q.impressions >= 10)
  .sort((a, b) => b.positionDelta - a.positionDelta)
  .slice(0, 10)

const bigMoversDown = [...queryComparison]
  .filter((q) => q.positionDelta !== null && q.positionDelta <= -5 && q.impressions >= 10)
  .sort((a, b) => a.positionDelta - b.positionDelta)
  .slice(0, 10)

const lowCtrTopRanked = [...queryComparison]
  .filter((q) => q.position !== null && q.position <= 10 && q.ctr < 0.01 && q.impressions >= 50)
  .sort((a, b) => b.impressions - a.impressions)
  .slice(0, 15)

const pageMap = new Map()
for (const r of p1Pages) {
  pageMap.set(r.keys[0], {
    page: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
    prevClicks: 0,
    prevImpressions: 0,
  })
}
for (const r of p2Pages) {
  const k = r.keys[0]
  if (pageMap.has(k)) {
    const e = pageMap.get(k)
    e.prevClicks = r.clicks
    e.prevImpressions = r.impressions
  } else {
    pageMap.set(k, {
      page: k,
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: null,
      prevClicks: r.clicks,
      prevImpressions: r.impressions,
    })
  }
}
const topPages = [...pageMap.values()]
  .map((p) => ({
    ...p,
    clicksDelta: p.clicks - p.prevClicks,
    impressionsDelta: p.impressions - p.prevImpressions,
  }))
  .sort((a, b) => b.clicks - a.clicks)
  .slice(0, 30)

const devices = p1Devices.map((r) => ({
  device: r.keys[0],
  clicks: r.clicks,
  impressions: r.impressions,
  ctr: r.ctr,
  position: r.position,
}))

const { year, week } = isoWeek(new Date(p1End))
const out = {
  meta: {
    generatedAt: new Date().toISOString(),
    site: SITE_URL,
    weekISO: `${year}-W${String(week).padStart(2, "0")}`,
    period: { start: p1Start, end: p1End },
    comparePeriod: { start: p2Start, end: p2End },
    source: "GSC Search Analytics API via OAuth refresh token",
  },
  summary: {
    clicks: p1Totals.clicks,
    impressions: p1Totals.impressions,
    ctr: Number(p1Totals.ctr.toFixed(4)),
    position: Number(p1Totals.position.toFixed(2)),
    prev: {
      clicks: p2Totals.clicks,
      impressions: p2Totals.impressions,
      ctr: Number(p2Totals.ctr.toFixed(4)),
      position: Number(p2Totals.position.toFixed(2)),
    },
    deltas: {
      clicks: diff(p1Totals.clicks, p2Totals.clicks),
      clicksPct: pctDelta(p1Totals.clicks, p2Totals.clicks),
      impressions: diff(p1Totals.impressions, p2Totals.impressions),
      impressionsPct: pctDelta(p1Totals.impressions, p2Totals.impressions),
      ctr: Number((p1Totals.ctr - p2Totals.ctr).toFixed(4)),
      ctrPp: Number(((p1Totals.ctr - p2Totals.ctr) * 100).toFixed(2)),
      position: Number((p2Totals.position - p1Totals.position).toFixed(2)),
    },
  },
  topQueries,
  topPages,
  bigMovers: { up: bigMoversUp, down: bigMoversDown },
  opportunities: { lowCtrTopRanked },
  devices,
}

const json = JSON.stringify(out, null, 2)
if (outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, json)
  console.error(`✓ Salvo em ${outputPath} (${json.length} bytes)`)
} else {
  process.stdout.write(json + "\n")
}

console.error(`  Cliques: ${p1Totals.clicks} (vs ${p2Totals.clicks}, delta ${out.summary.deltas.clicks})`)
console.error(`  Impressoes: ${p1Totals.impressions} (vs ${p2Totals.impressions}, delta ${out.summary.deltas.impressions})`)
console.error(`  Top queries: ${topQueries.length} | Top pages: ${topPages.length}`)
