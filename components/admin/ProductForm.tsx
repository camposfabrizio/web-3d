"use client";

import { useState } from "react";
import type {
  Category,
  CostBreakdown,
  Product,
  VariationGroup,
} from "@/lib/types";
import { slugify, uid, formatBRL } from "@/lib/format";
import { emptyCostBreakdown } from "@/lib/pricing";
import { SmartImage } from "@/components/SmartImage";
import { PricingCalculator } from "./PricingCalculator";

function blankProduct(categoryId: string): Product {
  const ts = Date.now();
  return {
    id: uid("prod"),
    name: "",
    slug: "",
    categoryId,
    shortDescription: "",
    description: "",
    price: 0,
    promoPrice: null,
    unit: "un",
    images: [],
    variations: [],
    featured: false,
    active: true,
    costBreakdown: null,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function ProductForm({
  product,
  categories,
  onSave,
  onCancel,
}: {
  product: Product | null;
  categories: Category[];
  onSave: (product: Product) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Product>(
    product ?? blankProduct(categories[0]?.id ?? ""),
  );
  const [imageUrl, setImageUrl] = useState("");
  const [showPricing, setShowPricing] = useState(Boolean(product?.costBreakdown));

  function set<K extends keyof Product>(key: K, value: Product[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleName(name: string) {
    setDraft((d) => ({
      ...d,
      name,
      // Mantém o slug sincronizado enquanto não for editado manualmente.
      slug: d.slug && d.slug !== slugify(d.name) ? d.slug : slugify(name),
    }));
  }

  function addImageUrl() {
    const url = imageUrl.trim();
    if (!url) return;
    set("images", [...draft.images, url]);
    setImageUrl("");
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        set("images", [...draft.images, reader.result]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function removeImage(i: number) {
    set(
      "images",
      draft.images.filter((_, idx) => idx !== i),
    );
  }

  // ----- Variações -----
  function addGroup() {
    const g: VariationGroup = {
      id: uid("v"),
      name: "Nova variação",
      options: [{ id: uid("o"), label: "Opção 1", priceDelta: 0 }],
    };
    set("variations", [...draft.variations, g]);
  }
  function updateGroup(gid: string, patch: Partial<VariationGroup>) {
    set(
      "variations",
      draft.variations.map((g) => (g.id === gid ? { ...g, ...patch } : g)),
    );
  }
  function removeGroup(gid: string) {
    set(
      "variations",
      draft.variations.filter((g) => g.id !== gid),
    );
  }
  function addOption(gid: string) {
    set(
      "variations",
      draft.variations.map((g) =>
        g.id === gid
          ? {
              ...g,
              options: [
                ...g.options,
                { id: uid("o"), label: "Nova opção", priceDelta: 0 },
              ],
            }
          : g,
      ),
    );
  }
  function updateOption(
    gid: string,
    oid: string,
    patch: Partial<{ label: string; priceDelta: number }>,
  ) {
    set(
      "variations",
      draft.variations.map((g) =>
        g.id === gid
          ? {
              ...g,
              options: g.options.map((o) =>
                o.id === oid ? { ...o, ...patch } : o,
              ),
            }
          : g,
      ),
    );
  }
  function removeOption(gid: string, oid: string) {
    set(
      "variations",
      draft.variations.map((g) =>
        g.id === gid
          ? { ...g, options: g.options.filter((o) => o.id !== oid) }
          : g,
      ),
    );
  }

  function setCost(cost: CostBreakdown) {
    set("costBreakdown", cost);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const finalName = draft.name.trim() || "Peça sem nome";
    onSave({
      ...draft,
      name: finalName,
      slug: (draft.slug || slugify(finalName)).trim(),
      price: Number(draft.price) || 0,
      promoPrice:
        draft.promoPrice && Number(draft.promoPrice) > 0
          ? Number(draft.promoPrice)
          : null,
    });
  }

  const inputCls =
    "w-full rounded-lg border border-chumbo/15 bg-white px-3 py-2 text-sm outline-none focus:border-copper focus:ring-2 focus:ring-copper/20";

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Básico */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-chumbo">
            Nome da peça
          </span>
          <input
            className={inputCls}
            value={draft.name}
            onChange={(e) => handleName(e.target.value)}
            required
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium text-chumbo">
            Categoria
          </span>
          <select
            className={inputCls}
            value={draft.categoryId}
            onChange={(e) => set("categoryId", e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium text-chumbo">
            Link (slug)
          </span>
          <input
            className={inputCls}
            value={draft.slug}
            onChange={(e) => set("slug", slugify(e.target.value))}
          />
        </label>

        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-chumbo">
            Descrição curta (aparece nos cards)
          </span>
          <input
            className={inputCls}
            value={draft.shortDescription}
            onChange={(e) => set("shortDescription", e.target.value)}
          />
        </label>

        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-chumbo">
            Descrição completa
          </span>
          <textarea
            className={inputCls}
            rows={4}
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </label>
      </div>

      {/* Preço */}
      <div className="grid gap-4 sm:grid-cols-3">
        <label>
          <span className="mb-1 block text-sm font-medium text-chumbo">
            Preço (R$)
          </span>
          <input
            type="number"
            min={0}
            step={0.01}
            className={inputCls}
            value={draft.price}
            onChange={(e) => set("price", Number(e.target.value))}
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-chumbo">
            Preço promocional (opcional)
          </span>
          <input
            type="number"
            min={0}
            step={0.01}
            className={inputCls}
            value={draft.promoPrice ?? ""}
            onChange={(e) =>
              set(
                "promoPrice",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-chumbo">
            Unidade
          </span>
          <input
            className={inputCls}
            value={draft.unit}
            onChange={(e) => set("unit", e.target.value)}
          />
        </label>
      </div>

      {/* Calculadora de precificação */}
      <div>
        <button
          type="button"
          onClick={() => {
            setShowPricing((v) => !v);
            if (!draft.costBreakdown) set("costBreakdown", emptyCostBreakdown);
          }}
          className="text-sm font-semibold text-copper hover:underline"
        >
          {showPricing ? "▾" : "▸"} Calculadora de precificação
        </button>
        {showPricing && (
          <div className="mt-3">
            <PricingCalculator
              value={draft.costBreakdown ?? emptyCostBreakdown}
              onChange={setCost}
              onApply={(price) => set("price", price)}
            />
          </div>
        )}
      </div>

      {/* Imagens */}
      <div>
        <h4 className="mb-2 text-sm font-medium text-chumbo">Imagens</h4>
        <div className="flex flex-wrap gap-3">
          {draft.images.map((img, i) => (
            <div
              key={i}
              className="relative h-20 w-20 overflow-hidden rounded-lg border border-chumbo/15"
            >
              <SmartImage src={img} alt={`Imagem ${i + 1}`} />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center bg-graphite text-xs text-ice"
                aria-label="Remover imagem"
              >
                ×
              </button>
            </div>
          ))}
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-chumbo/30 text-xs text-chumbo/50 hover:border-copper">
            + Enviar
            <input
              type="file"
              accept="image/*"
              onChange={onFile}
              className="hidden"
            />
          </label>
        </div>
        <div className="mt-2 flex gap-2">
          <input
            className={inputCls}
            placeholder="ou cole a URL de uma imagem"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <button
            type="button"
            onClick={addImageUrl}
            className="shrink-0 rounded-lg border border-chumbo/20 px-4 text-sm font-semibold text-chumbo hover:border-copper"
          >
            Adicionar
          </button>
        </div>
      </div>

      {/* Variações */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-medium text-chumbo">
            Variações (tamanho, cor, etc.)
          </h4>
          <button
            type="button"
            onClick={addGroup}
            className="text-sm font-semibold text-copper hover:underline"
          >
            + Variação
          </button>
        </div>

        <div className="space-y-3">
          {draft.variations.map((g) => (
            <div
              key={g.id}
              className="rounded-xl border border-chumbo/15 bg-ice/50 p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <input
                  className={inputCls}
                  value={g.name}
                  onChange={(e) => updateGroup(g.id, { name: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removeGroup(g.id)}
                  className="shrink-0 text-sm text-chumbo/40 hover:text-copper"
                >
                  Remover
                </button>
              </div>
              <div className="space-y-2">
                {g.options.map((o) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <input
                      className={inputCls}
                      value={o.label}
                      onChange={(e) =>
                        updateOption(g.id, o.id, { label: e.target.value })
                      }
                      placeholder="Opção"
                    />
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="text-xs text-chumbo/50">+R$</span>
                      <input
                        type="number"
                        step={0.5}
                        className="w-20 rounded-lg border border-chumbo/15 bg-white px-2 py-2 text-sm outline-none focus:border-copper"
                        value={o.priceDelta}
                        onChange={(e) =>
                          updateOption(g.id, o.id, {
                            priceDelta: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOption(g.id, o.id)}
                      className="shrink-0 text-chumbo/40 hover:text-copper"
                      aria-label="Remover opção"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addOption(g.id)}
                  className="text-xs font-semibold text-copper hover:underline"
                >
                  + Opção
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Flags */}
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-chumbo">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => set("active", e.target.checked)}
            className="h-4 w-4 accent-[var(--color-copper)]"
          />
          Ativo (visível no catálogo)
        </label>
        <label className="flex items-center gap-2 text-sm text-chumbo">
          <input
            type="checkbox"
            checked={draft.featured}
            onChange={(e) => set("featured", e.target.checked)}
            className="h-4 w-4 accent-[var(--color-copper)]"
          />
          Destaque
        </label>
      </div>

      {/* Ações */}
      <div className="flex items-center justify-end gap-3 border-t border-chumbo/10 pt-4">
        <span className="mr-auto text-sm text-chumbo/50">
          Preço final: {formatBRL(Number(draft.price) || 0)}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-chumbo/20 px-5 py-2 text-sm font-semibold text-chumbo hover:border-copper"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="rounded-full bg-copper px-6 py-2 text-sm font-semibold text-ice hover:bg-copper-dark"
        >
          Salvar peça
        </button>
      </div>
    </form>
  );
}
