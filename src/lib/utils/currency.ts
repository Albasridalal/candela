/**
 * KWD is always displayed with 3 decimal places, e.g. "KD 15.000".
 * Centralized here so every page formats money identically.
 */
export function formatCurrency(amount: number, currencyLabel = "KD"): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return `${currencyLabel} ${value.toFixed(3)}`;
}

export function parseCurrencyInput(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 1000) / 1000 : 0;
}
