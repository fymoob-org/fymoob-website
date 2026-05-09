# Analytics infra — FYMOOB

> Single source of truth pra GA4 + GSC. Última grande atualização: 08/05/2026
> (Fase 1 + 2 do plano analytics implementadas via Admin API + código).

## TL;DR — o que tem implementado

- ✅ **GA4 Property** `535148801` ("FYMOOB - Site Principal") configurada
- ✅ **OAuth Desktop** com refresh tokens em `.env.local` (sem service account JSON)
  - `GA4_REFRESH_TOKEN` — scopes `analytics.edit` + `analytics.readonly`
  - `GSC_REFRESH_TOKEN` — scope `webmasters.readonly`
- ✅ **Data Retention** 14 meses (max free tier)
- ✅ **Google Signals** ativado
- ✅ **8 Custom Dimensions** event-scoped registradas
- ✅ **Key Events** com valor monetário (`generate_lead` R$ 500, `whatsapp_click` R$ 100)
- ✅ **GSC ↔ GA4 link** ativo desde 30/04/2026
- ✅ **BigQuery export** daily ativo (projeto `fymoob-analytics`, location `southamerica-east1`)
- ✅ **5 eventos GA4** disparados pelo site com params custom enriquecidos
- ⏳ **Follow-up**: `view_item_list`, `filter_apply` em listagens (não implementado, baixa prioridade)
- ⏳ **Looker Studio dashboard** (não criado)
- ⏳ **Funnel Explorations** (não criados)

---

## Conexão rápida (próximas sessões)

### MCP GSC (read-only, sempre disponível)

Tools funcionando direto via MCP server (carregar via `ToolSearch` se deferred):

```
mcp__gsc__list_properties
mcp__gsc__get_search_analytics
mcp__gsc__get_advanced_search_analytics
mcp__gsc__inspect_url_enhanced
mcp__gsc__batch_url_inspection
mcp__gsc__check_indexing_issues
mcp__gsc__list_sitemaps_enhanced
mcp__gsc__get_sitemap_details
mcp__gsc__compare_search_periods
```

> ⚠️ MCP GSC NÃO usa OAuth do `.env.local` — falha pedindo `service_account_credentials.json`. Pra **read-only** ainda funciona porque cobre operações via `client_secrets.json` (não setado, mas tools acima passaram em sessões anteriores via outro mecanismo). Em caso de erro, fallback é script com `GSC_REFRESH_TOKEN`.

### MCP GA4

Não existe MCP server de GA4 instalado. Operações via scripts Node.js usando `googleapis` + `GA4_REFRESH_TOKEN`.

### Scripts disponíveis (todos em `scripts/`)

| Script | O quê faz | Auth |
|---|---|---|
| `gsc-oauth-bootstrap.mjs` | Gera/regenera `GSC_REFRESH_TOKEN` (scope `webmasters.readonly`) | Browser OAuth Desktop |
| `gsc-coverage-audit.mjs` | Audit completa de cobertura (URL Inspection API em batch) | OAuth |
| `gsc-resubmit-sitemaps.mjs` | Re-submete sitemap shards (precisa scope `webmasters` write — atual é readonly, falha) | OAuth |
| `ga4-oauth-bootstrap.mjs` | Bootstrap antigo só `analytics.readonly` — **superseded por ga4-admin-oauth-bootstrap.mjs** | Browser OAuth |
| `ga4-admin-oauth-bootstrap.mjs` | Gera `GA4_REFRESH_TOKEN` com scopes `analytics.edit` + `analytics.readonly` | Browser OAuth |
| `ga4-fase1-config.mjs` | Aplica/valida via Admin API: data retention, custom dims, key events com valor. Idempotente. | OAuth |
| `intel/gsc-pull.mjs` | Snapshot semanal queries/pages | Service Account (não usado mais — usar OAuth) |
| `intel/ga4-pull.mjs` | Snapshot semanal users/events | Service Account (idem) |

### Comandos úteis

```bash
# Validar estado GA4 admin (lista custom dims, key events, data retention)
node scripts/ga4-fase1-config.mjs --dry-run --property=535148801

# Re-rodar config (idempotente — só atualiza o que falta)
node scripts/ga4-fase1-config.mjs --property=535148801

# Audit GSC coverage (584 URLs do sitemap, ~10min)
node scripts/gsc-coverage-audit.mjs

# Smoke: ver últimos 5 eventos no dataLayer (rodar no browser DevTools)
window.dataLayer.slice(-5)
```

### Property IDs / IDs úteis

| Item | Valor |
|---|---|
| GA4 Property ID | `535148801` |
| GSC Site URL | `sc-domain:fymoob.com.br` |
| BigQuery Project ID | `fymoob-analytics` |
| BigQuery Dataset | `analytics_535148801` (auto-criado) |
| BigQuery Location | `southamerica-east1` |
| OAuth Client ID | `GA4_CLIENT_ID` em `.env.local` |
| OAuth Client Secret | `GA4_CLIENT_SECRET` em `.env.local` |
| Internal traffic cookie | `fymoob_internal=1` (set via `/internal-optout`) |

---

## Eventos GA4 disparados pelo site

### Core events (Google recommended ou key event)

| Evento | Where | Tipo | Key Event? | Valor |
|---|---|---|---|---|
| `view_item` | `/imovel/[slug]` | Recommended | ❌ | (sem valor — é discovery) |
| `view_item_list` | listagens | Recommended | ❌ | **NÃO IMPLEMENTADO** (follow-up) |
| `select_item` | PropertyCard click | Recommended | ❌ | (auto fires before navigation) |
| `generate_lead` | 4 forms `setStatus("sent")` | Recommended | ✅ | **R$ 500 BRL** |
| `whatsapp_click` | `[data-track="whatsapp_click"]` | Custom | ✅ | **R$ 100 BRL** |
| `phone_click` | `<a href="tel:">` (auto) | Custom | ❌ ainda — marcar após 1º disparo | (sugestão R$ 100-250) |

### Eventos secundários

| Evento | Where | Notas |
|---|---|---|
| `property_page_view` | `/imovel/[slug]` | Legacy custom, mantido pra compat com relatórios antigos. `view_item` é o novo padrão. |

### Custom Dimensions registradas (event-scoped)

Todas as 8 estão criadas em GA4 Admin (08/05/2026). Disponíveis pra usar como break-down em qualquer relatório/exploration após ~24h.

| `parameterName` | Display Name | Valores típicos |
|---|---|---|
| `property_id` | Property ID | Codigo Vista (ex: "AP00772") |
| `property_type` | Property Type | "Apartamento", "Casa", "Sobrado", "Terreno" |
| `neighborhood` | Neighborhood | "Batel", "Mossunguê", "Portão" |
| `price_range` | Price Range | "<300k", "300-500k", "500-800k", "800k-1.5M", ">1.5M" |
| `bedrooms` | Bedrooms | 1, 2, 3, 4, 5+ |
| `lead_source` | Lead Source | (reservado pra forms — ainda não populado) |
| `cta_location` | CTA Location | "float", "footer", "card_search", "hero_primary", `tel_link` |
| `listing_purpose` | Listing Purpose | "venda", "aluguel" |

> Buckets de `price_range` calibrados pelo helper `priceToBucket()` em [src/lib/analytics.ts](../../src/lib/analytics.ts).

### Internal traffic filter

Cookie `fymoob_internal=1` (set via `/internal-optout`) → `DeferredGA` envia `traffic_type=internal` em todos os eventos → GA4 Data Filter exclui dos relatórios. Bruno + Wagner + corretores **NÃO contam** nas métricas.

Adicionar mais um interno: navegar pra `/internal-optout` no dispositivo dele, click "Marcar como interno". Cookie 400 dias.

---

## Componentes-chave do código

### Tracker globais (vivem em `src/app/layout.tsx`)

- **`<DeferredGA />`** — carrega `gtag.js` lazy (após interação ou 12s)
- **`<WhatsAppClickTracker />`** — listener delegado pra `[data-track="whatsapp_click"]`
- **`<PhoneClickTracker />`** — listener delegado pra `<a href="tel:">`
- **`<RecentlyViewedTracker />`** — localStorage de imóveis vistos (não dispara GA, é pra UI)

### Page-level (paginas que enriquecem eventos com contexto)

- **`<PageContextSync>`** ([src/components/analytics/PageContextSync.tsx](../../src/components/analytics/PageContextSync.tsx)) — sincroniza `property_id`/`neighborhood`/`price_range`/`bedrooms`/`property_type`/`listing_purpose` em `window.__fymoob_pageContext`. Trackers globais leem dali ao disparar eventos.
- **`<PropertyPageAnalytics>`** ([src/components/analytics/PropertyPageAnalytics.tsx](../../src/components/analytics/PropertyPageAnalytics.tsx)) — dispara `view_item` (Google standard) + `property_page_view` (legacy) uma vez por imóvel/sessão.

### Helper

[src/lib/analytics.ts](../../src/lib/analytics.ts):
- `pushAnalyticsEvent(event, params)` — empurra pro `dataLayer`
- `getPageContext()` — lê `window.__fymoob_pageContext`
- `priceToBucket(price)` — mapeia preço numérico pro bucket string

```ts
import { pushAnalyticsEvent, getPageContext, priceToBucket } from "@/lib/analytics"

// Em qualquer client component:
pushAnalyticsEvent("custom_event", {
  ...getPageContext(),  // injeta property_id, neighborhood, etc se aplicável
  custom_param: "valor",
})
```

---

## OAuth setup (referência rápida pra novo dispositivo)

### Pré-requisitos no Google Cloud Console

1. **Projeto GCP** existe (atualmente `fymoob-analytics`)
2. **APIs habilitadas**:
   - Google Analytics Admin API
   - Google Analytics Data API
   - Google Search Console API
   - BigQuery API
3. **OAuth consent screen** configurado:
   - App tipo "External" em modo "Testing"
   - Test users: `dev.viniciusdamas@gmail.com`, `fymoob@gmail.com`
   - Scopes adicionados em "Data Access":
     - `https://www.googleapis.com/auth/analytics.edit`
     - `https://www.googleapis.com/auth/analytics.readonly`
     - `https://www.googleapis.com/auth/webmasters.readonly`
4. **OAuth Client** tipo "Desktop application" criado
   - `GA4_CLIENT_ID` + `GA4_CLIENT_SECRET` salvos em `.env.local`

### Bootstrap (rodar uma vez)

```bash
# GA4 admin + data
node scripts/ga4-admin-oauth-bootstrap.mjs   # gera GA4_REFRESH_TOKEN

# GSC (opcional — só se rodar scripts gsc-* do projeto)
node scripts/gsc-oauth-bootstrap.mjs          # gera GSC_REFRESH_TOKEN
```

Cada bootstrap abre browser → click "Allow" → token salvo em `.env.local`.

> ⚠️ Em modo "Testing", refresh tokens podem expirar em 7 dias. Pra evitar, publicar o app na aba "Audience" do consent screen (status "In production" — não precisa verificação completa pra escopos read-only/análise).

---

## Roadmap follow-up (próximas sessões)

### Curto prazo (1 sprint)

1. **`view_item_list`** em 8 listagens (`/busca`, `/imoveis/[bairro]`, `/imoveis/[bairro]/[tipo]`, `/imoveis/preco/[faixa]`, `/apartamentos-curitiba`, `/casas-curitiba`, `/sobrados-curitiba`, `/lancamentos`)
2. **`filter_apply`** em filtros da `/busca`
3. **Marcar `phone_click` como Key Event** (após primeiro disparo real chegar no GA4 — 24h após deploy do commit `d668d1b`)
4. **Atualizar 4 forms `generate_lead`** pra mandar `getPageContext()` completo (hoje só manda `form_id`/`property_code`)

### Médio prazo (1-2 dias spread)

5. **Looker Studio dashboard único** — KPIs topo + acquisition + top imóveis/bairros + GSC blend
6. **3 Funnel Explorations**:
   - Descoberta orgânica → Lead (5 steps closed)
   - WhatsApp path (4 steps open)
   - Busca → filtro → conversão (5 steps closed)
7. **Consent Mode v2 advanced** com CMP gratuito (Klaro self-hosted ou Cookiebot free)

### Longo prazo (~mês 4-6, quando >500 users/mês)

8. **Audiences pra retargeting**:
   - Property Viewers (no lead) — exclude de re-mkt
   - Hot Prospects (3+ views mesmo imóvel)
   - Form Abandoners
   - Recent Leads (suppression)
9. **GTM server-side** (recupera 30-50% de dados perdidos em ad blockers)

---

## Referências externas

- [Google: GA4 Recommended events](https://support.google.com/analytics/answer/9267735)
- [Google: Conversions vs Key Events](https://support.google.com/analytics/answer/13965727)
- [Google: Custom dimensions and metrics](https://support.google.com/analytics/answer/14240153)
- [Google: BigQuery Export setup](https://support.google.com/analytics/answer/9823238)
- [Google: Tag Platform Consent Mode](https://developers.google.com/tag-platform/security/guides/consent)
- [Stape: GA4 Recommended Events for Lead Generation](https://stape.io/news/ga4-new-recommended-events-lead-generation)
- [Simo Ahava: GA4 Events Implementation Guide](https://www.simoahava.com/analytics/implementation-guide-events-google-analytics-4/)

## Histórico de implementação

| Data | Mudança | Commit |
|---|---|---|
| 04/05/2026 | WhatsAppClickTracker global no layout | `6b41c28` |
| 04/05/2026 | Eventos `whatsapp_click` + `generate_lead` documentados | `a0ceabc` |
| 08/05/2026 | OAuth GSC bootstrap + scripts auditoria | `cd2bcfb` |
| 08/05/2026 | GA4 Fase 1 (admin config) + Fase 2 (eventos novos) | `d668d1b` |
