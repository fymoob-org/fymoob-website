#!/usr/bin/env node
/**
 * Gerador determinístico do relatório semanal SEO.
 *
 * Lê os 3 JSONs gerados por gsc-pull/ga4-pull/audit-snapshot e compõe
 * markdown em docs/seo/reports/YYYY-WWW.md. Zero LLM, zero custo.
 *
 * Análise mecânica:
 * - Top movers (clicks/positions deltas)
 * - Low-CTR top-ranked (oportunidades imediatas)
 * - Cross-ref: pages com tráfego + issues do audit
 * - Funnel GA4 com warnings de tracking quebrado (eventos zerados)
 *
 * Uso:
 *   node scripts/intel/generate-weekly-report.mjs
 *   node scripts/intel/generate-weekly-report.mjs --week 2026-W20
 *
 * Dependências: gsc-pull + ga4-pull + audit-snapshot devem ter rodado
 * antes pro mesmo período. Se não rodaram, este script invoca os 3
 * automaticamente (require .env.local + tokens válidos).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { execSync } from "node:child_process"

const args = process.argv.slice(2)
const getArg = (flag) => {
  const idx = args.indexOf(flag)
  return idx >= 0 ? args[idx + 1] : null
}

const skipPull = args.includes("--skip-pull")
const force = args.includes("--force")
const weekOverride = getArg("--week")

function isoWeekFromDate(date) {
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
  return `${year}-W${String(week).padStart(2, "0")}`
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
    end: end.toISOString().slice(0, 10),
    start: start.toISOString().slice(0, 10),
    compareEnd: compareEnd.toISOString().slice(0, 10),
    compareStart: compareStart.toISOString().slice(0, 10),
  }
}

const periods = defaultPeriods()
const weekISO = weekOverride || isoWeekFromDate(new Date(periods.end))
console.error(`▸ Generating ${weekISO} report`)
console.error(`  Período: ${periods.start} → ${periods.end}`)
console.error(`  Compare: ${periods.compareStart} → ${periods.compareEnd}`)

const tmpDir = "tmp/intel"
const gscPath = `${tmpDir}/gsc-${weekISO}.json`
const ga4Path = `${tmpDir}/ga4-${weekISO}.json`
const auditPath = `${tmpDir}/audit-${weekISO}.json`

if (!skipPull) {
  mkdirSync(tmpDir, { recursive: true })
  console.error("▸ Rodando pulls (GSC + GA4 + audit)...")
  try {
    execSync(`node scripts/intel/gsc-pull.mjs --output ${gscPath}`, { stdio: "inherit" })
    execSync(`node scripts/intel/ga4-pull.mjs --output ${ga4Path}`, { stdio: "inherit" })
    execSync(`node scripts/intel/audit-snapshot.mjs --output ${auditPath} --max-age-days 21`, { stdio: "inherit" })
  } catch (err) {
    console.error("✗ Pull falhou:", err.message)
    process.exit(1)
  }
}

if (!existsSync(gscPath) || !existsSync(ga4Path) || !existsSync(auditPath)) {
  console.error(`✗ Faltam JSONs em ${tmpDir}. Rode sem --skip-pull pra gerar.`)
  process.exit(1)
}

const gsc = JSON.parse(readFileSync(gscPath, "utf-8"))
const ga4 = JSON.parse(readFileSync(ga4Path, "utf-8"))
const audit = JSON.parse(readFileSync(auditPath, "utf-8"))

// ─────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────

const pct = (n) => (n == null ? "N/D" : `${n > 0 ? "+" : ""}${n}%`)
const num = (n) => (n == null ? "N/D" : n.toLocaleString("pt-BR"))
const delta = (n) => (n == null ? "N/D" : `${n > 0 ? "+" : ""}${num(n)}`)
const ctrPct = (n) => (n == null ? "N/D" : `${(n * 100).toFixed(2)}%`)
const pos = (n) => (n == null ? "N/D" : n.toFixed(2))
const duration = (s) => {
  if (s == null) return "N/D"
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}m${String(sec).padStart(2, "0")}s`
}

// ─────────────────────────────────────────────────────────────────────────
// Sections
// ─────────────────────────────────────────────────────────────────────────

function header() {
  return `# Relatório Semanal — FYMOOB · ${weekISO}

**Período analisado:** ${gsc.meta.period.start} → ${gsc.meta.period.end} (7 dias)
**Comparado com:** ${gsc.meta.comparePeriod.start} → ${gsc.meta.comparePeriod.end} (7 dias)
**Gerado em:** ${new Date().toISOString().slice(0, 10)} (automatizado via GitHub Actions)
**Fontes:** GSC Search Analytics API (OAuth), GA4 Data API v1beta (property ${ga4.meta.propertyId}), audit interno (${audit.meta.auditAgeDays}d de idade, ${audit.meta.totalPages} páginas)

---
`
}

function executiveSummary() {
  const d = gsc.summary.deltas
  const direction = (n) => (n > 0 ? "↑" : n < 0 ? "↓" : "→")
  const clicksDir = direction(d.clicks)
  const impDir = direction(d.impressions)
  const posDir = direction(d.position)

  const ga4Warning =
    ga4.conversions.view_item.total === 0 && ga4.pageviews.period.pageviews > 100
      ? "\n\n⚠️ **Alerta de tracking:** `view_item` zerado em " +
        ga4.pageviews.period.pageviews +
        " pageviews. Funil de imóvel sem visibilidade — verificar disparo do evento."
      : ""

  return `## Sumário executivo

- **Cliques:** ${num(gsc.summary.clicks)} ${clicksDir} ${delta(d.clicks)} (${pct(d.clicksPct)}) vs semana anterior
- **Impressões:** ${num(gsc.summary.impressions)} ${impDir} ${delta(d.impressions)} (${pct(d.impressionsPct)})
- **CTR:** ${ctrPct(gsc.summary.ctr)} (${d.ctrPp > 0 ? "+" : ""}${d.ctrPp}pp)
- **Posição média:** ${pos(gsc.summary.position)} ${posDir} (${d.position > 0 ? "melhorou" : "piorou"} ${Math.abs(d.position).toFixed(2)})
- **WhatsApp clicks:** ${ga4.conversions.whatsapp_click.total} (${delta(ga4.conversions.whatsapp_click.delta)} vs anterior)
- **Leads (form):** ${ga4.conversions.generate_lead.total} em ${num(ga4.pageviews.period.sessions)} sessões${ga4Warning}

---
`
}

function gscSection() {
  const topQ = gsc.topQueries
    .slice(0, 10)
    .map((q) => `| ${q.query} | ${q.clicks} | ${delta(q.clicksDelta)} | ${q.impressions} | ${pos(q.position)} | ${q.positionDelta != null ? (q.positionDelta > 0 ? "+" : "") + q.positionDelta : "—"} |`)
    .join("\n")
  const topP = gsc.topPages
    .slice(0, 10)
    .map((p) => `| ${p.page.replace("https://fymoob.com.br", "")} | ${p.clicks} | ${delta(p.clicksDelta)} | ${p.impressions} | ${delta(p.impressionsDelta)} |`)
    .join("\n")
  const devices = gsc.devices
    .map((d) => `| ${d.device} | ${d.clicks} | ${num(d.impressions)} | ${ctrPct(d.ctr)} | ${pos(d.position)} |`)
    .join("\n")

  const moversUp =
    gsc.bigMovers.up.length > 0
      ? gsc.bigMovers.up
          .slice(0, 5)
          .map((q) => `- **${q.query}**: pos ${pos(q.prevPosition)} → ${pos(q.position)} (+${q.positionDelta}, ${q.impressions} imp)`)
          .join("\n")
      : "_Sem movimentos relevantes essa semana._"

  const moversDown =
    gsc.bigMovers.down.length > 0
      ? gsc.bigMovers.down
          .slice(0, 5)
          .map((q) => `- **${q.query}**: pos ${pos(q.prevPosition)} → ${pos(q.position)} (${q.positionDelta}, ${q.impressions} imp)`)
          .join("\n")
      : "_Sem regressões essa semana._ ✓"

  return `## GSC — movimento da semana

| Métrica | Atual | Anterior | Delta |
|---|---:|---:|---:|
| Cliques | ${num(gsc.summary.clicks)} | ${num(gsc.summary.prev.clicks)} | ${delta(gsc.summary.deltas.clicks)} (${pct(gsc.summary.deltas.clicksPct)}) |
| Impressões | ${num(gsc.summary.impressions)} | ${num(gsc.summary.prev.impressions)} | ${delta(gsc.summary.deltas.impressions)} (${pct(gsc.summary.deltas.impressionsPct)}) |
| CTR | ${ctrPct(gsc.summary.ctr)} | ${ctrPct(gsc.summary.prev.ctr)} | ${gsc.summary.deltas.ctrPp > 0 ? "+" : ""}${gsc.summary.deltas.ctrPp}pp |
| Posição | ${pos(gsc.summary.position)} | ${pos(gsc.summary.prev.position)} | ${gsc.summary.deltas.position > 0 ? "+" : ""}${gsc.summary.deltas.position.toFixed(2)} |

### Top 10 queries por cliques

| Query | Cliques | Δ | Imp | Pos | Δ pos |
|---|---:|---:|---:|---:|---:|
${topQ}

### Top 10 páginas por cliques

| Página | Cliques | Δ | Imp | Δ imp |
|---|---:|---:|---:|---:|
${topP}

### Por dispositivo

| Device | Cliques | Imp | CTR | Pos |
|---|---:|---:|---:|---:|
${devices}

### Big movers ↑ (subiram ≥5 posições)

${moversUp}

### Big movers ↓ (caíram ≥5 posições)

${moversDown}

---
`
}

function ga4Section() {
  const p = ga4.pageviews.period
  const pPrev = ga4.pageviews.compare
  const d = ga4.pageviews.deltas
  const f = ga4.funnels
  const wa = ga4.conversions.whatsapp_click
  const lead = ga4.conversions.generate_lead

  const eventStatus = (event, ctx) => {
    if (event.total > 0) return `${event.total} (${delta(event.delta)})`
    if (ctx > 0) return `**0** ⚠️ tracking?`
    return "0"
  }

  const topPages = ga4.topPages
    .slice(0, 10)
    .map((pg) => `| ${pg.page} | ${pg.pageviews} | ${pg.sessions} | ${(pg.engagementRate * 100).toFixed(0)}% | ${duration(pg.avgSessionDuration)} |`)
    .join("\n")
  const channels = ga4.channels
    .map((c) => `| ${c.channel} | ${c.sessions} | ${c.users} | ${(c.engagementRate * 100).toFixed(0)}% |`)
    .join("\n")
  const waBySource = Object.entries(wa.bySource || {})
    .sort((a, b) => b[1] - a[1])
    .map(([src, count]) => `- ${src}: ${count}`)
    .join("\n")

  return `## GA4 — conversões da semana

| Métrica | Atual | Anterior | Delta |
|---|---:|---:|---:|
| Sessions | ${num(p.sessions)} | ${num(pPrev.sessions)} | ${delta(d.sessions)} (${pct(d.sessionsPct)}) |
| Pageviews | ${num(p.pageviews)} | ${num(pPrev.pageviews)} | ${delta(d.pageviews)} (${pct(d.pageviewsPct)}) |
| Users | ${num(p.users)} | ${num(pPrev.users)} | ${delta(d.users)} (${pct(d.usersPct)}) |
| Engagement Rate | ${(p.engagementRate * 100).toFixed(1)}% | ${(pPrev.engagementRate * 100).toFixed(1)}% | — |
| Avg session | ${duration(p.avgSessionDuration)} | ${duration(pPrev.avgSessionDuration)} | — |

### Eventos de conversão

| Evento | Atual | Status |
|---|---:|---|
| whatsapp_click | ${wa.total} | ${wa.delta > 0 ? "↑" : wa.delta < 0 ? "↓" : "→"} ${delta(wa.delta)} |
| generate_lead | ${eventStatus(lead, p.sessions)} | |
| phone_click | ${eventStatus(ga4.conversions.phone_click, p.sessions)} | |
| view_item | ${eventStatus(ga4.conversions.view_item, p.pageviews)} | |
| select_item | ${eventStatus(ga4.conversions.select_item, p.pageviews)} | |

**Funnel:** ${num(f.pageviews)} pageviews → ${f.whatsappClick} WhatsApp clicks (${f.ctaClickRate}%) → ${f.generateLead} leads${f.whatsappClick > 0 ? ` (${f.leadConversionRate}%)` : ""}.

${
  Object.keys(wa.bySource || {}).length > 0
    ? `### WhatsApp por origem do botão\n\n${waBySource}\n`
    : "_WhatsApp `cta_location` ainda não populado — adicionar `data-source` no botão._"
}

### Top 10 páginas (pageviews)

| Página | PV | Sessões | Engagement | Avg session |
|---|---:|---:|---:|---|
${topPages}

### Canais de tráfego

| Canal | Sessões | Users | Engagement |
|---|---:|---:|---:|
${channels}

---
`
}

function auditSection() {
  const s = audit.stats
  return `## Audit técnico (${audit.meta.totalPages} páginas, ${audit.meta.auditAgeDays}d de idade)

| Issue | Páginas |
|---|---:|
| Title >65 chars | ${s.titleTooLong} |
| Title <30 chars | ${s.titleTooShort} |
| Description longa | ${s.descriptionTooLong} |
| Description curta | ${s.descriptionTooShort} |
| Sem canonical | ${s.missingCanonical} |
| Sem og:image | ${s.missingOgImage} |
| Sem FAQ schema | ${s.missingFaqSchema} |
| Thin content | ${s.thinContent} |
| Poucos links internos | ${s.fewInternalLinks} |

**Top páginas com issues críticas (5+):**

${audit.criticalIssues.slice(0, 10).map((p) => `- \`${p.url}\` (${p.issuesCount} issues)`).join("\n")}

---
`
}

function actionsSection() {
  const actions = []

  // Auto-detected actions baseado nos dados
  if (gsc.opportunities.lowCtrTopRanked.length > 0) {
    actions.push({
      priority: "high",
      finding: `${gsc.opportunities.lowCtrTopRanked.length} queries pos≤10 com CTR<1%`,
      fix: "Reescrever snippet das páginas afetadas",
      details: gsc.opportunities.lowCtrTopRanked.slice(0, 5).map((q) => `${q.query} (${q.impressions} imp, pos ${pos(q.position)})`).join(", "),
    })
  }
  if (ga4.conversions.view_item.total === 0 && ga4.pageviews.period.pageviews > 100) {
    actions.push({
      priority: "critical",
      finding: "view_item zerado apesar de tráfego em /imovel/",
      fix: "Verificar dispatch em PropertyPageAnalytics + pushAnalyticsEvent",
    })
  }
  if (ga4.conversions.generate_lead.total === 0 && ga4.pageviews.period.sessions > 200) {
    actions.push({
      priority: "high",
      finding: "0 leads em " + ga4.pageviews.period.sessions + " sessões",
      fix: "Testar formulário em produção + validar tracking",
    })
  }
  if (audit.stats.missingCanonical > 0 && audit.meta.auditAgeDays < 7) {
    actions.push({
      priority: "medium",
      finding: `${audit.stats.missingCanonical} páginas sem canonical (audit fresh)`,
      fix: "Investigar template de generateMetadata afetado",
    })
  }
  if (Object.keys(ga4.conversions.whatsapp_click.bySource || {}).length === 0 && ga4.conversions.whatsapp_click.total > 0) {
    actions.push({
      priority: "low",
      finding: `${ga4.conversions.whatsapp_click.total} WhatsApp clicks sem cta_location atribuído`,
      fix: "Adicionar data-source em todos os botões WhatsApp",
    })
  }

  const desktop = gsc.devices.find((d) => d.device === "DESKTOP")
  const mobile = gsc.devices.find((d) => d.device === "MOBILE")
  if (desktop && mobile && desktop.impressions > 5000 && mobile.ctr / desktop.ctr > 2) {
    actions.push({
      priority: "high",
      finding: `CTR mobile (${ctrPct(mobile.ctr)}) é ${(mobile.ctr / desktop.ctr).toFixed(1)}x maior que desktop (${ctrPct(desktop.ctr)}) com posição similar`,
      fix: "Investigar snippets desktop (titles longos? descriptions cortadas?)",
    })
  }

  if (actions.length === 0) {
    return `## Ações priorizadas\n\n_Nada acionável detectado essa semana — métricas estáveis._\n\n---\n`
  }

  const rows = actions
    .map((a, i) => `| ${i + 1} | ${a.priority.toUpperCase()} | ${a.finding} | ${a.fix} |`)
    .join("\n")
  const details = actions
    .filter((a) => a.details)
    .map((a, i) => `**${i + 1}.** ${a.details}`)
    .join("\n\n")

  return `## Ações priorizadas (auto-detected)

| # | Prioridade | Finding | Fix |
|---|---|---|---|
${rows}

${details}

---
`
}

function footer() {
  return `## Metadados das fontes

- **GSC:** \`tmp/intel/gsc-${weekISO}.json\` (${gsc.meta.generatedAt})
- **GA4:** \`tmp/intel/ga4-${weekISO}.json\` (${ga4.meta.generatedAt})
- **Audit:** \`tmp/intel/audit-${weekISO}.json\` (${audit.meta.generatedAt}, ${audit.meta.auditAgeDays}d de idade)

> Gerado automaticamente por \`scripts/intel/generate-weekly-report.mjs\`. Pra reproduzir local: \`node scripts/intel/generate-weekly-report.mjs\`. Pipeline determinístico, zero LLM. Análise mecânica baseada em thresholds calibrados (low-CTR top-ranked, big movers ≥5 pos, tracking zero detection).
`
}

const md =
  header() +
  executiveSummary() +
  gscSection() +
  ga4Section() +
  auditSection() +
  actionsSection() +
  footer()

const outPath = `docs/seo/reports/${weekISO}.md`
mkdirSync(dirname(outPath), { recursive: true })

// Idempotente: se relatorio ja existe e nao tem flag --force, pula.
// Permite re-rodar o pipeline sem sobrescrever analise humana.
if (existsSync(outPath) && !force) {
  console.error(`\n⊘ ${outPath} ja existe — use --force pra sobrescrever`)
  console.error(`  (Pipeline weekly do CI usa --force pra atualizar.)`)
  process.exit(0)
}

writeFileSync(outPath, md)
console.error(`\n✓ Relatório salvo em ${outPath}`)
console.error(`  ${md.length} caracteres, ${md.split("\n").length} linhas`)
