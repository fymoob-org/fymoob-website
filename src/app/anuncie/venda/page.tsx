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
} from "lucide-react"

export const metadata: Metadata = {
  title: { absolute: "Anuncie seu imóvel pra venda em Curitiba | Imobiliária FYMOOB" },
  description:
    "Quer vender seu imóvel em Curitiba? A FYMOOB cuida da avaliação, fotos profissionais, anúncio no site e divulgação em ZAP, Viva Real e OLX. CRECI J 9420.",
  alternates: {
    canonical: "/anuncie/venda",
  },
}

const etapas = [
  {
    number: "01",
    icon: ClipboardCheck,
    title: "Cadastro do imóvel",
    description:
      "Preencha os dados básicos do imóvel que você quer vender. Entramos em contato pra agendar a visita.",
  },
  {
    number: "02",
    icon: Camera,
    title: "Avaliação e fotos",
    description:
      "Visitamos o imóvel, fazemos avaliação de mercado realista e registramos fotos profissionais que destacam os pontos fortes.",
  },
  {
    number: "03",
    icon: Megaphone,
    title: "Publicação e divulgação",
    description:
      "Publicamos no nosso site (otimizado pra Google), nos portais (ZAP, Viva Real, OLX) e redes sociais. Compradores qualificados nos encontram.",
  },
  {
    number: "04",
    icon: Handshake,
    title: "Negociação e fechamento",
    description:
      "Conduzimos as visitas, negociamos preço, organizamos a documentação e acompanhamos até a entrega das chaves.",
  },
]

const beneficios = [
  {
    icon: TrendingUp,
    title: "Precificação correta",
    description:
      "Avaliação baseada em dados reais do mercado de Curitiba — m² do bairro, comparáveis recentes, tendência. Imóvel precificado certo vende mais rápido.",
  },
  {
    icon: Eye,
    title: "Visibilidade no Google",
    description:
      "Seu imóvel ganha página própria otimizada pra Google. Aparece em buscas como 'apartamento {bairro}' e 'imóveis à venda em Curitiba'.",
  },
  {
    icon: Users,
    title: "Compradores qualificados",
    description:
      "Conectamos seu imóvel a quem já está buscando ativamente comprar em Curitiba. Menos visitas perdidas, mais propostas reais.",
  },
  {
    icon: Camera,
    title: "Fotos que vendem",
    description:
      "Fotos profissionais destacam os melhores ângulos. Imóveis com fotos boas recebem 3x mais cliques nos portais.",
  },
  {
    icon: Shield,
    title: "Segurança jurídica",
    description:
      "Contratos revisados, documentação conferida, escritura acompanhada. CRECI J 9420.",
  },
  {
    icon: Zap,
    title: "Sem custo até vender",
    description:
      "Você só paga a comissão quando o imóvel for efetivamente vendido. Sem mensalidade, sem taxa de cadastro.",
  },
]

const tiposAceitos = [
  "Apartamentos",
  "Casas",
  "Sobrados",
  "Terrenos",
  "Salas comerciais",
  "Cobertura",
  "Empreendimentos",
]

export default function AnuncieVendaPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-2 sm:px-6 lg:px-8">
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

      {/* Hero */}
      <div className="mb-12 mt-4">
        <span className="inline-block rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-primary">
          Venda
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold text-fymoob-gray-dark sm:text-4xl">
          Anuncie seu imóvel pra venda em Curitiba
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-fymoob-gray-mid">
          A FYMOOB cuida de <strong className="text-fymoob-gray-dark">avaliação,
          fotos profissionais, anúncio no site e nos portais</strong>, conduz
          as visitas e acompanha até a entrega das chaves.
        </p>
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
          Por que vender com a FYMOOB?
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
          Tipos de imóveis que vendemos
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

      {/* Form */}
      <section className="mb-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 sm:p-8">
        <h2 className="mb-2 font-display text-2xl font-bold text-fymoob-gray-dark">
          Cadastre seu imóvel pra venda
        </h2>
        <p className="mb-6 text-sm text-fymoob-gray-mid">
          Preencha os dados abaixo e um corretor entra em contato pra agendar
          a visita de avaliação. Sem compromisso.
        </p>
        <div className="mx-auto max-w-lg">
          <ContactForm
            interesseLabel="Qual o seu objetivo?"
            interesseOptions={[
              { value: "Vender imóvel", label: "Quero vender meu imóvel" },
              { value: "Avaliar imóvel", label: "Quero uma avaliação de preço primeiro" },
              { value: "Dúvida sobre venda", label: "Tenho dúvida sobre como funciona" },
            ]}
          />
        </div>
      </section>

      <section className="mt-12 border-t border-neutral-200 pt-12">
        <DynamicFAQ
          questions={generateAnuncieFAQ()}
          title="Perguntas frequentes sobre anunciar imóvel pra venda"
        />
      </section>
    </div>
  )
}
