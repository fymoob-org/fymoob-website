import type { Metadata } from "next"
import Link from "next/link"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { DynamicFAQ } from "@/components/seo/DynamicFAQ"
import { generateAnuncieFAQ } from "@/lib/seo"
import { Tag, Key, ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: { absolute: "Anuncie seu imóvel em Curitiba | Imobiliária FYMOOB" },
  description:
    "Anuncie seu imóvel pra venda ou aluguel em Curitiba. Preencha o cadastro online e um corretor da FYMOOB entra em contato. CRECI J 9420.",
  alternates: {
    canonical: "/anuncie",
  },
}

export default function AnunciePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-2 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { name: "Home", url: "/" },
          { name: "Anuncie seu imóvel", url: "/anuncie" },
        ]}
      />

      <div className="mb-10 mt-4">
        <h1 className="font-display text-3xl font-bold text-fymoob-gray-dark sm:text-4xl">
          Anuncie seu imóvel na FYMOOB
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-fymoob-gray-mid sm:text-lg">
          Cadastro online em poucos minutos. Um corretor da FYMOOB (CRECI J 9420) entra em
          contato pra agendar a avaliação.
        </p>
      </div>

      <section className="mb-14 grid gap-4 sm:grid-cols-2">
        <Link
          href="/anuncie/venda"
          className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:border-brand-primary/40 hover:shadow-lg sm:p-7"
        >
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10">
            <Tag className="size-6 text-brand-primary" />
          </div>
          <h2 className="font-display text-xl font-bold text-fymoob-gray-dark">
            Quero vender meu imóvel
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-fymoob-gray-mid">
            Cadastre seu imóvel pra venda. Um corretor entra em contato pra agendar
            a visita de avaliação.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-primary group-hover:gap-2 transition-[gap]">
            Anunciar pra venda
            <ArrowRight className="size-4" />
          </span>
        </Link>

        <Link
          href="/anuncie/locacao"
          className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:border-brand-primary/40 hover:shadow-lg sm:p-7"
        >
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10">
            <Key className="size-6 text-brand-primary" />
          </div>
          <h2 className="font-display text-xl font-bold text-fymoob-gray-dark">
            Quero alugar meu imóvel
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-fymoob-gray-mid">
            Cadastre seu imóvel pra locação. Um corretor entra em contato pra
            alinhar os próximos passos.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-primary group-hover:gap-2 transition-[gap]">
            Anunciar pra alugar
            <ArrowRight className="size-4" />
          </span>
        </Link>
      </section>

      <section className="mt-12 border-t border-neutral-200 pt-12">
        <DynamicFAQ
          questions={generateAnuncieFAQ()}
          title="Perguntas frequentes sobre anunciar imóvel na FYMOOB"
        />
      </section>
    </div>
  )
}
