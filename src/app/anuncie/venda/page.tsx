import type { Metadata } from "next"
import Link from "next/link"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { AnuncieWizard } from "../_components/AnuncieWizard"
import { ComoFuncionaCompacto } from "../_components/ComoFuncionaCompacto"
import { DynamicFAQ } from "@/components/seo/DynamicFAQ"
import { generateAnuncieFAQ } from "@/lib/seo"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: { absolute: "Anuncie seu imóvel pra venda em Curitiba | Imobiliária FYMOOB" },
  description:
    "Quer vender seu imóvel em Curitiba? Preencha o cadastro online e um corretor da FYMOOB entra em contato pra agendar a visita de avaliação. CRECI J 9420.",
  alternates: {
    canonical: "/anuncie/venda",
  },
}

export default function AnuncieVendaPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-2 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { name: "Home", url: "/" },
          { name: "Anuncie seu imóvel", url: "/anuncie" },
          { name: "Venda", url: "/anuncie/venda" },
        ]}
      />

      <Link
        href="/anuncie"
        className="mt-2 inline-flex items-center gap-1.5 text-sm text-fymoob-gray-mid transition-colors hover:text-brand-primary"
      >
        <ArrowLeft className="size-3.5" />
        Voltar pra anuncie
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-fymoob-gray-dark sm:text-3xl">
        Anuncie seu imóvel pra venda em Curitiba
      </h1>

      <div className="mt-6">
        <ComoFuncionaCompacto />
        <AnuncieWizard defaultOperacao="venda" />
      </div>

      <section className="mt-16 border-t border-neutral-200 pt-12">
        <DynamicFAQ
          questions={generateAnuncieFAQ()}
          title="Perguntas frequentes sobre anunciar imóvel pra venda"
        />
      </section>
    </div>
  )
}
