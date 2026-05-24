export function roundTo(value: number, decimals = 2) {
  const safeDecimals = Math.max(0, Math.min(6, Math.trunc(decimals)));
  const factor = 10 ** safeDecimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function percentOfPrice(price: number | null, percent: number, decimals = 2): number | null {
  if (price == null) return null;
  if (!Number.isFinite(price)) return null;
  if (!Number.isFinite(percent)) return null;
  return roundTo(price * percent, decimals);
}

export function derivePrice40(priceNew: number | null): number | null {
  return percentOfPrice(priceNew, 0.4);
}

export function derivePrice70(priceNew: number | null): number | null {
  return percentOfPrice(priceNew, 0.7);
}

export function derivePrices(priceNew: number | null): { Price40: number | null; Price70: number | null } {
  return { Price40: derivePrice40(priceNew), Price70: derivePrice70(priceNew) };
}
