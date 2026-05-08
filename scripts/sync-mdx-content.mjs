/**
 * Sync de conteudo MDX -> Supabase (re-sync seguro pos-migracao).
 *
 * Diferente do `migrate-mdx-to-supabase.mjs` (que e pra migracao inicial,
 * forca `status: draft` + `seo_no_index: true` ao usar --force), este
 * script atualiza APENAS os campos editoriais do artigo, preservando
 * status de publicacao, flags de indexacao, datas operacionais e capa.
 *
 * Campos atualizados: title, description, tags, methodology, reviewed_by,
 *   next_review, body, schema_type, reading_time_min
 * Campos preservados: status, seo_no_index, published_at, cover_image_url,
 *   cover_image_alt, author_id, created_at, updated_at (touch automatico)
 *
 * Uso:
 *   NEXT_PUBLIC_SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/sync-mdx-content.mjs --slugs=foo,bar [--dry-run]
 *
 * Sem `--slugs`: processa todos os arquivos em content/blog/ (cuidado!).
 *
 * Criado 08/05/2026 — pra patch de internal linking (4 artigos linkando
 * pra /empreendimento/reserva-barigui).
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import matter from "gray-matter"
import { createClient } from "@supabase/supabase-js"
import { mdxToBlockNote } from "./mdx-to-blocknote.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, "..")
const BLOG_DIR = path.join(REPO_ROOT, "content/blog")

// Carrega .env.local
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
  console.warn("[sync] .env.local nao carregado:", err.message)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[sync] Faltam env vars NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.")
  process.exit(1)
}

const args = process.argv.slice(2)
const DRY_RUN = args.includes("--dry-run")

const SLUGS_FILTER = (() => {
  for (const a of args) {
    const m = /^--slugs=(.+)$/.exec(a)
    if (m) return new Set(m[1].split(",").map((s) => s.trim()).filter(Boolean))
  }
  return null
})()

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function slugFromPath(p) {
  return path.basename(p).replace(/\.mdx$/, "")
}

function parseReadingTime(raw) {
  if (!raw) return null
  const m = /(\d+)/.exec(String(raw))
  return m ? parseInt(m[1], 10) : null
}

function frontmatterToContentColumns(frontmatter) {
  const methodology = frontmatter.methodology
    ? {
        period: frontmatter.methodology.period ?? undefined,
        sample: frontmatter.methodology.sample ?? undefined,
        sources: frontmatter.methodology.sources ?? undefined,
        last_updated: frontmatter.methodology.lastUpdated ?? undefined,
        next_review: frontmatter.methodology.nextReview ?? undefined,
      }
    : null

  return {
    title: String(frontmatter.title ?? "").slice(0, 120),
    description: String(frontmatter.description ?? "").slice(0, 165),
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
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

async function syncOne(filepath, stats) {
  const slug = slugFromPath(filepath)
  const raw = fs.readFileSync(filepath, "utf-8")
  const { data: frontmatter, content: mdxBody } = matter(raw)

  // Confirma que o artigo existe — se nao, falha barulhento (nao vamos
  // criar artigo novo via sync, isso e job da migracao inicial).
  const { data: existing, error: lookupErr } = await sb
    .from("articles")
    .select("id, slug, status, seo_no_index, published_at, cover_image_url")
    .eq("slug", slug)
    .maybeSingle()

  if (lookupErr) {
    console.error(`  [err] lookup falhou: ${lookupErr.message}`)
    stats.failed++
    return
  }

  if (!existing) {
    console.warn(
      `  [skip] artigo nao existe no Supabase. Use migrate-mdx-to-supabase.mjs pra primeira insercao.`,
    )
    stats.skipped++
    return
  }

  const body = mdxToBlockNote(mdxBody)
  if (body.length === 0) {
    console.warn(`  [warn] body vazio apos conversao. Skip.`)
    stats.failed++
    return
  }

  const cols = frontmatterToContentColumns(frontmatter)

  // Patch: atualiza so campos de conteudo. status/seo_no_index/published_at/
  // cover_image_url ficam intactos.
  const patch = { ...cols, body }

  if (DRY_RUN) {
    console.log(
      `  [dry-run] atualizaria slug=${slug} ` +
        `(status=${existing.status} seo_no_index=${existing.seo_no_index} preservados, ${body.length} blocos)`,
    )
    stats.wouldUpdate++
    return
  }

  const { error } = await sb.from("articles").update(patch).eq("id", existing.id)

  if (error) {
    console.error(`  [err] update falhou: ${error.message}`)
    stats.failed++
    return
  }

  console.log(
    `  ✓ atualizado id=${existing.id} slug=${slug} ` +
      `(status=${existing.status} preservado, ${body.length} blocos)`,
  )
  stats.updated++
}

function listMdxFiles() {
  if (!fs.existsSync(BLOG_DIR)) return []
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => path.join(BLOG_DIR, f))
}

async function main() {
  console.log(`\n=== Sync MDX -> Supabase (${DRY_RUN ? "DRY RUN" : "ESCRITA"}) ===`)
  console.log(`Fonte: ${BLOG_DIR}`)

  let files = listMdxFiles()
  if (SLUGS_FILTER) {
    const before = files.length
    files = files.filter((f) => SLUGS_FILTER.has(slugFromPath(f)))
    console.log(
      `Filtro de slugs: [${[...SLUGS_FILTER].join(", ")}] -> ${files.length}/${before} arquivos`,
    )
  }
  console.log(`Arquivos: ${files.length}\n`)

  if (!SLUGS_FILTER && files.length > 0) {
    console.log(
      `[aviso] sem --slugs, vou processar TODOS os ${files.length} artigos. Ctrl+C em 5s pra abortar.`,
    )
    await new Promise((r) => setTimeout(r, 5000))
  }

  const stats = { updated: 0, skipped: 0, failed: 0, wouldUpdate: 0 }

  for (const file of files) {
    const slug = slugFromPath(file)
    console.log(`-> ${slug}.mdx`)
    try {
      await syncOne(file, stats)
    } catch (err) {
      console.error(`  [err] excecao: ${err.message}`)
      stats.failed++
    }
  }

  console.log(`\n=== Resultado ===`)
  console.log(`Atualizados: ${stats.updated}`)
  console.log(`Pulados:     ${stats.skipped}`)
  console.log(`Falhas:      ${stats.failed}`)
  if (DRY_RUN) console.log(`Seriam atualizados: ${stats.wouldUpdate}`)
  console.log(``)
  if (!DRY_RUN && stats.updated > 0) {
    console.log(`Proximos passos:`)
    console.log(`  - Revalidar ISR: node scripts/force-revalidate-blog.mjs`)
    console.log(`  - Conferir em prod: https://fymoob.com.br/blog/<slug>`)
  }
}

main().catch((err) => {
  console.error("[sync] FATAL:", err)
  process.exit(1)
})
