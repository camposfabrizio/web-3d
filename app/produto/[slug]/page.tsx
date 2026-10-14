"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/components/StoreProvider";
import { SmartImage } from "@/components/SmartImage";
import { formatBRL, effectivePrice } from "@/lib/format";
import type { SelectedOption } from "@/lib/types";

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { products, categories, hydrated, addToCart } = useStore();

  const product = useMemo(
    () => products.find((p) => p.slug === params.slug && p.active),
    [products, params.slug],
  );

  const category = categories.find((c) => c.id === product?.categoryId);

  const [selected, setSelected] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [imgIndex, setImgIndex] = useState(0);
  const [added, setAdded] = useState(false);

  const base = product ? effectivePrice(product.price, product.promoPrice) : 0;

  const chosenOptions: SelectedOption[] = useMemo(() => {
    if (!product) return [];
    return product.variations.map((g) => {
      const optId = selected[g.id] ?? g.options[0]?.id;
      const opt = g.options.find((o) => o.id === optId) ?? g.options[0];
      return {
        groupId: g.id,
        groupName: g.name,
        optionId: opt?.id ?? "",
        label: opt?.label ?? "",
        priceDelta: opt?.priceDelta ?? 0,
      };
    });
  }, [product, selected]);

  const unitPrice =
    base + chosenOptions.reduce((s, o) => s + o.priceDelta, 0);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="h-96 animate-pulse rounded-2xl bg-chumbo/5" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-chumbo">Peça não encontrada</h1>
        <p className="mt-2 text-chumbo/60">
          Esse produto pode ter saído do catálogo.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-copper px-6 py-3 font-semibold text-ice hover:bg-copper-dark"
        >
          Voltar ao catálogo
        </Link>
      </div>
    );
  }

  const handleAdd = (goToCart: boolean) => {
    addToCart(product, chosenOptions, qty);
    if (goToCart) {
      router.push("/carrinho");
    } else {
      setAdded(true);
      window.setTimeout(() => setAdded(false), 2500);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="mb-6 text-sm text-chumbo/50">
        <Link href="/" className="hover:text-copper">
          Catálogo
        </Link>{" "}
        / <span className="text-chumbo/70">{product.name}</span>
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        {/* Galeria */}
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl border border-chumbo/10 bg-ice">
            <SmartImage
              src={product.images[imgIndex]}
              alt={product.name}
            />
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setImgIndex(i)}
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${
                    i === imgIndex ? "border-copper" : "border-transparent"
                  }`}
                >
                  <SmartImage src={img} alt={`${product.name} ${i + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {category && (
            <span className="text-sm font-semibold uppercase tracking-wide text-copper">
              {category.name}
            </span>
          )}
          <h1 className="mt-1 text-3xl font-bold text-chumbo">
            {product.name}
          </h1>

          <div className="mt-4 flex items-baseline gap-3">
            {product.promoPrice && product.promoPrice < product.price && (
              <span className="text-lg text-chumbo/40 line-through">
                {formatBRL(product.price)}
              </span>
            )}
            <span className="text-3xl font-bold text-chumbo">
              {formatBRL(unitPrice)}
            </span>
          </div>

          <p className="mt-5 whitespace-pre-line text-chumbo/70">
            {product.description}
          </p>

          {/* Variações */}
          {product.variations.map((g) => {
            const current = selected[g.id] ?? g.options[0]?.id;
            return (
              <div key={g.id} className="mt-6">
                <h3 className="mb-2 text-sm font-semibold text-chumbo">
                  {g.name}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {g.options.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() =>
                        setSelected((prev) => ({ ...prev, [g.id]: o.id }))
                      }
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                        current === o.id
                          ? "border-copper bg-copper text-ice"
                          : "border-chumbo/20 bg-white text-chumbo hover:border-copper"
                      }`}
                    >
                      {o.label}
                      {o.priceDelta > 0 && (
                        <span className="ml-1 opacity-80">
                          +{formatBRL(o.priceDelta)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Quantidade */}
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-chumbo">
              Quantidade
            </h3>
            <div className="inline-flex items-center rounded-full border border-chumbo/20 bg-white">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-4 py-2 text-lg font-bold text-chumbo hover:text-copper"
                aria-label="Diminuir"
              >
                −
              </button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="px-4 py-2 text-lg font-bold text-chumbo hover:text-copper"
                aria-label="Aumentar"
              >
                +
              </button>
            </div>
          </div>

          {/* Ações */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => handleAdd(false)}
              className="flex-1 rounded-full border-2 border-chumbo px-6 py-3 font-semibold text-chumbo transition-colors hover:bg-chumbo hover:text-ice"
            >
              {added ? "✓ Adicionado!" : "Adicionar ao carrinho"}
            </button>
            <button
              type="button"
              onClick={() => handleAdd(true)}
              className="flex-1 rounded-full bg-copper px-6 py-3 font-semibold text-ice transition-colors hover:bg-copper-dark"
            >
              Comprar agora
            </button>
          </div>

          <p className="mt-4 text-xs text-chumbo/50">
            A finalização do pedido é feita pelo WhatsApp, onde confirmamos
            personalização, prazo e forma de pagamento.
          </p>
        </div>
      </div>
    </div>
  );
}
