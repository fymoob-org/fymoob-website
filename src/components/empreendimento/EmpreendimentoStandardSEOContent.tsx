// Server Component — bloco textual rico em palavras-chave pra empreendimentos
// que NAO tem editorial layout. Fase 19.P2.B.1 (audit revelou que 109 de 110
// empreendimentos tem media 288 palavras = thin content por padrao Google
// que espera 500+).
//
// Saida tipica: 800-1200 palavras dinamicas via interpolacao de:
// - Dados do CRM (nome, bairro, construtora, situacao, fotos)
// - Stats agregados (precos, areas, tipos, contagem)
// - Descricoes curadas de bairros + construtoras (fallback dinamico)
//
// IMPORTANTE: nao-renderizar quando empreendimento ja tem editorial layout
// (Reserva Barigui, etc). Caller decide via `if (!hasEditorial)`.
import Link from "next/link"
import { formatPrice, formatArea, slugify } from "@/lib/utils"

interface Empreendimento {
  nome: string
  slug: string
  bairros: string[]
  total: number
  precoMin?: number | null
  precoMax?: number | null
  construtora?: string | null
  imageUrl?: string | null
}

interface EmpreendimentoStandardSEOContentProps {
  empreendimento: Empreendimento
  precoMin: number | null
  precoMax: number | null
  areaMin: number | null
  areaMax: number | null
  tipos: string[]
  bairro: string
  construtora: string | null
  situacao?: string | null
  descricaoCRM?: string | null
}

// Descriptors curados de bairros — usados quando o empreendimento esta em
// um dos top 15 de Curitiba. Bairros fora da lista usam fallback dinamico.
const BAIRRO_DESCRIPTIONS: Record<string, string> = {
  "Batel": "O Batel é um dos bairros mais nobres de Curitiba, conhecido pela vida noturna agitada, gastronomia refinada e comércio de alto padrão. Localizado próximo ao centro, oferece infraestrutura completa com Pátio Batel, Praça do Japão e fácil acesso a toda a cidade.",
  "Bigorrilho": "O Bigorrilho é vizinho direto do Batel e compartilha sua infraestrutura premium. Bairro residencial com ruas arborizadas, comércio sofisticado, próximo ao Parque Tanguá e Jardim Botânico — excelente qualidade de vida com perfil alto padrão tradicional.",
  "Mossunguê": "Mossunguê é um dos bairros mais valorizados de Curitiba, ao lado do Parque Barigui e ParkShoppingBarigui. Concentra grande parte dos lançamentos de alto padrão da cidade, com fácil acesso à BR-277, Avenida Cândido Hartmann e ao centro.",
  "Ecoville": "O Ecoville é um dos bairros mais modernos de Curitiba, com prédios novos, amplas áreas verdes (Bosque Gutierrez) e infraestrutura de primeiro mundo. Ideal pra quem busca conforto, modernidade e boa relação com áreas verdes.",
  "Água Verde": "O Água Verde combina conveniência urbana com qualidade de vida familiar. Com fartura de comércio, serviços, escolas e fácil acesso ao transporte público, é um dos bairros mais procurados pra famílias em Curitiba.",
  "Portão": "O Portão é um bairro tradicional e bem estruturado, com excelente rede de transporte (BRT), comércio variado, Hospital IPO e Shopping Palladium. Ideal pra famílias que buscam praticidade no dia a dia.",
  "Centro": "O Centro de Curitiba reúne história, cultura e praticidade. Com acesso a todos os serviços essenciais, transporte público abundante e vida cultural ativa, é perfeito pra quem valoriza a vida urbana.",
  "Cabral": "O Cabral é um bairro nobre com excelente infraestrutura, próximo ao Jardim Botânico e ao Centro Cívico. Ruas arborizadas, boas escolas, UFPR Politécnico e comércio completo fazem dele um dos mais desejados.",
  "Juvevê": "O Juvevê é um bairro charmoso e bem localizado, com ruas arborizadas, comércio local variado e proximidade ao centro. Perfeito pra quem busca tranquilidade sem abrir mão da conveniência urbana.",
  "Cristo Rei": "O Cristo Rei é um bairro arborizado próximo ao Centro Cívico e à UFPR. Combina tranquilidade familiar com proximidade do centro, com bom comércio local e boas escolas.",
  "Mercês": "O Mercês é um bairro residencial tranquilo, próximo ao Batel e Bigorrilho. Oferece boa infraestrutura, ruas calmas e fácil acesso aos principais pontos da cidade — perfil familiar de qualidade.",
  "Santa Felicidade": "Santa Felicidade é famoso pela gastronomia italiana e pelo charme interiorano dentro da cidade. Com grandes terrenos, casas amplas e clima tranquilo, é ideal pra quem busca espaço e qualidade de vida com personalidade.",
  "Alto da Glória": "O Alto da Glória é um bairro familiar histórico, com ruas tranquilas e proximidade ao Centro Cívico. Apartamentos antigos com charme arquitetônico se misturam a lançamentos modernos.",
  "Capão Raso": "O Capão Raso é um bairro popular em forte valorização, com BRT, comércio crescente e novos lançamentos a preços competitivos. Ideal pra primeira compra ou investimento.",
  "Jardim Botânico": "O Jardim Botânico oferece qualidade de vida única em Curitiba — proximidade ao parque mais simbólico da cidade, à UFPR Politécnico e infraestrutura crescente de comércio e serviços.",
}

// Construtoras conhecidas — descriptors curados pra reforçar autoridade
// quando o empreendimento é de uma marca top do mercado de Curitiba.
const CONSTRUTORA_DESCRIPTIONS: Record<string, string> = {
  "Avantti": "A Avantti é uma das construtoras mais ativas em Curitiba, com mais de 20 anos de mercado e empreendimentos icônicos como o Reserva Barigui. Conhecida por entregas no prazo e padrão construtivo elevado.",
  "Plaenge": "A Plaenge é referência em alto padrão no Sul do Brasil há mais de 50 anos. Em Curitiba, assina projetos premium em bairros consolidados como Batel, Bigorrilho e Ecoville.",
  "Cyrela": "A Cyrela é uma das maiores incorporadoras do Brasil, com presença em Curitiba marcada por empreendimentos de alto padrão e qualidade construtiva consagrada.",
  "Helbor": "A Helbor é uma incorporadora de alto padrão com operação consolidada em Curitiba, conhecida por projetos diferenciados em localizações nobres.",
  "Dirani": "A Dirani é uma construtora regional de Curitiba focada em médio-alto padrão, com bom histórico de entregas e qualidade.",
  "CR2": "A CR2 entrega empreendimentos em volume médio em Curitiba, focando em bairros tradicionais e médio padrão.",
  "Diálogo": "A Diálogo é especializada em projetos médio-alto padrão sustentáveis em Curitiba.",
  "Castro": "A Castro é uma construtora regional de alto padrão com forte atuação em Curitiba.",
  "EBM": "A EBM atua em médio padrão volume em Curitiba há mais de uma década.",
  "AYA": "A AYA é uma construtora de alto padrão com projetos diferenciados em Curitiba.",
}

// Helper — usa descriptor curado se existir, senão gera fallback dinamico
function getBairroDescription(bairro: string): string {
  if (BAIRRO_DESCRIPTIONS[bairro]) return BAIRRO_DESCRIPTIONS[bairro]
  return `${bairro} é um dos bairros de Curitiba cobertos pela FYMOOB. Com infraestrutura própria e perfil residencial, oferece opções diversificadas de imóveis pra quem busca morar ou investir na região.`
}

function getConstrutoraDescription(construtora: string | null): string | null {
  if (!construtora) return null
  if (CONSTRUTORA_DESCRIPTIONS[construtora]) return CONSTRUTORA_DESCRIPTIONS[construtora]
  return `A ${construtora} é a construtora responsável por este empreendimento, com atuação no mercado imobiliário de Curitiba.`
}

export function EmpreendimentoStandardSEOContent({
  empreendimento: emp,
  precoMin,
  precoMax,
  areaMin,
  areaMax,
  tipos,
  bairro,
  construtora,
  situacao,
  descricaoCRM,
}: EmpreendimentoStandardSEOContentProps) {
  const total = emp.total
  const tipoPlural = tipos.length === 1 ? `${tipos[0].toLowerCase()}s` : "unidades"
  const precoText = precoMin
    ? precoMax && precoMax !== precoMin
      ? `de ${formatPrice(precoMin)} a ${formatPrice(precoMax)}`
      : `a partir de ${formatPrice(precoMin)}`
    : null
  const areaText =
    areaMin && areaMax
      ? areaMin === areaMax
        ? `${formatArea(areaMin)}m²`
        : `de ${formatArea(areaMin)}m² a ${formatArea(areaMax)}m²`
      : null
  const tiposText =
    tipos.length === 0
      ? "imóveis"
      : tipos.length === 1
        ? tipos[0].toLowerCase()
        : tipos.slice(0, 3).join(", ").toLowerCase()

  const construtoraDesc = getConstrutoraDescription(construtora)
  const bairroDesc = getBairroDescription(bairro)
  const bairroSlug = slugify(bairro)

  return (
    <section className="bg-white py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* H2 — Sobre o empreendimento */}
        <h2 className="font-display text-2xl font-bold text-neutral-900 md:text-3xl">
          Sobre o {emp.nome}
        </h2>
        <div className="mt-6 space-y-4 leading-relaxed text-neutral-700">
          <p>
            O <strong>{emp.nome}</strong> é um empreendimento{" "}
            {situacao ? `${situacao.toLowerCase()} ` : ""}
            localizado{" "}
            {bairro ? (
              <>
                no bairro <strong>{bairro}</strong>, em Curitiba/PR
              </>
            ) : (
              "em Curitiba/PR"
            )}
            {construtora ? (
              <>
                , da construtora <strong>{construtora}</strong>
              </>
            ) : (
              ""
            )}
            . O catálogo da FYMOOB Imobiliária (CRECI J 9420) tem atualmente{" "}
            <strong>
              {total} {total === 1 ? "unidade disponível" : "unidades disponíveis"}
            </strong>
            {tipos.length > 0 ? ` no formato ${tiposText}` : ""}
            {areaText ? `, com áreas privativas ${areaText}` : ""}
            {precoText ? `, valores ${precoText}` : ""}.
          </p>

          {descricaoCRM && (
            <div className="whitespace-pre-line">{descricaoCRM}</div>
          )}
        </div>

        {/* H3 — Localizacao */}
        <h3 className="mt-10 font-display text-xl font-bold text-neutral-900 md:text-2xl">
          Localização: {bairro}, Curitiba
        </h3>
        <div className="mt-4 space-y-4 leading-relaxed text-neutral-700">
          <p>{bairroDesc}</p>
          <p>
            Para mais opções de imóveis no bairro, veja{" "}
            <Link
              href={`/imoveis/${bairroSlug}`}
              className="font-semibold text-brand-primary hover:underline"
            >
              todos os imóveis em {bairro}
            </Link>
            {tipos.includes("Apartamento") ? (
              <>
                {" "}
                ou especificamente{" "}
                <Link
                  href={`/imoveis/${bairroSlug}/apartamentos`}
                  className="font-semibold text-brand-primary hover:underline"
                >
                  apartamentos em {bairro}
                </Link>
              </>
            ) : null}
            . Para conhecer infraestrutura local, escolas, transporte e perfil
            familiar do bairro, consulte nosso guia em{" "}
            <Link
              href={`/morar-em-curitiba`}
              className="text-brand-primary hover:underline"
            >
              morar em Curitiba
            </Link>
            .
          </p>
        </div>

        {/* H3 — Tipos de unidades */}
        {tipos.length > 0 && (
          <>
            <h3 className="mt-10 font-display text-xl font-bold text-neutral-900 md:text-2xl">
              Tipos de unidades disponíveis no {emp.nome}
            </h3>
            <div className="mt-4 space-y-4 leading-relaxed text-neutral-700">
              <p>
                O empreendimento oferece{" "}
                {tipos.length === 1
                  ? `${tipoPlural}`
                  : `diferentes formatos: ${tipos.join(", ").toLowerCase()}`}
                {areaText ? ` com áreas ${areaText}` : ""}
                {precoText ? `, valores ${precoText}` : ""}. Cada unidade
                disponível na FYMOOB pode ser visitada com agendamento prévio
                pelo WhatsApp{" "}
                <a
                  href="https://wa.me/5541999780517"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="whatsapp_click"
                  data-source="emp_seo_units"
                  data-empreendimento={emp.nome}
                  data-bairro={bairro}
                  className="font-semibold text-brand-primary hover:underline"
                >
                  (41) 99978-0517
                </a>
                .
              </p>
              <p>
                Veja a lista completa de unidades disponíveis acima — clique em
                qualquer uma pra ver fotos, plantas, valor exato, condomínio,
                IPTU e detalhes específicos. Filtros por número de quartos,
                área e valor estão na busca da FYMOOB.
              </p>
            </div>
          </>
        )}

        {/* H3 — Construtora */}
        {construtora && construtoraDesc && (
          <>
            <h3 className="mt-10 font-display text-xl font-bold text-neutral-900 md:text-2xl">
              Construtora: {construtora}
            </h3>
            <div className="mt-4 space-y-4 leading-relaxed text-neutral-700">
              <p>{construtoraDesc}</p>
              <p>
                Antes de fechar a compra de qualquer imóvel da{" "}
                {construtora}, sempre verifique o registro de incorporação no
                cartório de registro de imóveis, certidões da empresa e
                histórico de entregas anteriores. A FYMOOB acompanha esse
                processo gratuitamente — solicite via WhatsApp.
              </p>
            </div>
          </>
        )}

        {/* H3 — Por que comprar com FYMOOB */}
        <h3 className="mt-10 font-display text-xl font-bold text-neutral-900 md:text-2xl">
          Por que comprar no {emp.nome} com a FYMOOB
        </h3>
        <div className="mt-4 space-y-4 leading-relaxed text-neutral-700">
          <p>
            A <strong>FYMOOB Imobiliária</strong> é registrada no CRECI/PR sob
            o número <strong>J 9420</strong>. Bruno César de Almeida
            (CRECI/PR 24.494) é o corretor responsável. Atendemos quem busca
            imóveis em Curitiba e região metropolitana — visita, documentação,
            orientação sobre financiamento, proposta, contrato e escritura.
          </p>
          <p>
            Atendimento pelo WhatsApp{" "}
            <a
              href={`https://wa.me/5541999780517?text=${encodeURIComponent(
                `Olá! Tenho interesse no empreendimento ${emp.nome} em ${bairro}. Gostaria de mais informações.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              data-track="whatsapp_click"
              data-source="emp_seo_fymoob"
              data-empreendimento={emp.nome}
              data-bairro={bairro}
              className="font-semibold text-brand-primary hover:underline"
            >
              (41) 99978-0517
            </a>
            , de segunda a sexta das 8h30 às 17h. Visitas agendadas com 24-48h
            de antecedência conforme disponibilidade.
          </p>
          <p>
            Para entender os passos completos de compra de imóvel em Curitiba,
            consulte nosso{" "}
            <Link
              href="/comprar-imovel-curitiba"
              className="font-semibold text-brand-primary hover:underline"
            >
              guia de compra
            </Link>
            {tipos.includes("Apartamento") ? (
              <>
                {" "}
                ou o pillar específico de{" "}
                <Link
                  href="/comprar-apartamento-curitiba"
                  className="font-semibold text-brand-primary hover:underline"
                >
                  comprar apartamento em Curitiba
                </Link>
              </>
            ) : null}
            .
          </p>
        </div>
      </div>
    </section>
  )
}
