# Fase 22 — Wizard moderno de captação `/anuncie`

> **Status:** ✅ MVP IMPLEMENTADO (19/05/2026) — falta validação visual + criar bucket Supabase
> **Tipo:** Melhoria gratuita (não cobrada — entrega antes dos add-ons pagos)
> **Esforço estimado:** ~3 dias dev (MVP) + ~2 dias polish (Fase 2)

## Contexto

Form atual em `/anuncie`, `/anuncie/venda` e `/anuncie/locacao` captura só
5 campos (nome, email, telefone, dropdown interesse, mensagem livre). Resultado:
Bruno/Wagner perdem 30-60 min/lead ligando pra coletar dados básicos
(endereço, tipo, m², quartos, valor).

Bruno solicitou em 19/05/2026: form mais moderno, multi-step, captando
dados estruturados + fotos.

## Diagnóstico do form atual

- ❌ Zero info do imóvel (endereço, tipo, m², quartos, valor)
- ❌ Sem upload de fotos (proprietário com fotos = lead 3x mais quente)
- ❌ Campo "Mensagem" livre = corretor recebe texto bagunçado
- ❌ Single page com 6+ seções antes do form = scroll fatigue
- ❌ Sem progress visual = abandono alto

## Referências de mercado (2025-2026)

Best practices que viraram padrão:

| Plataforma | Estrutura | Aceita fotos | Diferenciais |
|---|---|---|---|
| Quinto Andar | Wizard 4 etapas | ❌ (visita prof) | Sugestão de preço, autocomplete CEP |
| Loft "Vender" | Wizard 4-5 etapas | ❌ (vistoria) | Calculadora, comparáveis |
| ZAP / Viva Real | Wizard 5-6 etapas | ✅ até 30 fotos | Tutorial integrado |
| OLX Imóveis | Single page longa | ✅ self-service | Anúncio cru |
| Apolar Curitiba | Single simples | ❌ | Form básico (FYMOOB atual) |

**5 best practices que viraram padrão:**
1. Multi-step wizard 3-5 etapas (converte ~30% mais que single — Baymard)
2. Autocomplete CEP via ViaCEP (preenche 4 campos automático)
3. Upload de fotos opcional mas valorizado
4. Sugestão de valor de mercado
5. Auto-save em localStorage (forms longos têm 70% abandono sem)

## Wireframe da solução proposta

```
┌─────────────────────────────────────────────────────┐
│  ●━━━●━━━○━━━○━━━○      Etapa 2 de 4 (50%)         │
└─────────────────────────────────────────────────────┘

ETAPA 1 — Onde está seu imóvel?    [fácil → reduz fricção]
  CEP        [_____-___] 🔍       ViaCEP autocompleta
  Cidade     [Curitiba]            auto-preenchido
  Bairro     [Mossunguê]           editável
  Rua        [Av Padre Anchieta]   editável
  Número     [___]
  Complemento (opcional)

ETAPA 2 — Sobre o imóvel
  Tipo      ⚪ Apto  ⚪ Casa  ⚪ Sobrado
            ⚪ Cobertura ⚪ Studio ⚪ Sala
  Área privativa  [____] m²
  Quartos      [-][2][+]   steppers
  Suítes       [-][1][+]
  Vagas        [-][1][+]
  Andar (se apto)

ETAPA 3 — Valor pretendido
  Valor pretendido    R$ [____________]
  Condomínio (mensal) R$ [____________]
  IPTU (anual)        R$ [____________]
  [☑] Não sei o valor → quero uma avaliação primeiro

ETAPA 4 — Seus dados + fotos
  📷 Upload de fotos (drag & drop, até 10, 5MB cada)
      💡 Imóveis com fotos têm 3x mais visitas

  Nome / Email / WhatsApp
  Mensagem opcional
  [☑] Autorizo contato + LGPD
  [Turnstile anti-bot]
  → ENVIAR CADASTRO
```

## Mapeamento Form → API Loft

Todos os campos batem com `Property` type ([src/types/property.ts](../../src/types/property.ts)):

| Form | Campo Loft | Existe? |
|---|---|---|
| Tipo | `Categoria` | ✅ |
| CEP/Bairro/Rua/Número | `Bairro`, endereço | ✅ |
| Área | `AreaPrivativa` | ✅ |
| Quartos | `Dormitorio` | ✅ |
| Suítes | `Suites` | ✅ |
| Vagas | `Vagas` | ✅ |
| Valor | `ValorVenda` / `ValorLocacao` | ✅ |
| Condomínio | `ValorCondominio` | ✅ |
| IPTU | `ValorIptu` | ✅ |
| Fotos | `Foto[]` | ✅ |

**Decisão técnica:** form NÃO cria imóvel direto no CRM (regra: API Loft = read-only).
Lead chega pra Bruno/Wagner via email com payload estruturado HTML; eles cadastram
manualmente no CRM em ~2 min (vs 30-60 min de telefonema).

## Plano técnico

### Fase 1 — MVP (~3 dias)

#### Componentes (frontend)

- [x] `src/app/anuncie/_components/AnuncieWizard.tsx` — orchestrator, state management
- [x] `src/app/anuncie/_components/steps/Step1Endereco.tsx`
- [x] `src/app/anuncie/_components/steps/Step2Imovel.tsx`
- [x] `src/app/anuncie/_components/steps/Step3Valor.tsx`
- [x] `src/app/anuncie/_components/steps/Step4Contato.tsx`
- [x] `src/app/anuncie/_components/ProgressBar.tsx` — visual 4 dots
- [x] `src/app/anuncie/_components/PhotoUpload.tsx` — drag&drop pra Supabase
- [x] `src/app/anuncie/_components/Stepper.tsx` — counter `-` `+` reutilizável

#### Hooks / utils

- [x] `src/app/anuncie/_hooks/useViaCEP.ts` — fetch ViaCEP API (gratuita) + cache
- [x] `src/app/anuncie/_hooks/useWizardAutosave.ts` — persiste state em localStorage
- [ ] `src/lib/lead-schema.ts` — Zod schema pra validar payload final *(MVP: validação inline em cada step)*

#### Integração

- [x] Substituir `<ContactForm>` em `/anuncie/venda/page.tsx` por `<AnuncieWizard mode="venda" />`
- [x] Substituir em `/anuncie/locacao/page.tsx` por `<AnuncieWizard mode="locacao" />`
- [x] `/anuncie` (hub) mantém os 2 cards apontando pras especializadas

#### Backend

- [x] Reusa `/api/lead` existente — wizard passa `mensagem` construída via `buildMensagem()` consolidando todos os campos. Payload extra `imovel` (JSON estruturado) também enviado, MAS hoje `/api/lead` ignora (fica como hook futuro)
- [ ] Email template HTML rico pra Bruno (Fase 2 — hoje o CRM Loft mostra `mensagem` como texto)
- [x] Rate limit via Upstash — `checkLeadRateLimit(ip)` em `/api/upload-lead-photo` e `/api/lead`
- [x] Turnstile no Step 4 do wizard
- [ ] Salvar lead em Supabase `leads_anuncie` table (futuro — Fase 2)

#### Upload de fotos (Supabase)

- [ ] **PENDENTE:** criar bucket `lead-photos` no Supabase Dashboard (público; URLs incluídas na mensagem do lead)
- [x] Resize server-side via Sharp (max 1600px largura, WebP qualidade 82) — reusa `uploadImage()` de `src/lib/supabase-storage.ts`
- [x] Validação: max 10 fotos, max 5MB cada, MIME image/*
- [x] URL pública da foto incluída no texto da mensagem (`buildMensagem` → seção "FOTOS")

### Fase 2 — Polish (~2 dias, depois)

- [ ] Sugestão de valor de mercado por bairro (FipeZap por bairro + comparáveis Loft)
- [ ] Confirmation page rica com próximos passos visuais
- [ ] Notificação WhatsApp automática pra Bruno (Twilio ou WAHA)
- [ ] Tooltip "?" em campos avançados (CEP, suítes vs quartos, valor sugerido)
- [ ] Analytics: track abandono por etapa (GA4 custom event)

## UX modernos a aplicar

| Feature | Esforço | Impacto |
|---|---:|---|
| Wizard multi-step | 4h | 🟢 Alto (conversão +30%) |
| Progress bar 4 dots | 1h | 🟢 Alto |
| Autocomplete CEP (ViaCEP) | 2h | 🟢 Alto |
| Validação inline | 2h | 🟡 Médio |
| Auto-save localStorage | 2h | 🟡 Médio |
| Upload fotos drag&drop | 6-8h | 🟢 Alto |
| Steppers (`-`/`+`) | 1h | 🟡 Médio (mobile) |
| Confirmation page rica | 2h | 🟡 Médio |
| Sugestão de valor (Fase 2) | 8-12h | 🟠 Complex |

**Total MVP:** ~20-24h (~3 dias)
**Total c/ Polish:** ~30-36h (~4-5 dias)

## Cronograma

- **2026-05-19 (hoje):** documentação + início implementação Fase 1
- **2026-05-22 (estimativa):** MVP em produção
- **Pós Bruno aprovar add-ons:** Fase 2 (polish)

## Política de cobrança

Esta fase **NÃO está sendo cobrada do Bruno**. Entra como melhoria gratuita
sob a justificativa: a página `/anuncie` é parte do contrato original
(04/04/2026, cláusula 2). A separação em `/venda`/`/locacao` (commit
c3431cd, 18/05) e este wizard moderno são evolução do entregável original,
não funcionalidade nova.

Quando Bruno aprovar Pack Certidões / Propostas / Laudos do roadmap em
[add-ons-orcamento.md](add-ons-orcamento.md), parte da infra desta fase
(wizard component, Supabase Storage, server action, Turnstile, ViaCEP) será
**reutilizada** — reduz custo das próximas fases.

## Histórico

- **2026-05-19** — Bruno solicitou form moderno multi-step, fase iniciada
- **2026-05-19** — MVP implementado: wizard 4 etapas, autosave localStorage, ViaCEP autocomplete, upload Supabase (bucket `lead-photos`), Turnstile, LGPD, integração `/anuncie/venda` e `/anuncie/locacao`. Aguarda criação manual do bucket no Supabase + validação visual local.
