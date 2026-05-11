import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

// Treemap HTML em .next/analyze/ quando ANALYZE=true npm run build.
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
];

const nextConfig: NextConfig = {
  // Source maps so em analise local (ANALYZE=true) — NAO em prod default.
  // Expor .js.map em prod da ao atacante reconnaissance gratuito (codigo
  // descompilado + nomes de variaveis + shapes de endpoint). Ligue via
  // ANALYZE=true npm run build quando quiser rodar source-map-explorer.
  productionBrowserSourceMaps: process.env.ANALYZE === "true",
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Next.js 16 requer allowlist explícita. 75 = default cards/fotos,
    // 85 = hero property thumbnails, 92 = imagem principal do imóvel.
    qualities: [75, 85, 92],
    remotePatterns: [
      // Vista/Loft usa subdominios variados: cdn.vistahost, cdn1.vistahost,
      // foto.vistahost. Allowlist ampla por sufixo evita Image 400 se o CRM
      // mudar de host. Filtro adicional startsWith("https://") em loft.ts
      // previne XSS por URL poisoning.
      {
        protocol: "https",
        hostname: "**.vistahost.com.br",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.storage.sa-east-1.nhost.run",
        pathname: "/v1/files/**",
      },
      // Supabase Storage (Fase 18 — custom blog admin). Buckets:
      // articles-covers, articles-inline, authors. Allowlist genérica por
      // sufixo `.supabase.co` cobre qualquer projeto sem hardcode do ref.
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@base-ui/react"],
    // H-20260417-006: cache client-side para rotas dinamicas por 30s.
    // Next 16 default e 0s (cache expira imediato), causando re-fetch
    // do RSC payload a cada navegacao home <-> /busca. Trade-off:
    // dados podem estar ate 30s stale (aceitavel para imobiliaria —
    // imoveis nao mudam a cada segundo).
    staleTimes: {
      dynamic: 30,
    },
    // Server Actions default body limit = 1MB. Upload de capa de artigo
    // pode passar 1MB (foto de celular sem otimizar chega em 3-5 MB).
    // Sharp comprime no servidor pra WebP < 500 KB, mas o limite mede o
    // INPUT. Sem este aumento o request retorna 400 antes da action rodar.
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // H-20260417-004 REVERTIDO: inlineCss fez HTML crescer +326KB (predicted
    // era +20-30KB), LCP +238ms, TBT +237ms. Kill triggered em 4 de 5.
  },
  // H-20260417-003: memoizacao automatica compile-time. Meta report
  // 20-40% menos re-renders + LCP +12%. Custo: +30-50% build time.
  reactCompiler: true,
  // sharp tem binario nativo (libvips). Em Next 15 webpack tenta bundlar
  // por default e quebra na Vercel (".node" nao serializa). Listar como
  // external faz ele ser carregado via require em runtime — preserva o
  // binding nativo. Imprescindivel pro upload de imagem otimizada (server
  // action `uploadCoverImageAction` em src/app/admin/blog/_cover-action.ts).
  serverExternalPackages: ["sharp"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      // Torres do Reserva Barigui — slugs herdados do CRM/marketing antigo.
      // O CRM Loft agrupa Reserva Lago/Colina/Mirante sob um unico
      // empreendimento ("Reserva Barigui"), entao cada torre nao tem
      // landing propria. Redirecionamos pros anchors da pagina principal
      // pra preservar SEO de qualquer link externo/indexado e bookmark.
      {
        source: "/empreendimento/reserva-lago",
        destination: "/empreendimento/reserva-barigui#torre-lago",
        permanent: true,
      },
      {
        source: "/empreendimento/reserva-colina",
        destination: "/empreendimento/reserva-barigui#torre-colina",
        permanent: true,
      },
      {
        source: "/empreendimento/reserva-mirante",
        destination: "/empreendimento/reserva-barigui#torre-mirante",
        permanent: true,
      },
      // ============================================================
      // Slugs herdados do site Atomicat antigo (fymoob.com -> .br).
      // Google ainda indexa formatos do site antigo; o redirect 308
      // do dominio raiz preserva path, entao slugs renomeados caem em
      // 404. Mapeamento 301 abaixo cobre os 2 padroes detectados via
      // GSC sc-domain:fymoob.com em 04/05/2026.
      // ============================================================
      // /politica-privacidade (Atomicat) -> /politica-de-privacidade (Next).
      // GSC: 63 impressoes/mes, indice ainda mostra a URL no SERP.
      {
        source: "/politica-privacidade",
        destination: "/politica-de-privacidade",
        permanent: true,
      },
      // /imoveis/preco/acima-de-1-milhao -> /imoveis/preco/1-a-3-milhoes.
      // Slug de faixa antigo/typo que apareceu indexado no GSC com 404
      // (Tabela.csv 25/04). Sitemap atual usa "1-a-3-milhoes" e
      // "acima-3-milhoes" — a faixa "acima-de-1-milhao" nunca existiu
      // mas Google rastreou via link interno antigo ou typo de prospect.
      // Redirect pra faixa mais proxima da intent ("acima de 1 milhao").
      {
        source: "/imoveis/preco/acima-de-1-milhao",
        destination: "/imoveis/preco/1-a-3-milhoes",
        permanent: true,
      },
      // /imovel/{CODE}/{slug-info}/{venda|aluguel} (Atomicat) -> busca filtrada.
      // CODE = letras maiusculas + digitos (AP00945, CA02611, ST00010).
      // Site novo usa /imovel/{slug-completo}-{CODE} sem barras intermediarias,
      // entao nao ha conflito. Destination = /busca?codigo=:code mostra o
      // imovel se ainda ativo, ou empty state coerente se removido do CRM.
      {
        source: "/imovel/:code([A-Z]+\\d+)/:slug*/:finalidade(venda|aluguel)",
        destination: "/busca?codigo=:code",
        permanent: true,
      },
      // ============================================================
      // Limpeza de query strings legadas em /busca — herdadas do site
      // antigo (Atomicat/Loft) e backlinks externos. Google Search
      // Console reporta como "Pagina alternativa com tag canonica
      // adequada" (8 paginas afetadas em 21/04/2026). Os canonicals ja
      // apontam pra URL limpa, mas 301 redirect e mais agressivo —
      // remove a URL antiga do indice em vez de mante-la como
      // "alternate". Cada `has` matcha quando o param especifico esta
      // presente. Destination sem query strippa todos os params.
      // ============================================================

      // Params da API do Loft/CRM expostos por links externos. Codigo
      // atual NAO usa esses nomes em URLs publicas.
      {
        source: "/busca",
        has: [{ type: "query", key: "SuperDestaqueWeb" }],
        destination: "/busca",
        permanent: true,
      },
      {
        source: "/busca",
        has: [{ type: "query", key: "DestaqueWeb" }],
        destination: "/busca",
        permanent: true,
      },
      {
        source: "/busca",
        has: [{ type: "query", key: "Lancamento" }],
        destination: "/busca",
        permanent: true,
      },
      // Param `order` (typo) — codigo atual usa `ordenar`. URL antiga
      // de Atomicat ainda no indice do Google.
      {
        source: "/busca",
        has: [{ type: "query", key: "order" }],
        destination: "/busca",
        permanent: true,
      },
      // UI state que nao deveria estar em URL crawlavel
      {
        source: "/busca",
        has: [{ type: "query", key: "listagem" }],
        destination: "/busca",
        permanent: true,
      },
      // Param `min` antigo — codigo atual usa `precoMin`
      {
        source: "/busca",
        has: [{ type: "query", key: "min" }],
        destination: "/busca",
        permanent: true,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
