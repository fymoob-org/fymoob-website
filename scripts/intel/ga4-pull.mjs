#!/usr/bin/env node
/**
 * Sprint 1 — Analytics Intelligence (Linha A)
 * Evidence collector pra GA4. Roda deterministico, gera JSON, ZERO LLM.
 *
 * AUTH: usa OAuth refresh token de .env.local (GA4_CLIENT_ID +
 * GA4_CLIENT_SECRET + GA4_REFRESH_TOKEN + GA4_SITE_PRINCIPAL_PROPERTY_ID).
 * NAO usa Service Account por causa do bug ativo do Google desde
 * 23/abr/2026 que rejeita SAs novas em GA4 e GSC.
 *
 * Foco em eventos de conversao do site:
 *   - whatsapp_click (com click_source)
 *   - generate_lead (com form_id)
 *   - phone_click, view_item, select_item
 *
 * Uso:
 *   node scripts/intel/ga4-pull.mjs                              # auto: D-10..D-3 vs D-17..D-10
 *   node scripts/intel/ga4-pull.mjs --output tmp/intel/ga4.json
 *   node scripts/intel/ga4-pull.mjs --p1 ... --p2 ... --output ...
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import process from "node:process"
import { google } from "googleapis"

const ENV_PATH = join(process.cwd(), ".env.local")

const args = process.argv.slice(2)
const getArg = (flag) => {
  const idx = args.indexOf(flag)
  return idx >= 0 ? args[idx + 1] : null
}

const p1Arg = getArg("--p1")
const p2Arg = getArg("--p2")
const outputPath = getArg("--output")

function parseEnv(content) {
  const out = {}
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
  return out
}

const env = parseEnv(readFileSync(ENV_PATH, "utf-8"))
const {
  GA4_CLIENT_ID,
  GA4_CLIENT_SECRET,
  GA4_REFRESH_TOKEN,
  GA4_SITE_PRINCIPAL_PROPERTY_ID,
} = env

for (const [k, v] of Object.entries({
  GA4_CLIENT_ID,
  GA4_CLIENT_SECRET,
  GA4_REFRESH_TOKEN,
  GA4_SITE_PRINCIPAL_PROPERTY_ID,
})) {
  if (!v) {
    console.error(`✗ ${k} ausente em .env.local`)
    console.error("  Rode: node scripts/ga4-oauth-bootstrap.mjs")
    process.exit(1)
  }
}

const oauth2 = new google.auth.OAuth2(GA4_CLIENT_ID, GA4_CLIENT_SECRET)
oauth2.setCredentials({ refresh_token: GA4_REFRESH_TOKEN })
const analyticsdata = google.analyticsdata({ version: "v1beta", auth: oauth2 })
const propertyPath = `properties/${GA4_SITE_PRINCIPAL_PROPERTY_ID}`

// ─────────────────────────────────────────────────────────────────────────
// Helpers
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

async function runReport(body) {
  const { data } = await analyticsdata.properties.runReport({
    property: propertyPath,
    requestBody: body,
  })
  return data
}

function toNum(s) {
  return Number(s || 0)
}

function pctDelta(a, b) {
  if (b === 0) return null
  return Number((((a - b) / b) * 100).toFixed(1))
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

console.error(`▸ GA4: property ${GA4_SITE_PRINCIPAL_PROPERTY_ID}`)
console.error(`  Periodo 1 (atual): ${p1Start} -> ${p1End}`)
console.error(`  Periodo 2 (compare): ${p2Start} -> ${p2End}`)

const totalsBody = (start, end) => ({
  dateRanges: [{ startDate: start, endDate: end }],
  metrics: [
    { name: "sessions" },
    { name: "screenPageViews" },
    { name: "totalUsers" },
    { name: "engagementRate" },
    { name: "averageSessionDuration" },
  ],
})

const eventTotalsBody = (start, end) => ({
  dateRanges: [{ startDate: start, endDate: end }],
  dimensions: [{ name: "eventName" }],
  metrics: [{ name: "eventCount" }],
  dimensionFilter: {
    filter: {
      fieldName: "eventName",
      inListFilter: {
        values: ["whatsapp_click", "generate_lead", "phone_click", "view_item", "select_item"],
      },
    },
  },
})

// O codigo dispara `cta_location` (custom dim registrada em GA4 Admin),
// nao `click_source`. Ver src/components/analytics/WhatsAppClickTracker.tsx.
const waSourceBody = (start, end) => ({
  dateRanges: [{ startDate: start, endDate: end }],
  dimensions: [{ name: "customEvent:cta_location" }],
  metrics: [{ name: "eventCount" }],
  dimensionFilter: {
    filter: { fieldName: "eventName", stringFilter: { value: "whatsapp_click" } },
  },
  orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
  limit: 10,
})

const leadFormBody = (start, end) => ({
  dateRanges: [{ startDate: start, endDate: end }],
  dimensions: [{ name: "customEvent:form_id" }],
  metrics: [{ name: "eventCount" }],
  dimensionFilter: {
    filter: { fieldName: "eventName", stringFilter: { value: "generate_lead" } },
  },
  orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
  limit: 10,
})

const topPagesBody = (start, end) => ({
  dateRanges: [{ startDate: start, endDate: end }],
  dimensions: [{ name: "pagePath" }],
  metrics: [
    { name: "screenPageViews" },
    { name: "sessions" },
    { name: "engagementRate" },
    { name: "averageSessionDuration" },
  ],
  orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
  limit: 30,
})

const sourceBody = (start, end) => ({
  dateRanges: [{ startDate: start, endDate: end }],
  dimensions: [{ name: "sessionDefaultChannelGroup" }],
  metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "engagementRate" }],
  orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  limit: 10,
})

const [p1Tot, p2Tot, p1Events, p2Events, waSource, leadForm, topPages, channels] =
  await Promise.all([
    runReport(totalsBody(p1Start, p1End)),
    runReport(totalsBody(p2Start, p2End)),
    runReport(eventTotalsBody(p1Start, p1End)),
    runReport(eventTotalsBody(p2Start, p2End)),
    runReport(waSourceBody(p1Start, p1End)).catch(() => ({ rows: [] })),
    runReport(leadFormBody(p1Start, p1End)).catch(() => ({ rows: [] })),
    runReport(topPagesBody(p1Start, p1End)),
    runReport(sourceBody(p1Start, p1End)),
  ])

const totals = (data) => {
  const r = data.rows?.[0]
  if (!r) {
    return {
      sessions: 0,
      pageviews: 0,
      users: 0,
      engagementRate: 0,
      avgSessionDuration: 0,
    }
  }
  return {
    sessions: toNum(r.metricValues[0].value),
    pageviews: toNum(r.metricValues[1].value),
    users: toNum(r.metricValues[2].value),
    engagementRate: Number(toNum(r.metricValues[3].value).toFixed(4)),
    avgSessionDuration: Number(toNum(r.metricValues[4].value).toFixed(2)),
  }
}

const p1Totals = totals(p1Tot)
const p2Totals = totals(p2Tot)

const eventsMap = (data) => {
  const m = {}
  for (const r of data.rows || []) {
    m[r.dimensionValues[0].value] = toNum(r.metricValues[0].value)
  }
  return m
}
const p1Ev = eventsMap(p1Events)
const p2Ev = eventsMap(p2Events)

const bySource = {}
for (const r of waSource.rows || []) {
  const key = r.dimensionValues[0].value || "(none)"
  bySource[key] = toNum(r.metricValues[0].value)
}

const byForm = {}
for (const r of leadForm.rows || []) {
  const key = r.dimensionValues[0].value || "(none)"
  byForm[key] = toNum(r.metricValues[0].value)
}

const topPagesArr = (topPages.rows || []).map((r) => ({
  page: r.dimensionValues[0].value,
  pageviews: toNum(r.metricValues[0].value),
  sessions: toNum(r.metricValues[1].value),
  engagementRate: Number(toNum(r.metricValues[2].value).toFixed(4)),
  avgSessionDuration: Number(toNum(r.metricValues[3].value).toFixed(2)),
}))

const channelsArr = (channels.rows || []).map((r) => ({
  channel: r.dimensionValues[0].value,
  sessions: toNum(r.metricValues[0].value),
  users: toNum(r.metricValues[1].value),
  engagementRate: Number(toNum(r.metricValues[2].value).toFixed(4)),
}))

const { year, week } = isoWeek(new Date(p1End))
const out = {
  meta: {
    generatedAt: new Date().toISOString(),
    propertyId: GA4_SITE_PRINCIPAL_PROPERTY_ID,
    weekISO: `${year}-W${String(week).padStart(2, "0")}`,
    period: { start: p1Start, end: p1End },
    comparePeriod: { start: p2Start, end: p2End },
    source: "GA4 Data API via OAuth refresh token",
  },
  pageviews: {
    period: p1Totals,
    compare: p2Totals,
    deltas: {
      sessions: p1Totals.sessions - p2Totals.sessions,
      sessionsPct: pctDelta(p1Totals.sessions, p2Totals.sessions),
      pageviews: p1Totals.pageviews - p2Totals.pageviews,
      pageviewsPct: pctDelta(p1Totals.pageviews, p2Totals.pageviews),
      users: p1Totals.users - p2Totals.users,
      usersPct: pctDelta(p1Totals.users, p2Totals.users),
    },
  },
  conversions: {
    whatsapp_click: {
      total: p1Ev.whatsapp_click || 0,
      prev: p2Ev.whatsapp_click || 0,
      delta: (p1Ev.whatsapp_click || 0) - (p2Ev.whatsapp_click || 0),
      bySource,
    },
    generate_lead: {
      total: p1Ev.generate_lead || 0,
      prev: p2Ev.generate_lead || 0,
      delta: (p1Ev.generate_lead || 0) - (p2Ev.generate_lead || 0),
      byForm,
    },
    phone_click: {
      total: p1Ev.phone_click || 0,
      prev: p2Ev.phone_click || 0,
      delta: (p1Ev.phone_click || 0) - (p2Ev.phone_click || 0),
    },
    view_item: {
      total: p1Ev.view_item || 0,
      prev: p2Ev.view_item || 0,
      delta: (p1Ev.view_item || 0) - (p2Ev.view_item || 0),
    },
    select_item: {
      total: p1Ev.select_item || 0,
      prev: p2Ev.select_item || 0,
      delta: (p1Ev.select_item || 0) - (p2Ev.select_item || 0),
    },
  },
  funnels: {
    pageviews: p1Totals.pageviews,
    whatsappClick: p1Ev.whatsapp_click || 0,
    generateLead: p1Ev.generate_lead || 0,
    ctaClickRate: p1Totals.pageviews
      ? Number((((p1Ev.whatsapp_click || 0) / p1Totals.pageviews) * 100).toFixed(2))
      : 0,
    leadConversionRate: p1Ev.whatsapp_click
      ? Number((((p1Ev.generate_lead || 0) / p1Ev.whatsapp_click) * 100).toFixed(2))
      : 0,
  },
  topPages: topPagesArr,
  channels: channelsArr,
}

const json = JSON.stringify(out, null, 2)
if (outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, json)
  console.error(`✓ Salvo em ${outputPath} (${json.length} bytes)`)
} else {
  process.stdout.write(json + "\n")
}

console.error(`  Sessions: ${p1Totals.sessions} (vs ${p2Totals.sessions})`)
console.error(`  Pageviews: ${p1Totals.pageviews} (vs ${p2Totals.pageviews})`)
console.error(`  WhatsApp clicks: ${p1Ev.whatsapp_click || 0} | Leads: ${p1Ev.generate_lead || 0}`)
