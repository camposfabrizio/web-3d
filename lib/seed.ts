import type { Category, Product, StoreSettings } from "./types";

export const defaultSettings: StoreSettings = {
  storeName: "Art Space 3D",
  tagline: "Ideias ganham forma em 3D.",
  // Configure no painel admin: DDI + DDD + número, só dígitos. Ex.: 5547999999999
  whatsapp: "",
  instagram: "@artspace3d",
  city: "Navegantes · SC",
  pickupInfo: "Combine a retirada no ateliê em Navegantes/SC pelo WhatsApp.",
  deliveryInfo: "Enviamos para todo o Brasil e entregamos na região.",
  pixKey: "",
  adminPin: "art3d",
};

export const seedCategories: Category[] = [
  { id: "cat_presentes", name: "Presentes & Souvenirs", slug: "presentes", emoji: "🎁" },
  { id: "cat_decoracao", name: "Decoração & Interiores", slug: "decoracao", emoji: "🏛️" },
  { id: "cat_luminarias", name: "Luminárias", slug: "luminarias", emoji: "💡" },
  { id: "cat_personalizados", name: "Personalizados", slug: "personalizados", emoji: "✨" },
];

const now = Date.parse("2026-01-01T00:00:00Z");

function p(product: Omit<Product, "createdAt" | "updatedAt">): Product {
  return { ...product, createdAt: now, updatedAt: now };
}

export const seedProducts: Product[] = [
  p({
    id: "prod_luminaria_lua",
    name: "Luminária Lua 3D",
    slug: "luminaria-lua-3d",
    categoryId: "cat_luminarias",
    shortDescription: "A lua na sua estante, com textura real das crateras.",
    description:
      "Luminária em formato de lua com a textura real da superfície lunar, impressa camada a camada. Luz quente e difusa, perfeita para criar um ambiente aconchegante. Acompanha base em madeira e cabo USB.",
    price: 129.9,
    promoPrice: 109.9,
    unit: "un",
    images: [],
    variations: [
      {
        id: "v_tamanho",
        name: "Tamanho",
        options: [
          { id: "o_12", label: "12 cm", priceDelta: 0 },
          { id: "o_15", label: "15 cm", priceDelta: 30 },
          { id: "o_20", label: "20 cm", priceDelta: 70 },
        ],
      },
    ],
    featured: true,
    active: true,
    costBreakdown: {
      filamentGrams: 180,
      filamentPricePerKg: 130,
      printHours: 11,
      machineCostPerHour: 3,
      laborHours: 0.8,
      laborCostPerHour: 40,
      extraCost: 22,
      marginPct: 90,
    },
  }),
  p({
    id: "prod_vaso_geometrico",
    name: "Vaso Geométrico Facetado",
    slug: "vaso-geometrico-facetado",
    categoryId: "cat_decoracao",
    shortDescription: "Geometria precisa, projetada para integrar-se ao seu ambiente.",
    description:
      "Vaso decorativo com facetas geométricas minimalistas. Design limpo e exclusivo que valoriza qualquer canto da casa. Pode ser usado com plantas artificiais ou como objeto de decoração. Cápsula interna impermeável opcional para plantas naturais.",
    price: 89.9,
    promoPrice: null,
    unit: "un",
    images: [],
    variations: [
      {
        id: "v_cor",
        name: "Cor do filamento",
        options: [
          { id: "o_cobre", label: "Laranja Cobre", priceDelta: 0 },
          { id: "o_chumbo", label: "Cinza Chumbo", priceDelta: 0 },
          { id: "o_gelo", label: "Gelo", priceDelta: 0 },
        ],
      },
      {
        id: "v_capsula",
        name: "Cápsula impermeável",
        options: [
          { id: "o_sem", label: "Sem cápsula", priceDelta: 0 },
          { id: "o_com", label: "Com cápsula", priceDelta: 15 },
        ],
      },
    ],
    featured: true,
    active: true,
    costBreakdown: null,
  }),
  p({
    id: "prod_topo_bolo",
    name: "Topo de Bolo Personalizado",
    slug: "topo-de-bolo-personalizado",
    categoryId: "cat_presentes",
    shortDescription: "Eternize este momento no topo da comemoração.",
    description:
      "Topo de bolo sob medida com o nome, a idade ou a frase da sua festa. Ideal para aniversários, bodas e chás. Envie o texto e o tema no WhatsApp após o pedido — criamos o modelo e confirmamos a prévia antes de imprimir.",
    price: 49.9,
    promoPrice: null,
    unit: "un",
    images: [],
    variations: [
      {
        id: "v_cor",
        name: "Cor",
        options: [
          { id: "o_cobre", label: "Laranja Cobre", priceDelta: 0 },
          { id: "o_dourado", label: "Dourado", priceDelta: 8 },
          { id: "o_branco", label: "Branco", priceDelta: 0 },
        ],
      },
    ],
    featured: false,
    active: true,
    costBreakdown: null,
  }),
  p({
    id: "prod_chaveiro",
    name: "Chaveiro Personalizado",
    slug: "chaveiro-personalizado",
    categoryId: "cat_personalizados",
    shortDescription: "Seu nome, sua marca ou um mapa afetivo em miniatura.",
    description:
      "Chaveiro feito sob medida: nome, logotipo, placa de carro ou um símbolo especial. Ótimo como lembrancinha de evento e brinde corporativo. Peça com desconto progressivo para grandes quantidades — fale com a gente.",
    price: 19.9,
    promoPrice: null,
    unit: "un",
    images: [],
    variations: [
      {
        id: "v_cor",
        name: "Cor",
        options: [
          { id: "o_cobre", label: "Laranja Cobre", priceDelta: 0 },
          { id: "o_chumbo", label: "Cinza Chumbo", priceDelta: 0 },
          { id: "o_mix", label: "Duas cores", priceDelta: 5 },
        ],
      },
    ],
    featured: false,
    active: true,
    costBreakdown: null,
  }),
  p({
    id: "prod_litofania",
    name: "Porta-retrato Litofania",
    slug: "porta-retrato-litofania",
    categoryId: "cat_presentes",
    shortDescription: "Uma foto que ganha vida quando a luz atravessa.",
    description:
      "A litofania transforma a sua foto favorita em relevo: parece uma peça comum, mas ao acender a luz por trás a imagem aparece em detalhes. Um presente afetivo e surpreendente. Envie a foto após a compra.",
    price: 79.9,
    promoPrice: null,
    unit: "un",
    images: [],
    variations: [
      {
        id: "v_formato",
        name: "Formato",
        options: [
          { id: "o_quadro", label: "Quadro com base", priceDelta: 0 },
          { id: "o_luminaria", label: "Luminária de mesa", priceDelta: 35 },
        ],
      },
    ],
    featured: true,
    active: true,
    costBreakdown: null,
  }),
  p({
    id: "prod_suporte_headset",
    name: "Suporte de Headset",
    slug: "suporte-de-headset",
    categoryId: "cat_decoracao",
    shortDescription: "Organização com estética geométrica para a sua setup.",
    description:
      "Suporte de mesa para fones e headsets com design geométrico sóbrio. Base estável e antiderrapante. Integra-se à decoração do home office ou do setup gamer.",
    price: 69.9,
    promoPrice: null,
    unit: "un",
    images: [],
    variations: [],
    featured: false,
    active: true,
    costBreakdown: null,
  }),
  p({
    id: "prod_trofeu_evento",
    name: "Troféu / Medalha de Evento",
    slug: "trofeu-medalha-evento",
    categoryId: "cat_personalizados",
    shortDescription: "Premiações exclusivas para o seu evento esportivo.",
    description:
      "Troféus e medalhas personalizados para corridas, campeonatos e confraternizações. Produção sob demanda com o logo do evento e os patrocinadores. Orçamento por lote — envie os detalhes no WhatsApp.",
    price: 59.9,
    promoPrice: null,
    unit: "un",
    images: [],
    variations: [
      {
        id: "v_tipo",
        name: "Tipo",
        options: [
          { id: "o_medalha", label: "Medalha", priceDelta: 0 },
          { id: "o_trofeu", label: "Troféu de mesa", priceDelta: 40 },
        ],
      },
    ],
    featured: false,
    active: true,
    costBreakdown: null,
  }),
  p({
    id: "prod_abajur_facetado",
    name: "Abajur Facetado",
    slug: "abajur-facetado",
    categoryId: "cat_luminarias",
    shortDescription: "Luz e sombra desenhadas pela geometria.",
    description:
      "Abajur de mesa com cúpula facetada que projeta padrões de luz e sombra no ambiente. Peça de assinatura para quem busca sofisticação e exclusividade. Soquete e cabo inclusos.",
    price: 159.9,
    promoPrice: 139.9,
    unit: "un",
    images: [],
    variations: [
      {
        id: "v_cor",
        name: "Cor da cúpula",
        options: [
          { id: "o_gelo", label: "Gelo", priceDelta: 0 },
          { id: "o_cobre", label: "Laranja Cobre", priceDelta: 0 },
        ],
      },
    ],
    featured: false,
    active: true,
    costBreakdown: null,
  }),
];
