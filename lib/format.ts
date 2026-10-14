// Utilidades de formatação e identificadores.

/** Formata um valor numérico (em reais) como moeda BRL. */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(value) ? value : 0);
}

/** Gera um slug URL-safe a partir de um texto. */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Identificador curto e único o suficiente para uso local. */
export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

/** Mantém apenas dígitos (útil para telefone de WhatsApp). */
export function onlyDigits(value: string): string {
  return (value || "").replace(/\D+/g, "");
}

/** Preço efetivo de um produto (promocional, se houver e for menor). */
export function effectivePrice(price: number, promoPrice?: number | null): number {
  if (typeof promoPrice === "number" && promoPrice > 0 && promoPrice < price) {
    return promoPrice;
  }
  return price;
}
