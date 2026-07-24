// Pricing configuration and utility functions for calculating costs based on model rates and profit margins.
export interface ModelRate {
  inputPer1M: number;
  outputPer1M: number;
}

export const MODEL_RATES: Record<string, ModelRate> = {
  "gemini-2.5-flash-lite": {
    inputPer1M: 0.1,
    outputPer1M: 0.4,
  },
  "gemini-3.5-flash-lite": {
    inputPer1M: 0.3,
    outputPer1M: 2.5,
  },
  "gemini-embedding-2": {
    inputPer1M: 0.2,
    outputPer1M: 0.0,
  },
};

// Returns the current profit margin percentage (default: 25%).
export function getProfitMarginPercent(): number {
  const envMargin = process.env.PROFIT_MARGIN_PERCENT;
  if (envMargin !== undefined && !isNaN(Number(envMargin))) {
    return Number(envMargin);
  }
  return 25; // Default 25% cut
}

/**
 * Calculates raw base USD cost and billed USD cost (base cost + profit margin cut)
 * for a given model and token counts.
 * Note: Thinking/reasoning tokens count towards output tokens and are billed at the output rate.
 */
export function calculateTokenCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): { baseCostUsd: number; billedCostUsd: number; marginPercent: number } {
  const rate = MODEL_RATES[model] ?? { inputPer1M: 0.3, outputPer1M: 2.5 }; // Fallback to 3.5-flash-lite rate
  const marginPercent = getProfitMarginPercent();
  const marginMultiplier = 1 + marginPercent / 100;

  const baseInputCost = (inputTokens / 1_000_000) * rate.inputPer1M;
  const baseOutputCost = (outputTokens / 1_000_000) * rate.outputPer1M;

  const baseCostUsd = parseFloat((baseInputCost + baseOutputCost).toFixed(8));
  const billedCostUsd = parseFloat((baseCostUsd * marginMultiplier).toFixed(6));

  return {
    baseCostUsd,
    billedCostUsd,
    marginPercent,
  };
}

// Formats USD for clean UI display
export function formatUsd(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "—";
  const absVal = Math.abs(val);

  if (absVal === 0) return "$0.00";
  if (absVal >= 0.01) {
    return `$${val.toFixed(2)}`;
  }
  if (absVal >= 0.0001) {
    return `$${val.toFixed(4)}`;
  }
  return `$${val.toFixed(6)}`;
}
