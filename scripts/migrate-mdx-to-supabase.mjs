/**
 * Fase 18.G — Migracao 15 MDX legado → Supabase Postgres.
 *
 * Roda local (Node 20+):
 *
 *   NEXT_PUBLIC_SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/migrate-mdx-to-supabase.mjs [--dry-run]
 *
 * Pipeline por arquivo:
 *   1. le content/blog/<slug>.mdx, parsea frontmatter
 *   2. converte body MDX → BlockNote JSON via mdx-to-blocknote.mjs
 *   3. upload da capa /public/blog/<slug>.webp pro bucket articles-covers
 *   4. resolve author_id (Bruno seedado, fallback cria)
 *   5. INSERT/UPSERT em articles com slug PK + status='draft' (NAO publica
 *      automaticamente — Bruno revisa post-a-post no admin antes de tornar
 *      publico). Posts publicados manualmente ja existentes nao sao tocados
 *      (ON CONFLICT (slug) DO NOTHING).
 *
 * Idempotente: rodar 2x nao duplica. Pra forcar reimportacao, passar
 * `--force` (faz UPSERT sobrescrevendo body/title/etc).
 *
 * --dry-run: nao escreve nada, so loga o que faria.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import matter from "gray-matter"
import { createClient } from "@supabase/supabase-js"
import { mdxToBlockNote } from "./mdx-to-blocknote.mjs"

// ───────────────────────────────────────────────────────────
// Config
// ───────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, "..")
const BLOG_DIR = path.join(REPO_ROOT, "content/blog")
const COVERS_DIR = path.join(REPO_ROOT, "public/blog")

// Carrega .env.local se existir (mesmo padrao do Next, sem dotenv extra)
try {
  const envFile = path.join(REPO_ROOT, ".env.local")
  if (fs.existsSync(envFile)) {
    const contents = fs.readFileSync(envFile, "utf-8")
    for (const line of contents.split("\n")) {
      const m = /^\s*([A-Z_]+)\s*=\s*(.*)\s*$/.exec(line)
      if (!m) continue
      const [, key, valRaw] = m
      const val = valRaw.replace(/^"|"$/g, "")
      if (!process.env[key]) process.env[key] = val
    }
  }
} catch (err) {
  console.warn("[migrate] .env.local nao carregado:", err.message)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "[migrate] Faltam env vars NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."
  )
  process.exit(1)
}

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has("--dry-run")
const FORCE = args.has("--force")

// Filtro opcional por slug — `--slugs=foo,bar,baz` processa apenas esses
// arquivos. Util pra atualizar 1-N artigos especificos sem reescrever os
// outros 14 no DB. Adicionado 08/05/2026 — antes o script processava
// SEMPRE todos os 15 com --force, gerando risco quando havia edits em
// admin nao espelhados no MDX.
const SLUGS_FILTER = (() => {
  for (const a of process.argv.slice(2)) {
    const m = /^--slugs=(.+)$/.exec(a)
    if (m) return new Set(m[1].split(",").map((s) => s.trim()).filter(Boolean))
  }
  return null
})()

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fymoob.com.br"

// ───────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────

function listMdxFiles() {
  if (!fs.existsSync(BLOG_DIR)) return []
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => path.join(BLOG_DIR, f))
}

function slugFromPath(p) {
  return path.basename(p).replace(/\.mdx$/, "")
}

function detectMime(filename) {
  const ext = path.extname(filename).toLowerCase()
  if (ext === ".webp") return "image/webp"
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg"
  if (ext === ".png") return "image/png"
  if (ext === ".avif") return "image/avif"
  return null
}

async function uploadCover(slug, frontmatterImagePath) {
  // Resolve path local. Frontmatter usa "/blog/foo.webp" (relativo ao /public)
  if (!frontmatterImagePath) return null
  const cleanPath = frontmatterImagePath.startsWith("/")
    ? frontmatterImagePath.slice(1)
    : frontmatterImagePath
  const localFile = path.join(REPO_ROOT, "public", cleanPath)

  if (!fs.existsSync(localFile)) {
    console.warn(`[migrate] capa nao encontrada: ${localFile}. Pulando upload.`)
    return null
  }

  const mime = detectMime(localFile)
  if (!mime) {
    console.warn(`[migrate] mime nao reconhecido: ${localFile}`)
    return null
  }

  const buffer = fs.readFileSync(localFile)
  const ext = path.extname(localFile).slice(1)
  const storagePath = `migracao-mdx/${slug}.${ext}`

  if (DRY_RUN) {
    console.log(`[dry-run] uploadCover skip → ${storagePath}`)
    return `https://${new URL(SUPABASE_URL).host}/storage/v1/object/public/articles-covers/${storagePath}`
  }

  const { error } = await sb.storage
    .from("articles-covers")
    .upload(storagePath, buffer, {
      contentType: mime,
      cacheControl: "31536000, immutable",
      upsert: true,
    })

  if (error) {
    console.error(`[migrate] upload da capa "${slug}" falhou:`, error.message)
    return null
  }

  const { data } = sb.storage.from("articles-covers").getPublicUrl(storagePath)
  return data.publicUrl
}

async function ensureAuthor(authorName) {
  // Tenta achar autor pelo nome canonico (Bruno foi seedado)
  const { data: existing } = await sb
    .from("authors")
    .select("id, slug, name")
    .eq("name", authorName)
    .maybeSingle()

  if (existing) return existing.id

  // Fallback — autor nao seedado, cria como "Convidado"
  console.log(`[migrate] autor "${authorName}" nao existe; criando como Convidado...`)
  if (DRY_RUN) return "DRY-RUN-AUTHOR-ID"
  const slug = authorName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  const { data, error } = await sb
    .from("authors")
    .insert({
      slug,
      name: authorName,
      role: "Convidado",
      bio_short: `Autor convidado: ${authorName}.`,
      expertise: [],
      social_links: {},
    })
    .select("id")
    .single()
  if (error) {
    console.error(`[migrate] falha ao criar autor "${authorName}":`, error.message)
    return null
  }
  return data.id
}

function parseReadingTime(raw) {
  if (!raw) return null
  const m = /(\d+)/.exec(String(raw))
  return m ? parseInt(m[1], 10) : null
}

function frontmatterToColumns(frontmatter) {
  // Sources do MDX podem ser array ou string CSV
  const methodology = frontmatter.methodology
    ? {
        period: frontmatter.methodology.period ?? undefined,
        sample: frontmatter.methodology.sample ?? undefined,
        sources: Array.isArray(frontmatter.methodology.sources)
          ? frontmatter.methodology.sources
          : undefined,
        lastUpdate: frontmatter.methodology.lastUpdate ?? undefined,
        nextReview: frontmatter.methodology.nextReview ?? undefined,
      }
    : null

  return {
    title: String(frontmatter.title ?? "").slice(0, 120),
    description: String(frontmatter.description ?? "").slice(0, 165),
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
    published_at: frontmatter.date
      ? new Date(frontmatter.date).toISOString()
      : null,
    schema_type:
      frontmatter.schema === "Article"
        ? "Article"
        : frontmatter.schema === "NewsArticle"
          ? "NewsArticle"
          : "BlogPosting",
    reading_time_min: parseReadingTime(frontmatter.readingTime),
    reviewed_by: frontmatter.reviewedBy ?? null,
    next_review: frontmatter.nextReview ?? null,
    methodology,
  }
}

// ───────────────────────────────────────────────────────────
// Pipeline por arquivo
// ───────────────────────────────────────────────────────────

async function migrateOne(filepath, stats) {
  const slug = slugFromPath(filepath)
  const raw = fs.readFileSync(filepath, "utf-8")
  const { data: frontmatter, content: mdxBody } = matter(raw)

  // Skip se ja existe e nao --force
  if (!FORCE) {
    const { data: existing } = await sb
      .from("articles")
      .select("id, status, title")
      .eq("slug", slug)
      .maybeSingle()
    if (existing) {
      console.log(`  [skip] já existe (id=${existing.id}, status=${existing.status})`)
      stats.skipped++
      return
    }
  }

  // 1. Body BlockNote
  const body = mdxToBlockNote(mdxBody)
  if (body.length === 0) {
    console.warn(`  [warn] body vazio apos conversao. Conteudo MDX provavelmente nao casa com parser.`)
  }

  // 2. Cover image
  const coverUrl = await uploadCover(slug, frontmatter.image)

  // 3. Author
  const authorName =
    typeof frontmatter.author === "string" ? frontmatter.author : "Bruno César de Almeida"
  const authorId = await ensureAuthor(authorName)

  // 4. Build payload
  const cols = frontmatterToColumns(frontmatter)
  const payload = {
    slug,
    ...cols,
    body,
    cover_image_url: coverUrl,
    cover_image_alt: frontmatter.coverAlt ?? `Imagem de capa: ${cols.title}`,
    author_id: authorId,
    status: "draft", // Bruno publica manualmente apos validar
    seo_no_index: true,
  }

  if (DRY_RUN) {
    console.log(
      `  [dry-run] inseriria slug=${slug}, autor=${authorName}, ${body.length} blocos, capa=${coverUrl ? "OK" : "FALTA"}`
    )
    stats.wouldInsert++
    return
  }

  const { data: inserted, error } = await sb
    .from("articles")
    .upsert(payload, { onConflict: "slug" })
    .select("id, slug")
    .single()

  if (error) {
    console.error(`  [err] insert falhou: ${error.message}`)
    stats.failed++
    return
  }

  console.log(
    `  ✓ migrado id=${inserted.id} slug=${inserted.slug} (${body.length} blocos)`
  )
  stats.inserted++
}

// ───────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== Migracao MDX → Supabase (${DRY_RUN ? "DRY RUN" : "ESCRITA"}, FORCE=${FORCE}) ===`)
  console.log(`Site: ${SITE_URL}`)
  console.log(`Fonte: ${BLOG_DIR}`)

  let files = listMdxFiles()
  if (SLUGS_FILTER) {
    const before = files.length
    files = files.filter((f) => SLUGS_FILTER.has(slugFromPath(f)))
    console.log(
      `Filtro de slugs ativo: [${[...SLUGS_FILTER].join(", ")}] — ` +
        `${files.length}/${before} arquivos serao processados`,
    )
  }
  console.log(`Arquivos encontrados: ${files.length}\n`)

  const stats = { inserted: 0, skipped: 0, failed: 0, wouldInsert: 0 }

  for (const file of files) {
    const slug = slugFromPath(file)
    console.log(`→ ${slug}.mdx`)
    try {
      await migrateOne(file, stats)
    } catch (err) {
      console.error(`  [err] excecao: ${err.message}`)
      stats.failed++
    }
  }

  console.log(`\n=== Resultado ===`)
  console.log(`Inseridos:   ${stats.inserted}`)
  console.log(`Pulados:     ${stats.skipped} (ja existiam)`)
  console.log(`Falhas:      ${stats.failed}`)
  if (DRY_RUN) console.log(`Seriam inseridos: ${stats.wouldInsert}`)
  console.log(``)
  console.log(`Proximos passos:`)
  console.log(`  1. /admin/blog → revisar cada rascunho`)
  console.log(`  2. Quando tiver 1 ok → publicar pra validar visual`)
  console.log(`  3. Apos os 15 ok → setar BLOG_SOURCE=supabase + remover Sanity (Fase 18.H)`)
}

main().catch((err) => {
  console.error("[migrate] FATAL:", err)
  process.exit(1)
})
