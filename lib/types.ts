// Modelo de dados do catálogo digital da Art Space 3D.

export type Category = {
  id: string;
  name: string;
  slug: string;
  /** Emoji/ícone curto opcional para a vitrine. */
  emoji?: string;
};

export type VariationOption = {
  id: string;
  label: string;
  /** Valor somado (ou subtraído) ao preço base quando selecionada. */
  priceDelta: number;
};

export type VariationGroup = {
  id: string;
  /** Ex.: "Tamanho", "Cor do filamento". */
  name: string;
  options: VariationOption[];
};

/** Memória de cálculo da precificação de uma peça impressa em 3D. */
export type CostBreakdown = {
  /** Gramas de filamento usadas na peça. */
  filamentGrams: number;
  /** Preço do filamento por quilo (R$/kg). */
  filamentPricePerKg: number;
  /** Horas de impressão. */
  printHours: number;
  /** Custo de máquina por hora (energia + depreciação). */
  machineCostPerHour: number;
  /** Horas de trabalho manual (modelagem, acabamento, montagem). */
  laborHours: number;
  /** Valor da hora de trabalho (R$/h). */
  laborCostPerHour: number;
  /** Custos extras: embalagem, insumos, frete de material, etc. */
  extraCost: number;
  /** Margem de lucro desejada em %. */
  marginPct: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  /** Preço de venda em reais. */
  price: number;
  /** Preço promocional opcional (menor que o preço). */
  promoPrice?: number | null;
  /** Unidade exibida: "un", "par", "kit"... */
  unit: string;
  /** URLs ou data URLs das imagens. A primeira é a capa. */
  images: string[];
  variations: VariationGroup[];
  featured: boolean;
  active: boolean;
  /** Memória de cálculo (interna, só aparece no admin). */
  costBreakdown?: CostBreakdown | null;
  createdAt: number;
  updatedAt: number;
};

export type StoreSettings = {
  storeName: string;
  tagline: string;
  /** Telefone com DDI + DDD, só dígitos. Ex.: 5547999999999. */
  whatsapp: string;
  instagram: string;
  city: string;
  /** Texto exibido na opção "Retirar". */
  pickupInfo: string;
  /** Texto exibido na opção "Receber / Entrega". */
  deliveryInfo: string;
  /** Chave Pix opcional, mostrada no resumo do pedido. */
  pixKey: string;
  /** PIN simples para abrir o painel admin (proteção leve, lado do cliente). */
  adminPin: string;
};

export type SelectedOption = {
  groupId: string;
  groupName: string;
  optionId: string;
  label: string;
  priceDelta: number;
};

export type CartItem = {
  /** Chave única: produto + combinação de opções. */
  key: string;
  productId: string;
  name: string;
  image?: string;
  unit: string;
  unitPrice: number;
  qty: number;
  selectedOptions: SelectedOption[];
};

export type DeliveryMethod = "retirar" | "entrega";

export type CheckoutInfo = {
  customerName: string;
  deliveryMethod: DeliveryMethod;
  address: string;
  notes: string;
};
