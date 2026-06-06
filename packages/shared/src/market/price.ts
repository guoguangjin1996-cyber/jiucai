export type OpenStatus =
  | "LIMIT_UP_OPEN"
  | "HIGH_OPEN"
  | "FLAT_OPEN"
  | "LOW_OPEN"
  | "LIMIT_DOWN_OPEN";

export interface LimitPrices {
  limitUpPrice: number;
  limitDownPrice: number;
}

function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function resolveOpenPrice(previousClose: number, pressure: number, limitRate: number): number {
  const rawChange = pressure * 0.015;
  const cappedChange = clamp(rawChange, -limitRate, limitRate);
  return roundToTwoDecimals(previousClose * (1 + cappedChange));
}

export function getOpenStatus(
  openPrice: number,
  previousClose: number,
  limitRate: number
): OpenStatus {
  const { limitUpPrice, limitDownPrice } = createLimitPrices(previousClose, limitRate);

  if (openPrice >= limitUpPrice) {
    return "LIMIT_UP_OPEN";
  }

  if (openPrice <= limitDownPrice) {
    return "LIMIT_DOWN_OPEN";
  }

  if (openPrice > previousClose) {
    return "HIGH_OPEN";
  }

  if (openPrice < previousClose) {
    return "LOW_OPEN";
  }

  return "FLAT_OPEN";
}

export function createLimitPrices(previousClose: number, limitRate: number): LimitPrices {
  return {
    limitUpPrice: roundToTwoDecimals(previousClose * (1 + limitRate)),
    limitDownPrice: roundToTwoDecimals(previousClose * (1 - limitRate))
  };
}
