"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/components/StoreProvider";
import { ProductCard } from "@/components/ProductCard";
import { CubeMark } from "@/components/SmartImage";

export default function CatalogPage() {
  const { products, categories, hydrated } = useStore();
  const [activeCat, setActiveCat] = useState<string>("all");
  const [query, setQuery] = useState("");

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: string) => map.get(id);
  }, [categories]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => p.active)
      .filter((p) => (activeCat === "all" ? true : p.categoryId === activeCat))
      .filter((p) =>
        q
          ? p.name.toLowerCase().includes(q) ||
            p.shortDescription.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
          : true,
      );
  }, [products, activeCat, query]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-graphite text-ice">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 md:grid-cols-[1.4fr_1fr] md:py-24">
          <div>
            <p className="mb-4 inline-block rounded-full border border-copper/40 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-copper">
              Estúdio de design e fabricação digital
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              Ideias ganham forma{" "}
              <span className="text-copper">em 3D.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-ice/70">
              Não apenas imprimimos objetos. Materializamos ideias. Presentes,
              souvenirs, decoração e luminárias feitos sob demanda — com
              precisão de engenharia e calor humano.
            </p>
            <a
              href="#catalogo"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-copper px-6 py-3 font-semibold text-ice transition-colors hover:bg-copper-dark"
            >
              Ver o catálogo
            </a>
          </div>

          <div className="hidden justify-center md:flex">
            <div className="flex h-56 w-56 items-center justify-center rounded-3xl border border-copper/30 bg-copper/10">
              <CubeMark className="h-28 w-28" />
            </div>
          </div>
        </div>
      </section>

      {/* Catálogo */}
      <section id="catalogo" className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8 flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-chumbo">Catálogo</h2>
              <p className="text-sm text-chumbo/60">
                Escolha a peça, personalize e finalize pelo WhatsApp.
              </p>
            </div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar peça..."
              className="w-full max-w-xs rounded-full border border-chumbo/15 bg-white px-4 py-2 text-sm outline-none focus:border-copper focus:ring-2 focus:ring-copper/30"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <CatPill
              active={activeCat === "all"}
              onClick={() => setActiveCat("all")}
              label="Todos"
            />
            {categories.map((c) => (
              <CatPill
                key={c.id}
                active={activeCat === c.id}
                onClick={() => setActiveCat(c.id)}
                label={`${c.emoji ? c.emoji + " " : ""}${c.name}`}
              />
            ))}
          </div>
        </div>

        {!hydrated ? (
          <GridSkeleton />
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-chumbo/20 p-12 text-center text-chumbo/60">
            Nenhuma peça encontrada para esse filtro.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                categoryName={categoryName(p.categoryId)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CatPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? "bg-copper text-ice"
          : "border border-chumbo/15 bg-white text-chumbo hover:border-copper"
      }`}
    >
      {label}
    </button>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[3/4] animate-pulse rounded-2xl bg-chumbo/5"
        />
      ))}
    </div>
  );
}
