import { readFile } from "node:fs/promises"
import path from "node:path"
import type { Metadata } from "next"
import { MDXRemote } from "next-mdx-remote/rsc"
import remarkGfm from "remark-gfm"
import { HelpCircle } from "lucide-react"

export const metadata: Metadata = {
  title: { absolute: "Ajuda — Painel Admin · FYMOOB" },
  robots: { index: false, follow: false },
}

/**
 * Renderiza docs/admin-blog-onboarding.md dentro do painel admin pra
 * Bruno/Wagner consultarem sem precisar abrir o GitHub.
 *
 * Imagens do md (paths `./admin-blog-screenshots/X.png`) são reescritas pra
 * `/admin-help/X.png` (copiadas pra public/admin-help/ no commit dos prints).
 *
 * Atualizar o conteúdo é só editar o .md no repo — re-deploy regenera
 * o HTML estático aqui.
 */
export default async function AdminAjudaPage() {
  const mdPath = path.join(process.cwd(), "docs", "admin-blog-onboarding.md")
  let source: string
  try {
    source = await readFile(mdPath, "utf-8")
  } catch {
    source = `# Ajuda indisponível\n\nArquivo \`docs/admin-blog-onboarding.md\` não encontrado.`
  }

  // Reescreve refs locais de screenshots pra URL pública (copiados pra
  // public/admin-help/ via cp em commit anterior).
  source = source
    .replace(/\(\.\/admin-blog-screenshots\//g, "(/admin-help/")
    .replace(/\(docs\/admin-blog-screenshots\//g, "(/admin-help/")

  // Sanitiza caracteres que MDX trata como JSX e quebram em runtime:
  // - `<algo>` solto (não wrapped em código) parece tag JSX inválida e
  //   dispara "An error occurred in the Server Components render".
  // - `<algo@algo>` é um link autolink válido em GFM — preserva.
  // - Dentro de blocos `code` (backtick) e ``` está protegido nativamente.
  // Heurística: escapa `<` que vem antes de letra E NÃO precedido por backtick
  // e que não é parte de tag HTML aceita por MDX (poucos casos relevantes
  // no doc — basicamente fazer escape genérico é o caminho seguro).
  source = source.replace(
    /(?<!`)<([a-z][a-z0-9]*)(?!\s*\/?>?\s*\w+=)/gi,
    "&lt;$1",
  )

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center gap-3 border-b border-slate-200 pb-6 dark:border-admin-border">
        <HelpCircle className="size-6 text-brand-primary" />
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
            Ajuda — Painel Admin
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manual passo a passo pra usar o admin do blog. Atualizado conforme o
            painel evolui — qualquer dúvida, mensagem pro Vinicius.
          </p>
        </div>
      </header>

      <article className="prose-admin-help max-w-none text-slate-700 dark:text-slate-300">
        <MDXRemote
          source={source}
          options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
          components={{
            h1: (p) => <h1 {...p} className="mt-12 mb-4 font-display text-3xl font-bold text-slate-900 dark:text-slate-100" />,
            h2: (p) => <h2 {...p} className="mt-10 mb-3 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100" />,
            h3: (p) => <h3 {...p} className="mt-8 mb-2 font-display text-xl font-semibold text-slate-900 dark:text-slate-100" />,
            p: (p) => <p {...p} className="mb-4 text-base leading-relaxed text-slate-700 dark:text-slate-300" />,
            a: (p) => <a {...p} className="font-medium text-brand-primary underline underline-offset-2 hover:text-brand-primary-hover" />,
            ul: (p) => <ul {...p} className="mb-4 list-disc space-y-1.5 pl-6" />,
            ol: (p) => <ol {...p} className="mb-4 list-decimal space-y-1.5 pl-6" />,
            li: (p) => <li {...p} className="leading-relaxed" />,
            blockquote: (p) => (
              <blockquote
                {...p}
                className="my-6 rounded-r border-l-4 border-brand-primary bg-slate-50 px-4 py-2 italic text-slate-600 dark:bg-admin-elevated dark:text-slate-300"
              />
            ),
            table: (p) => <div className="my-6 overflow-x-auto"><table {...p} className="w-full border-collapse text-sm" /></div>,
            th: (p) => <th {...p} className="border-b border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold dark:border-admin-border dark:bg-admin-elevated" />,
            td: (p) => <td {...p} className="border-b border-slate-100 px-3 py-2 dark:border-admin-border" />,
            code: (p) => <code {...p} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-slate-800 dark:bg-admin-elevated dark:text-slate-200" />,
            // eslint-disable-next-line @next/next/no-img-element
            img: (p) => <img {...p} alt={p.alt || ""} className="my-4 rounded-lg border border-slate-200 shadow-sm dark:border-admin-border" loading="lazy" />,
            hr: (p) => <hr {...p} className="my-8 border-slate-200 dark:border-admin-border" />,
          }}
        />
      </article>
    </div>
  )
}
