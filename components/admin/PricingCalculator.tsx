"use client";

import type { CostBreakdown } from "@/lib/types";
import { computePricing, emptyCostBreakdown } from "@/lib/pricing";
import { formatBRL } from "@/lib/format";

const FIELDS: {
  key: keyof CostBreakdown;
  label: string;
  suffix?: string;
  step?: number;
}[] = [
  { key: "filamentGrams", label: "Filamento usado", suffix: "g" },
  { key: "filamentPricePerKg", label: "Preço do filamento", suffix: "R$/kg" },
  { key: "printHours", label: "Tempo de impressão", suffix: "h", step: 0.1 },
  { key: "machineCostPerHour", label: "Custo de máquina", suffix: "R$/h", step: 0.5 },
  { key: "laborHours", label: "Trabalho manual", suffix: "h", step: 0.1 },
  { key: "laborCostPerHour", label: "Valor da hora", suffix: "R$/h" },
  { key: "extraCost", label: "Custos extras", suffix: "R$" },
  { key: "marginPct", label: "Margem de lucro", suffix: "%" },
];

export function PricingCalculator({
  value,
  onChange,
  onApply,
}: {
  value: CostBreakdown | null;
  onChange: (cost: CostBreakdown) => void;
  onApply: (price: number) => void;
}) {
  const cost = value ?? emptyCostBreakdown;
  const result = computePricing(cost);

  function set(key: keyof CostBreakdown, raw: string) {
    const num = parseFloat(raw);
    onChange({ ...cost, [key]: Number.isFinite(num) ? num : 0 });
  }

  return (
    <div className="rounded-xl border border-chumbo/15 bg-ice/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-semibold text-chumbo">
          Precificação da peça
        </h4>
        <span className="text-xs text-chumbo/50">
          Calcule o custo e sugira o preço
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1 block text-xs font-medium text-chumbo/70">
              {f.label} {f.suffix && <span className="text-chumbo/40">({f.suffix})</span>}
            </span>
            <input
              type="number"
              min={0}
              step={f.step ?? 1}
              value={cost[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
              className="w-full rounded-lg border border-chumbo/15 bg-white px-2 py-1.5 text-sm outline-none focus:border-copper"
            />
          </label>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-white p-3 text-sm sm:grid-cols-4">
        <Row label="Filamento" value={result.filamentCost} />
        <Row label="Máquina" value={result.machineCost} />
        <Row label="Mão de obra" value={result.laborCost} />
        <Row label="Extras" value={result.extraCost} />
        <Row label="Custo total" value={result.totalCost} strong />
        <Row label="Margem" value={result.marginValue} />
        <div className="col-span-2 flex items-center justify-between rounded-md bg-copper/10 px-2 py-1">
          <span className="font-semibold text-chumbo">Preço sugerido</span>
          <span className="font-bold text-copper">
            {formatBRL(result.suggestedPrice)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onApply(result.suggestedPrice)}
        className="mt-3 rounded-full bg-chumbo px-4 py-2 text-sm font-semibold text-ice hover:bg-copper"
      >
        Usar como preço de venda
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-chumbo/60">{label}</span>
      <span className={strong ? "font-bold text-chumbo" : "text-chumbo"}>
        {formatBRL(value)}
      </span>
    </div>
  );
}
