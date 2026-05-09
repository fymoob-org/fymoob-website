#!/usr/bin/env node
/**
 * scripts/ga4-fase1-config.mjs
 *
 * Configuracao automatica da Fase 1 do plano analytics FYMOOB
 * (08/05/2026):
 *
 *   1. Data Retention: 2 -> 14 meses (max do tier gratuito)
 *   2. Google Signals: enabled
 *   3. Custom dimensions: cria 8 (property_id, property_type, neighborhood,
 *      price_range, bedrooms, lead_source, cta_location, listing_purpose)
 *   4. Key Events: marca whatsapp_click + generate_lead com value/currency
 *
 * Idempotente: confere estado atual antes de cada operacao, so atualiza
 * o que falta.
 *
 * Auth: usa GA4_REFRESH_TOKEN (com scopes analytics.edit + readonly,
 * gerado via scripts/ga4-admin-oauth-bootstrap.mjs).
 *
 * Uso:
 *   node scripts/ga4-fase1-config.mjs                # aplica de fato
 *   node scripts/ga4-fase1-config.mjs --dry-run      # so mostra o que faria
 *   node scripts/ga4-fase1-config.mjs --property=123 # forca property ID
 *
 * NAO faz (ainda):
 *   - GSC <-> GA4 link: Admin API nao expoe esse endpoint, fazer manual em
 *     GA4 Admin > Property > Search Console Links > Link
 *   - BigQuery link: requer projeto GCP existente, ver script separado
 *     ga4-link-bigquery.mjs (a criar quando user tiver projeto)
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { google } from "googleapis"

const ENV_PATH = join(process.cwd(), ".env.local")

const args = process.argv.slice(2)
const DRY_RUN = args.includes("--dry-run")
const PROPERTY_ARG = (() => {
  const a = args.find((x) => x.startsWith("--property="))
  return a ? a.split("=")[1] : null
})()

// Conteudo da Fase 1 — defines what gets configured
const CUSTOM_DIMENSIONS = [
  {
    parameterName: "property_id",
    displayName: "Property ID",
    description: "Codigo Vista do imovel (cruza com CRM Loft).",
    scope: "EVENT",
  },
  {
    parameterName: "property_type",
    displayName: "Property Type",
    description: 'Tipo: "Apartamento", "Casa", "Sobrado", "Terreno", etc.',
    scope: "EVENT",
  },
  {
    parameterName: "neighborhood",
    displayName: "Neighborhood",
    description: "Bairro de Curitiba (Batel, Mossungue, Portao, etc).",
    scope: "EVENT",
  },
  {
    parameterName: "price_range",
    displayName: "Price Range",
    description: 'Bucket: "<300k", "300-500k", "500-800k", "800k-1.5M", ">1.5M".',
    scope: "EVENT",
  },
  {
    parameterName: "bedrooms",
    displayName: "Bedrooms",
    description: "Quantidade de quartos (1, 2, 3, 4+).",
    scope: "EVENT",
  },
  {
    parameterName: "lead_source",
    displayName: "Lead Source",
    description: "Form ou canal de captura (form_contato, form_anuncie, etc).",
    scope: "EVENT",
  },
  {
    parameterName: "cta_location",
    displayName: "CTA Location",
    description: "Onde o WhatsApp/tel foi clicado (header, float, card, hero).",
    scope: "EVENT",
  },
  {
    parameterName: "listing_purpose",
    displayName: "Listing Purpose",
    description: 'Finalidade: "venda", "aluguel", "ambos".',
    scope: "EVENT",
  },
]

// Valor monetario inicial pros key events (estimativa conservadora —
// ajustar trimestralmente com Bruno baseado em fechamento real).
// Tickets venda Curitiba ~ R$ 600k, comissao 5-6%, taxa fechamento
// lead organico 1-3% -> valor por lead R$ 300-1k. Comecamos em R$ 500.
const KEY_EVENTS = [
  {
    eventName: "generate_lead",
    countingMethod: "ONCE_PER_EVENT",
    defaultValue: { numericValue: 500, currencyCode: "BRL" },
  },
  {
    eventName: "whatsapp_click",
    countingMethod: "ONCE_PER_EVENT",
    defaultValue: { numericValue: 100, currencyCode: "BRL" },
  },
]

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function parseEnv(content) {
  const out = {}
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
  return out
}

function upsertEnvLine(content, key, value) {
  const lines = content.split(/\r?\n/)
  const re = new RegExp(`^${key}=`)
  let found = false
  const next = lines.map((l) => {
    if (re.test(l)) {
      found = true
      return `${key}=${value}`
    }
    return l
  })
  if (!found) next.push(`${key}=${value}`)
  return next.join("\n")
}

if (!existsSync(ENV_PATH)) {
  console.error(`ERRO: .env.local nao encontrado em ${ENV_PATH}`)
  process.exit(1)
}

const envContent = readFileSync(ENV_PATH, "utf8")
const env = parseEnv(envContent)

if (!env.GA4_CLIENT_ID || !env.GA4_CLIENT_SECRET || !env.GA4_REFRESH_TOKEN) {
  console.error(
    "ERRO: faltam GA4_CLIENT_ID / GA4_CLIENT_SECRET / GA4_REFRESH_TOKEN em .env.local",
  )
  console.error("Rode `node scripts/ga4-admin-oauth-bootstrap.mjs` primeiro.")
  process.exit(1)
}

const oauth2 = new google.auth.OAuth2(env.GA4_CLIENT_ID, env.GA4_CLIENT_SECRET)
oauth2.setCredentials({ refresh_token: env.GA4_REFRESH_TOKEN })

const admin = google.analyticsadmin({ version: "v1beta", auth: oauth2 })

// ─────────────────────────────────────────────────────────────────────────
// Property discovery — descobre property ID via accountSummaries
// ─────────────────────────────────────────────────────────────────────────

async function resolveProperty() {
  if (PROPERTY_ARG) {
    console.log(`Usando property ID via flag: ${PROPERTY_ARG}`)
    return PROPERTY_ARG
  }
  if (env.GA4_PROPERTY_ID) {
    console.log(`Usando GA4_PROPERTY_ID do .env.local: ${env.GA4_PROPERTY_ID}`)
    return env.GA4_PROPERTY_ID
  }

  console.log("Descobrindo properties acessiveis...")
  const { data } = await admin.accountSummaries.list({})
  const accounts = data.accountSummaries || []
  const properties = accounts.flatMap((a) =>
    (a.propertySummaries || []).map((p) => ({
      account: a.displayName,
      property: p.displayName,
      propertyName: p.property, // formato: properties/123456789
      propertyId: p.property?.replace("properties/", ""),
    })),
  )

  if (properties.length === 0) {
    console.error("Nenhuma property GA4 acessivel. Confere se o email do bootstrap tem acesso ao GA4.")
    process.exit(1)
  }

  if (properties.length === 1) {
    const p = properties[0]
    console.log(`  -> ${p.account} > ${p.property} (${p.propertyId})`)
    // Salva no .env.local pra evitar discovery em runs futuros
    if (!DRY_RUN) {
      const updated = upsertEnvLine(envContent, "GA4_PROPERTY_ID", p.propertyId)
      writeFileSync(ENV_PATH, updated, "utf8")
      console.log(`  GA4_PROPERTY_ID salvo no .env.local`)
    }
    return p.propertyId
  }

  console.log(`Multiplas properties acessiveis. Use --property=ID:`)
  for (const p of properties) {
    console.log(`  ${p.propertyId} — ${p.account} > ${p.property}`)
  }
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────────────────
// Fase 1.1: Data Retention
// ─────────────────────────────────────────────────────────────────────────

async function setDataRetention(propertyId) {
  const propertyPath = `properties/${propertyId}`
  const { data: current } = await admin.properties.getDataRetentionSettings({
    name: `${propertyPath}/dataRetentionSettings`,
  })

  console.log(`  Atual: eventDataRetention=${current.eventDataRetention}`)

  if (current.eventDataRetention === "FOURTEEN_MONTHS") {
    console.log(`  ✓ ja esta em 14 meses, skip`)
    return
  }

  if (DRY_RUN) {
    console.log(`  [dry-run] alteraria pra FOURTEEN_MONTHS`)
    return
  }

  await admin.properties.updateDataRetentionSettings({
    name: `${propertyPath}/dataRetentionSettings`,
    updateMask: "eventDataRetention",
    requestBody: { eventDataRetention: "FOURTEEN_MONTHS" },
  })
  console.log(`  ✓ atualizado pra FOURTEEN_MONTHS`)
}

// ─────────────────────────────────────────────────────────────────────────
// Fase 1.2: Google Signals
// ─────────────────────────────────────────────────────────────────────────

async function enableGoogleSignals(propertyId) {
  const propertyPath = `properties/${propertyId}`
  try {
    const { data: current } = await admin.properties.getGoogleSignalsSettings({
      name: `${propertyPath}/googleSignalsSettings`,
    })
    console.log(`  Atual: state=${current.state}, consent=${current.consent}`)

    if (current.state === "GOOGLE_SIGNALS_ENABLED") {
      console.log(`  ✓ ja habilitado, skip`)
      return
    }

    if (DRY_RUN) {
      console.log(`  [dry-run] habilitaria Google Signals`)
      return
    }

    await admin.properties.updateGoogleSignalsSettings({
      name: `${propertyPath}/googleSignalsSettings`,
      updateMask: "state",
      requestBody: { state: "GOOGLE_SIGNALS_ENABLED" },
    })
    console.log(`  ✓ habilitado`)
  } catch (e) {
    console.warn(`  AVISO: nao foi possivel configurar Google Signals: ${e?.message || e}`)
    console.warn(`  (pode ser feito manualmente em GA4 Admin > Data Settings > Data Collection)`)
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Fase 1.3: Custom Dimensions
// ─────────────────────────────────────────────────────────────────────────

async function createCustomDimensions(propertyId) {
  const propertyPath = `properties/${propertyId}`
  const { data: list } = await admin.properties.customDimensions.list({
    parent: propertyPath,
  })
  const existingByParam = new Map(
    (list.customDimensions || []).map((d) => [d.parameterName, d]),
  )

  console.log(`  ${existingByParam.size} dimensions existentes na property`)

  let created = 0
  let skipped = 0

  for (const dim of CUSTOM_DIMENSIONS) {
    const existing = existingByParam.get(dim.parameterName)
    if (existing) {
      console.log(`  - ${dim.parameterName} (${existing.scope}): ja existe, skip`)
      skipped++
      continue
    }

    if (DRY_RUN) {
      console.log(`  [dry-run] criaria ${dim.parameterName} (${dim.scope})`)
      created++
      continue
    }

    try {
      await admin.properties.customDimensions.create({
        parent: propertyPath,
        requestBody: dim,
      })
      console.log(`  ✓ ${dim.parameterName} (${dim.scope})`)
      created++
    } catch (e) {
      console.error(`  ✗ ${dim.parameterName}: ${e?.message || e}`)
    }
  }

  console.log(`  Resultado: ${created} criadas, ${skipped} ja existiam`)
}

// ─────────────────────────────────────────────────────────────────────────
// Fase 1.4: Key Events
// ─────────────────────────────────────────────────────────────────────────

async function markKeyEvents(propertyId) {
  const propertyPath = `properties/${propertyId}`

  // Em v1beta o resource ainda se chama conversionEvents (pre-rebrand)
  // mas a API aceita "key event" funcionalmente igual. v1alpha tem
  // properties.keyEvents.* explicito; v1beta nos da o mesmo via conversionEvents.
  const { data: list } = await admin.properties.conversionEvents.list({
    parent: propertyPath,
  })
  const existingByName = new Map(
    (list.conversionEvents || []).map((e) => [e.eventName, e]),
  )

  console.log(`  ${existingByName.size} key events existentes`)

  let created = 0
  let skipped = 0

  for (const ke of KEY_EVENTS) {
    const existing = existingByName.get(ke.eventName)
    if (existing) {
      const valueOk =
        existing.defaultConversionValue?.value === ke.defaultValue.numericValue &&
        existing.defaultConversionValue?.currencyCode === ke.defaultValue.currencyCode
      if (valueOk) {
        console.log(
          `  - ${ke.eventName}: ja marcado com value=${ke.defaultValue.numericValue} ${ke.defaultValue.currencyCode}, skip`,
        )
        skipped++
        continue
      }
      // Update value/currency
      if (DRY_RUN) {
        console.log(
          `  [dry-run] atualizaria value de ${ke.eventName} pra ${ke.defaultValue.numericValue} ${ke.defaultValue.currencyCode}`,
        )
        skipped++
        continue
      }
      try {
        await admin.properties.conversionEvents.patch({
          name: existing.name,
          updateMask: "defaultConversionValue.value,defaultConversionValue.currencyCode",
          requestBody: {
            defaultConversionValue: {
              value: ke.defaultValue.numericValue,
              currencyCode: ke.defaultValue.currencyCode,
            },
          },
        })
        console.log(`  ✓ ${ke.eventName}: value atualizado pra ${ke.defaultValue.numericValue} ${ke.defaultValue.currencyCode}`)
      } catch (e) {
        console.error(`  ✗ ${ke.eventName} update: ${e?.message || e}`)
      }
      continue
    }

    if (DRY_RUN) {
      console.log(
        `  [dry-run] criaria ${ke.eventName} com value=${ke.defaultValue.numericValue} ${ke.defaultValue.currencyCode}`,
      )
      created++
      continue
    }

    try {
      await admin.properties.conversionEvents.create({
        parent: propertyPath,
        requestBody: {
          eventName: ke.eventName,
          countingMethod: ke.countingMethod,
          defaultConversionValue: {
            value: ke.defaultValue.numericValue,
            currencyCode: ke.defaultValue.currencyCode,
          },
        },
      })
      console.log(
        `  ✓ ${ke.eventName} marcado como key event (value ${ke.defaultValue.numericValue} ${ke.defaultValue.currencyCode})`,
      )
      created++
    } catch (e) {
      // Erro mais comum: evento ainda nao foi disparado em prod, GA4 nao
      // conhece o nome. Solucao: aguardar primeiro disparo (24h apos
      // primeiro user organico) ou usar "Create event" na UI antes.
      console.error(`  ✗ ${ke.eventName}: ${e?.message || e}`)
      console.error(
        `    (provavel causa: evento ainda nao chegou no GA4 — aguardar disparos reais primeiro)`,
      )
    }
  }

  console.log(`  Resultado: ${created} criados, ${skipped} ja estavam OK`)
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== GA4 Fase 1 Config — FYMOOB ${DRY_RUN ? "(DRY RUN)" : ""} ===`)

  const propertyId = await resolveProperty()
  console.log(`Property: properties/${propertyId}\n`)

  console.log("[1/4] Data Retention (2 -> 14 meses)")
  await setDataRetention(propertyId)

  console.log("\n[2/4] Google Signals")
  await enableGoogleSignals(propertyId)

  console.log("\n[3/4] Custom Dimensions")
  await createCustomDimensions(propertyId)

  console.log("\n[4/4] Key Events")
  await markKeyEvents(propertyId)

  console.log(`\n=== Concluido ===`)
  console.log(`Proximos passos manuais (Admin API nao expoe):`)
  console.log(`  - Linkar GSC: GA4 Admin > Search Console Links > Link`)
  console.log(`  - Linkar BigQuery: criar projeto GCP gratuito + GA4 Admin > BigQuery Links`)
  console.log(``)
  console.log(`Codigo (Fase 2 do plano): rodar pushAnalyticsEvent novos eventos`)
  console.log(`(view_item, view_item_list, select_item, phone_click, filter_apply)`)
}

main().catch((err) => {
  console.error("\n[FATAL]", err?.message || err)
  if (err?.errors) console.error(err.errors)
  process.exit(1)
})
