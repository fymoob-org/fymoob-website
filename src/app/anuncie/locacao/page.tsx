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
  ArrowLeft,
  Key,
} from "lucide-react"

export const metadata: Metadata = {
  title: { absolute: "Anuncie seu imóvel pra locação em Curitiba | Imobiliária FYMOOB" },
  description:
    "Quer alugar seu imóvel em Curitiba? A FYMOOB cuida da análise de crédito do inquilino, contrato, vistoria e acompanhamento. Sem mensalidade. CRECI J 9420.",
  alternates: {
    canonical: "/anuncie/locacao",
  },
}

const etapas = [
  {
    number: "01",
    icon: ClipboardCheck,
    title: "Cadastro do imóvel",
    description:
      "Preencha os dados básicos do imóvel disponível pra alugar. Entramos em contato pra agendar a visita.",
  },
  {
    number: "02",
    icon: Camera,
    title: "Vistoria e fotos",
    description:
      "Visitamos pra fazer vistoria do estado de conservação e fotos profissionais. Definimos valor de aluguel baseado no mercado.",
  },
  {
    number: "03",
    icon: Megaphone,
    title: "Publicação e divulgação",
    description:
      "Anunciamos no site, portais (ZAP, Viva Real, OLX) e redes sociais. Interessados qualificados chegam até você sem você precisar atender ninguém.",
  },
  {
    number: "04",
    icon: Key,
    title: "Análise de crédito e contrato",
    description:
      "Fazemos análise de crédito do candidato, conferimos documentos, montamos contrato e entregamos a chave. Você fica protegido de inquilino problemático.",
  },
]

const beneficios = [
  {
    icon: Shield,
    title: "Análise de crédito do inquilino",
    description:
      "Verificamos histórico financeiro, comprovante de renda e referências antes de aprovar. Você reduz risco de inadimplência.",
  },
  {
    icon: TrendingUp,
    title: "Preço de aluguel correto",
    description:
      "Avaliação baseada no mercado real de Curitiba — m² do bairro, comparáveis, condições do imóvel. Aluga mais rápido e no preço justo.",
  },
  {
    icon: Users,
    title: "Inquilinos qualificados",
    description:
      "Conectamos seu imóvel a candidatos que já estão buscando alugar em Curitiba. Sem perder tempo com curiosos.",
  },
  {
    icon: Eye,
    title: "Visibilidade no Google",
    description:
      "Página própria otimizada pra Google. Aparece em buscas como 'apartamento pra alugar {bairro}' e 'imóveis pra locação Curitiba'.",
  },
  {
    icon: Camera,
    title: "Fotos profissionais",
    description:
      "Fotos que destacam os pontos fortes do imóvel. Anúncios com fotos boas alugam 3x mais rápido.",
  },
  {
    icon: Zap,
    title: "Sem mensalidade",
    description:
      "Você só paga quando o imóvel for efetivamente alugado. Sem taxa de cadastro, sem custo fixo mensal.",
  },
]

const tiposAceitos = [
  "Apartamentos",
  "Casas",
  "Sobrados",
  "Salas comerciais",
  "Cobertura",
  "Kitnet / Studio",
]

export default function AnuncieLocacaoPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-2 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { name: "Home", url: "/" },
          { name: "Anuncie seu imóvel", url: "/anuncie" },
          { name: "Locação", url: "/anuncie/locacao" },
        ]}
      />

      <Link
        href="/anuncie"
        className="mt-2 inline-flex items-center gap-1.5 text-sm text-fymoob-gray-mid transition-colors hover:text-brand-primary"
      >
        <ArrowLeft className="size-3.5" />
        Voltar pra anuncie
      </Link>

      <div className="mb-12 mt-4">
        <span className="inline-block rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-primary">
          Locação
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold text-fymoob-gray-dark sm:text-4xl">
          Anuncie seu imóvel pra alugar em Curitiba
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-fymoob-gray-mid">
          A FYMOOB cuida de <strong className="text-fymoob-gray-dark">análise
          de crédito, vistoria, contrato e cobrança</strong>, conecta seu imóvel
          a inquilinos qualificados e acompanha do anúncio à entrega das chaves.
        </p>
      </div>

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

      <section className="mb-16">
        <h2 className="mb-8 text-center font-display text-2xl font-bold text-fymoob-gray-dark">
          Por que alugar com a FYMOOB?
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

      <section className="mb-16">
        <h2 className="mb-4 font-display text-2xl font-bold text-fymoob-gray-dark">
          Tipos de imóveis que alugamos
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

      <section className="mb-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 sm:p-8">
        <h2 className="mb-2 font-display text-2xl font-bold text-fymoob-gray-dark">
          Cadastre seu imóvel pra locação
        </h2>
        <p className="mb-6 text-sm text-fymoob-gray-mid">
          Preencha os dados abaixo e um corretor entra em contato pra agendar
          a visita de avaliação. Sem compromisso.
        </p>
        <div className="mx-auto max-w-lg">
          <ContactForm
            interesseLabel="Qual o seu objetivo?"
            interesseOptions={[
              { value: "Alugar imóvel", label: "Quero disponibilizar pra aluguel" },
              { value: "Avaliar aluguel", label: "Quero saber qual o valor de aluguel" },
              { value: "Dúvida sobre locação", label: "Tenho dúvida sobre como funciona" },
            ]}
          />
        </div>
      </section>

      <section className="mt-12 border-t border-neutral-200 pt-12">
        <DynamicFAQ
          questions={generateAnuncieFAQ()}
          title="Perguntas frequentes sobre anunciar imóvel pra locação"
        />
      </section>
    </div>
  )
}
