"use client";

import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatBRL } from "@/lib/format";
import { SmartImage } from "./SmartImage";

export function ProductCard({
  product,
  categoryName,
}: {
  product: Product;
  categoryName?: string;
}) {
  const hasPromo =
    typeof product.promoPrice === "number" &&
    product.promoPrice > 0 &&
    product.promoPrice < product.price;

  return (
    <Link
      href={`/produto/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-chumbo/10 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-ice">
        <SmartImage
          src={product.images[0]}
          alt={product.name}
          className="transition-transform duration-300 group-hover:scale-105"
        />
        {hasPromo && (
          <span className="absolute left-3 top-3 rounded-full bg-copper px-2.5 py-1 text-xs font-bold text-ice">
            Promo
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {categoryName && (
          <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-copper">
            {categoryName}
          </span>
        )}
        <h3 className="font-semibold leading-tight text-chumbo">
          {product.name}
        </h3>
        <p className="mt-1 line-clamp-2 flex-1 text-sm text-chumbo/60">
          {product.shortDescription}
        </p>

        <div className="mt-3 flex items-baseline gap-2">
          {hasPromo && (
            <span className="text-sm text-chumbo/40 line-through">
              {formatBRL(product.price)}
            </span>
          )}
          <span className="text-lg font-bold text-chumbo">
            {formatBRL(hasPromo ? product.promoPrice! : product.price)}
          </span>
        </div>
      </div>
    </Link>
  );
}
