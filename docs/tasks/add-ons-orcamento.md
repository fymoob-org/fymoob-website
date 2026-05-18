# Roadmap de Serviços Online (Bruno)

> Status, valores e prioridade dos serviços online solicitados pelo Bruno.
> **Atualizado:** 2026-05-18 — lista enxuta após conversa com Bruno
> (descartados itens fora da lista atual; manter foco nos 8 abaixo).

---

## 📋 Lista oficial — 8 serviços solicitados pelo Bruno

### Imóvel
1. **Laudo de Avaliação Judicial** (R$)
2. **Calculadora de imóvel** (igual ChatGPT, IA)
3. **Laudo de Avaliação Física** (R$)

### Vendas
4. **Pack de Certidões** (R$)
5. **Proposta Online (venda)**
6. **Anuncie seu imóvel pra venda** ← _já existe parcialmente_

### Locação
7. **Proposta + Análise de Crédito (locação)**
8. **Anuncie seu imóvel pra locação** ← _já existe parcialmente_

---

## ✅ Itens 6 e 8 — "Anuncie venda" e "Anuncie locação"

**Status:** ✅ **MELHORIA APLICADA (18/05/2026, sem custo)**

Antes da conversa, existia `/anuncie` única que cobria os 2 casos. Agora:

- `/anuncie` → hub com 2 botões grandes (Quero vender / Quero alugar)
- `/anuncie/venda` → página dedicada, copy direcionado pra proprietário vendendo
- `/anuncie/locacao` → página dedicada, copy direcionado pra proprietário alugando

Cada página tem etapas, benefícios e form específicos. Form com `interesseOptions` filtrado por contexto.

Não cobrado — entrou como melhoria de UX.

---

## 💰 Itens 1-5 e 7 — Features novas (a orçar)

### Esforço e valor sugerido

| # | Item | Esforço | Tempo real | Valor pro Bruno | Custo recorrente |
|---|---|---|---:|---:|---|
| 4 | **Pack Certidões** (Pix manual) | 🟢 BAIXO | 1-2 dias | **R$ 1.500** | — |
| 4 | **Pack Certidões** (gateway online) | 🟢 BAIXO | 3-4 dias | **R$ 2.800** | ~2% por transação |
| 5 | **Proposta de Venda** (sozinha) | 🟡 MÉDIO | 2 dias | **R$ 1.000** | — |
| 7 | **Proposta + Análise Crédito** (loc, sozinha) | 🟡 MÉDIO | 3 dias | **R$ 1.500** | — |
| 5+7 | **Combo Propostas** (venda + loc juntas) | 🟡 MÉDIO | 4-5 dias | **R$ 2.200** | — |
| 3 | **Laudo Físico** | 🟠 ALTO | 2-3 dias | **R$ 1.000** | — |
| 1 | **Laudo Judicial** | 🟠 ALTO | 3-4 dias | **R$ 1.500** | — |
| 2 | **Calculadora ChatGPT** | 🔴 MUITO ALTO | 8-12 dias | **R$ 5.000** | R$ 50-200/mês (API IA) |

### Pacote completo

- **Manual + combo:** R$ 13.000
- **Online + combo:** R$ 14.300

---

## 📅 Ordem técnica recomendada

```
Fase 1 (~2 sem) — Pack Certidões
  Gera receita já (cobra cliente), independente dos outros.

Fase 2 (~3 sem) — Combo Propostas (venda + locação + análise crédito)
  Compartilham 70% do código (form, geração de PDF, email).
  Fazer junto sai ~30% mais barato vs. separado.

Fase 3 (~2 sem) — Laudos (Físico + Judicial)
  Templates de PDF diferentes mas infra reaproveitada da Fase 2.
  Judicial precisa: perito parceiro com CRECI judicial confirmado.

Fase 4 (~4-6 sem) — Calculadora ChatGPT
  Por último: mais cara, custo recorrente de IA, validação anti-alucinação.
  Vale começar depois que os outros tiverem rodando.
```

---

## ❓ Decisão pendente (pergunta enviada ao Bruno)

**Captação vs. monetização:**

- Lead novo (precisa mais gente no funil) → começar pela **Calculadora**
- Monetizar quem já chegou → começar por **Certidões + Propostas**

Resposta do Bruno define ordem real das fases.

---

## Política contratual

Base legal: Cláusula 2, §2º do contrato (04/04/2026) — "*Quaisquer funcionalidades,
páginas ou serviços não listados nesta cláusula estão fora do escopo deste
contrato e, se solicitados, serão objeto de orçamento complementar aprovado
por ambas as partes antes da execução.*"

Aprovação válida: WhatsApp com confirmação por escrito (§5º Cláusula 13ª).

---

## Histórico

- **04/04/2026** — contrato original assinado, escopo definido
- **18-19/04/2026** — primeiros add-ons mapeados (configurador-servicos.html)
- **18/05/2026** — Bruno mandou lista enxuta de 8 serviços. Itens fora da lista
  removidos do roadmap ativo. `/anuncie/venda` e `/anuncie/locacao` separados
  como melhoria gratuita. Mensagem com fases enviada pra Bruno aguardando
  resposta sobre prioridade.
