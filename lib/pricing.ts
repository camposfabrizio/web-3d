import type { CostBreakdown } from "./types";

export const emptyCostBreakdown: CostBreakdown = {
  filamentGrams: 0,
  filamentPricePerKg: 120,
  printHours: 0,
  machineCostPerHour: 3,
  laborHours: 0,
  laborCostPerHour: 40,
  extraCost: 0,
  marginPct: 100,
};

export type PricingResult = {
  filamentCost: number;
  machineCost: number;
  laborCost: number;
  extraCost: number;
  /** Soma dos custos, sem margem. */
  totalCost: number;
  /** Valor da margem aplicada. */
  marginValue: number;
  /** Preço sugerido = custo total + margem. */
  suggestedPrice: number;
};

/**
 * Calcula o custo de uma peça impressa em 3D e sugere um preço de venda
 * a partir da memória de cálculo informada no painel admin.
 */
export function computePricing(cost: CostBreakdown): PricingResult {
  const filamentCost = (cost.filamentGrams / 1000) * cost.filamentPricePerKg;
  const machineCost = cost.printHours * cost.machineCostPerHour;
  const laborCost = cost.laborHours * cost.laborCostPerHour;
  const extraCost = cost.extraCost;

  const totalCost = filamentCost + machineCost + laborCost + extraCost;
  const marginValue = totalCost * (cost.marginPct / 100);
  const rawPrice = totalCost + marginValue;

  // Arredonda para múltiplo de R$ 0,50 para um preço "comercial".
  const suggestedPrice = Math.max(0, Math.round(rawPrice * 2) / 2);

  return {
    filamentCost,
    machineCost,
    laborCost,
    extraCost,
    totalCost,
    marginValue,
    suggestedPrice,
  };
}
