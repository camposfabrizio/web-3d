"use client";

import { useState } from "react";
import type { StoreSettings } from "@/lib/types";
import { onlyDigits } from "@/lib/format";

export function SettingsForm({
  settings,
  onSave,
}: {
  settings: StoreSettings;
  onSave: (s: StoreSettings) => void;
}) {
  const [draft, setDraft] = useState<StoreSettings>(settings);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ ...draft, whatsapp: onlyDigits(draft.whatsapp) });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  const inputCls =
    "w-full rounded-lg border border-chumbo/15 bg-white px-3 py-2 text-sm outline-none focus:border-copper focus:ring-2 focus:ring-copper/20";

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium text-chumbo">
            Nome da loja
          </span>
          <input
            className={inputCls}
            value={draft.storeName}
            onChange={(e) => set("storeName", e.target.value)}
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-chumbo">
            Cidade / região
          </span>
          <input
            className={inputCls}
            value={draft.city}
            onChange={(e) => set("city", e.target.value)}
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-chumbo">
          Slogan
        </span>
        <input
          className={inputCls}
          value={draft.tagline}
          onChange={(e) => set("tagline", e.target.value)}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-chumbo">
          WhatsApp para receber os pedidos
        </span>
        <input
          className={inputCls}
          value={draft.whatsapp}
          onChange={(e) => set("whatsapp", e.target.value)}
          placeholder="Ex.: 5547999999999 (DDI + DDD + número)"
          inputMode="numeric"
        />
        <span className="mt-1 block text-xs text-chumbo/50">
          Apenas números, com código do país (55) e DDD. É para onde os pedidos
          serão enviados.
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium text-chumbo">
            Instagram
          </span>
          <input
            className={inputCls}
            value={draft.instagram}
            onChange={(e) => set("instagram", e.target.value)}
            placeholder="@artspace3d"
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-chumbo">
            Chave Pix (opcional)
          </span>
          <input
            className={inputCls}
            value={draft.pixKey}
            onChange={(e) => set("pixKey", e.target.value)}
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-chumbo">
          Texto da opção “Retirar”
        </span>
        <input
          className={inputCls}
          value={draft.pickupInfo}
          onChange={(e) => set("pickupInfo", e.target.value)}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-chumbo">
          Texto da opção “Receber / Entrega”
        </span>
        <input
          className={inputCls}
          value={draft.deliveryInfo}
          onChange={(e) => set("deliveryInfo", e.target.value)}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-chumbo">
          PIN de acesso ao admin
        </span>
        <input
          className={inputCls}
          value={draft.adminPin}
          onChange={(e) => set("adminPin", e.target.value)}
        />
        <span className="mt-1 block text-xs text-chumbo/50">
          Proteção simples (no navegador). Não use uma senha importante aqui.
        </span>
      </label>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="rounded-full bg-copper px-6 py-2 text-sm font-semibold text-ice hover:bg-copper-dark"
        >
          Salvar configurações
        </button>
        {saved && (
          <span className="text-sm font-semibold text-copper">✓ Salvo!</span>
        )}
      </div>
    </form>
  );
}
