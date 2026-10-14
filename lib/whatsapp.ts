import type { CartItem, CheckoutInfo, StoreSettings } from "./types";
import { formatBRL, onlyDigits } from "./format";

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
}

/** Monta o texto do pedido que será enviado no WhatsApp. */
export function buildOrderMessage(
  items: CartItem[],
  info: CheckoutInfo,
  settings: StoreSettings,
): string {
  const lines: string[] = [];
  lines.push(`*Novo pedido — ${settings.storeName}*`);
  lines.push("");

  if (info.customerName.trim()) {
    lines.push(`*Cliente:* ${info.customerName.trim()}`);
  }

  lines.push("");
  lines.push("*Itens:*");
  items.forEach((item, index) => {
    const opts = item.selectedOptions
      .map((o) => `${o.groupName}: ${o.label}`)
      .join(" • ");
    const subtotal = item.unitPrice * item.qty;
    lines.push(
      `${index + 1}. ${item.name}${opts ? ` (${opts})` : ""}`,
    );
    lines.push(
      `   ${item.qty} × ${formatBRL(item.unitPrice)} = ${formatBRL(subtotal)}`,
    );
  });

  lines.push("");
  lines.push(`*Total: ${formatBRL(cartTotal(items))}*`);

  lines.push("");
  if (info.deliveryMethod === "entrega") {
    lines.push("*Entrega:* Receber no endereço");
    if (info.address.trim()) {
      lines.push(`*Endereço:* ${info.address.trim()}`);
    }
  } else {
    lines.push("*Entrega:* Retirar");
  }

  if (info.notes.trim()) {
    lines.push("");
    lines.push(`*Observações:* ${info.notes.trim()}`);
  }

  if (settings.pixKey.trim()) {
    lines.push("");
    lines.push(`_Chave Pix: ${settings.pixKey.trim()}_`);
  }

  return lines.join("\n");
}

/** Gera o link wa.me com a mensagem já codificada. */
export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = onlyDigits(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
