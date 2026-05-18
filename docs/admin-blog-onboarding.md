# Onboarding — Painel Admin do Blog FYMOOB

> Manual passo a passo pra criar, editar, programar e excluir artigos do blog.
>
> **Última atualização:** 2026-05-15
> **Versão do admin:** Fase 18 (BlockNote + Supabase)
> **Screenshots:** [docs/admin-blog-screenshots/](./admin-blog-screenshots/) (30 prints capturados em 15/05/2026)
>
> Esse doc é referência rápida pra consultar quando esquecer "como faço X".

---

## Índice

1. [Acesso e login](#1-acesso-e-login)
2. [Visão geral — lista de artigos](#2-visao-geral-lista-de-artigos)
3. [Criar um artigo novo](#3-criar-um-artigo-novo)
4. [Usar o editor (BlockNote)](#4-usar-o-editor-blocknote)
5. [Blocos custom da FYMOOB](#5-blocos-custom-da-fymoob)
6. [SEO Score — o que é e como subir](#6-seo-score-o-que-e-e-como-subir)
7. [Configurar metadados do artigo](#7-configurar-metadados-do-artigo)
8. [Salvar, publicar e programar publicação](#8-salvar-publicar-e-programar-publicacao)
9. [Editar artigo já publicado](#9-editar-artigo-ja-publicado)
10. [Histórico de revisões](#10-historico-de-revisoes)
11. [Excluir artigo](#11-excluir-artigo)
12. [Gerenciar autores](#12-gerenciar-autores)
13. [Upload de imagens](#13-upload-de-imagens)
14. [Erros comuns](#14-erros-comuns)
15. [Glossário](#15-glossario)

---

## 1. Acesso e login

### O que aprende
Como entrar no painel admin a partir de qualquer dispositivo.

### Passo a passo

1. Acesse: **https://fymoob.com.br/admin**
2. Você verá a tela de login.
3. Use email + senha cadastrados. Se ainda não tem acesso, envie um email solicitando pra **dev.viniciusdamas@gmail.com**.
4. Após logar, cai direto na lista de artigos.

![Tela de login do admin](./admin-blog-screenshots/01-login-tela.png)
![Dashboard inicial após login](./admin-blog-screenshots/02-dashboard-admin.png)

### Dicas

- Use sempre o mesmo dispositivo pra ficar logado por mais tempo
- Se esqueceu senha → reset por email (botão "Esqueci minha senha")

---

## 2. Visão geral — lista de artigos

### O que aprende
Entender o que cada coluna da lista mostra + como filtrar.

### Passo a passo

1. Na URL `/admin/blog` você vê todos os artigos.
2. Colunas visíveis: Título, Autor, Status (draft/scheduled/published), Última atualização, Ações.
3. Use filtros no topo pra ver apenas status específico (rascunhos, agendados, publicados).

![Lista completa de artigos](./admin-blog-screenshots/03-lista-artigos-completa.png)

![Barra de filtros e busca](./admin-blog-screenshots/04-filtros-busca.png)

![Botão Novo artigo no topo direito](./admin-blog-screenshots/05-novo-artigo-botao.png)

### Glossário rápido (status)

| Status | Cor | O que significa |
|---|---|---|
| **Rascunho** | âmbar | Só você vê. Não publicado |
| **Agendado** | azul | Programado pra publicar em data futura |
| **Publicado** | verde | Visível em fymoob.com.br/blog |
| **Arquivado** | cinza | Removido do site, mas guardado no banco |

---

## 3. Criar um artigo novo

### O que aprende
Criar um artigo do zero.

### Passo a passo

1. Click em **"Novo artigo"** no topo direito da lista
2. Preencha o **título** (campo grande no topo)
3. O **slug** (URL) é gerado automático do título — pode editar se quiser
4. Comece a escrever no editor (cursor já está posicionado)
5. Não esquece de salvar (Ctrl+S ou botão "Salvar rascunho")

![Editor vazio após criar artigo novo](./admin-blog-screenshots/06-editor-vazio.png)

![Painel lateral com aba Conteúdo](./admin-blog-screenshots/07-painel-lateral-conteudo.png)

![Barra de ações no topo (Histórico, Preview, Salvar, Agendar, Publicar)](./admin-blog-screenshots/08-toolbar-acoes.png)

### Dica importante

- **Título define o slug** → mudar título depois muda URL → quebra links externos. Decida o título antes de divulgar o artigo.

---

## 4. Usar o editor (BlockNote)

### O que aprende
Como funciona o editor estilo Notion: blocos, atalhos, formatação.

### Passo a passo

1. **Cada linha é um "bloco"** — pode ser parágrafo, título, lista, etc.
2. Digite `/` em qualquer lugar pra abrir o **menu de blocos** (slash menu).
3. Atalhos rápidos:
   - `#` + espaço = título 1 (H1) — *não use, é só pra o título do artigo*
   - `##` + espaço = título 2 (H2)
   - `###` + espaço = título 3 (H3)
   - `>` + espaço = citação
   - `-` ou `*` + espaço = lista bullet
   - `1.` + espaço = lista numerada
4. **Selecione texto** pra abrir menu de formatação (negrito, itálico, link).

![Slash menu aberto após digitar `/`](./admin-blog-screenshots/10-slash-menu-aberto.png)

![Seção FYMOOB do slash menu (6 blocos custom)](./admin-blog-screenshots/11-slash-menu-blocos-fymoob.png)

![Editor playground (sandbox de teste sem afetar artigos reais)](./admin-blog-screenshots/12-editor-playground.png)

### Dicas

- **Use H2 pra seções principais, H3 pra subseções**
- Não pule níveis (H2 → H4 sem H3 no meio) — ruim pra SEO
- **Link**: selecione texto → Ctrl+K → cola URL

---

## 5. Blocos custom da FYMOOB

### O que aprende
6 blocos especiais que só existem no nosso editor.

### Os blocos

| Bloco | Quando usar | Aparência no site |
|---|---|---|
| **Methodology Box** | Topo de artigo de dados, citar fonte/período | Caixa cinza institucional |
| **Callout Box** | Destacar info importante no meio do texto | Caixa colorida com ícone |
| **CTA Box** | Conversão (final de seção, oferecer contato) | Botão grande chamativo |
| **Changelog** | Topo de artigo "pillar" (atualizado periódico) | Bloco com data + mudanças |
| **FAQ Item** | Perguntas frequentes (gera schema SEO) | Accordion com pergunta + resposta |
| **Imóvel Destaque** | Mostrar imóvel específico vinculado ao artigo | Card visual com foto + preço |

### Como inserir

1. Posicione cursor onde quer o bloco
2. Digite `/`
3. Role o menu até "FYMOOB" (blocos custom aparecem no final)
4. Click no que quer adicionar
5. Preencha os campos do bloco

![Bloco Methodology Box no editor](./admin-blog-screenshots/14-bloco-methodology.png)

![Bloco Callout/Aviso no editor](./admin-blog-screenshots/15-bloco-callout.png)

![Bloco CTA (Call to Action) no editor](./admin-blog-screenshots/16-bloco-cta.png)

![Bloco Changelog/Histórico de atualizações no editor](./admin-blog-screenshots/17-bloco-changelog.png)

![Bloco FAQ (Pergunta + Resposta) no editor](./admin-blog-screenshots/18-bloco-faq.png)

![Bloco Imóvel em destaque no editor](./admin-blog-screenshots/19-bloco-imovel-destaque.png)

### Dica

- **MethodologyBox + Changelog são obrigatórios em artigos "pillar"** (guias amplos, atualizados periodicamente)
- **FAQ Item** ajuda SEO porque gera schema markup automaticamente — sempre coloca 3-5 perguntas no final dos artigos longos

---

## 6. SEO Score — o que é e como subir

### O que aprende
Entender o "SEO Score" do artigo + o que fazer pra aumentar.

### O que é

Cada artigo tem uma nota de **0 a 100** calculada automaticamente. Verifica:
- Tem título?
- Tem meta description?
- Tem H2 / H3?
- Tem imagem de capa?
- Tem alt text nas imagens?
- Tem links internos pra outras páginas FYMOOB?
- Tamanho do título (50-60 chars ideal)
- Tamanho da description (150-160 chars ideal)
- Tem FAQ Items?

### Onde encontrar

No editor, painel lateral direito mostra o score + checklist do que falta.

> 📸 _Prints pendentes: SEO Score painel, checklist com pendentes, e estado "score 100"._

### Regra importante

- **Score mínimo pra publicar = 80**
- Se tentar publicar com score < 80, sistema bloqueia (chamamos isso de "SEO Score gate")
- Pra forçar publicação abaixo de 80, precisa permissão admin

---

## 7. Configurar metadados do artigo

### O que aprende
Preencher capa, descrição SEO, autor, categoria, tags.

### Passo a passo

1. No editor, abra a aba **"Metadados"** ou **"SEO"** (lateral)
2. Preenchimentos obrigatórios:
   - **Capa** (imagem 1200×630 mínimo)
   - **Meta description** (150-160 chars)
   - **Autor** (selecionar da lista)
   - **Data de publicação** (define ordem no blog)
   - **Tags** (3-5, separadas por vírgula)
   - **Categoria** (uma só)

![Aba Conteúdo do painel lateral (default)](./admin-blog-screenshots/23-aba-conteudo.png)

![Aba Detalhes do painel lateral](./admin-blog-screenshots/24-aba-detalhes.png)

![Aba Confiabilidade (E-E-A-T e Research Protocol)](./admin-blog-screenshots/25-aba-confiabilidade.png)

![Aba Google (SEO técnico, OG image, schema)](./admin-blog-screenshots/26-aba-google.png)

![Painel direito completo full-page](./admin-blog-screenshots/42-painel-detalhes-completo.png)

### Dicas

- **Capa** é o que aparece em redes sociais (WhatsApp, Facebook) quando alguém compartilha. Tem que ser visualmente impactante
- **Description** é o que aparece no Google logo abaixo do título — gente decide clicar baseada nela
- **Tags** ajudam o sistema a recomendar artigos relacionados, não pra SEO

---

## 8. Salvar, publicar e programar publicação

### O que aprende
Diferença entre salvar rascunho × publicar × programar.

### Passo a passo

#### Salvar rascunho
- **Ctrl+S** ou botão "Salvar"
- Salva automaticamente a cada 30s também (autosave)
- Status fica `draft` — ninguém vê fora do admin

#### Publicar agora
1. Click **"Publicar"**
2. Sistema verifica SEO Score ≥ 80
3. Se OK, status vira `published` e o artigo fica visível em **fymoob.com.br/blog/{slug}** em poucos minutos
4. Se SEO Score < 80 → modal explica o que falta corrigir antes

#### Programar publicação
1. Click **"Programar"** (ao invés de "Publicar")
2. Escolha **data e hora** futura
3. Status vira `scheduled` — sistema publica automaticamente naquela hora
4. Cron roda diariamente às 06:00 BRT — então use datas futuras

![Botões de ação no topo (Histórico, Preview, Salvar, Agendar, Publicar)](./admin-blog-screenshots/08-toolbar-acoes.png)

### Dica

- **Programar publicação** é bom pra publicar de manhãzinha enquanto vocês dormem (ex: programa às 6h pra todo dia 1º do mês)
- Pra cancelar agendamento: edite o artigo agendado e mude pra `draft` ou outra data

---

## 9. Editar artigo já publicado

### O que aprende
Mexer em artigo que já está no ar sem quebrar nada.

### Passo a passo

1. Volte à lista de artigos
2. Filtre por status `published`
3. Click no artigo → editor abre
4. Edite normalmente
5. Click **"Salvar e publicar alterações"**
6. Versão nova substitui a antiga em alguns minutos no site

![Editor de um artigo publicado existente](./admin-blog-screenshots/09-editor-artigo-existente.png)

### Cuidado!

- **Não mude o slug (URL) de artigo publicado** sem motivo forte — quebra todos os links externos que apontam pro artigo
- Se PRECISAR mudar slug, fala com o Vinicius pra criar redirect 301 (sem isso, perde tráfego SEO)

---

## 10. Histórico de revisões

### O que aprende
Voltar versão anterior se algo deu errado.

### Passo a passo

1. No editor, abra **"Histórico"** (botão lateral ou ícone de relógio)
2. Lista mostra todas as versões salvas com data + hora + quem editou
3. Click numa versão antiga pra ver preview
4. Click **"Restaurar esta versão"** se quiser voltar pra ela
5. Versão atual fica salva como nova revisão (não perde nada)

![Painel de histórico de revisões aberto](./admin-blog-screenshots/34-historico-lateral.png)

---

## 11. Excluir artigo

### O que aprende
Remover artigo do site (sem perder o dado).

### Passo a passo

1. Lista de artigos → click no artigo
2. Botão **"Arquivar"** (canto inferior direito do editor)
3. Confirma — status vira `archived`
4. Artigo some do site, mas continua salvo no banco
5. Pra **deletar de vez** (sem volta): fala com Vinicius (só admin Supabase apaga linha do banco)

![Botão Excluir destacado na lista de artigos](./admin-blog-screenshots/37-botao-excluir-lista.png)

![Confirmação ao clicar Excluir](./admin-blog-screenshots/38-modal-excluir.png)

### Cuidado!

- Arquivar artigo publicado significa **perder tráfego SEO** que ele gerava
- Antes de arquivar, considera **redirect 301 pra outro artigo similar** (fala com Vinicius)

---

## 12. Gerenciar autores

### O que aprende
Criar/editar perfis de autores que aparecem nos artigos.

### Onde

Menu lateral → **"Autores"** ou URL `/admin/blog/autores`.

### Criar novo autor

1. Click **"Novo autor"**
2. Preencha:
   - **Nome completo** (ex: Bruno César de Almeida)
   - **Slug** (gerado auto, ex: bruno-cesar-de-almeida)
   - **Role/cargo** (Sócio-fundador, Corretor, etc.)
   - **Bio curta** (1-2 frases)
   - **Bio longa** (3-5 parágrafos sobre expertise)
   - **Foto** (avatar quadrado, 400×400 mínimo)
   - **Expertise** (lista de áreas: Mercado Imobiliário, SEO, etc.)
   - **Links sociais** (LinkedIn, Instagram, etc.)
3. Salvar

![Lista completa de autores em /admin/blog/autores](./admin-blog-screenshots/39-lista-autores.png)

![Tela de edição de um autor existente](./admin-blog-screenshots/40-autor-edicao.png)

![Form completo do autor (full-page)](./admin-blog-screenshots/41-autor-form-completo.png)

### Dica

- Bio do autor é **importante pra E-E-A-T** (Experiência, Expertise, Autoridade, Trust) — fator de ranking Google. Não economize: 3-5 parágrafos sólidos, mencionando credenciais reais

---

## 13. Upload de imagens

### O que aprende
Onde fazer upload de capas, imagens inline, fotos de autor.

### 3 buckets do Supabase

| Bucket | Onde é usado | Tamanho recomendado |
|---|---|---|
| `articles-covers` | Capa do artigo (header) | 1200×630px |
| `articles-inline` | Imagens dentro do texto | Variável (máx 1600px largura) |
| `authors` | Foto do autor | 400×400px (quadrada) |

### Passo a passo (capa)

1. No editor, aba **"Metadados"** → click **"Upload capa"**
2. Selecione arquivo do computador (PNG/WebP/JPG)
3. Sistema mostra preview + crop se precisar
4. Salva automaticamente

### Passo a passo (inline)

1. No editor, posicione cursor onde quer a imagem
2. Digite `/` → escolha **"Imagem"**
3. Upload do arquivo
4. Pode redimensionar arrastando as bordas
5. **Adicionar alt text** (descritivo, importante pra SEO)

> 📸 _Prints pendentes: modal de upload de capa, imagem inline com alt text, redimensionar imagem._

### Dicas

- **Sempre escreva alt text** — vital pra SEO E acessibilidade
- **Comprima imagens antes de subir** (use [Squoosh](https://squoosh.app/) ou similar) — imagem 5MB demora 10s pra carregar no site
- **Prefira WebP** que JPG/PNG (menor tamanho, mesma qualidade)

---

## 14. Erros comuns

### "Não consigo publicar — SEO Score baixo"
→ Veja seção [SEO Score](#6-seo-score--o-que-é-e-como-subir). Foque nos itens com ✗ no checklist.

### "Salvei mas não vejo no site"
→ Cache pode demorar 1-5 min pra atualizar. Tenta limpar cache do navegador (Ctrl+F5).

### "Editor travou no meio da edição"
→ Recarregue a página. Autosave deve ter salvo seu progresso. Confirma no histórico.

### "Imagem subiu mas tá distorcida no artigo"
→ Provavelmente imagem fora de proporção. Capas precisam 1200×630, inline máx 1600px largura.

### "Bloco custom não aparece no slash menu"
→ Refresh da página (F5). Se persistir, fala com Vinicius (problema técnico).

### "Programei publicação mas não publicou"
→ Cron roda 6h BRT. Verifica:
- A data programada já passou?
- Status ainda mostra `scheduled` ou virou `failed`?
- Se `failed`, fala com Vinicius.

---

## 15. Glossário

| Termo | Significado |
|---|---|
| **BlockNote** | Editor estilo Notion que usamos no admin |
| **Slug** | Parte final da URL (ex: `melhores-bairros-curitiba-2026`) |
| **Meta description** | Texto curto que aparece no Google abaixo do título |
| **E-E-A-T** | Critérios Google: Experiência, Expertise, Autoridade, Trust |
| **Pillar article** | Artigo amplo "guia definitivo" atualizado periodicamente |
| **SEO Score gate** | Bloqueio automático que impede publicar com score < 80 |
| **Schema markup** | Código invisível que ajuda Google entender o conteúdo |
| **Supabase** | Banco de dados onde artigos ficam armazenados |
| **Cron** | Tarefa automática (roda diário 6h BRT pra publicar agendados) |
| **Autosave** | Salvamento automático a cada 30s (não precisa Ctrl+S sempre) |

---

## Quando chamar o desenvolvedor

**Em caso de**:
- Erro técnico que trava o admin
- Pedido de redirect (mudar URL de artigo)
- Permissão pra novos usuários
- Qualquer dúvida que esse doc não cobre

---

*Doc versionado em git. Última versão sempre em [`docs/admin-blog-onboarding.md`](.) do repositório fymoob-website.*

---

## Histórico de versões

- **2026-05-15:** versão inicial publicada com 30 screenshots inline capturados via Playwright em produção. Pendentes: SEO Score painel, listas exemplo, tags/categoria, modal publicar, prompt agendar, upload de capa. Capturas adicionais conforme o painel evoluir.
