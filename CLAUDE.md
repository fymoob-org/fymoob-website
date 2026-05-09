# FYMOOB — Site Imobiliário SEO-First

## REGRA ABSOLUTA — API LOFT/VISTA
**NUNCA, em NENHUMA hipótese, executar operações de exclusão ou modificação destrutiva na API do Loft/Vista.**
- NUNCA chamar endpoints de DELETE em imóveis, clientes, leads ou qualquer outro recurso
- NUNCA chamar PUT/POST que remova, sobrescreva ou limpe dados existentes
- NUNCA executar scripts que possam alterar ou apagar dados no CRM do cliente
- Usar a API APENAS para LEITURA (GET) e envio de leads (POST /lead)
- Se precisar testar escrita, usar APENAS o sandbox (sandbox-rest.vistahost.com.br), NUNCA produção
- **Esta regra não tem exceção. Dados do cliente são sagrados.**

---

## Projeto
Reconstrução do site da imobiliária FYMOOB (Curitiba/PR) com foco em SEO e geração de leads orgânicos via Google.

**Baseline real do site antigo (fymoob.com na Atomicat/Loft, GSC 2026-04-17, janela 3m):**
- 92 páginas indexadas no Google / 291 descobertas não indexadas
- 122 páginas únicas com impressões nos últimos 3 meses
- ~580 cliques/mês na home
- Cobertura do CRM: ~70 imóveis indexados de 1.479 ativos = **<5%**
- Zero landing pages estratégicas (bairros, tipos, preços, combinações)
- Query strings indexadas poluindo índice (`/busca?ordenar=...`, `/busca?tipo=Casa&ordenar=`)
- Duplicate content + soft 404s + URLs de imóveis deletados ainda no índice

**Oportunidade do novo site:**
- 560 URLs estratégicas (234 imóveis + 65 bairros + tipos + combinações + faixas + conteúdo editorial)
- Landing pages por intenção de busca específica
- SEO técnico correto (canonicals, schema.org, sitemap hierárquico)
- Cobertura CRM: 100% dos imóveis ativos

**Baseline completo e screenshots:** [docs/metrics-baseline/README.md](docs/metrics-baseline/README.md).

## Stack
- **Framework:** Next.js 15+ (App Router, TypeScript)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix + Tailwind)
- **Icons:** Lucide React
- **Fontes:** Poppins (headings/nav) + Inter (body)
- **Paleta:** Azul FYMOOB (#29ABE2) + branco — identidade atual da marca
- **CRM:** Loft/Vista API REST (antigo Vista) — chave da API será configurada via env
- **Banco:** Supabase (PostgreSQL + Storage + Auth) — sa-east-1
- **Blog CMS:** custom admin com BlockNote + Supabase (Fase 18, substitui Sanity removido em 30/04/2026)
- **Editor blog:** [`@blocknote/react`](src/components/admin/ArticleEditor.tsx) com 6 blocos custom (MethodologyBox, CalloutBox, CTABox, Changelog, FAQ, ImovelDestaque)
- **Imagens:** CDN Vistahost (`cdn.vistahost.com.br`) + Supabase Storage (3 buckets: articles-covers, articles-inline, authors)
- **Deploy:** Vercel
- **Domínio:** fymoob.com

## Comandos
```bash
npm run dev          # Desenvolvimento local
npm run build        # Build de produção
npm run lint         # Linting
npm run test         # Testes
npm run smoke        # Smoke test (25 rotas em prod fymoob.com.br)
npm run smoke https://preview.xxx.vercel.app   # testar preview URL
```

## Smoke Test (CI)
> Pós-deploy roda automaticamente via `.github/workflows/smoke-test.yml` quando
> Vercel conclui deploy de produção. Valida 25 rotas incluindo 1 `/imovel/` real
> extraído do sitemap/0.xml (não hardcoded). Se falhar, commit fica marcado ❌
> no GitHub — visibilidade imediata pra reverter.
>
> Cobertura: home, busca, sitemaps (4 shards), 1 imóvel + 1 empreendimento real,
> landings programáticas, blog, guia, pillars, robots, llms, OG image, proteção
> admin (307), /api/revalidate sem secret (401), /api/lead GET (405), /api/photos
> inválido (400). Ver `scripts/smoke-test.mjs`.

## Convenções de Código
- Todo código da aplicação fica dentro de `src/`
- Componentes em PascalCase, arquivos em kebab-case
- Server Components por padrão, 'use client' apenas quando necessário
- UI components via shadcn/ui — nunca criar do zero se shadcn tem equivalente
- Ver `.claude/skills/frontend-design/SKILL.md` para design system completo
- Todas as páginas públicas devem exportar `generateMetadata()`
- Todas as páginas de imóvel devem incluir JSON-LD schema markup
- Imagens sempre via `<Image />` do Next.js com alt descritivo
- Dados da API Loft via `src/services/loft.ts` — nunca chamar API direto nos componentes
- Dados de artigos via `src/services/articles.ts` (Supabase, Fase 18). Wrapper de compatibilidade em `src/services/blog.ts` com toggle `BLOG_SOURCE=supabase|<vazio>` (vazio = MDX legado).
- Sem mock data — API Loft é a única fonte de dados (LOFT_API_KEY obrigatória)
- Env vars chaves: `LOFT_API_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BLOG_SOURCE`, `CRON_SECRET` — ver `.env.example`

## Performance — Regras obrigatórias
> Meta: Lighthouse mobile >80 em todas as páginas. Toda nova feature deve preservar performance.
- **Server Components por padrão** — 'use client' apenas para interatividade (hooks, eventos)
- **CSS puro > biblioteca JS** — animações, sliders, layouts responsivos via CSS/Tailwind
- **NUNCA usar JS para decidir layout responsivo** (useIsMobile = CLS). Usar classes Tailwind (`sm:`, `md:`)
- **Dynamic import (`next/dynamic`)** para componentes pesados abaixo do fold
- **Padrão wrapper client** para `ssr: false`: criar client component wrapper, importar do server component
- **Lazy localStorage** via `requestIdleCallback` — nunca bloquear main thread com localStorage síncrono
- **Imagens:** `priority` apenas no LCP element (1 por página). Demais usam `loading="lazy"` (padrão)
- **GA4:** DeferredGA (carrega após interação ou 12s) — nunca carregar síncrono
- **Carousel (embla):** nunca carregar no bundle inicial de listagens. Dynamic import para seções abaixo do fold
- **Mapa (maplibre):** sempre dynamic import via IntersectionObserver (200px rootMargin), CSS carregado via CDN dinâmico
- **Animações:** CSS `animation-timeline: view()` com fallback. Nunca `opacity:0` + JS IntersectionObserver para animação de entrada
- **FAQ:** `<details>/<summary>` nativo (zero JS). Nunca Accordion/Radix para FAQ

## Performance Changes — REQUIRE HYPOTHESIS + MEASUREMENT
> **Escopo: SÓ quando o PR faz claim de impacto em performance.** Para mudanças rotineiras (bug fix, layout, CSS, conteúdo, feature sem claim de perf), **pular o protocolo**.

### Quando APLICA (obrigatório)
PR se encaixa em QUALQUER uma destas:
- Descrição/commit menciona ganho numérico (`-X KB`, `-Y ms`, `+Z score`, `resolve bottleneck`)
- Adiciona/troca lib ou componente pesado (@base-ui, maplibre, embla, radix)
- Split/merge de bundle, dynamic imports motivados por perf
- Alterações em `next.config.ts`, `modularizeImports`, `optimizePackageImports`
- Mudanças explicitamente para "melhorar Lighthouse/CWV/TBT/LCP"
- Size-limit falha no CI (regression budget enforcement)

Nesse caso:
1. Registrar hipótese em `docs/perf/hypotheses/H-YYYYMMDD-NNN.md` (template: [`.claude/protocols/HYPOTHESIS.md`](.claude/protocols/HYPOTHESIS.md))
2. Medir baseline com `npm run perf:baseline -- <url>` e `npm run perf:bundle` antes (CoV < 10%)
3. **Uma** mudança por PR (attribution limpa)
4. Medir depois; reportar delta no commit com link pro arquivo `docs/perf/baselines/`
5. Se não atingiu success criterion e não está dentro do kill → reverter
6. Quando não dá pra medir, output `MEASUREMENT_REQUIRED` — **NUNCA inventar número**

### Quando NÃO APLICA (dispensa de burocracia)
Seguir o fluxo normal, sem hipótese nem medição:
- **Bug fix**: corrigir comportamento quebrado (lógica, crash, UX errada)
- **Layout / CSS / visual**: padding, cor, tipografia, espaçamento, responsividade
- **Conteúdo**: texto, imagens, copy, traduções
- **Feature nova sem claim de perf**: adicionar página, botão, formulário
- **Refactor interno**: rename, extrair função, mover arquivo, dividir componente
- **Docs, testes, infra de dev** (ex: adicionar eslint rule, tipos TS)
- **Bump de dep** sem claim de perf (ex: patch de segurança)

Se ao fazer uma dessas você acidentalmente **regredir performance** (size-limit falha no CI), aí sim entra no protocolo — mas pra decidir se compensa ou se precisa mitigar.

### Hot fix — atalho explícito
Prod quebrado, urgência real, sem tempo pra protocolo:
- Fazer o fix direto, prefixar commit com `hotfix(...)`
- **Depois do fix no ar**, se a mudança tem relevância de perf, abrir follow-up PR com a hipótese e a medição pós-fato
- Registrar em `docs/perf/hotfixes.log` (append-only) a data + commit + motivo — pra não acumular débito invisível

### Em dúvida?
Pergunte: *"estou afirmando um número de KB/ms neste PR?"* Se sim, protocolo. Se não, dispensa.

**Protocolos (ler só se aplica):**
- [`.claude/protocols/HYPOTHESIS.md`](.claude/protocols/HYPOTHESIS.md) — template HDD
- [`.claude/protocols/MEASURE-BEFORE-CLAIM.md`](.claude/protocols/MEASURE-BEFORE-CLAIM.md) — checklist + escopo detalhado
- [`.claude/protocols/STATISTICAL-RIGOR.md`](.claude/protocols/STATISTICAL-RIGOR.md) — CoV, mediana, 5 runs
- [`.claude/protocols/ATTRIBUTION.md`](.claude/protocols/ATTRIBUTION.md) — rastrear causa real antes de propor fix

**Baseline atual:** [`docs/perf/baseline-current.md`](docs/perf/baseline-current.md).

## Arquitetura de URLs (SEO)
```
/                                    → Home
/imovel/[slug]                       → Página individual do imóvel
/imoveis/[bairro]                    → Landing page por bairro
/imoveis/[bairro]/[tipo]             → Landing combinada bairro+tipo
/apartamentos-curitiba               → Landing page por tipo (estática)
/casas-curitiba                      → Landing page por tipo (estática)
/sobrados-curitiba                   → Landing page por tipo (estática)
/terrenos-curitiba                   → Landing page por tipo (estática)
/blog/[slug]                         → Artigo do blog
/faq                                 → Perguntas frequentes
/sobre                               → Sobre nós
/contato                             → Contato
/anuncie                             → Anunciar imóvel
/busca                               → Busca com filtros (SSR)
/imoveis/[bairro]/venda              → Landing bairro + venda (programático)
/imoveis/[bairro]/aluguel            → Landing bairro + aluguel (programático)
/apartamentos-curitiba/venda         → Landing tipo + finalidade
/imoveis/ate-300-mil                 → Landing faixa de preço
/imoveis/[bairro]/[n]-quartos        → Landing bairro + quartos (futuro)
/empreendimento/[slug]               → Página individual empreendimento
/empreendimentos                     → Listagem de empreendimentos
```

## Analytics (GA4 + GSC) — single source of truth
**Antes de propor tracking novo, ler [`docs/analytics/README.md`](docs/analytics/README.md).** Cobre:
- GA4 Property `535148801` configurada via API: 8 custom dimensions, 2 key events com valor (R$ 500/100), data retention 14m, BigQuery export ativo
- 5 eventos GA4 disparados: `view_item`, `select_item`, `whatsapp_click`, `generate_lead`, `phone_click`
- OAuth refresh tokens em `.env.local`: `GA4_REFRESH_TOKEN` (admin+data) + `GSC_REFRESH_TOKEN` (read)
- Scripts: `ga4-fase1-config.mjs` (idempotente), `ga4-admin-oauth-bootstrap.mjs`, `gsc-coverage-audit.mjs`
- Helpers: `pushAnalyticsEvent`, `getPageContext`, `priceToBucket` em [`src/lib/analytics.ts`](src/lib/analytics.ts)
- Trackers globais no layout: `<DeferredGA>`, `<WhatsAppClickTracker>`, `<PhoneClickTracker>`
- `<PageContextSync>` em paginas de imovel/empreendimento alimenta custom dims automaticamente

## SEO — Regras obrigatórias
- Toda página pública: `generateMetadata()` com title, description, og:image únicos
- Toda página de imóvel: JSON-LD `RealEstateListing` com preço, endereço, geo, quartos, área
- Layout raiz: JSON-LD `Organization` + `LocalBusiness`
- `sitemap.ts` dinâmico listando todos os imóveis + bairros + blog
- `robots.ts` permitindo tudo exceto /api/, /favoritos, /comparar
- Breadcrumbs com schema `BreadcrumbList` em todas as páginas
- Imagens: alt = "Foto do [tipo] com [N] quartos no [bairro], Curitiba"

## API Loft/Vista — Referência rápida
- Endpoint: `https://[dominio].vistahost.com.br/imoveis/listar?key=KEY`
- Paginação: max 50 resultados por request
- Campos: Codigo, Categoria, Cidade, Bairro, ValorVenda, ValorLocacao, Dormitorio, Suites, Vagas, AreaTotal, AreaPrivativa, Descricao, FotoDestaque, fotos[], Status, Finalidade
- Detalhes: `/imoveis/detalhes?key=KEY&imovel=CODIGO`
- 249 imóveis ativos via API REST (dados ao vivo do CRM)

## Nunca Supor — REGRA FUNDAMENTAL
- **Toda tarefa é complexa até provado o contrário.** Especialmente filtros, mapeamentos de dados, regras baseadas em valores do CRM/API externa.
- **NUNCA supor valores de campos enum/status sem validar o que a API realmente retorna.** Screenshot do UI interno do CRM ≠ payload da API.
- **Blacklist conservadora > whitelist estrita.** Se não tem certeza, remova apenas o que sabidamente é ruim. Filtros do tipo "if valor não está na minha lista curta, descarta" = bug garantido (vide incidente 16/04/2026 quebrando site inteiro por mapear status que não matchava API real).
- **Testar antes de commitar:** se a mudança altera quantidade de resultados, comparar "antes" vs "depois" (ex: tinha 231 imóveis, agora tem 0 = quebrou).
- **Buscar provas, não presumir.** Grep no código existente, log temporário, exemplo de resposta real — sempre antes de regras novas.

## Task Management — REGRA OBRIGATÓRIA
- **Fonte única conceitual:** [`docs/TASKS.md`](docs/TASKS.md) é o **índice mestre** (~140 linhas: tabela Status Geral + foco da semana + ponteiros). Detalhe de cada fase em [`docs/tasks/<fase>.md`](docs/tasks/). Sessões antigas e fases concluídas em [`docs/tasks/archive/`](docs/tasks/archive/).
- **Ao começar uma sessão:** ler o índice + apenas o(s) arquivo(s) da(s) fase(s) em foco (não toda a árvore).
- **APÓS CADA IMPLEMENTAÇÃO:**
  1. Marcar `[x]` no arquivo da fase ativa (`docs/tasks/<fase>.md`)
  2. Atualizar contadores na tabela Status Geral em `docs/TASKS.md`
  3. Tasks novas vão no arquivo da fase apropriada (nunca no índice)
  4. Se fase completa: mover inteira para `docs/tasks/archive/fases-concluidas.md` + atualizar status no índice
- **NUNCA** fazer commit sem atualizar a fase ativa + contador no índice.
- **Sessões fechadas:** mover blocos `<details>` da fase ativa para `docs/tasks/archive/sessoes-YYYY-MM.md` no primeiro commit do mês seguinte.

## Contexto de negócio
- Ver `docs/project-context.md` para dados completos do cliente
- Ver `docs/TASKS.md` (índice mestre) + `docs/tasks/<fase>.md` para detalhe
- Ver `docs/sprint-plan.md` para referência histórica das fases originais
- Ver `docs/seo-strategy.md` para estratégia técnica detalhada de SEO

## Compactação
Quando compactar, SEMPRE preservar:
- Lista de arquivos modificados na sessão atual
- Fase/sprint atual do plano de execução
- Quaisquer decisões de arquitetura tomadas
- Comandos de teste relevantes

## Workflow de Sessão
- **Início de sessão:** rodar `/project:resume` para saber onde parou
- **Final de sessão:** rodar `/project:checkpoint` para salvar progresso
- **Criar página:** rodar `/project:new-page` para seguir padrões SEO
- **Revisar SEO:** invocar agente `seo-reviewer` para validar páginas
- **Entre fases:** usar `/clear` para limpar contexto

## Conteúdo SEO — Fontes, princípios editoriais e hardening jurídico

**Antes de escrever ou revisar qualquer artigo do blog**, ler [`docs/seo/article-writing-rules.md`](docs/seo/article-writing-rules.md). Cobre:

- Princípios obrigatórios (CRM ≠ fonte estatística, FipeZap, datas explícitas, claims absolutos com caveat)
- Hierarquia de fontes (5 tiers: oficiais → setor → mídia → compiladores → colaborativo)
- Critérios pra revisão pré-publicação
- Vocabulário padronizado do cluster (substituições obrigatórias em texto corrido)
- Hardening jurídico (Tema 1113/STJ, Lei 13.786/2018, propter rem, art. 108 CC, SESP-PR, INCC-DI vs M)
- Workflow de revisão idempotente (validado em 15 artigos)

## Blog Custom Admin (Fase 18 — concluída 30/04/2026)
Sanity foi removido por completo. Stack atual:
- **Editor:** BlockNote (Notion-like) em `/admin/blog/[id]` com autosave, preview, SEO Score gate, histórico de revisões
- **Autores:** CRUD em `/admin/blog/autores` (E-E-A-T: schema Person/RealEstateAgent dinâmico)
- **Migração 15 MDX:** `node scripts/migrate-mdx-to-supabase.mjs` (idempotente)
- **Cron Vercel:** `/api/cron/publish-scheduled` roda diário 06:00 UTC (publica `status=scheduled`)
- **Toggle blog público:** `BLOG_SOURCE=supabase` em prod ativa o read do Supabase. Fallback default = MDX em `content/blog/`
- Detalhes: [`docs/tasks/fase-18-blog-admin.md`](docs/tasks/fase-18-blog-admin.md), `supabase/README.md` (migrations + buckets)