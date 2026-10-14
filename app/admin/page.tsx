"use client";

import { useRef, useState } from "react";
import { useStore } from "@/components/StoreProvider";
import { ProductForm } from "@/components/admin/ProductForm";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { SmartImage } from "@/components/SmartImage";
import { formatBRL, slugify, uid } from "@/lib/format";
import type { Category, Product } from "@/lib/types";

type Tab = "produtos" | "categorias" | "config" | "dados";

const UNLOCK_KEY = "as3d.admin.unlocked";

export default function AdminPage() {
  const store = useStore();
  const { hydrated, settings } = store;

  // Inicialização lazy: o conteúdo só aparece após `hydrated`, então ler o
  // sessionStorage aqui não causa divergência de hidratação.
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(UNLOCK_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [tab, setTab] = useState<Tab>("produtos");

  function tryUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (pin === settings.adminPin) {
      setUnlocked(true);
      setPinError(false);
      try {
        sessionStorage.setItem(UNLOCK_KEY, "1");
      } catch {
        /* ignore */
      }
    } else {
      setPinError(true);
    }
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <div className="h-40 animate-pulse rounded-2xl bg-chumbo/5" />
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24">
        <h1 className="mb-2 text-center text-2xl font-bold text-chumbo">
          Área administrativa
        </h1>
        <p className="mb-6 text-center text-sm text-chumbo/60">
          Digite o PIN para gerenciar o catálogo.
        </p>
        <form onSubmit={tryUnlock} className="space-y-3">
          <input
            type="password"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setPinError(false);
            }}
            placeholder="PIN"
            autoFocus
            className="w-full rounded-lg border border-chumbo/15 bg-white px-4 py-3 text-center text-lg outline-none focus:border-copper focus:ring-2 focus:ring-copper/30"
          />
          {pinError && (
            <p className="text-center text-sm text-copper">PIN incorreto.</p>
          )}
          <button
            type="submit"
            className="w-full rounded-full bg-copper px-6 py-3 font-semibold text-ice hover:bg-copper-dark"
          >
            Entrar
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-chumbo/40">
          PIN padrão: <code>art3d</code> (altere nas configurações).
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-chumbo">Painel</h1>
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.removeItem(UNLOCK_KEY);
            } catch {
              /* ignore */
            }
            setUnlocked(false);
          }}
          className="text-sm font-semibold text-chumbo/50 hover:text-copper"
        >
          Sair
        </button>
      </div>

      <div className="mb-8 flex flex-wrap gap-2 border-b border-chumbo/10">
        {(
          [
            ["produtos", "Produtos"],
            ["categorias", "Categorias"],
            ["config", "Configurações"],
            ["dados", "Backup"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              tab === key
                ? "border-copper text-copper"
                : "border-transparent text-chumbo/60 hover:text-chumbo"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "produtos" && <ProductsTab />}
      {tab === "categorias" && <CategoriesTab />}
      {tab === "config" && (
        <SettingsForm settings={settings} onSave={store.saveSettings} />
      )}
      {tab === "dados" && <DataTab />}
    </div>
  );
}

/* ---------------- Produtos ---------------- */

function ProductsTab() {
  const { products, categories, upsertProduct, deleteProduct } = useStore();
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  const catName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "—";

  if (creating || editing) {
    return (
      <div className="rounded-2xl border border-chumbo/10 bg-white p-6">
        <h2 className="mb-4 text-xl font-bold text-chumbo">
          {editing ? "Editar peça" : "Nova peça"}
        </h2>
        <ProductForm
          product={editing}
          categories={categories}
          onSave={(p) => {
            upsertProduct(p);
            setEditing(null);
            setCreating(false);
          }}
          onCancel={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-chumbo/60">
          {products.length} peça(s) cadastrada(s)
        </p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-full bg-copper px-5 py-2 text-sm font-semibold text-ice hover:bg-copper-dark"
        >
          + Nova peça
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-chumbo/10 bg-white">
        {products.length === 0 ? (
          <p className="p-8 text-center text-chumbo/50">
            Nenhuma peça ainda. Cadastre a primeira!
          </p>
        ) : (
          <ul className="divide-y divide-chumbo/10">
            {products.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-4 p-3 sm:p-4"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-ice">
                  <SmartImage src={p.images[0]} alt={p.name} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-chumbo">
                      {p.name}
                    </h3>
                    {!p.active && (
                      <span className="rounded-full bg-chumbo/10 px-2 py-0.5 text-xs text-chumbo/60">
                        inativo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-chumbo/50">{catName(p.categoryId)}</p>
                </div>
                <div className="hidden text-right sm:block">
                  {p.promoPrice && p.promoPrice < p.price && (
                    <span className="mr-2 text-xs text-chumbo/40 line-through">
                      {formatBRL(p.price)}
                    </span>
                  )}
                  <span className="font-bold text-chumbo">
                    {formatBRL(
                      p.promoPrice && p.promoPrice < p.price
                        ? p.promoPrice
                        : p.price,
                    )}
                  </span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    className="rounded-full border border-chumbo/20 px-3 py-1.5 text-sm font-semibold text-chumbo hover:border-copper"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Excluir "${p.name}"?`)) deleteProduct(p.id);
                    }}
                    className="rounded-full px-3 py-1.5 text-sm font-semibold text-chumbo/50 hover:text-copper"
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------------- Categorias ---------------- */

function CategoriesTab() {
  const { categories, products, upsertCategory, deleteCategory } = useStore();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");

  function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const cat: Category = {
      id: uid("cat"),
      name: n,
      slug: slugify(n),
      emoji: emoji.trim() || undefined,
    };
    upsertCategory(cat);
    setName("");
    setEmoji("");
  }

  const countFor = (id: string) =>
    products.filter((p) => p.categoryId === id).length;

  return (
    <div className="max-w-2xl">
      <form onSubmit={add} className="mb-6 flex flex-wrap items-end gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-sm font-medium text-chumbo">
            Nova categoria
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da categoria"
            className="w-full rounded-lg border border-chumbo/15 bg-white px-3 py-2 text-sm outline-none focus:border-copper"
          />
        </label>
        <label className="w-20">
          <span className="mb-1 block text-sm font-medium text-chumbo">
            Emoji
          </span>
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="🎁"
            className="w-full rounded-lg border border-chumbo/15 bg-white px-3 py-2 text-center text-sm outline-none focus:border-copper"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-copper px-5 py-2 text-sm font-semibold text-ice hover:bg-copper-dark"
        >
          Adicionar
        </button>
      </form>

      <ul className="divide-y divide-chumbo/10 overflow-hidden rounded-2xl border border-chumbo/10 bg-white">
        {categories.map((c) => {
          const count = countFor(c.id);
          return (
            <li key={c.id} className="flex items-center gap-3 p-4">
              <span className="text-xl">{c.emoji ?? "📦"}</span>
              <div className="flex-1">
                <p className="font-semibold text-chumbo">{c.name}</p>
                <p className="text-xs text-chumbo/50">{count} peça(s)</p>
              </div>
              <button
                type="button"
                disabled={count > 0}
                title={
                  count > 0
                    ? "Mova ou exclua as peças desta categoria antes"
                    : "Excluir categoria"
                }
                onClick={() => {
                  if (confirm(`Excluir categoria "${c.name}"?`))
                    deleteCategory(c.id);
                }}
                className="rounded-full px-3 py-1.5 text-sm font-semibold text-chumbo/50 hover:text-copper disabled:cursor-not-allowed disabled:opacity-30"
              >
                Excluir
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------------- Backup / Dados ---------------- */

function DataTab() {
  const { exportData, importData, resetCatalog } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");

  function download() {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `art-space-3d-catalogo-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Backup exportado.");
  }

  function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const ok = importData(data);
        setMsg(ok ? "Catálogo importado com sucesso." : "Arquivo inválido.");
      } catch {
        setMsg("Não foi possível ler o arquivo.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-chumbo/10 bg-white p-6">
        <h3 className="font-bold text-chumbo">Backup do catálogo</h3>
        <p className="mt-1 text-sm text-chumbo/60">
          Os dados ficam salvos neste navegador. Exporte um arquivo para ter uma
          cópia de segurança ou para transferir o catálogo para outro
          dispositivo.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={download}
            className="rounded-full bg-chumbo px-5 py-2 text-sm font-semibold text-ice hover:bg-copper"
          >
            Exportar JSON
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-full border border-chumbo/20 px-5 py-2 text-sm font-semibold text-chumbo hover:border-copper"
          >
            Importar JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            onChange={onImport}
            className="hidden"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-copper/30 bg-copper/5 p-6">
        <h3 className="font-bold text-chumbo">Restaurar catálogo de exemplo</h3>
        <p className="mt-1 text-sm text-chumbo/60">
          Substitui todos os produtos, categorias e configurações pelos dados de
          exemplo iniciais. Esta ação não pode ser desfeita.
        </p>
        <button
          type="button"
          onClick={() => {
            if (
              confirm(
                "Isto apaga suas alterações e volta ao catálogo de exemplo. Continuar?",
              )
            ) {
              resetCatalog();
              setMsg("Catálogo restaurado para o exemplo.");
            }
          }}
          className="mt-4 rounded-full border border-copper px-5 py-2 text-sm font-semibold text-copper hover:bg-copper hover:text-ice"
        >
          Restaurar exemplo
        </button>
      </div>

      {msg && <p className="text-sm font-semibold text-copper">{msg}</p>}
    </div>
  );
}
