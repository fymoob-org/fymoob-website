# Setup — Analytics Intelligence (Sprint 1 Linha A)

> Auth pra os scripts `scripts/intel/gsc-pull.mjs` e `scripts/intel/ga4-pull.mjs`.
> Usados pelo skill `/weekly-report` pra coletar evidências reais de GSC + GA4.

## Decisão de autenticação: OAuth refresh token (não Service Account)

**Auth atual:** OAuth refresh token de uma conta Google (no caso `dev.viniciusdamas@gmail.com`, owner do GSC + GA4 da FYMOOB) armazenado no `.env.local`.

**Por que NÃO Service Account:**

O Google tem um bug ativo desde **23 de abril de 2026** que rejeita Service Accounts novas no Search Console e no Google Analytics 4. Quando você tenta adicionar uma SA recém-criada como usuário (Settings → Users → Add user), retorna:

- "Esse email não corresponde a uma Conta do Google" (português)
- "Email doesn't match a Google account" / "email not found" (inglês)

Google reconheceu publicamente que "tweaking settings will not help" e está investigando, sem ETA de fix. Threads oficiais reportando:

- [Search Central — thread 429294699](https://support.google.com/webmasters/thread/429294699)
- [Search Central — thread 429020059](https://support.google.com/webmasters/thread/429020059)
- [Analytics Community — thread 430678559](https://support.google.com/analytics/thread/430678559)

Service Accounts criadas **antes de 20/abr/2026** continuam funcionando. Como não temos nenhuma SA antiga válida pra GSC/GA4 da FYMOOB, optamos por OAuth.

**Quando reavaliar:** quando Google corrigir o bug. Reabrir esse doc e considerar migrar pra SA (mais limpo arquiteturalmente, não depende de conta humana).

## Setup local

### Pré-requisitos

- Conta Google que é **owner ou admin** das properties:
  - GSC: `sc-domain:fymoob.com.br`
  - GA4: property `535148801`
- Google Cloud Project (qualquer um) com:
  - Google Search Console API habilitada
  - Google Analytics Data API habilitada
  - OAuth 2.0 Client ID criado (tipo "Desktop app")

### Variáveis necessárias em `.env.local`

```bash
GA4_CLIENT_ID=<client_id do OAuth 2.0 Client>
GA4_CLIENT_SECRET=<client_secret do mesmo>
GA4_REFRESH_TOKEN=<refresh token gerado>
GSC_REFRESH_TOKEN=<refresh token separado, mesma client_id mas escopo GSC>
GA4_SITE_PRINCIPAL_PROPERTY_ID=535148801
GSC_SITE_URL=sc-domain:fymoob.com.br  # opcional, default já é esse
```

> Mesmo OAuth Client cobre as 2 APIs. Você roda o bootstrap 2 vezes — uma vez
> com escopo `analytics.readonly` (gera GA4_REFRESH_TOKEN) e outra com
> `webmasters.readonly` (gera GSC_REFRESH_TOKEN).

### Bootstrap dos refresh tokens

Scripts já existentes:

```bash
# GA4 — abre browser, autoriza, salva GA4_REFRESH_TOKEN no .env.local
node scripts/ga4-oauth-bootstrap.mjs

# GSC — idem pra Search Console
node scripts/gsc-oauth-bootstrap.mjs
```

Se algum refresh token for invalidado (acontece quando: revogar app na conta
Google, mexer pesado em IAM/Cloud, ou ficar 6 meses sem usar), re-rodar o
bootstrap correspondente.

### Smoke test

```bash
# Cada um gera um JSON em tmp/intel/
node scripts/intel/gsc-pull.mjs --output tmp/intel/gsc-smoke.json
node scripts/intel/ga4-pull.mjs --output tmp/intel/ga4-smoke.json
node scripts/intel/audit-snapshot.mjs --output tmp/intel/audit-smoke.json
```

Output esperado: 3 JSONs salvos com tamanho ~5-15 KB.

Se algum falhar:
- **`invalid_grant`** → refresh token invalidado, re-rodar o bootstrap correspondente
- **`permission denied` / 403** → conta logada não é owner/admin da property — confirmar acesso no GSC/GA4
- **`audit muito velho`** → re-rodar `python scripts/seo-gaps-audit.py --all` antes

## Setup em produção (GitHub Actions)

Cron weekly **já implementado** em `.github/workflows/weekly-report.yml` (15/05/2026):

- Cron `0 6 * * 1` (toda segunda 06:00 UTC = 03:00 BRT)
- Pipeline determinístico (zero LLM): roda os 3 scripts intel +
  `scripts/intel/generate-weekly-report.mjs` que compõe o markdown
- Commita em `docs/seo/reports/YYYY-WWW.md` via `github-actions[bot]`
- **Idempotente:** não sobrescreve relatório existente (preserva análise
  manual). Pra forçar regen, usar `workflow_dispatch` com `force: true`

### Secrets necessários no GitHub

Settings → Secrets and variables → Actions → New repository secret:

| Nome | Valor |
|---|---|
| `GA4_CLIENT_ID` | Mesmo do `.env.local` |
| `GA4_CLIENT_SECRET` | Mesmo do `.env.local` |
| `GA4_REFRESH_TOKEN` | Mesmo do `.env.local` |
| `GSC_REFRESH_TOKEN` | Mesmo do `.env.local` |
| `GA4_SITE_PRINCIPAL_PROPERTY_ID` | `535148801` |

Como copiar valor sem expor no terminal:
```bash
# Mostrar valor de cada var pra colar no GitHub UI (cuidado pra não logar):
grep -E "^(GA4_CLIENT_ID|GA4_CLIENT_SECRET|GA4_REFRESH_TOKEN|GSC_REFRESH_TOKEN|GA4_SITE_PRINCIPAL_PROPERTY_ID)=" .env.local
```

### Validar workflow

Depois de configurar os secrets, rodar manual no GitHub Actions:
1. Ir em Actions → "Weekly SEO Report" → "Run workflow"
2. Marcar `force: true` (pra criar relatório atual mesmo se já existir)
3. Aguardar ~3 min
4. Verificar commit `docs(seo): weekly report YYYY-WWW` no histórico

**Sobre expiração:** refresh token OAuth não expira **enquanto for usado pelo
menos 1 vez a cada 6 meses**. Com cron weekly, esse problema nunca acontece.

## Custo

- GSC API: gratuita (quotas amplas)
- GA4 Data API: gratuita (quotas amplas pra propriedades padrão)
- OAuth: gratuito
- Anthropic API (skill): ~$0,30 por run, ~$1,20/mês weekly

## Troubleshooting

| Erro | Causa | Fix |
|---|---|---|
| `invalid_grant` no GSC ou GA4 | Refresh token revogado/inválido | Re-rodar `gsc-oauth-bootstrap.mjs` ou `ga4-oauth-bootstrap.mjs` |
| `Faltam GA4_CLIENT_ID...` | `.env.local` não tem as vars | Conferir nomes exatos, sem aspas, sem espaços |
| GSC retorna 0 rows | Período sem dados ou property errada | Validar via GSC web — site tem dados na janela? |
| GA4 retorna 0 events | Eventos custom ainda não chegaram (latência até 48h) | Validar com `window.dataLayer` no console em prod, esperar 24-48h |
| Email not found ao adicionar SA | Bug ativo do Google desde 23/abr/2026 | Não tem fix. Manter OAuth (já configurado). |

## Histórico de decisões

- **2026-05-04:** Setup inicial com Service Account documentado (commit `271070d`).
- **2026-05-08:** OAuth bootstrap criado (`ga4-oauth-bootstrap.mjs`, `gsc-oauth-bootstrap.mjs`) pra contornar limitação do SA em GA4 admin. GSC continuou com SA na intenção.
- **2026-05-15:** Tentativa de migrar 100% pra SA falhou — bug do Google ativo desde 23/abr rejeita SAs novas em GSC + GA4. Migrado scripts `intel/{gsc,ga4}-pull.mjs` definitivamente pra OAuth. SA não usada mais.
