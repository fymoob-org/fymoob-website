# Eventos de conversao GA4 — FYMOOB

> **Status atualizado 08/05/2026.** Doc complementar a `docs/analytics/README.md`
> (single source of truth da infra). Esta pagina foca no schema dos eventos
> com history de evolucao.
>
> Refator 08/05/2026 (Fase 2 analytics, commit `d668d1b`):
> - Renomeado `property_code` -> `property_id`, `bairro` -> `neighborhood`
>   (alinha com custom dimensions registradas no GA4 Admin)
> - Adicionados eventos `view_item` (Google standard), `select_item`,
>   `phone_click`
> - Eventos enriquecidos com 8 custom dims via `getPageContext()`

## Eventos disparados pelo site

### 1. `whatsapp_click`

Disparado em **qualquer clique** num link WhatsApp do site (botao flutuante,
footer, hero do empreendimento, CTAs em cards de imovel/empreendimento etc).

**Como e capturado:** listener global em `<WhatsAppClickTracker>` (montado
no layout root) escuta cliques em elementos `[data-track="whatsapp_click"]`.

**Parametros enviados:**

| Param | Tipo | Exemplo | Sempre presente? |
|---|---|---|---|
| `event_category` | string | `engagement` | sim |
| `event_label` | string | `float`, `footer`, `landing_seo`, `hero_primary`, `card`, `property_contact_card` | sim |
| `page_path` | string | `/empreendimento/reserva-barigui` | sim |
| `property_code` | string | `AP00772` | so em paginas de imovel |
| `empreendimento` | string | `Reserva Barigui` | so em paginas de empreendimento |
| `bairro` | string | `Mossungue` | so em paginas de empreendimento |

**Sources observadas (lista de `data-source`):**

- `float` — botao verde flutuante (canto inferior direito)
- `footer` — link no rodape
- `landing_seo` — botao no bloco "Por que comprar com FYMOOB" das landings
- `emp_seo_units` / `emp_seo_fymoob` — CTAs no bloco editorial dos empreendimentos
- `hero_primary` — CTA principal do hero (paginas editoriais)
- `card` — botao em PropertyCard (cards de listagem)
- `property_contact_card` — sidebar de contato em /imovel/*
- `shared_button` — fallback do componente WhatsAppButton (shared)

### 2. `generate_lead`

Disparado quando um **form de contato e enviado com sucesso** (Loft confirmou
recebimento). Substitui contagem manual.

**Como e capturado:** chamada `pushAnalyticsEvent("generate_lead", ...)` no
`setStatus("sent")` dos 4 forms.

**Parametros enviados:**

| Param | Tipo | Exemplo | Sempre presente? |
|---|---|---|---|
| `form_id` | string | `contact_form`, `contact_sidebar`, `mobile_inline`, `property_contact` | sim |
| `interesse` | string | `Venda`, `Aluguel`, `Comprar imovel`, `Contato pelo site` | sim |
| `page_path` | string | `/imovel/...` ou `/contato` | sim |
| `property_code` | string | `AP00772` | so em forms vinculados a imovel |
| `page_variant` | string | `standard`, `premium` | so em ContactSidebar |
| `is_consult_price` | boolean | `false` | so em ContactSidebar |

**Forms cobertos:**

| `form_id` | Localizacao | Componente |
|---|---|---|
| `contact_form` | `/contato`, hubs genericos | [components/shared/ContactForm.tsx](../../src/components/shared/ContactForm.tsx) |
| `contact_sidebar` | `/imovel/[slug]` desktop | [components/property/ContactSidebar.tsx](../../src/components/property/ContactSidebar.tsx) |
| `mobile_inline` | `/imovel/[slug]` mobile | [components/property/MobileInlineContactForm.tsx](../../src/components/property/MobileInlineContactForm.tsx) |
| `property_contact` | legado em PropertyContact | [components/property/PropertyContact.tsx](../../src/components/property/PropertyContact.tsx) |

## Status no GA4 admin (08/05/2026)

**Concluido via `scripts/ga4-fase1-config.mjs`** (commit `d668d1b`):

- `whatsapp_click` marcado como Key Event com **value R$ 100 BRL**
- `generate_lead` marcado como Key Event com **value R$ 500 BRL**
- 8 Custom Dimensions registradas (event-scoped):
  `property_id`, `property_type`, `neighborhood`, `price_range`, `bedrooms`,
  `lead_source`, `cta_location`, `listing_purpose`
- Data Retention 14 meses
- Google Signals ativado
- GSC + BigQuery linked

**Pendente** (1-3 dias apos deploy do commit):

- `phone_click` virar Key Event — GA4 so deixa marcar key event de eventos
  que ja chegaram. Apos primeiros cliques tel: em prod, rodar:
  ```
  # Adicionar phone_click no array KEY_EVENTS de scripts/ga4-fase1-config.mjs
  # com value R$ 150 BRL (ligacao = intencao mais quente que WhatsApp)
  node scripts/ga4-fase1-config.mjs --property=535148801
  ```

**Ja disponiveis nos relatorios** (24h apos primeiros disparos):
- **Relatorios > Engagement > Conversoes** — contagem + valor por dia
- **Explorations** — breakdown por `property_type` / `neighborhood` /
  `price_range` / `cta_location` / `listing_purpose`
- **Audiencias** podem ser criadas pra retargeting

## Filtro de trafego interno

Cliques de Bruno + Wagner + corretores **nao sao contados** porque o site
seta cookie `fymoob_internal=1` em quem visitou `/internal-optout` e o
DeferredGA marca eventos com `traffic_type=internal` (filtrado no GA4 Data
Filter).

Pra adicionar mais um interno:
1. Acessar `/internal-optout` no dispositivo dele com login admin
2. Botao "Marcar como interno" → seta cookie 400 dias
3. Pronto, eventos dele saem com `traffic_type=internal`

## Validacao manual (smoke test)

Em qualquer pagina:

```js
// Console do browser
window.dataLayer.length      // numero de eventos no buffer
window.dataLayer.slice(-5)   // ultimos 5 eventos
```

Clique no botao WhatsApp Float → recarrega `dataLayer` deve ter um item
`{ event: "whatsapp_click", source: "float", page_path: "/", ... }`.

Submeter form → `dataLayer` deve receber `{ event: "generate_lead", form_id: "...", ... }`.
