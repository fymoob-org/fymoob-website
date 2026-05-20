// Server Component — bloco textual rico em palavras-chave pra landings
// tipadas (apartamentos, casas, sobrados, terrenos). Fase 19.P0.4.
//
// Concorrente MySide tem 3001 palavras na landing /apartamentos-venda-curitiba-pr;
// FYMOOB pre-fix tinha ~1489 mas a maioria eram titles de cards. Esse bloco
// adiciona ~1000 palavras de conteudo textual indexavel real (Google indexa
// texto, nao imagens nem cards repetidos).
import Link from "next/link"

interface LandingSEOContentProps {
  tipo: "Apartamento" | "Casa" | "Sobrado" | "Terreno"
  total: number
}

const BAIRROS_DESTAQUE = [
  { slug: "batel", nome: "Batel", perfil: "alto padrão, próximo ao Centro" },
  { slug: "agua-verde", nome: "Água Verde", perfil: "família, escolas, comércio" },
  { slug: "bigorrilho", nome: "Bigorrilho", perfil: "alto padrão, parques" },
  { slug: "ecoville", nome: "Ecoville", perfil: "moderno, novo, alto padrão" },
  { slug: "centro", nome: "Centro", perfil: "investimento, infraestrutura" },
  { slug: "cabral", nome: "Cabral", perfil: "custo-benefício, família" },
  { slug: "juveve", nome: "Juvevê", perfil: "tradicional, residencial" },
  { slug: "cristo-rei", nome: "Cristo Rei", perfil: "arborizado, família" },
  { slug: "mossungue", nome: "Mossunguê", perfil: "Parque Barigui, alto padrão" },
  { slug: "alto-da-gloria", nome: "Alto da Glória", perfil: "histórico, familiar" },
]

const TIPOS_CONTEUDO = {
  Apartamento: {
    plural: "apartamentos",
    artigo: "um",
    descricao: "Apartamentos em Curitiba combinam praticidade urbana, segurança de condomínio e infraestrutura de lazer. Da capital paranaense saem alguns dos lançamentos mais bem avaliados do Sul do país, com construtoras como Avantti, Plaenge, Cyrela, Helbor e Dirani entregando projetos de alto padrão regularmente.",
    dicaCompra:
      "Na hora de escolher seu apartamento, observe: relação m²/preço (médio em Curitiba é R$ 11.621/m² segundo FipeZAP de março/2026), número de vagas (1 vaga é padrão em médio padrão, 2+ em alto padrão), proximidade de BRT/transporte, escolas e supermercados, infraestrutura de lazer do condomínio (piscina, academia, salão), e situação do empreendimento (pronto vs planta vs em obras).",
    dicaInvest: "Para investimento, bairros em valorização recente como Centro Cívico, Hugo Lange, Capão Raso e Vila Izabel oferecem ROI superior aos clássicos. Apartamentos compactos (1 quarto, 35-45m²) próximos a hospitais (IPO, Cajuru, Santa Casa) e universidades (UFPR, PUC-PR) têm liquidez de aluguel alta.",
  },
  Casa: {
    plural: "casas",
    artigo: "uma",
    descricao: "Casas em Curitiba são o sonho de quem busca espaço, quintal e privacidade. A cidade tem opções desde casas geminadas em bairros médios até casas em condomínio fechado de alto padrão em Cascatinha, Mossunguê, Champagnat e Lamenha Pequena. Casas em Santa Felicidade, Boa Vista e Tatuquara oferecem ótima relação custo-benefício para quem busca terreno amplo.",
    dicaCompra:
      "Ao comprar uma casa em Curitiba, verifique: zoneamento da Prefeitura (IPPUC) — fundamental para reformas/ampliações, idade do imóvel e estado da estrutura (laudo técnico recomendado para casas com 20+ anos), IPTU/condomínio anuais, vagas de garagem, vizinhança e segurança da rua, infraestrutura básica (água, esgoto, gás encanado).",
    dicaInvest:
      "Casas em condomínio fechado têm valorização constante (5-8% ao ano em Curitiba). Casas avulsas em bairros com obras de mobilidade (Linha Verde, BRT) também valorizam. Casas para reforma/retrofit em Batel, Mercês e Bigorrilho têm potencial de upside grande.",
  },
  Sobrado: {
    plural: "sobrados",
    artigo: "um",
    descricao: "Sobrados em Curitiba combinam o conforto de uma casa com a praticidade de um terreno menor. São especialmente populares em bairros como Capão Raso, Boqueirão, Portão, Cabral e Bairro Alto, onde o ticket fica entre R$ 400 mil e R$ 1,5 milhão para sobrados padrão (3-4 quartos, 2 vagas).",
    dicaCompra:
      "Atenção especial à isolação térmica/acústica entre andares, escadas (verifique se atendem normas de segurança), distribuição cozinha/sala (térreo) vs quartos (superior), e iluminação dos cômodos do piso superior. Sobrados antigos podem ter pé-direito menor — verifique se o layout funciona pra sua família.",
    dicaInvest:
      "Sobrados em condomínio fechado (Mossunguê, Cascatinha, Lamenha Pequena) têm valorização semelhante a casas em condomínio. Sobrados avulsos em bairros emergentes (Capão Raso, Tatuquara, Cidade Industrial) têm tickets baixos e boa demanda de aluguel.",
  },
  Terreno: {
    plural: "terrenos",
    artigo: "um",
    descricao:
      "Terrenos em Curitiba são oportunidade tanto para construção residencial quanto para investimento patrimonial. A cidade tem zoneamento bem definido (IPPUC) com áreas residenciais, comerciais, industriais e mistas. Terrenos em bairros consolidados (Mossunguê, Ecoville, Bigorrilho) chegam a R$ 10 mil/m²; terrenos em bairros emergentes (Tatuquara, Caximba, Umbará) ficam abaixo de R$ 1.000/m².",
    dicaCompra:
      "Antes de comprar terreno, sempre: 1) Consultar o zoneamento na Prefeitura (IPPUC) — define o que pode ser construído (residencial, comercial, mista), altura máxima, recuo obrigatório; 2) Verificar topografia e drenagem (terrenos em declive exigem fundação especial); 3) Checar se tem rede de água, esgoto e gás encanado disponíveis; 4) Conferir matrícula no Cartório e regularidade documental; 5) Avaliar valorização do bairro nos últimos 5 anos.",
    dicaInvest:
      "Terrenos comerciais em corredores de tráfego (Linha Verde, Av. Anita Garibaldi, BR-277) têm valorização forte. Terrenos próximos a polos universitários (UFPR Centro Politécnico, PUC-PR) têm demanda constante. Pequenas glebas (até 5.000m²) em áreas em expansão (Caximba, Tatuquara) são oportunidades de loteamento com retorno em 2-4 anos.",
  },
}

export function LandingSEOContent({ tipo, total }: LandingSEOContentProps) {
  const conteudo = TIPOS_CONTEUDO[tipo]
  const tipoSlug = conteudo.plural

  return (
    <section className="border-t border-neutral-200 bg-white py-12 md:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-bold text-neutral-900 md:text-3xl">
          Conheça o mercado de {conteudo.plural} em Curitiba
        </h2>
        <p className="mt-4 leading-relaxed text-neutral-700">
          Curitiba é uma das capitais brasileiras com mercado imobiliário mais consistente —
          combinando qualidade de vida (5º melhor IDH do país segundo IBGE 2025), infraestrutura
          urbana de referência (BRT, parques, mobilidade) e preço médio do metro quadrado de{" "}
          <strong>R$ 11.621/m²</strong> segundo o Índice FipeZAP de março de 2026 (variação de
          5,92% nos últimos 12 meses). A FYMOOB tem hoje{" "}
          <strong>
            {total} {conteudo.plural} disponíveis
          </strong>{" "}
          em Curitiba, com catálogo atualizado automaticamente do CRM Loft/Vista.
        </p>
        <p className="mt-4 leading-relaxed text-neutral-700">{conteudo.descricao}</p>

        <h3 className="mt-10 font-display text-xl font-bold text-neutral-900 md:text-2xl">
          Bairros mais procurados de Curitiba
        </h3>
        <p className="mt-4 leading-relaxed text-neutral-700">
          A cidade tem 75 bairros oficiais e a FYMOOB cobre os principais. Os bairros mais
          buscados combinam segurança, infraestrutura, escolas e proximidade do centro:
        </p>
        <ul className="mt-4 grid gap-2 text-neutral-700 sm:grid-cols-2">
          {BAIRROS_DESTAQUE.map((b) => (
            <li key={b.slug} className="flex items-start gap-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-primary" />
              <span>
                <Link
                  href={`/imoveis/${b.slug}/${tipoSlug}`}
                  className="font-semibold text-neutral-900 hover:text-brand-primary hover:underline"
                >
                  {b.nome}
                </Link>{" "}
                — <span className="text-sm text-neutral-600">{b.perfil}</span>
              </span>
            </li>
          ))}
        </ul>

        <h3 className="mt-10 font-display text-xl font-bold text-neutral-900 md:text-2xl">
          Como escolher o {conteudo.plural === "casas" ? "imóvel" : "imóvel"} certo em Curitiba
        </h3>
        <p className="mt-4 leading-relaxed text-neutral-700">{conteudo.dicaCompra}</p>

        <h3 className="mt-10 font-display text-xl font-bold text-neutral-900 md:text-2xl">
          {conteudo.plural.charAt(0).toUpperCase() + conteudo.plural.slice(1)} para investimento
        </h3>
        <p className="mt-4 leading-relaxed text-neutral-700">{conteudo.dicaInvest}</p>

        <h3 className="mt-10 font-display text-xl font-bold text-neutral-900 md:text-2xl">
          Por que comprar com a FYMOOB Imobiliária
        </h3>
        <p className="mt-4 leading-relaxed text-neutral-700">
          A FYMOOB é uma imobiliária de Curitiba com{" "}
          <strong>CRECI J 9420</strong>. Trabalhamos com catálogo unificado sincronizado
          com o nosso CRM. O atendimento é via WhatsApp{" "}
          <a
            href="https://wa.me/5541999780517?text=Ol%C3%A1!%20Tenho%20interesse%20em%20saber%20mais%20sobre%20os%20im%C3%B3veis%20da%20FYMOOB."
            target="_blank"
            rel="noopener noreferrer"
            data-track="whatsapp_click"
            data-source="landing_seo"
            className="font-semibold text-brand-primary hover:underline"
          >
            (41) 99978-0517
          </a>{" "}
          ou email <strong>fymoob@gmail.com</strong>. Bruno César de Almeida{" "}
          (CRECI/PR 24.494) é o corretor responsável.
        </p>

        {tipo === "Apartamento" && (
          <div className="mt-10 rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-6">
            <h3 className="font-display text-lg font-bold text-neutral-900">
              Quer ir mais a fundo?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-700">
              Leia nosso guia definitivo:{" "}
              <Link
                href="/comprar-apartamento-curitiba"
                className="font-semibold text-brand-primary hover:underline"
              >
                Comprar Apartamento em Curitiba — Guia Completo 2026
              </Link>
              {" "}— 30 minutos de leitura cobrindo preço médio do m² (FipeZAP), 20 melhores bairros,
              financiamento Caixa/Itaú/Bradesco, ITBI Curitiba, planta vs pronto, valorização e
              armadilhas.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
