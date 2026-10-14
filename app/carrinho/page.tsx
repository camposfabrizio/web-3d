"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/components/StoreProvider";
import { SmartImage } from "@/components/SmartImage";
import { formatBRL } from "@/lib/format";
import { buildOrderMessage, buildWhatsAppLink, cartTotal } from "@/lib/whatsapp";
import type { CheckoutInfo, DeliveryMethod } from "@/lib/types";

export default function CartPage() {
  const { cart, settings, hydrated, setQty, removeFromCart, clearCart } =
    useStore();

  const [info, setInfo] = useState<CheckoutInfo>({
    customerName: "",
    deliveryMethod: "retirar",
    address: "",
    notes: "",
  });

  const total = cartTotal(cart);
  const whatsappReady = Boolean(settings.whatsapp);

  function finish() {
    const message = buildOrderMessage(cart, info, settings);
    const link = buildWhatsAppLink(settings.whatsapp, message);
    window.open(link, "_blank", "noopener,noreferrer");
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="h-72 animate-pulse rounded-2xl bg-chumbo/5" />
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-chumbo">
          Seu carrinho está vazio
        </h1>
        <p className="mt-2 text-chumbo/60">
          Explore o catálogo e adicione suas peças favoritas.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-copper px-6 py-3 font-semibold text-ice hover:bg-copper-dark"
        >
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold text-chumbo">Seu pedido</h1>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* Itens */}
        <div className="space-y-4">
          {cart.map((item) => (
            <div
              key={item.key}
              className="flex gap-4 rounded-2xl border border-chumbo/10 bg-white p-4"
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-ice">
                <SmartImage src={item.image} alt={item.name} />
              </div>

              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-chumbo">{item.name}</h3>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.key)}
                    className="text-sm text-chumbo/40 hover:text-copper"
                    aria-label="Remover item"
                  >
                    Remover
                  </button>
                </div>

                {item.selectedOptions.length > 0 && (
                  <p className="text-xs text-chumbo/50">
                    {item.selectedOptions
                      .map((o) => `${o.groupName}: ${o.label}`)
                      .join(" • ")}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="inline-flex items-center rounded-full border border-chumbo/20">
                    <button
                      type="button"
                      onClick={() => setQty(item.key, item.qty - 1)}
                      className="px-3 py-1 font-bold text-chumbo hover:text-copper"
                      aria-label="Diminuir"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty(item.key, item.qty + 1)}
                      className="px-3 py-1 font-bold text-chumbo hover:text-copper"
                      aria-label="Aumentar"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-bold text-chumbo">
                    {formatBRL(item.unitPrice * item.qty)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={clearCart}
            className="text-sm text-chumbo/50 hover:text-copper"
          >
            Esvaziar carrinho
          </button>
        </div>

        {/* Checkout */}
        <div className="h-fit rounded-2xl border border-chumbo/10 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-chumbo">Finalização</h2>

          <label className="mb-3 block">
            <span className="mb-1 block text-sm font-medium text-chumbo">
              Seu nome
            </span>
            <input
              type="text"
              value={info.customerName}
              onChange={(e) =>
                setInfo({ ...info, customerName: e.target.value })
              }
              placeholder="Como podemos te chamar?"
              className="w-full rounded-lg border border-chumbo/15 px-3 py-2 text-sm outline-none focus:border-copper focus:ring-2 focus:ring-copper/30"
            />
          </label>

          <div className="mb-3">
            <span className="mb-1 block text-sm font-medium text-chumbo">
              Entrega
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(["retirar", "entrega"] as DeliveryMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setInfo({ ...info, deliveryMethod: m })}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold capitalize transition-colors ${
                    info.deliveryMethod === m
                      ? "border-copper bg-copper text-ice"
                      : "border-chumbo/20 text-chumbo hover:border-copper"
                  }`}
                >
                  {m === "retirar" ? "Retirar" : "Receber"}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-chumbo/50">
              {info.deliveryMethod === "retirar"
                ? settings.pickupInfo
                : settings.deliveryInfo}
            </p>
          </div>

          {info.deliveryMethod === "entrega" && (
            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium text-chumbo">
                Endereço
              </span>
              <textarea
                value={info.address}
                onChange={(e) => setInfo({ ...info, address: e.target.value })}
                rows={2}
                placeholder="Rua, número, bairro, cidade"
                className="w-full rounded-lg border border-chumbo/15 px-3 py-2 text-sm outline-none focus:border-copper focus:ring-2 focus:ring-copper/30"
              />
            </label>
          )}

          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium text-chumbo">
              Observações
            </span>
            <textarea
              value={info.notes}
              onChange={(e) => setInfo({ ...info, notes: e.target.value })}
              rows={2}
              placeholder="Personalização, cores, prazo desejado..."
              className="w-full rounded-lg border border-chumbo/15 px-3 py-2 text-sm outline-none focus:border-copper focus:ring-2 focus:ring-copper/30"
            />
          </label>

          <div className="mb-4 flex items-center justify-between border-t border-chumbo/10 pt-4">
            <span className="font-semibold text-chumbo">Total</span>
            <span className="text-2xl font-bold text-chumbo">
              {formatBRL(total)}
            </span>
          </div>

          {whatsappReady ? (
            <button
              type="button"
              onClick={finish}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-copper px-6 py-3 font-semibold text-ice transition-colors hover:bg-copper-dark"
            >
              <WhatsAppIcon />
              Finalizar no WhatsApp
            </button>
          ) : (
            <div className="rounded-lg border border-copper/40 bg-copper/10 p-3 text-sm text-chumbo">
              O número de WhatsApp ainda não foi configurado. Defina em{" "}
              <Link href="/admin" className="font-semibold text-copper underline">
                Admin → Configurações
              </Link>
              .
            </div>
          )}

          <p className="mt-3 text-center text-xs text-chumbo/50">
            Você será levado ao WhatsApp com o resumo do pedido pronto.
          </p>
        </div>
      </div>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15c-1.48 0-2.93-.4-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 4.54 0 8.23 3.7 8.23 8.24s-3.69 8.42-8.24 8.42zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.42-.14 0-.31-.02-.47-.02-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.29z" />
    </svg>
  );
}
