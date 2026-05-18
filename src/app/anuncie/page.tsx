import type { Metadata } from "next"
import Link from "next/link"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { ContactForm } from "@/components/shared/ContactForm"
import { DynamicFAQ } from "@/components/seo/DynamicFAQ"
import { generateAnuncieFAQ } from "@/lib/seo"
import {
  Camera,
  Users,
  TrendingUp,
  Shield,
  Eye,
  Zap,
  ClipboardCheck,
  Megaphone,
  Handshake,
  CheckCircle2,
  Tag,
  Key,
  ArrowRight,
} from "lucide-react"

export const metadata: Metadata = {
  title: { absolute: "Anuncie seu imóvel em Curitiba | Imobiliária FYMOOB" },
  description:
    "Anuncie seu imóvel pra venda ou aluguel com a Imobiliária FYMOOB. Anúncio em ZAP Imóveis, Viva Real, OLX e site próprio. Atendimento local. CRECI J 9420.",
  alternates: {
    canonical: "/anuncie",
  },
}

const etapas = [
  {
    number: "01",
    icon: ClipboardCheck,
    title: "Cadastro do imóvel",
    description:
      "Preencha o formulário com os dados básicos do seu imóvel. Nós entramos em contato para agendar uma visita.",
  },
  {
    number: "02",
    icon: Camera,
    title: "Avaliação e fotos",
    description:
      "Visitamos o imóvel, fazemos a avaliação de mercado e registramos fotos de alta qualidade para o anúncio.",
  },
  {
    number: "03",
    icon: Megaphone,
    title: "Publicação e divulgação",
    description:
      "Seu imóvel é publicado no nosso site otimizado para Google, portais parceiros e redes sociais.",
  },
  {
    number: "04",
    icon: Handshake,
    title: "Negociação e fechamento",
    description:
      "Cuidamos de toda a negociação, documentação e acompanhamos até a entrega das chaves.",
  },
]

const beneficios = [
  {
    icon: Eye,
    title: "Visibilidade no Google",
    description:
      "Seu imóvel aparece nas buscas do Google com página própria, fotos e todas as informações.",
  },
  {
    icon: Zap,
    title: "Agilidade na publicação",
    description:
      "Após a visita técnica, seu imóvel é publicado o mais rápido possível no site.",
  },
  {
    icon: Users,
    title: "Base de clientes qualificados",
    description:
      "Conectamos seu imóvel a compradores e inquilinos que já estão buscando ativamente em Curitiba.",
  },
  {
    icon: TrendingUp,
    title: "Avaliação de mercado profissional",
    description:
      "Precificação baseada em dados reais do mercado curitibano para vender ou alugar mais rápido.",
  },
  {
    icon: Shield,
    title: "Segurança jurídica",
    description:
      "Contratos revisados, documentação verificada e transações com respaldo legal. CRECI J 9420.",
  },
  {
    icon: Camera,
    title: "Fotos profissionais",
    description:
      "Anúncios com fotos de qualidade que destacam os melhores atributos do seu imóvel.",
  },
]

const tiposAceitos = [
  "Apartamentos",
  "Casas",
  "Sobrados",
  "Terrenos",
  "Salas comerciais",
  "Cobertura",
  "Kitnet / Studio",
  "Empreendimentos",
]

export default function AnunciePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-2 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { name: "Home", url: "/" },
          { name: "Anuncie seu imóvel", url: "/anuncie" },
        ]}
      />

      {/* Hero */}
      <div className="mb-10">
        <h1 className="font-display text-3xl font-bold text-fymoob-gray-dark sm:text-4xl">
          Anuncie seu imóvel na FYMOOB
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-fymoob-gray-mid">
          Venda ou alugue seu imóvel com quem entende de Curitiba.{" "}
          <strong className="text-fymoob-gray-dark">
            Avaliação profissional, anúncio otimizado e atendimento do início ao fim.
          </strong>
        </p>
      </div>

      {/* Escolha venda vs locação */}
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
            Avaliação profissional, fotos, divulgação em portais e
            acompanhamento até a escritura.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-primary group-hover:gap-2 transition-[gap]">
            Saiba mais
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
            Análise de crédito do inquilino, contrato, vistoria e cobrança.
            Você fica protegido de inadimplência.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-primary group-hover:gap-2 transition-[gap]">
            Saiba mais
            <ArrowRight className="size-4" />
          </span>
        </Link>
      </section>

      {/* Stats bar */}
      <div className="mb-14 grid grid-cols-3 gap-4 rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-6">
        {[
          { number: "249+", label: "Imóveis ativos" },
          { number: "65", label: "Bairros atendidos" },
          { number: "Ágil", label: "Publicação rápida" },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <p className="font-display text-2xl font-bold text-brand-primary sm:text-3xl">
              {item.number}
            </p>
            <p className="mt-0.5 text-xs text-fymoob-gray-mid sm:text-sm">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {/* Como funciona */}
      <section className="mb-16">
        <h2 className="mb-8 text-center font-display text-2xl font-bold text-fymoob-gray-dark">
          Como funciona
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {etapas.map((etapa) => {
            const Icon = etapa.icon
            return (
              <div key={etapa.number} className="relative rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                <span className="absolute -top-3 left-4 rounded-full bg-brand-primary px-2.5 py-0.5 text-xs font-bold text-white">
                  {etapa.number}
                </span>
                <div className="mb-3 mt-1 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10">
                  <Icon className="size-5 text-brand-primary" />
                </div>
                <h3 className="font-display font-bold text-fymoob-gray-dark">
                  {etapa.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-fymoob-gray-mid">
                  {etapa.description}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Beneficios */}
      <section className="mb-16">
        <h2 className="mb-8 text-center font-display text-2xl font-bold text-fymoob-gray-dark">
          Por que anunciar na FYMOOB?
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {beneficios.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-brand-primary/30 hover:shadow-md"
              >
                <Icon className="mb-3 size-6 text-brand-primary" />
                <h3 className="font-display font-bold text-fymoob-gray-dark">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fymoob-gray-mid">
                  {item.description}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Tipos aceitos */}
      <section className="mb-16">
        <h2 className="mb-4 font-display text-2xl font-bold text-fymoob-gray-dark">
          Tipos de imóveis que anunciamos
        </h2>
        <div className="flex flex-wrap gap-2">
          {tiposAceitos.map((tipo) => (
            <span
              key={tipo}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium text-fymoob-gray-dark"
            >
              <CheckCircle2 className="size-3.5 text-brand-primary" />
              {tipo}
            </span>
          ))}
        </div>
      </section>

      {/* Form section */}
      <section className="mb-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 sm:p-8">
        <h2 className="mb-2 font-display text-2xl font-bold text-fymoob-gray-dark">
          Cadastre seu imóvel
        </h2>
        <p className="mb-6 text-sm text-fymoob-gray-mid">
          Preencha os dados abaixo e um de nossos corretores entrará em contato
          para agendar a visita de avaliação. Sem compromisso.
        </p>
        <div className="mx-auto max-w-lg">
          <ContactForm
            interesseLabel="O que você deseja?"
            interesseOptions={[
              { value: "Vender imóvel", label: "Quero vender meu imóvel" },
              { value: "Alugar imóvel", label: "Quero disponibilizar para aluguel" },
              { value: "Avaliar imóvel", label: "Quero uma avaliação de preço" },
              { value: "Dúvida geral", label: "Tenho uma dúvida sobre anunciar" },
            ]}
          />
        </div>
      </section>

      {/* FAQ — Fase 19.P0.10 (gap pos-audit) */}
      <section className="mt-12 border-t border-neutral-200 pt-12">
        <DynamicFAQ
          questions={generateAnuncieFAQ()}
          title="Perguntas frequentes sobre anunciar imóvel na FYMOOB"
        />
      </section>
    </div>
  )
}
