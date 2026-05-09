import type { Metadata } from "next";
import localFont from "next/font/local";
import dynamic from "next/dynamic";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { generateOrganizationSchema, generateLocalBusinessSchema, safeJsonLd } from "@/lib/seo";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChromeGate } from "@/components/layout/ChromeGate";
import { SITE_URL } from "@/lib/constants";
import "./globals.css";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

// Dynamic imports — these client components don't need SSR
const WhatsAppFloat = dynamic(
  () => import("@/components/layout/WhatsAppFloat").then((m) => ({ default: m.WhatsAppFloat })),
  { ssr: true }
);
const BottomNav = dynamic(
  () => import("@/components/layout/BottomNav").then((m) => ({ default: m.BottomNav })),
  { ssr: true }
);
const NavigationProgress = dynamic(
  () => import("@/components/layout/NavigationProgress").then((m) => ({ default: m.NavigationProgress })),
  { ssr: true }
);
const DeferredGA = dynamic(
  () => import("@/components/analytics/DeferredGA").then((m) => ({ default: m.DeferredGA })),
  { ssr: true }
);
const WhatsAppClickTracker = dynamic(
  () => import("@/components/analytics/WhatsAppClickTracker").then((m) => ({ default: m.WhatsAppClickTracker })),
  { ssr: true }
);
const PhoneClickTracker = dynamic(
  () => import("@/components/analytics/PhoneClickTracker").then((m) => ({ default: m.PhoneClickTracker })),
  { ssr: true }
);
import { ScrollToTop } from "@/components/layout/ScrollToTop";

const satoshi = localFont({
  src: "../../public/fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  // Hipotese H-20260417-001: `optional` elimina layout shift por font swap.
  // Se a font nao chegar em ~100ms, browser mantem fallback permanente
  // naquela sessao (volta ao Satoshi apos cache em navegacoes seguintes).
  // Trade-off: 3G em navegacao inicial ve Inter (fallback system) — aceito
  // pelo CLS garantido e meta de Core Web Vitals.
  display: "optional",
  weight: "300 900",
});

export const metadata: Metadata = {
  title: {
    default: "FYMOOB Imobiliária | Imóveis em Curitiba",
    template: "%s | FYMOOB Imobiliária",
  },
  description:
    "Encontre apartamentos, casas e sobrados em Curitiba. Imobiliária FYMOOB — seu imóvel ideal com atendimento personalizado.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "FYMOOB Imobiliária",
    url: SITE_URL,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "FYMOOB Imobiliária - Imóveis em Curitiba",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FYMOOB Imobiliária | Imóveis em Curitiba",
    description:
      "Encontre apartamentos, casas e sobrados em Curitiba. Imobiliária FYMOOB — seu imóvel ideal com atendimento personalizado.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/site.webmanifest",
  other: {
    "msapplication-TileColor": "#29ABE2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const orgSchema = generateOrganizationSchema();
  const localBusinessSchema = generateLocalBusinessSchema();

  return (
    <html lang="pt-BR" className={satoshi.variable} data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://cdn.vistahost.com.br" />
        <link rel="dns-prefetch" href="https://cdn.vistahost.com.br" />
        {/* Favicons — URLs estaveis (sem hash do Next.js) servidos do /public.
            Google exige URL estavel; nao usar src/app/icon.png nem
            src/app/apple-icon.png (Next.js gera URL com hash que muda a
            cada build — desorienta o favicon crawler do Google). */}
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#29ABE2" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(localBusinessSchema) }}
        />
      </head>
      <body
        className="antialiased"
      >
        <Header />
        <main className="min-h-screen overflow-x-clip">{children}</main>
        <ChromeGate>
          <Footer />
        </ChromeGate>
        <ScrollToTop />
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <WhatsAppFloat />
        <BottomNav />
        {GA_ID && <DeferredGA gaId={GA_ID} />}
        {/* Listener global pra cliques em [data-track="whatsapp_click"]
            — captura Float, Footer, LandingSEOContent, EmpSEOContent etc. */}
        {GA_ID && <WhatsAppClickTracker />}
        {GA_ID && <PhoneClickTracker />}
        {/* RUM field data (p75 LCP/INP/CLS de usuarios reais) — precondicao
            para validar empiricamente otimizacoes Tier 1+ do roadmap perf.
            Dashboard: Vercel > Project > Speed Insights. */}
        <SpeedInsights />
        {/* Vercel Web Analytics — traffic, top pages, referrers, countries.
            Hobby plan: 50k events/mes, 30d historico. Cookieless, LGPD-friendly.
            Dashboard: Vercel > Project > Analytics. */}
        <Analytics />
      </body>
    </html>
  );
}
