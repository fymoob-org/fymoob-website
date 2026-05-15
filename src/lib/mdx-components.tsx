import type { MDXComponents } from "mdx/types"
import Image from "next/image"
import Link from "next/link"

export function CalloutBox({
  variant = "info",
  children,
}: {
  variant?: "alert" | "info" | "warning"
  children: React.ReactNode
}) {
  // Callout pra destacar numero-chave, aviso ou noticia importante em posts.
  // TNH1/UOL pattern: quebra o texto com bloco visualmente distinto.
  // Dark variants ativam apenas no painel admin (preview); site publico fica light.
  const styles = {
    alert: "border-red-200 bg-red-50 text-red-900 dark:border-red-700/40 dark:bg-red-950/30 dark:text-red-100",
    info: "border-brand-primary-muted bg-brand-primary-light text-neutral-800 dark:border-brand-primary/30 dark:bg-brand-primary/10 dark:text-slate-100",
    warning: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-100",
  }
  return (
    <div
      className={`my-6 rounded-xl border px-5 py-4 text-sm leading-relaxed ${styles[variant]}`}
    >
      {children}
    </div>
  )
}

export function MethodologyBox({
  period,
  sample,
  treatment,
  sources,
  lastUpdate,
  nextReview,
}: {
  period?: string
  sample?: string
  treatment?: string
  sources?: string[] | string
  lastUpdate?: string
  nextReview?: string
}) {
  // Research Protocol v1.0 — obrigatório em posts pilar/ranking/YMYL.
  // Transparência de metodologia (IFCN P4). Permite replicação pelo leitor.
  // Defensive: MDX remote pode serializar props de forma inesperada — aceita
  // string[] ou string, e gracefully degrada se campo ausente.
  const sourcesList = Array.isArray(sources)
    ? sources
    : typeof sources === "string"
      ? sources.split(",").map((s) => s.trim()).filter(Boolean)
      : []

  // Formatacao ESTAVEL (deterministica server/client) pra evitar React
  // Hydration error #418. toLocaleDateString depende de locale/timezone do
  // runtime — pode gerar string diferente no SSR vs browser.
  const formatDate = (d?: string) => {
    if (!d) return null
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(d)
    return match ? `${match[3]}/${match[2]}/${match[1]}` : d
  }

  return (
    <aside
      className="my-8 rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-sm dark:border-admin-border dark:bg-admin-elevated"
      aria-label="Metodologia da pesquisa"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-slate-400">
        Metodologia
      </p>
      <dl className="grid gap-2 text-neutral-700 sm:grid-cols-[max-content_1fr] sm:gap-x-4 dark:text-slate-200">
        {period && (
          <>
            <dt className="font-semibold">Período:</dt>
            <dd>{period}</dd>
          </>
        )}
        {sample && (
          <>
            <dt className="font-semibold">Amostra:</dt>
            <dd>{sample}</dd>
          </>
        )}
        {treatment && (
          <>
            <dt className="font-semibold">Tratamento:</dt>
            <dd>{treatment}</dd>
          </>
        )}
        {sourcesList.length > 0 && (
          <>
            <dt className="font-semibold">Fontes:</dt>
            <dd>{sourcesList.join(", ")}</dd>
          </>
        )}
        {lastUpdate && (
          <>
            <dt className="font-semibold">Última atualização:</dt>
            <dd>
              <time dateTime={lastUpdate}>{formatDate(lastUpdate)}</time>
            </dd>
          </>
        )}
        {nextReview && (
          <>
            <dt className="font-semibold">Próxima revisão:</dt>
            <dd>
              <time dateTime={nextReview}>{formatDate(nextReview)}</time>
            </dd>
          </>
        )}
      </dl>
    </aside>
  )
}

interface ChangelogEntry {
  date: string
  change: string
}

export function Changelog({ entries }: { entries?: ChangelogEntry[] }) {
  // Research Protocol v1.0 — correções transparentes (IFCN P5).
  // Lista o QUE mudou, não só QUANDO. Padrão Reuters + IFCN.
  if (!entries || !Array.isArray(entries) || entries.length === 0) return null

  // Formatacao ESTAVEL pra evitar hydration error #418.
  const formatDate = (d?: string) => {
    if (!d) return ""
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(d)
    return match ? `${match[3]}/${match[2]}/${match[1]}` : d
  }

  return (
    <aside
      className="my-8 rounded-xl border border-amber-200 bg-amber-50/50 p-5 text-sm dark:border-amber-700/40 dark:bg-amber-950/30"
      aria-label="Histórico de atualizações"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-200">
        Histórico de atualizações
      </p>
      <ul className="space-y-2 text-neutral-800 dark:text-slate-200">
        {entries.map((e, i) => (
          <li key={i} className="flex gap-3">
            <time
              dateTime={e.date}
              className="shrink-0 font-mono text-xs font-semibold text-amber-900 dark:text-amber-200"
            >
              {formatDate(e.date)}
            </time>
            <span className="leading-relaxed">{e.change}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export function CTABox({
  title,
  description,
  href,
  label,
}: {
  title: string
  description: string
  href: string
  label: string
}) {
  return (
    <div className="my-8 rounded-2xl border border-brand-primary-muted bg-brand-primary-light p-6 dark:border-brand-primary/30 dark:bg-brand-primary/10">
      <p className="font-display text-lg font-bold text-neutral-950 dark:text-slate-100">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-slate-300">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-brand-primary-hover hover:shadow-lg active:scale-[0.98]"
      >
        <svg viewBox="0 0 32 32" className="size-4 fill-white">
          <path d="M16.004 3.2C9.064 3.2 3.404 8.86 3.404 15.8c0 2.22.58 4.39 1.68 6.3L3.2 28.8l6.9-1.81a12.56 12.56 0 0 0 5.9 1.49h.004c6.94 0 12.6-5.66 12.6-12.6 0-3.37-1.31-6.53-3.69-8.91A12.52 12.52 0 0 0 16.004 3.2Zm0 23.04a10.41 10.41 0 0 1-5.31-1.45l-.38-.23-3.95 1.04 1.05-3.86-.25-.39a10.42 10.42 0 0 1-1.6-5.55c0-5.76 4.69-10.44 10.45-10.44 2.79 0 5.41 1.09 7.39 3.06a10.38 10.38 0 0 1 3.05 7.39c0 5.76-4.69 10.44-10.45 10.44Zm5.73-7.82c-.31-.16-1.85-.91-2.14-1.02-.29-.1-.5-.16-.7.16-.21.31-.81 1.02-.99 1.23-.18.21-.37.23-.68.08-.31-.16-1.32-.49-2.52-1.56-.93-.83-1.56-1.86-1.74-2.17-.18-.31-.02-.48.14-.64.14-.14.31-.37.47-.55.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.55-.08-.16-.7-1.69-.96-2.31-.25-.61-.51-.52-.7-.53h-.6c-.21 0-.55.08-.83.39-.29.31-1.09 1.07-1.09 2.6 0 1.53 1.12 3.01 1.27 3.22.16.21 2.2 3.35 5.32 4.7.74.32 1.32.51 1.77.66.75.24 1.43.2 1.96.12.6-.09 1.85-.76 2.11-1.49.26-.73.26-1.35.18-1.49-.08-.13-.29-.21-.6-.37Z" />
        </svg>
        {label}
      </Link>
    </div>
  )
}

// Extrai texto plano de children React (string, array, elementos
// nested). Usado pra gerar id de heading SSR sem rehype-slug.
function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node
  if (typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(extractText).join("")
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as { props: { children?: React.ReactNode } }).props.children)
  }
  return ""
}

function slugifyHeading(children: React.ReactNode): string {
  return extractText(children)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export const mdxComponents: MDXComponents = {
  // h2/h3 com id auto-gerado pra anchor links SSR-friendly.
  // Necessario pra:
  // (1) TableOfContents client-side encontrar via getElementById
  // (2) BlogPosting schema com hasPart (sitelinks de seção em desktop)
  // (3) deep-link de outras paginas pro meio do artigo
  h2: ({ children, ...props }) => (
    <h2
      id={slugifyHeading(children)}
      className="mt-12 mb-4 font-display text-2xl font-bold tracking-tight text-neutral-950 scroll-mt-20"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      id={slugifyHeading(children)}
      className="mt-8 mb-3 font-display text-xl font-semibold text-neutral-950 scroll-mt-20"
      {...props}
    >
      {children}
    </h3>
  ),
  p: (props) => (
    <p className="mb-4 text-base leading-relaxed text-neutral-700" {...props} />
  ),
  a: (props) => (
    <a
      className="font-medium text-brand-primary underline underline-offset-2 transition-colors duration-200 hover:text-brand-primary-hover"
      {...props}
    />
  ),
  ul: (props) => (
    <ul className="mb-4 list-disc space-y-1.5 pl-6 text-neutral-700" {...props} />
  ),
  ol: (props) => (
    <ol className="mb-4 list-decimal space-y-1.5 pl-6 text-neutral-700" {...props} />
  ),
  li: (props) => <li className="leading-relaxed" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="my-6 border-l-4 border-brand-primary pl-4 italic text-neutral-600"
      {...props}
    />
  ),
  table: (props) => (
    <div className="my-6 overflow-x-auto rounded-xl border border-neutral-200">
      <table
        className="w-full border-collapse text-sm text-neutral-700"
        {...props}
      />
    </div>
  ),
  thead: (props) => <thead {...props} />,
  tbody: (props) => <tbody {...props} />,
  tr: (props) => (
    <tr className="transition-colors hover:bg-neutral-50/50" {...props} />
  ),
  th: (props) => (
    <th
      className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500"
      {...props}
    />
  ),
  td: (props) => (
    <td className="border-b border-neutral-100 px-4 py-3" {...props} />
  ),
  img: (props) => (
    <Image
      src={props.src || ""}
      // Alt vazio seria decorativo — ruim pra SEO de imagens em posts.
      // Fallback: title > alt > label generico.
      alt={props.alt || props.title || "Ilustração do artigo"}
      width={800}
      height={450}
      className="my-6 rounded-xl"
    />
  ),
  strong: (props) => (
    <strong className="font-semibold text-neutral-950" {...props} />
  ),
  CTABox,
  CalloutBox,
  MethodologyBox,
  Changelog,
}
